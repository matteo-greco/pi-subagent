import { spawn } from "node:child_process";
import { mkdir, mkdtemp, open, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function directorySize(directory) {
  let bytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    bytes += entry.isDirectory() ? await directorySize(entryPath) : (await stat(entryPath)).size;
  }
  return bytes;
}

export async function pruneRunTranscripts(root, options) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }

  const runs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const directory = join(root, entry.name);
    const details = await stat(directory);
    try {
      await stat(join(directory, "completed.json"));
    } catch {
      if (options.now - details.mtimeMs > options.abandonedAgeMs) {
        await rm(directory, { recursive: true, force: true });
      }
      continue;
    }
    runs.push({ directory, modifiedAt: details.mtimeMs, bytes: await directorySize(directory) });
  }
  runs.sort((left, right) => left.modifiedAt - right.modifiedAt);

  let retainedBytes = runs.reduce((total, run) => total + run.bytes, 0);
  for (const run of runs) {
    const expired = options.now - run.modifiedAt > options.maxAgeMs;
    if (!expired && retainedBytes <= options.maxBytes) continue;
    await rm(run.directory, { recursive: true, force: true });
    retainedBytes -= run.bytes;
  }
}

function signalProcessGroup(child, signal) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // The process has already exited.
    }
  }
}

export async function runBoundedProcess(options) {
  const startedAt = Date.now();
  await mkdir(options.transcriptRoot, { recursive: true, mode: 0o700 });
  await pruneRunTranscripts(options.transcriptRoot, {
    now: startedAt,
    maxAgeMs: options.transcriptMaxAgeMs ?? 7 * 24 * 60 * 60 * 1000,
    maxBytes: options.transcriptMaxBytes ?? 100 * 1024 * 1024,
    abandonedAgeMs: 60 * 60 * 1000,
  });
  const runDirectory = await mkdtemp(join(options.transcriptRoot, "run-"));
  const transcriptPath = join(runDirectory, "events.jsonl");
  const metadataPath = join(runDirectory, "metadata.json");
  await writeFile(metadataPath, `${JSON.stringify({ ...options.metadata, startedAt }, null, 2)}\n`, { mode: 0o600 });
  const transcript = await open(transcriptPath, "a", 0o600);
  let writes = Promise.resolve();
  const record = (event, details = {}) => {
    const entry = `${JSON.stringify({ timestamp: Date.now(), event, ...details })}\n`;
    writes = writes.then(() => transcript.appendFile(entry));
  };

  let lastAction = "started child process";
  let stderr = "";
  let termination = "exit";
  let closed = false;
  let timeoutHandle;
  let killHandle;
  let heartbeatHandle;
  let abortHandler;

  const result = await new Promise((resolve) => {
    const child = spawn(options.command, options.args, {
      cwd: options.cwd,
      env: options.env,
      detached: process.platform !== "win32",
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    record("started", { pid: child.pid, command: options.command, args: options.args });

    const terminate = (reason) => {
      if (closed || termination !== "exit") return;
      termination = reason;
      record(reason, { pid: child.pid, elapsedMs: Date.now() - startedAt, lastAction });
      signalProcessGroup(child, "SIGTERM");
      killHandle = setTimeout(() => {
        if (closed) return;
        record("sigkill", { pid: child.pid, lastAction });
        signalProcessGroup(child, "SIGKILL");
      }, options.terminateGraceMs);
    };

    timeoutHandle = setTimeout(() => terminate("timeout"), options.timeoutMs);
    heartbeatHandle = setInterval(() => {
      const status = { elapsedMs: Date.now() - startedAt, lastAction };
      record("heartbeat", status);
      options.onHeartbeat?.(status);
    }, options.heartbeatMs);

    abortHandler = () => terminate("aborted");
    if (options.signal?.aborted) abortHandler();
    else options.signal?.addEventListener("abort", abortHandler, { once: true });

    let stdoutBuffer = "";
    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) {
        lastAction = "received stdout output";
        record("stdout", { line });
        const requestedTermination = options.onStdoutLine?.(line);
        if (requestedTermination) terminate(requestedTermination);
      }
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      lastAction = "received stderr output";
      record("stderr", { text });
      options.onStderr?.(text);
    });

    child.on("error", (error) => {
      lastAction = `spawn error: ${errorMessage(error)}`;
      record("spawn-error", { message: errorMessage(error) });
    });
    child.on("close", (code, signal) => {
      closed = true;
      if (stdoutBuffer) {
        record("stdout", { line: stdoutBuffer });
        options.onStdoutLine?.(stdoutBuffer);
      }
      record("closed", { code, signal, termination });
      resolve({ code: code ?? 1, signal });
    });
  });

  clearTimeout(timeoutHandle);
  clearTimeout(killHandle);
  clearInterval(heartbeatHandle);
  options.signal?.removeEventListener("abort", abortHandler);
  await writes;
  await transcript.close();
  await writeFile(
    join(runDirectory, "completed.json"),
    `${JSON.stringify({ completedAt: Date.now(), termination, exitCode: result.code })}\n`,
    { mode: 0o600 },
  );

  return {
    exitCode: result.code,
    signal: result.signal,
    termination,
    elapsedMs: Date.now() - startedAt,
    lastAction,
    stderr,
    runDirectory,
    transcriptPath,
    metadataPath,
  };
}

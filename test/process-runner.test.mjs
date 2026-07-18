import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { runBoundedProcess } from "../src/process-runner.js";

const fixture = new URL("fixtures/child.mjs", import.meta.url).pathname;

async function eventually(check, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      return await check();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  return check();
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

test("elapsed timeout terminates an unresponsive process group and preserves diagnostics", async () => {
  const root = await mkdtemp(join(tmpdir(), "bounded-subagent-test-"));
  const statePath = join(root, "pids.json");

  try {
    const result = await runBoundedProcess({
      command: process.execPath,
      args: [fixture, "ignore-term-tree", statePath],
      cwd: process.cwd(),
      timeoutMs: 100,
      terminateGraceMs: 50,
      heartbeatMs: 25,
      transcriptRoot: root,
      metadata: { task: "timeout fixture" },
    });

    assert.equal(result.termination, "timeout");
    assert.match(result.lastAction, /started|output/);
    assert.ok(result.elapsedMs >= 100);

    const { childPid, grandchildPid } = JSON.parse(await readFile(statePath, "utf8"));
    await eventually(() => {
      assert.equal(processExists(childPid), false);
      assert.equal(processExists(grandchildPid), false);
    });

    const transcript = await readFile(result.transcriptPath, "utf8");
    assert.match(transcript, /"event":"started"/);
    assert.match(transcript, /"event":"timeout"/);
    assert.match(transcript, /"event":"sigkill"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

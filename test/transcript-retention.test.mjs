import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, utimes, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { pruneRunTranscripts } from "../src/process-runner.js";

test("transcript retention removes expired runs and bounds retained bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "subagent-retention-test-"));
  const now = Date.now();

  try {
    for (const [name, ageMs, bytes, completed] of [
      ["expired", 20_000, 10, true],
      ["older", 2_000, 80, true],
      ["newer", 1_000, 80, true],
      ["active", 30_000, 200, false],
      ["abandoned", 7_200_000, 20, false],
    ]) {
      const directory = join(root, name);
      await mkdir(directory);
      await writeFile(join(directory, "events.jsonl"), "x".repeat(bytes));
      if (completed) await writeFile(join(directory, "completed.json"), "{}");
      const timestamp = new Date(now - ageMs);
      await utimes(directory, timestamp, timestamp);
    }

    await pruneRunTranscripts(root, {
      now,
      maxAgeMs: 10_000,
      maxBytes: 100,
      abandonedAgeMs: 3_600_000,
    });

    assert.deepEqual(await readdir(root), ["active", "newer"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

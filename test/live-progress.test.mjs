import assert from "node:assert/strict";
import { test } from "node:test";

import { projectChildEvent } from "../src/live-progress.js";

test("live progress exposes thinking without exposing reasoning text", () => {
  const result = projectChildEvent(undefined, {
    type: "message_update",
    message: {
      role: "assistant",
      content: [{ type: "thinking", thinking: "private reasoning" }],
    },
  });

  assert.deepEqual(result.progress, {
    phase: "thinking",
    partialText: "",
    activeTools: [],
  });
  assert.equal(result.changed, true);
  assert.equal(result.immediate, false);
});

test("live progress carries partial response text", () => {
  const result = projectChildEvent(undefined, {
    type: "message_update",
    message: {
      role: "assistant",
      content: [{ type: "text", text: "Partial answer" }],
    },
  });

  assert.equal(result.progress.phase, "responding");
  assert.equal(result.progress.partialText, "Partial answer");
});

test("tool lifecycle events expose and then clear the running tool", () => {
  const started = projectChildEvent(undefined, {
    type: "tool_execution_start",
    toolCallId: "call-1",
    toolName: "read",
    args: { path: "src/index.ts" },
  });

  assert.deepEqual(started.progress.activeTools, [
    { id: "call-1", name: "read", args: { path: "src/index.ts" } },
  ]);
  assert.equal(started.progress.phase, "tool");
  assert.equal(started.immediate, true);

  const ended = projectChildEvent(started.progress, {
    type: "tool_execution_end",
    toolCallId: "call-1",
  });

  assert.deepEqual(ended.progress.activeTools, []);
  assert.equal(ended.progress.phase, "thinking");
  assert.equal(ended.immediate, true);
});

test("message completion clears transient response text", () => {
  const responding = projectChildEvent(undefined, {
    type: "message_update",
    message: { role: "assistant", content: [{ type: "text", text: "Done" }] },
  }).progress;

  const ended = projectChildEvent(responding, { type: "message_end" });
  assert.equal(ended.progress.partialText, "");
  assert.equal(ended.immediate, true);
});

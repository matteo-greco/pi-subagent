import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveDelegationPolicy } from "../src/policy.js";

test("a spawned child cannot delegate again without an inherited nesting budget", () => {
  assert.throws(
    () => resolveDelegationPolicy({ PI_SUBAGENT_DEPTH: "1", PI_SUBAGENT_NESTING_BUDGET: "0" }, {}),
    /Nested subagent execution blocked at depth 1/,
  );
});

test("an explicitly granted nesting budget is consumed one generation at a time", () => {
  const policy = resolveDelegationPolicy(
    { PI_SUBAGENT_DEPTH: "1", PI_SUBAGENT_NESTING_BUDGET: "2" },
    { timeoutSeconds: 40, nestingBudget: 2 },
  );

  assert.deepEqual(policy, {
    timeoutSeconds: 40,
    maxTurns: 20,
    maxToolCalls: 50,
    nestingBudget: 1,
  });
});

test("a root invocation grants no nested delegation by default", () => {
  const policy = resolveDelegationPolicy({}, {});
  assert.equal(policy.nestingBudget, 0);
  assert.equal(policy.timeoutSeconds, 300);
});

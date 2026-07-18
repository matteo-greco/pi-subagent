import assert from "node:assert/strict";
import { test } from "node:test";

import { mapSettledWithConcurrency } from "../src/parallel.js";

test("a failed parallel task does not discard completed sibling results", async () => {
  const results = await mapSettledWithConcurrency(["done", "failed", "also done"], 2, async (item) => {
    if (item === "failed") throw new Error("fixture failure");
    return item.toUpperCase();
  });

  assert.deepEqual(results.map((result) => result.status), ["fulfilled", "rejected", "fulfilled"]);
  assert.equal(results[0].value, "DONE");
  assert.match(String(results[1].reason), /fixture failure/);
  assert.equal(results[2].value, "ALSO DONE");
});

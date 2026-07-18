import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const [mode, statePath] = process.argv.slice(2);

if (mode === "sleep") {
  setInterval(() => {}, 1_000);
} else if (mode === "ignore-term-tree") {
  process.on("SIGTERM", () => {});
  const grandchild = spawn(process.execPath, [new URL("grandchild.mjs", import.meta.url).pathname], {
    detached: false,
    stdio: "ignore",
  });
  await writeFile(statePath, JSON.stringify({ childPid: process.pid, grandchildPid: grandchild.pid }));
  setInterval(() => {}, 1_000);
} else if (mode === "emit-and-sleep") {
  console.log(JSON.stringify({ type: "message_end", message: { role: "assistant", content: [] } }));
  setInterval(() => {}, 1_000);
} else {
  process.exitCode = 2;
}

# Pi Subagent

A user-owned replacement for Pi's example `subagent` extension. It preserves the `subagent` tool name and existing single, parallel, and chain modes while placing mechanical bounds around child execution.

The extension runtime and its canonical `general-purpose` agent definition live together in this repository. Runtime implementation is under `src/`; installable agent definitions are under `agents/`.

## Safety behavior

- Each task has a five-minute elapsed timeout by default; callers may request up to fifteen minutes.
- Each child receives a budget of 20 assistant turns and 50 tool calls. Crossing either limit terminates the child.
- Spawned children receive no nested-delegation budget by default. A root caller may explicitly grant at most two additional generations with `nestingBudget`.
- Child Pi runs in its own process group. Timeout and abort send `SIGTERM`, then `SIGKILL` after five seconds if the group has not closed.
- Internal parallel mode uses all-settled aggregation so one failure does not discard completed siblings.
- A heartbeat is emitted every fifteen seconds with elapsed time and the last observed child action.
- Raw child events, stderr, metadata, and termination events are stored under `~/.pi/agent/subagent-runs/` with user-only file permissions. Completed runs older than seven days or beyond 100 MB total are pruned oldest-first; abandoned runs are removed after one hour.

## Installation

```bash
rm -f ~/.pi/agent/extensions/subagent ~/.pi/agent/agents/general-purpose.md
ln -s /Users/matteo/code/pi-subagent ~/.pi/agent/extensions/subagent
ln -s /Users/matteo/code/pi-subagent/agents/general-purpose.md ~/.pi/agent/agents/general-purpose.md
```

Reload Pi after changing the installation:

```text
/reload
```

## Development

```bash
npm install
npm run check
```

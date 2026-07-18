export const DEFAULT_TIMEOUT_SECONDS = 300;
export const MAX_TIMEOUT_SECONDS = 900;
export const DEFAULT_MAX_TURNS = 20;
export const DEFAULT_MAX_TOOL_CALLS = 50;
export const MAX_NESTING_BUDGET = 2;

export function resolveDelegationPolicy(environment, requested) {
  const inheritedBudget = environment.PI_SUBAGENT_NESTING_BUDGET;
  if (inheritedBudget !== undefined && Number(inheritedBudget) <= 0) {
    throw new Error(
      `Nested subagent execution blocked at depth ${environment.PI_SUBAGENT_DEPTH ?? "1"}. The parent did not grant a nesting budget.`,
    );
  }

  return {
    timeoutSeconds: requested.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS,
    maxTurns: DEFAULT_MAX_TURNS,
    maxToolCalls: DEFAULT_MAX_TOOL_CALLS,
    nestingBudget:
      inheritedBudget === undefined
        ? (requested.nestingBudget ?? 0)
        : Math.max(0, Math.min(Number(inheritedBudget) - 1, requested.nestingBudget ?? MAX_NESTING_BUDGET)),
  };
}

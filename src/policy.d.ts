export const DEFAULT_TIMEOUT_SECONDS: number;
export const MAX_TIMEOUT_SECONDS: number;
export const DEFAULT_MAX_TURNS: number;
export const DEFAULT_MAX_TOOL_CALLS: number;
export const MAX_NESTING_BUDGET: number;

export interface ExecutionLimits {
  timeoutSeconds: number;
  maxTurns: number;
  maxToolCalls: number;
  nestingBudget: number;
}

export interface RequestedLimits {
  timeoutSeconds?: number;
  nestingBudget?: number;
}

export function resolveDelegationPolicy(
  environment: NodeJS.ProcessEnv,
  requested: RequestedLimits,
): ExecutionLimits;

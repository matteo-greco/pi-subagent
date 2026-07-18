export interface ActiveToolProgress {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface LiveProgress {
  phase: "starting" | "thinking" | "responding" | "tool";
  partialText: string;
  activeTools: ActiveToolProgress[];
  elapsedMs?: number;
}

export interface ProjectedProgress {
  progress: LiveProgress;
  changed: boolean;
  immediate: boolean;
}

export function projectChildEvent(current: LiveProgress | undefined, event: unknown): ProjectedProgress;

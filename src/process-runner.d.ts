export type ProcessTermination = "exit" | "timeout" | "aborted" | "turn-limit" | "tool-call-limit";

export interface BoundedProcessStatus {
  elapsedMs: number;
  lastAction: string;
}

export interface BoundedProcessOptions {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  timeoutMs: number;
  terminateGraceMs: number;
  heartbeatMs: number;
  transcriptRoot: string;
  transcriptMaxAgeMs?: number;
  transcriptMaxBytes?: number;
  metadata: Record<string, unknown>;
  onStdoutLine?: (line: string) => ProcessTermination | undefined;
  onStderr?: (text: string) => void;
  onHeartbeat?: (status: BoundedProcessStatus) => void;
}

export interface BoundedProcessResult {
  exitCode: number;
  signal: NodeJS.Signals | null;
  termination: ProcessTermination;
  elapsedMs: number;
  lastAction: string;
  stderr: string;
  runDirectory: string;
  transcriptPath: string;
  metadataPath: string;
}

export function pruneRunTranscripts(
  root: string,
  options: { now: number; maxAgeMs: number; maxBytes: number; abandonedAgeMs: number },
): Promise<void>;

export function runBoundedProcess(options: BoundedProcessOptions): Promise<BoundedProcessResult>;

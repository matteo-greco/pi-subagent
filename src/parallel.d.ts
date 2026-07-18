export type SettledResult<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; reason: unknown };

export function mapSettledWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  operation: (item: TInput, index: number) => Promise<TOutput>,
): Promise<Array<SettledResult<TOutput>>>;

export async function timed<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; durationMs: number }> {
  const started = performance.now();
  const result = await fn();
  return { result, durationMs: performance.now() - started };
}

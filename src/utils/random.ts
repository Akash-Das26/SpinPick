/**
 * Cryptographically secure Fisher-Yates shuffle using crypto.getRandomValues().
 * Returns a new array — does not mutate the original.
 */
export function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  const randArr = new Uint32Array(result.length);
  crypto.getRandomValues(randArr);
  for (let i = result.length - 1; i > 0; i--) {
    const j = randArr[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Cryptographically secure random integer in [0, max).
 */
export function secureRandomInt(max: number): number {
  if (max <= 0) return 0;
  const rand = new Uint32Array(1);
  crypto.getRandomValues(rand);
  return rand[0] % max;
}

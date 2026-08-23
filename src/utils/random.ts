function randomInt(max: number): number {
  if (max <= 1) return 0;
  const rand = new Uint32Array(1);
  crypto.getRandomValues(rand);
  return rand[0] % max;
}

export function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

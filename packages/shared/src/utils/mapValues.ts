/**
 * Map values of an object given mapFn. Avoids needing to pull in lodash
 */
export function mapValues<
  TKey extends string | number | symbol,
  TValue,
  TNewValue,
>(
  obj: Record<TKey, TValue>,
  mapFn: (value: TValue, key: TKey, index: number) => TNewValue,
): Record<TKey, TNewValue> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value], index) => [
      key,
      mapFn(value as TValue, key as TKey, index),
    ]),
  ) as Record<TKey, TNewValue>;
}

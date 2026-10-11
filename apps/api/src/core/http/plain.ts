/**
 * Own enumerable fields that have a value, as a plain object. Use instead of spreading DTO
 * instances (spreads keep `undefined` fields, which would overwrite stored data).
 */
export function definedFields<T extends object>(obj: T | undefined | null): Partial<T> {
  if (!obj) return {};
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

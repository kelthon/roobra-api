/**
 * Narrows a value to an object whose fields can be read, so a guard reads
 * `value.field` without an `in` check first: a missing field is `undefined`.
 *
 * @param value Any value, such as parsed JSON or a route's return value
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

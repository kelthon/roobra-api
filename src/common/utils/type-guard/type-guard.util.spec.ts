import { isRecord } from './type-guard.util.js';

describe('isRecord', () => {
  it('should accept an object or an array', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(true);
  });

  it('should reject null and primitives', () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord('object')).toBe(false);
    expect(isRecord(1)).toBe(false);
  });
});

import { serializeBigIntAsString } from './bigint-json.js';

describe('serializeBigIntAsString', () => {
  beforeAll(() => {
    serializeBigIntAsString();
  });

  it('should write a bigint as a string', () => {
    expect(JSON.stringify({ id: 42n })).toBe('{"id":"42"}');
  });

  it('should keep the precision past Number.MAX_SAFE_INTEGER', () => {
    expect(JSON.stringify({ id: 9007199254740993n })).toBe(
      '{"id":"9007199254740993"}',
    );
  });

  it('should write a bigint nested in a relation', () => {
    expect(JSON.stringify({ media: { volumes: [{ id: 1n }] } })).toBe(
      '{"media":{"volumes":[{"id":"1"}]}}',
    );
  });
});

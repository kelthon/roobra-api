declare global {
  interface BigInt {
    toJSON(): string;
  }
}

/**
 * Makes `JSON.stringify` write a `bigint` as a string, which it otherwise
 * refuses with a `TypeError`. Every `BigInt` id reaches clients as a string,
 * like the nano id of `User`, and keeps its precision past 2^53.
 *
 * It patches `BigInt.prototype` for the whole process, so calling it again
 * changes nothing.
 *
 * @see https://github.com/kelthon/roobra-docs/blob/main/adr/2026-10-14-send-bigint-ids-as-strings.md
 */
export function serializeBigIntAsString(): void {
  BigInt.prototype.toJSON = function (this: bigint) {
    return this.toString();
  };
}

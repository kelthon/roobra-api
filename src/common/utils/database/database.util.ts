// Prisma Client error codes, see
// https://www.prisma.io/docs/orm/reference/error-reference#prisma-client-query-engine
const ProvidedValueIsTooLong = 'P2000';
const UniqueConstraintViolationError = 'P2002';
const ForeignKeyConstraintViolationError = 'P2003';
const ConstraintViolationError = 'P2004';
const RelationViolationError = 'P2014';
const QueryInterpretationError = 'P2016';
const InputError = 'P2019';
const TableDoesNotExistError = 'P2021';
const ColumnDoesNotExistError = 'P2022';
const InconsistentColumnDataError = 'P2023';
const RecordNotFoundError = 'P2025';

/**
 * The part of a Prisma error this app reads
 *
 * `meta.target` is typed as the list of column names a unique constraint
 * violation reports, which Prisma itself types as `unknown`.
 */
export type DatabaseErrorCandidate = {
  code: string;
  meta?: {
    target?: string[];
    modelName?: string;
    [key: string]: unknown;
  };
};

/**
 * Tells whether an error is a Prisma error with the given code
 *
 * It checks the error's shape instead of using `instanceof`, so it also works
 * in unit tests, where the generated Prisma client is replaced by a mock.
 *
 * @param error The caught value
 * @param code The Prisma error code, for example `P2025`
 */
export function isPrismaClientError(
  error: unknown,
  code: string,
): error is DatabaseErrorCandidate {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

/** A value is too long for its column (`P2000`) */
export function isProvidedValueTooLongError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isPrismaClientError(error, ProvidedValueIsTooLong);
}

/** A unique constraint was violated (`P2002`) */
export function isUniqueConstraintViolationError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isPrismaClientError(error, UniqueConstraintViolationError);
}

/** A foreign key constraint failed (`P2003`) */
export function isForeignKeyConstraintViolationError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isPrismaClientError(error, ForeignKeyConstraintViolationError);
}

/** A constraint failed on the database (`P2004`) */
export function isConstraintViolationError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isPrismaClientError(error, ConstraintViolationError);
}

/** A required relation between two records would be violated (`P2014`) */
export function isRelationViolationError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isPrismaClientError(error, RelationViolationError);
}

/** The query could not be interpreted (`P2016`) */
export function isQueryInterpretationError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isPrismaClientError(error, QueryInterpretationError);
}

/** The query input is invalid (`P2019`) */
export function isInputError(error: unknown): error is DatabaseErrorCandidate {
  return isPrismaClientError(error, InputError);
}

/** The table does not exist in the database (`P2021`) */
export function isTableDoesNotExistError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isPrismaClientError(error, TableDoesNotExistError);
}

/** The column does not exist in the database (`P2022`) */
export function isColumnDoesNotExistError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isPrismaClientError(error, ColumnDoesNotExistError);
}

/** The stored column data is inconsistent with the schema (`P2023`) */
export function isInconsistentColumnDataError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isPrismaClientError(error, InconsistentColumnDataError);
}

/** The record the operation needed was not found (`P2025`) */
export function isRecordNotFoundError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isPrismaClientError(error, RecordNotFoundError);
}

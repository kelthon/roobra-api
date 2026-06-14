export enum DatabaseErrorCode {
  UniqueConstraintViolationError = 'P2002',
  ForeignKeyConstraintViolationError = 'P2003',
  ConstraintViolationError = 'P2004',
  RelationViolationError = 'P2014',
  QueryInterpretationError = 'P2016',
  InputError = 'P2019',
  TableDoesNotExistError = 'P2021',
  ColumnDoesNotExistError = 'P2022',
  InconsistentColumnDataError = 'P2023',
  RecordNotFoundError = 'P2025',
}

export type DatabaseErrorCandidate = {
  code: DatabaseErrorCode;
};

export function isDatabaseError(
  error: unknown,
  code: DatabaseErrorCode,
): error is DatabaseErrorCandidate {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: DatabaseErrorCode }).code === code
  );
}

export function isUniqueConstraintViolationError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isDatabaseError(
    error,
    DatabaseErrorCode.UniqueConstraintViolationError,
  );
}

export function isForeignKeyConstraintViolationError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isDatabaseError(
    error,
    DatabaseErrorCode.ForeignKeyConstraintViolationError,
  );
}

export function isConstraintViolationError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isDatabaseError(error, DatabaseErrorCode.ConstraintViolationError);
}

export function isRelationViolationError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isDatabaseError(error, DatabaseErrorCode.RelationViolationError);
}

export function isQueryInterpretationError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isDatabaseError(error, DatabaseErrorCode.QueryInterpretationError);
}

export function isInputError(error: unknown): error is DatabaseErrorCandidate {
  return isDatabaseError(error, DatabaseErrorCode.InputError);
}

export function isTableDoesNotExistError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isDatabaseError(error, DatabaseErrorCode.TableDoesNotExistError);
}

export function isColumnDoesNotExistError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isDatabaseError(error, DatabaseErrorCode.ColumnDoesNotExistError);
}

export function isInconsistentColumnDataError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isDatabaseError(error, DatabaseErrorCode.InconsistentColumnDataError);
}

export function isRecordNotFoundError(
  error: unknown,
): error is DatabaseErrorCandidate {
  return isDatabaseError(error, DatabaseErrorCode.RecordNotFoundError);
}

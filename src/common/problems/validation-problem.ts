import { ValidationError } from '@nestjs/common';
import { FieldError, ProblemException } from './problem.js';

/**
 * Flattens class-validator errors into one entry per field, naming a nested
 * field by its path (`address.zip`).
 *
 * @param errors The errors of one object
 * @param parent The path of the object the errors belong to
 */
export function toFieldErrors(
  errors: ValidationError[],
  parent = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const messages = Object.values(error.constraints ?? {});

    return [
      ...(messages.length > 0 ? [{ field, messages }] : []),
      ...toFieldErrors(error.children ?? [], field),
    ];
  });
}

/**
 * The `exceptionFactory` of the global `ValidationPipe`: answers an invalid
 * request as a `validation-failed` problem that lists every invalid field.
 *
 * @param errors The errors class-validator found in the request
 */
export function validationProblemFactory(
  errors: ValidationError[],
): ProblemException {
  const fieldErrors = toFieldErrors(errors);
  const count = fieldErrors.length;

  return new ProblemException(
    'validation-failed',
    `The request has ${count} invalid ${count === 1 ? 'field' : 'fields'}.`,
    fieldErrors,
  );
}

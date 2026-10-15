import { ValidationError } from '@nestjs/common';
import { ProblemException } from '@app/common/exceptions/problem.exception.js';
import {
  toFieldErrors,
  validationProblemFactory,
} from './validation-problem.js';

/** A class-validator error, with only the properties these specs read */
function validationError(
  property: string,
  constraints?: Record<string, string>,
  children: ValidationError[] = [],
): ValidationError {
  return { property, constraints, children } as ValidationError;
}

describe('toFieldErrors', () => {
  it('should list every message of a field', () => {
    expect(
      toFieldErrors([
        validationError('password', {
          isStrongPassword: 'password is not strong enough',
          isNotEmpty: 'password should not be empty',
        }),
      ]),
    ).toEqual([
      {
        field: 'password',
        messages: [
          'password is not strong enough',
          'password should not be empty',
        ],
      },
    ]);
  });

  it('should name a nested field by its path', () => {
    expect(
      toFieldErrors([
        validationError('address', undefined, [
          validationError('zip', { isPostalCode: 'zip must be a postal code' }),
        ]),
      ]),
    ).toEqual([
      { field: 'address.zip', messages: ['zip must be a postal code'] },
    ]);
  });

  it('should return no field for no error', () => {
    expect(toFieldErrors([])).toEqual([]);
  });
});

describe('validationProblemFactory', () => {
  it('should return a validation-failed problem with the field errors', () => {
    const problem = validationProblemFactory([
      validationError('email', { isEmail: 'email must be an email' }),
    ]);

    expect(problem).toBeInstanceOf(ProblemException);
    expect(problem.type).toBe('validation-failed');
    expect(problem.getStatus()).toBe(400);
    expect(problem.message).toBe('The request has 1 invalid field.');
    expect(problem.errors).toEqual([
      { field: 'email', messages: ['email must be an email'] },
    ]);
  });

  it('should count the invalid fields in the detail', () => {
    const problem = validationProblemFactory([
      validationError('email', { isEmail: 'email must be an email' }),
      validationError('username', { isUsername: 'invalid username' }),
    ]);

    expect(problem.message).toBe('The request has 2 invalid fields.');
  });
});

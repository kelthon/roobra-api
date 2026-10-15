import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Validates a person's name: letters only, with words separated by a hyphen or
 * an apostrophe, or by a space when `allowSpaces` is true.
 *
 * @param minLength The minimum length
 * @param maxLength The maximum length
 * @param allowSpaces Whether words may be separated by a space
 * @param validationOptions Standard class-validator options
 */
export function IsName(
  minLength: number = 3,
  maxLength: number = 75,
  allowSpaces: boolean = false,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isName',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }

          if (value.length < minLength || value.length > maxLength) {
            return false;
          }

          if (!allowSpaces && value.includes(' ')) {
            return false;
          }

          const expr = /^[\p{L}]+(?:[ '-][\p{L}]+)*$/u;

          return expr.test(value);
        },
        defaultMessage() {
          return `Name must be contain only letters ${allowSpaces ? '' : ' without spaces'} and be between ${minLength} and ${maxLength} characters.`;
        },
      },
    });
  };
}

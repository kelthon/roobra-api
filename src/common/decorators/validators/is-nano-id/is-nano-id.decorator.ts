import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates a nano id: 21 characters, each a letter, a digit, `_` or `-`.
 *
 * @param validationOptions Standard class-validator options
 */
export function IsNanoId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNanoId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;

          const regex = /^[a-zA-Z0-9_-]{21}$/;
          return regex.test(value);
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Please provide a valid nano id.';
        },
      },
    });
  };
}

import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsUserName(
  minLength: number = 3,
  maxLength: number = 75,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUserName',
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

          const expr = /^[\p{L}\p{N}_]+$/u;

          return expr.test(value);
        },
        defaultMessage() {
          return `Username must be contain only letters, digits or underscore and be between ${minLength} and ${maxLength} characters.`;
        },
      },
    });
  };
}

import { registerDecorator, ValidationOptions } from 'class-validator';

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

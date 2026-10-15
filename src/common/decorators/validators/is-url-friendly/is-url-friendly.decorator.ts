import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsUrlFriendly(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUrlFriendly',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          // Only letters, numbers, hyphens and underscores, at least one character
          const expr = /^[a-zA-Z0-9_-]+$/;
          return expr.test(value);
        },
        defaultMessage(_args: ValidationArguments) {
          return 'The value must be URL-friendly: only letters, numbers, hyphens and underscores are allowed.';
        },
      },
    });
  };
}

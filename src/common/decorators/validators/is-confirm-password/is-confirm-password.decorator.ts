import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsConfirmPassword(
  passwordProperty: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isConfirmPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (typeof value !== 'string') return false;

          const relatedValue = (
            args.object as unknown as Record<string, unknown>
          )[passwordProperty];

          return value === relatedValue;
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Passwords do not match.';
        },
      },
    });
  };
}

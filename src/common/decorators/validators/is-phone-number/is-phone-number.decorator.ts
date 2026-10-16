import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { phone } from 'phone';

/**
 * Validates a mobile phone number. Without a `+` and its country code, the
 * number is read as one from the USA or Canada.
 *
 * @param validationOptions Standard class-validator options
 */
export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isWhatsAppNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;

          const result = phone(value);
          return result.isValid;
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Please provide a valid WhatsApp phone number.';
        },
      },
    });
  };
}

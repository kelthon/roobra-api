import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Validates a sort expression in the `field:order` format, such as
 * `createdAt:desc`. The field is case-sensitive, the order is not. Pass
 * `{ each: true }` to validate every item of an array.
 *
 * @param allowedFields The fields that can be sorted by
 * @param allowedOrders The accepted sort directions
 * @param validationOptions Standard class-validator options
 */
export function IsOrderByField(
  allowedFields: string[],
  allowedOrders: string[] = ['asc', 'desc'],
  validationOptions?: ValidationOptions,
) {
  const normalizedOrders = allowedOrders.map((o) => o.toLowerCase());

  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isOrderByField',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }

          const segments = value.split(':');

          if (segments.length !== 2) {
            return false;
          }

          const [field, order] = segments;

          return (
            allowedFields.includes(field) &&
            normalizedOrders.includes(order.toLowerCase())
          );
        },
        defaultMessage() {
          return `Each orderBy must be in the format field:${allowedOrders.join('|')} and use one of: ${allowedFields.join(', ')}.`;
        },
      },
    });
  };
}

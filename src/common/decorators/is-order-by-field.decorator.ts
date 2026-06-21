import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsOrderByField(
  allowedFields: string[],
  allowedOrders: string[] = ['asc', 'desc'],
  validationOptions?: ValidationOptions,
) {
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

          const [field, order] = value.split(':');

          if (!field || !order) {
            return false;
          }

          return (
            allowedFields.includes(field) &&
            allowedOrders
              .map((o) => o.toLowerCase())
              .includes(order.toLowerCase())
          );
        },
        defaultMessage() {
          return 'Each orderBy must be in the format field:asc|desc and use allowed fields.';
        },
      },
    });
  };
}

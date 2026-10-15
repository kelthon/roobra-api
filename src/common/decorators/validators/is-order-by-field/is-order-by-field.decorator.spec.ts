import { validate } from 'class-validator';
import { IsOrderByField } from './is-order-by-field.decorator.js';

class DummyDto {
  @IsOrderByField(['name', 'email', 'createdAt'], ['asc', 'desc'], {
    each: true,
  })
  orderBy!: string | string[];
}

const validateOrder = (orderBy: unknown) =>
  validate(Object.assign(new DummyDto(), { orderBy }));

describe('IsOrderByField', () => {
  it('should pass when field and order are allowed', async () => {
    expect(await validateOrder('name:asc')).toHaveLength(0);
  });

  it('should pass when order differs only in case', async () => {
    expect(await validateOrder('name:ASC')).toHaveLength(0);
  });

  it('should fail when the field is not allowed', async () => {
    expect(await validateOrder('updatedAt:asc')).toHaveLength(1);
  });

  it('should fail when the order is not allowed', async () => {
    expect(await validateOrder('email:random')).toHaveLength(1);
  });

  it('should report a single error when both field and order are invalid', async () => {
    expect(await validateOrder('updatedAt:random')).toHaveLength(1);
  });

  it('should fail when the order is missing', async () => {
    expect(await validateOrder('createdAt')).toHaveLength(1);
  });

  it('should fail when the field is empty', async () => {
    expect(await validateOrder(':asc')).toHaveLength(1);
  });

  it('should fail when the order is empty', async () => {
    expect(await validateOrder('name:')).toHaveLength(1);
  });

  it('should fail when the value has extra segments', async () => {
    expect(await validateOrder('name:asc:extra')).toHaveLength(1);
  });

  it('should fail when the value is not a string', async () => {
    expect(await validateOrder(123)).toHaveLength(1);
  });

  it('should pass when every item of the array is valid', async () => {
    expect(
      await validateOrder(['createdAt:desc', 'name:asc', 'email:asc']),
    ).toHaveLength(0);
  });

  it('should fail when any item of the array is invalid', async () => {
    expect(await validateOrder(['name:asc', 'email:random'])).toHaveLength(1);
  });

  it('should list the allowed fields and orders in the error message', async () => {
    const [error] = await validateOrder('updatedAt:asc');

    expect(error.constraints?.isOrderByField).toBe(
      'Each orderBy must be in the format field:asc|desc and use one of: name, email, createdAt.',
    );
  });
});

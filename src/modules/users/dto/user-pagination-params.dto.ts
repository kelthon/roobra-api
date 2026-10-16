import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { IsOrderByField } from '@app/common/decorators/validators/is-order-by-field/is-order-by-field.decorator.js';
import { BasePaginationParamsDto } from '@app/common/dto/base-pagination-params-dto.js';
import { User } from '@app/db/prisma/client.js';

const USER_ORDER_FIELDS = [
  'username',
  'email',
  'createdAt',
  'updatedAt',
] satisfies (keyof User)[];

/** The query of `GET /v1/users` */
export class UserPaginationParamsDto extends BasePaginationParamsDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsOrderByField(USER_ORDER_FIELDS, undefined, { each: true })
  orderBy: string[] = ['createdAt:desc'];
}

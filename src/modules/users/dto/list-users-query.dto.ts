import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
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
export class ListUsersQueryDto extends BasePaginationParamsDto {
  /** Part of a username or an email to look for, in any case */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  term?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsOrderByField(USER_ORDER_FIELDS, undefined, { each: true })
  orderBy: string[] = ['createdAt:desc'];
}

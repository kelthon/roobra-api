import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { IsOrderByField } from '../decorators/is-order-by-field.decorator.js';

export class PaginationParamsDto {
  @IsOptional()
  @IsString()
  term?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @IsPositive()
  limit?: number = 10;

  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsOrderByField(['name', 'phoneNumber', 'createdAt'], undefined, {
    each: true,
  })
  orderBy?: string[] = ['createdAt:desc'];
}

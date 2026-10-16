import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max } from 'class-validator';

/**
 * The page and its size, for a list paged by page. A list route extends it
 * with its own `orderBy` and filters. The defaults live here only: the
 * service reads the query as it is.
 */
export class BasePaginationParamsDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @IsPositive()
  page: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @IsInt()
  @IsPositive()
  @Max(100)
  limit: number = 10;
}

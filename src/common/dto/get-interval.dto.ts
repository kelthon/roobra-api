import { IsDateString, IsOptional } from 'class-validator';

export class GetIntervalDto {
  @IsDateString()
  @IsOptional()
  from!: string;

  @IsDateString()
  @IsOptional()
  to!: string;
}

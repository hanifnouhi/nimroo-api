import { IsOptional, IsNumber, IsObject, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FilterQuery } from 'mongoose';

export class QueryOptionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsObject()
  sort?: Record<string, 1 | -1>;

  @IsOptional()
  @IsObject()
  projection?: string;
}

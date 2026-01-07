import { IsString, IsOptional } from 'class-validator';
import { BaseErrorDto } from '../../common/dtos/base-error.dto';

/**
 * DTO for translation error
 */
export class UserErrorDto extends BaseErrorDto {
  @IsString()
  @IsOptional()
  externalServiceError?: string;

  constructor(message: string, code: number, externalServiceError?: string) {
    super(message, code);
    this.externalServiceError = externalServiceError;
  }
}

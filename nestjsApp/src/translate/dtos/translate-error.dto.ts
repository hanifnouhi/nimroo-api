import { IsString, IsOptional } from "class-validator";
import { BaseErrorDto } from "../../common/dtos/base-error.dto";

/**
 * DTO for translation error
 */
export class TranslateErrorDto extends BaseErrorDto {
    @IsString()
    @IsOptional()
    correctedText?: string;

    @IsString()
    @IsOptional()
    externalServiceError?: string;

    constructor(message: string, code: number, externalServiceError?: string, correctedText?: string){
        super(message, code);
        this.externalServiceError = externalServiceError;
        this.correctedText = correctedText;
    }
}
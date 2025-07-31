import { IsString, IsNumber, IsDate } from 'class-validator';

/**
 * DTO for base structure of errors
 */
export class BaseErrorDto {
    @IsString()
    message: string;

    @IsNumber()
    code: number;

    @IsDate()
    timestamp: Date;

    constructor(message: string, code: number, timestamp: Date = new Date()) {
        this.message = message;
        this.code = code;
        this.timestamp = timestamp;
    }
}
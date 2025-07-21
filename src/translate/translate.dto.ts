import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class TranslateTextDto {
    @IsString()
    @IsNotEmpty()
    text: string;

    @IsOptional()
    @Transform(({ value }) => value ?? 'en')
    @IsString()
    targetLang: string;
}
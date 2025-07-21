import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

export class TranslateTextDto {
    @IsString()
    @IsNotEmpty()
    text: string;

    @IsString()
    @Transform(({ value }) => value ?? 'en')
    targetLang: string;
}
import { IsNotEmpty, IsString, isNotEmpty } from "class-validator";

export class TranslateTextDto {
    @IsString()
    @IsNotEmpty()
    text: string;

    @IsString()
    targetLang?: string;
}
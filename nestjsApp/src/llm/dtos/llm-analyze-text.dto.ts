import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class LlmAnalyzeTextDto {
    @ApiProperty({
        description: 'A text to analyze with llm service to find if it is meaningful and visualizable',
        example: 'hello'
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(50)
    text: string
}
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GenerateImageDto {
    @ApiProperty({
        description: 'Text for generate image',
        example: 'Apple'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    @MinLength(2)
    text: string;
}
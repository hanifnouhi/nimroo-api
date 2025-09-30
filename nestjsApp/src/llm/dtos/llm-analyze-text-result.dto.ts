import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class LlmAnalyzeTextResultDto {
    @ApiProperty({
        description: 'Is the text meaningful for requesting image?',
        example: 'nimroo'
    })
    @IsBoolean()
    meaningful: boolean;

    @ApiProperty({
        description: 'Is the text is visualizable?',
        example: 'nimroo'
    })
    @IsBoolean()
    visualizable: boolean;
}
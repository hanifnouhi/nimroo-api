import { Controller, Post, Body } from '@nestjs/common';
import { TranslateService } from './translate.service';
import { TranslateTextDto } from './translate.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('translate')
@Controller('translate')
export class TranslateController {
    constructor(private readonly translateService: TranslateService) {

    }

    /**
     * Translate a given text into the specified target language
     * @param body DTO containing {string} text and {string} targetLang 
     * @returns {Promise<{ translation: string }} A promise that resolves to the translated text
     */
    @Post()
    @ApiOperation({ summary: 'Translate text to target language' })
    @ApiResponse({ status: 201, description: 'Translation successful' })
    @ApiBody({ type: TranslateTextDto })
    async translate(@Body() body: TranslateTextDto) {
        const { text, targetLang } = body;
        const translation = await this.translateService.translate(text, targetLang);
        return { translation };
    }
}

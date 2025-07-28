import { Controller, Post, Body } from '@nestjs/common';
import { TranslateService } from './translate.service';
import { TranslateTextDto } from './translate.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { InjectPinoLogger, Logger, PinoLogger } from 'nestjs-pino';

@ApiTags('translate')
@Controller('translate')
export class TranslateController {
    constructor(
        private readonly translateService: TranslateService,
        @InjectPinoLogger(TranslateController.name) private readonly logger: PinoLogger
    ) {}

    /**
     * Translate a given text into the specified target language
     * @param body DTO containing {string} text and {string} targetLang 
     * @returns {Promise<TranslationResult>} A promise that resolves to the TranslationResult containing translated text and detected language and spell corrected text.
     */
    @Post()
    @ApiOperation({ summary: 'Translate text to target language' })
    @ApiResponse({ status: 200, description: 'Translation successful' })
    @ApiBody({ type: TranslateTextDto })
    async translate(@Body() body: TranslateTextDto) {
        this.logger.debug(`Received POST request to /translate with data: ${JSON.stringify(body)}`);
        const { text, targetLang } = body;
        const translation = await this.translateService.translate(text, targetLang);
        this.logger.info(`Translation successfully done: ${translation}`);
        return translation;
    }
}

import { Controller, Post, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { TranslateService } from './translate.service';
import { TranslateTextDto } from './dtos/translate.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TranslationResult } from './providers/translation-result.interface';
import { CheckLimit } from '../common/decorators/check-limit.decorator';
import { MembershipFeature, UserRole } from '../user/user.enums';
import { UsageInterceptor } from '../common/Interceptors/usage.interceptor';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('translate')
@Controller('translate')
export class TranslateController {
    constructor(
        private readonly translateService: TranslateService,
        @InjectPinoLogger(TranslateController.name) private readonly logger: PinoLogger
    ) {}

    /**
     * Translate a given text into the specified target language
     * @param translateTextDto Translate dto containing {string} text and {string} targetLang 
     * @returns {Promise<TranslationResult>} A promise that resolves to the TranslationResult containing translated text and detected language and spell corrected text.
     */
    @Post()
    @Roles(UserRole.User, UserRole.Admin)
    @CheckLimit(MembershipFeature.TRANSLATION)
    @UseInterceptors(UsageInterceptor)
    @ApiOperation({ summary: 'Translate text to target language' })
    @ApiResponse({ status: 201, description: 'Translation successful' })
    @ApiBody({ type: TranslateTextDto })
    async translate(@Body() translateTextDto: TranslateTextDto): Promise<TranslationResult> {
        this.logger.debug(`Received POST request to /translate with data: ${JSON.stringify(translateTextDto)}`);
        const { text, targetLang, fromLang, spellCheck } = translateTextDto;
        const translation = await this.translateService.translate(text, targetLang, fromLang, spellCheck);
        return translation;
    }
}

import { Controller, Post, Body } from '@nestjs/common';
import { TranslateService } from './translate.service';
import { TranslateTextDto } from './translate.dto';

@Controller('translate')
export class TranslateController {
    constructor(private readonly translateService: TranslateService) {

    }

    @Post()
    async translate(@Body() body: TranslateTextDto) {
        const { text, targetLang } = body;
        const translation = await this.translateService.translate(text, targetLang);
        return { translation };
    }
}

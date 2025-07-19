import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Cache } from 'cache-manager';

@Injectable()
export class TranslateService {
    constructor(private configService: ConfigService, @Inject('CACHE_MANAGER') private cacheManager: Cache) {}

    async translate(text: string, lang: string = 'en') {
        const normalizedText = text.trim().toLowerCase();
        const targetLang = lang.trim().toLowerCase();
        const cacheKey = `translate:${normalizedText}:${targetLang}`;
        const cached = await this.cacheManager.get<string>(cacheKey);

        if (cached) {
          return cached;
        }

        const endpoint = this.configService.get<string>('AZURE_TRANSLATE_URL') + `&to=${targetLang}`;
        const subscriptionKey = this.configService.get<string>('AZURE_TRANSLATE_KEY1');
        const region = this.configService.get<string>('AZURE_TRANSLATE_REGION');

        try {
          const response = await axios.post(endpoint!, [{ Text: normalizedText }], {
            headers: {
              'Ocp-Apim-Subscription-Key': subscriptionKey,
              'Ocp-Apim-Subscription-Region': region,
              'Content-type': 'application/json',
            },
          });
          const translated = response.data[0]?.translations[0]?.text;
          if (translated) {
            await this.cacheManager.set(cacheKey, translated);
          }            
          return translated ?? 'No translation found';
        } catch (error) {
          console.error('Azure Translate API error:', error.message);
          return 'Translation failed';
        }
    }
}

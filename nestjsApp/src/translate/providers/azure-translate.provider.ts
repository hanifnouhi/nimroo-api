// src/translate/providers/azure-translate.provider.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TranslationProvider } from './translate.interface';
import { TranslationResult } from './translation-result.interface';

@Injectable()
export class AzureTranslateProvider implements TranslationProvider {
  constructor(private configService: ConfigService) {}

  async translate(
    text: string,
    targetLang: string,
  ): Promise<TranslationResult> {
    const endpoint =
      this.configService.get<string>('AZURE_TRANSLATE_URL') +
      `&to=${targetLang}`;
    const subscriptionKey = this.configService.get<string>(
      'AZURE_TRANSLATE_KEY1',
    );
    const region = this.configService.get<string>('AZURE_TRANSLATE_REGION');

    const normalizedText = text.trim().toLowerCase();

    try {
      const response = await axios.post(endpoint, [{ Text: normalizedText }], {
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Ocp-Apim-Subscription-Region': region,
          'Content-type': 'application/json',
        },
      });

      const translated = response.data[0]?.translations[0]?.text;
      const detectedLanguage = response.data[0]?.detectedLanguage?.language;
      return {
        translated: translated ?? 'No translation found',
        detectedLanguage,
      };
    } catch (error) {
      console.error('Azure Translate API error:', error.message);
      return {
        translated: 'Translation failed',
        detectedLanguage: 'en',
      };
    }
  }
}

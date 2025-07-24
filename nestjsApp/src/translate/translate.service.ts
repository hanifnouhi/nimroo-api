import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { TranslationProvider } from './providers/translate.interface';
import { TranslationResult } from './providers/translation-result.interface';

/**
 * Service responsible for text translation.
 * Utilizes a pluggable TranslationProvider and caches results.
 */
@Injectable()
export class TranslateService {
    constructor(
      @Inject('CACHE_MANAGER') private cacheManager: Cache,
      @Inject('TranslationProvider') private provider: TranslationProvider
    ) {}

    /**
     * Translates a given text into the specified target language.
     * Returns a cached result if available to avoid redundant API calls.
     * 
     * @param {string} text - The input text to be translated
     * @param {string} lang - The target language code (default is 'en') 
     * @returns {Promise<TranslationResult>} A promise resolving to the object containing Translated text and Detected language
     */
    async translate(text: string, lang: string = 'en'): Promise<TranslationResult> {
        //Normalize text to ensure consistent cache key generation
        const normalizedText = text.trim().toLowerCase();
        const targetLang = lang.trim().toLowerCase();
        const cacheKey = `translate:${normalizedText}:${targetLang}`;
        const cached: TranslationResult | undefined = await this.cacheManager.get<TranslationResult>(cacheKey);

        // Return cached translation if available
        if (cached) {
          return cached;
        }

        try {
          // Call the pluggable translation provider
          const result = await this.provider.translate(normalizedText, targetLang);
          
          //Cache the result for future requests if translated
          if (result.translated) {
            await this.cacheManager.set(cacheKey, result);
          }            
          return result;
        } catch (error) {
          console.error('Azure Translate API error:', error.message);
          return {
            translated: 'Translation failed',
            detectedLanguage: 'en'
          };
        }
    }
}

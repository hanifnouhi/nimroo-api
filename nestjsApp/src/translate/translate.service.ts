import { Inject, Injectable} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { TranslationProvider } from './providers/translate.interface';
import { TranslationResult } from './providers/translation-result.interface';
import { SpellCheckService } from '../spell-check/spell-check.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

/**
 * Service responsible for text translation.
 * Utilizes a pluggable TranslationProvider and caches results.
 */
@Injectable()
export class TranslateService {
    constructor(
      @Inject('CACHE_MANAGER') private cacheManager: Cache,
      @Inject('TranslationProvider') private provider: TranslationProvider,
      private readonly spellCheckService: SpellCheckService,
      @InjectPinoLogger(TranslateService.name) private readonly logger: PinoLogger
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
        this.logger.debug(`Attempting to translate ${text} to the ${lang} language`);
        //Normalize text to ensure consistent cache key generation
        const normalizedText = text.trim().toLowerCase();
        const targetLang = lang.trim().toLowerCase();
        const cacheKey = `translate:${normalizedText}:${targetLang}`;
        const cached: TranslationResult | undefined = await this.cacheManager.get<TranslationResult>(cacheKey);

        // Return cached translation if available
        if (cached) {
          this.logger.debug(`Found result in the cache for key: ${cacheKey}. Translate: "${cached.translated}", Detected Lang: "${cached.detectedLanguage}", Corrected text: "${cached.correctedText}"`);
          return cached;
        }

        try {
          // Call the pluggable translation provider
          this.logger.debug(`Attempting to send translate request to translate provider with text: ${normalizedText}, targetLang ${targetLang}`);
          const result = await this.provider.translate(normalizedText, targetLang);
          
          //Cache the result for future requests if translated
          if (result.translated) {
            this.logger.info(`${normalizedText} translated successfully to ${result.translated}`);
            try {
              this.logger.debug(`Attempting to check the text spell after successfull translate: ${normalizedText}, targetLang ${targetLang}`);
              let correctedText = await this.spellCheckService.correct(normalizedText, result.detectedLanguage);
              correctedText = correctedText.trim().toLowerCase();
              if (correctedText && correctedText !== normalizedText) {
                result.correctedText = correctedText;
              }
              this.logger.info(`${normalizedText} spell checked successfully to ${correctedText}`);
            } catch (spellCheckError) {
              this.logger.error({ error: spellCheckError.message, stack: spellCheckError.stack }, 'Spell check API error after successful translate.');
            }
            
            this.logger.debug(`Attempting to save the result in cache with: cacheKey ${cacheKey}, cacheValue ${result}`);
            await this.cacheManager.set(cacheKey, result);
          }            
          return result;
        } catch (error) {
          this.logger.error({ error: error.message, stack: error.stack }, 'Azure Translate API error during translation.');
          return {
            translated: 'Translation failed',
            detectedLanguage: 'en'
          };
        }
    }
}

import { Inject, Injectable, InternalServerErrorException} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { TranslationProvider } from './providers/translate.interface';
import { TranslationResult } from './providers/translation-result.interface';
import { SpellCheckService } from '../spell-check/spell-check.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TranslateErrorDto } from './dtos/translate-error.dto';
import { SUPPORTED_SPELLCHECK_LANGUAGES } from '../common/constants/translate.constants';

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
    async translate(text: string, lang: string = 'en', fromLang: string = 'en'): Promise<TranslationResult> {
        this.logger.debug(`Attempting to translate ${text} to the ${lang} language`);
        //Normalize text to ensure consistent cache key generation
        const normalizedText = text.trim().toLowerCase();
        const targetLang = lang.trim().toLowerCase();
        fromLang = fromLang.trim().toLowerCase();
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
            
            result.correctedText = await this.spellCheck(normalizedText, fromLang || result.detectedLanguage?.trim().toLowerCase() || 'en');

            this.logger.debug(`Attempting to save the result in cache with: cacheKey ${cacheKey}, cacheValue ${result}`);
            await this.cacheManager.set(cacheKey, result);
          }            
          return result;
        } catch (error) {
          this.logger.error({ error: error.message, stack: error.stack }, 'Azure Translate API error during translation.');

          const correctedText = await this.spellCheck(normalizedText, fromLang);

          const translateError = new TranslateErrorDto(
            'Failed to tranlate text. Please try again later.',
            500,
            error.message,
            correctedText
          )
          throw new InternalServerErrorException(translateError);
        }
    }

    /**
     * Check spell of a given text in the specified target language.
     * 
     * @param {string} text - The input text to be checked
     * @param {string} fromLang - The target language code (default is 'en') 
     * @returns {Promise<string>} A promise resolving to the corrected text
     */
    private async spellCheck(text: string, fromLang: string): Promise<string> {
      let result = '';
      //Check spell just if the language is supported
      if (SUPPORTED_SPELLCHECK_LANGUAGES.has(fromLang)) {
        try {
          this.logger.debug(`Attempting to check the text spell after successfull translate: ${text}, fromLang ${fromLang}`);
          let correctedText = await this.spellCheckService.correct(text, fromLang);
          correctedText = correctedText.trim().toLowerCase();
          if (correctedText && correctedText !== text) {
            result = correctedText;
          }
          this.logger.info(`${text} spell checked successfully to ${correctedText}`);
        } catch (spellCheckError) {
          this.logger.error({ error: spellCheckError.message, stack: spellCheckError.stack }, 'Spell check API error after successful translate.');
        }
      }
      return result;
    }
}

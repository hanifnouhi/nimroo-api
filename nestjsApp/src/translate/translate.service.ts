import { Inject, Injectable, InternalServerErrorException} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { TranslationProvider } from './providers/translate.interface';
import { TranslationResult } from './providers/translation-result.interface';
import { SpellCheckService } from '../spell-check/spell-check.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TranslateErrorDto } from './dtos/translate-error.dto';
import { SUPPORTED_SPELLCHECK_LANGUAGES } from '../common/constants/translate.constants';
import { CacheService } from '../cache/cache.service';

/**
 * Service responsible for text translation.
 * Utilizes a pluggable TranslationProvider and caches results.
 */
@Injectable()
export class TranslateService {
    constructor(
      @Inject('TranslationProvider') private provider: TranslationProvider,
      private readonly spellCheckService: SpellCheckService,
      @InjectPinoLogger(TranslateService.name) private readonly logger: PinoLogger,
      private readonly cacheService: CacheService
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
        const sourceLang = fromLang.trim().toLowerCase();
        const cacheKey = `translate:${normalizedText}:${targetLang}`;

        try {
          const result = await this.cacheService.getOrSetCachedValue<TranslationResult>(
            cacheKey,
            async () => {
              this.logger.debug(`Cache miss for key: ${cacheKey}. Fetching actual translation from provider...`);
              const translationProvider = await this.provider.translate(normalizedText, targetLang);
              // Cache the result for future requests if translated
              if (translationProvider.translated) {
                this.logger.info(`${normalizedText} translated successfully to ${translationProvider.translated}`);

                const languageForSpellCheck = sourceLang || translationProvider.detectedLanguage?.trim().toLowerCase() || 'en';
                
                // Check spell just if the language is supported
                if (SUPPORTED_SPELLCHECK_LANGUAGES.has(languageForSpellCheck)) {
                  try {
                      this.logger.debug(`Attempting to check the text spell after successful translate: ${normalizedText}, fromLang ${languageForSpellCheck}`);
                      let correctedText = await this.spellCheckService.correct(normalizedText, languageForSpellCheck);
                      correctedText = correctedText.trim().toLowerCase();
                      
                      // Add text if just was translated and was different from original
                      if (correctedText && correctedText !== normalizedText) {
                        translationProvider.correctedText = correctedText;
                        this.logger.info(`${normalizedText} spell checked successfully to ${correctedText}`);
                      }
                  } catch (spellCheckError) {
                      this.logger.error({ error: spellCheckError.message, stack: spellCheckError.stack }, 'Spell check API error after successful translate within factory.');
                  }
                }
              }
              this.logger.debug(`Prepared result for caching: ${JSON.stringify(translationProvider)}`);
              return translationProvider;
            }
          );
          this.logger.debug(`Translation result for ${text} obtained (from cache or new).`);
          return result;
        } catch (error) {
          // Management of errors outside of getOrSetCachedValue
          this.logger.error({ error: error.message, stack: error.stack }, 'Failed to translate text. Please try again later.');

          // Do spell check event though the error occured during translation
          const correctedTextOnError = await this.spellCheckService.correct(normalizedText, sourceLang);

          const translateError = new TranslateErrorDto(
            'Failed to translate text. Please try again later.',
            500,
            error.message,
            correctedTextOnError
          );
          throw new InternalServerErrorException(translateError);
        }
    }
}

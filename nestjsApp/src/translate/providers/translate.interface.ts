import { TranslationResult } from "./translation-result.interface";

/**
 * Interface for pluggable translation providers.
 * Implementations should define the `translate` method.
 */
export interface TranslationProvider {
    /**
     * Translate a given text to the specified target language.
     *
     * @param {string} text - Text to translate
     * @param {string} targetLang - Language code for the translation target (e.g., 'en', 'fr')
     * @returns {Promise<TranslationResult>}A promise resolving to a TranslationResult containing Translated text and Detected language
     */
    translate(text: string, targetLang: string): Promise<TranslationResult>;
}
  
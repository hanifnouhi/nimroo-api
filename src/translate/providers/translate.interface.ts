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
     * @returns {Promise<string>}A promise resolving to the translated text
     */
    translate(text: string, targetLang: string): Promise<string>;
}
  
// translation-result.interface.ts
export interface TranslationResult {
    translated: string;
    detectedLanguage?: string | undefined; // optional
    correctedText?: string | undefined;
}
  
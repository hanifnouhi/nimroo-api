import { Inject, Injectable } from '@nestjs/common';
import { LlmAnalyzeTextDto } from './dtos/llm-analyze-text.dto';
import { LlmAnalyzeProvider } from './providers/llm-analyze.interface';
import { LlmAnalyzeResult } from './providers/llm-analyze-result.interface';
import { CacheService } from '../cache/cache.service';
import { LlmTextDataResultDto } from './dtos/llm-text-data-result.dto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class LlmService {
  constructor(
    @Inject('LlmAnalyzeProvider') private readonly provider: LlmAnalyzeProvider,
    private readonly cacheService: CacheService,
    @InjectPinoLogger(LlmService.name) private readonly logger: PinoLogger,
  ) {}

  /**
   * Analyze text to find if it's meaningful and visualizable
   *
   * @param {LlmAnalyzeTextDto} text - A text as input
   * @returns {Promise<LlmAnalyzeResult>} A promise resolving to llm analyze result containing two boolean value, meaningful and visualizable
   */
  async analyzeText(
    text: LlmAnalyzeTextDto,
  ): Promise<LlmAnalyzeResult | undefined> {
    // Cache key for analyze text
    const cacheKey = `llm:analyze:${text.text}:v1`;

    this.logger.debug(`Attempt to anaylze text: ${text.text}`);
    return await this.cacheService.getOrSetCachedValue<
      LlmAnalyzeResult | undefined
    >(cacheKey, async () => {
      // If cache not found, send request to provider
      return await this.provider.analyze(text);
    });
  }

  /**
   * Get detailed data for the text
   *
   * @param {string} text - A text as input
   * @param {string} sourceLang - User source language
   * @param {string } targetLang - User target language
   * @returns {Promise<LlmTextDataResultDto>} A promise resolving to llm text data result dto that contains meaning, examples, synonyms and antonyms
   */
  async textData(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<LlmTextDataResultDto> {
    // Cache key for test data
    const cacheKey = `llm:data:${text}:${sourceLang}:${targetLang}:v1`;

    this.logger.debug(
      `Attempt to get text data for: ${text} in language: ${targetLang}`,
    );
    return await this.cacheService.getOrSetCachedValue<LlmTextDataResultDto>(
      cacheKey,
      async () => {
        // If cache not found, send request to provider
        return await this.provider.textData(text, sourceLang, targetLang);
      },
    );
  }
}

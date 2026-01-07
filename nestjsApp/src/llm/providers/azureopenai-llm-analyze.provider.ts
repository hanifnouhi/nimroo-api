import { Injectable } from '@nestjs/common';
import { LlmAnalyzeProvider } from './llm-analyze.interface';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import { LlmAnalyzeTextDto } from '../dtos/llm-analyze-text.dto';
import { LlmAnalyzeResult } from './llm-analyze-result.interface';
import { LlmTextDataResultDto } from '../dtos/llm-text-data-result.dto';

@Injectable()
export class AzureOpenAiLlmProvider implements LlmAnalyzeProvider {
  private client: AzureOpenAI;
  private systemPrompt: string;
  private modelName = 'gpt-35-turbo';

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.getOrThrow<string>(
      'AZURE_OPEN_AI_ANALYZE_URL',
    );
    const apiKey = this.configService.getOrThrow<string>(
      'AZURE_OPEN_AI_ANALYZE_KEY1',
    );
    const apiVersion = this.configService.getOrThrow<string>(
      'AZURE_OPEN_AI_ANALYZE_API_VERSION',
    );
    const deployment = this.configService.getOrThrow<string>(
      'AZURE_OPEN_AI_ANALYZE_DEPLOYMENT',
    );
    const options = { endpoint, apiKey, deployment, apiVersion };

    this.client = new AzureOpenAI(options);
  }

  /**
   * Send request to azure open ai service to find if the text in meaningful and visualizable
   *
   * @param {LlmAnalyzeTextDto} text - The input text
   * @returns {Promise<LlmAnalyzeResult | undefined>} A promise resolving to llm analyze result contains two boolean value: meaningful and visualizable
   */
  async analyze(
    text: LlmAnalyzeTextDto,
  ): Promise<LlmAnalyzeResult | undefined> {
    // System prompt to send to azure open ai service
    this.systemPrompt = `You are an AI that analyzes a short text.
                            Return JSON with two booleans only:
                            {"meaningful": true|false, "visualizable": true|false}`;
    try {
      const response = await this.client.chat.completions.create({
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: text.text },
        ],
        model: this.modelName,
      });

      const raw = response.choices[0].message?.content?.trim() || undefined;

      if (raw) {
        // If response exist return response
        return JSON.parse(raw);
      } else {
        // If response does not exist return undefined
        return undefined;
      }
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${text.text}`);
    }
  }

  /**
   * Send request to azure open ai service to get more detailed data about text. Like meaning, examples, synonyms, antonyms.
   *
   * @param {string} text - An input text
   * @param {string} sourceLang - User source language
   * @param {string} targetLang - User target language
   * @returns
   */
  async textData(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<LlmTextDataResultDto> {
    // System prompt to send to azure open ai service
    this.systemPrompt = `
                            You are a dictionary API.
                            Return ONLY valid JSON in this exact structure:
                            {
                            "meaning": "",
                            "examples": [],
                            "synonyms": [],
                            "antonyms": []
                            }
                            Rules:
                            - If not applicable, use empty string or empty array
                            - meaning: max 2 short sentences
                            - examples: common usage, max 10 words each, max 4 items
                            - synonyms: max 4 items, SAME language as the word, true synonyms only
                            - antonyms: max 4 items, SAME language as the word, true opposites only
                            - do not include translations of the word
                            - do not use broader, narrower, or related terms
                            - if no true synonyms or antonyms exist, return empty arrays
                            - do not invent data
                            - no explanations
                            - no extra fields
                            - no markdown
                            `.trim();

    try {
      const response = await this.client.chat.completions.create({
        messages: [
          { role: 'system', content: this.systemPrompt },
          {
            role: 'user',
            content: `Word: "${text}" Language: "${targetLang}"`,
          },
        ],
        model: this.modelName,
        temperature: 0.1,
      });

      const raw = response.choices[0].message?.content?.trim() || undefined;

      if (raw) {
        // Return response if the response exist
        return JSON.parse(raw);
      } else {
        // Throw error if the response does not exist
        throw new Error();
      }
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${text}`);
    }
  }
}

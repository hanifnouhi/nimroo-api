import { Injectable } from "@nestjs/common";
import { LlmAnalyzeProvider } from "./llm-analyze.interface";
import { ConfigService } from "@nestjs/config";
import { AzureOpenAI } from "openai";
import { LlmAnalyzeTextDto } from "../dtos/llm-analyze-text.dto";
import { LlmAnalyzeResult } from "./llm-analyze-result.interface";

@Injectable()
export class AzureOpenAiLlmProvider implements LlmAnalyzeProvider{

    private client: AzureOpenAI;
    private systemPrompt: string;
    private modelName = "gpt-35-turbo";

    constructor (
        private readonly configService: ConfigService
    ){
        const endpoint = this.configService.getOrThrow<string>('AZURE_OPEN_AI_ANALYZE_URL');
        const apiKey = this.configService.getOrThrow<string>('AZURE_OPEN_AI_ANALYZE_KEY1');
        const apiVersion = this.configService.getOrThrow<string>('AZURE_OPEN_AI_ANALYZE_API_VERSION');
        const deployment = this.configService.getOrThrow<string>('AZURE_OPEN_AI_ANALYZE_DEPLOYMENT');
        const options = { endpoint, apiKey, deployment, apiVersion };

        this.client = new AzureOpenAI(options);

        this.systemPrompt = `You are an AI that analyzes a short text.
                            Return JSON with two booleans only:
                            {"meaningful": true|false, "visualizable": true|false}`;
    }

    async analyze(text: LlmAnalyzeTextDto): Promise<LlmAnalyzeResult | undefined> {
        try {
            const response = await this.client.chat.completions.create({
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'user', content: text.text}
                ],
                model: this.modelName
            });

            const raw = response.choices[0].message?.content?.trim() || undefined;

            if (raw) {
                return JSON.parse(raw);
            } else {
                return undefined;
            }
        } catch (error) {
            throw new Error(`Failed to parse LLM response: ${text.text}`);
        }

    }
}
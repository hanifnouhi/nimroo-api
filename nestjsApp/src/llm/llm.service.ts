import { Inject, Injectable } from '@nestjs/common';
import { LlmAnalyzeTextDto } from './dtos/llm-analyze-text.dto';
import { LlmAnalyzeProvider } from './providers/llm-analyze.interface';
import { LlmAnalyzeResult } from './providers/llm-analyze-result.interface';

@Injectable()
export class LlmService {
    constructor(
        @Inject('LlmAnalyzeProvider') private readonly provider: LlmAnalyzeProvider
    ){}

    async analyzeText(text: LlmAnalyzeTextDto): Promise<LlmAnalyzeResult | undefined> {
        return await this.provider.analyze(text);
    }
}

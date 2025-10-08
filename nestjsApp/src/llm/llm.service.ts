import { Inject, Injectable } from '@nestjs/common';
import { LlmAnalyzeTextDto } from './dtos/llm-analyze-text.dto';
import { LlmAnalyzeProvider } from './providers/llm-analyze.interface';
import { LlmAnalyzeResult } from './providers/llm-analyze-result.interface';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class LlmService {
    constructor(
        @Inject('LlmAnalyzeProvider') private readonly provider: LlmAnalyzeProvider,
        private readonly cacheService: CacheService
    ){}

    async analyzeText(text: LlmAnalyzeTextDto): Promise<LlmAnalyzeResult | undefined> {
        const cacheKey = `llm:${text.text}`;
        
        return await this.cacheService.getOrSetCachedValue<LlmAnalyzeResult | undefined>(
            cacheKey,
            async () => {
                return await this.provider.analyze(text);
            }
        );
    }
}

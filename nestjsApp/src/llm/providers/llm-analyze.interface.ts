import { LlmAnalyzeTextDto } from "../dtos/llm-analyze-text.dto";
import { LlmTextDataResultDto } from "../dtos/llm-text-data-result.dto";
import { LlmAnalyzeResult } from "./llm-analyze-result.interface";

export interface LlmAnalyzeProvider {
    analyze(text: LlmAnalyzeTextDto): Promise<LlmAnalyzeResult | undefined>;

    textData(text: string, sourceLang: string, targetLang: string): Promise<LlmTextDataResultDto>;
}
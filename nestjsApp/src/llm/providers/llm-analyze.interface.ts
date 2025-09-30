import { LlmAnalyzeTextDto } from "../dtos/llm-analyze-text.dto";
import { LlmAnalyzeResult } from "./llm-analyze-result.interface";

export interface LlmAnalyzeProvider {
    analyze(text: LlmAnalyzeTextDto): Promise<LlmAnalyzeResult | undefined>
}
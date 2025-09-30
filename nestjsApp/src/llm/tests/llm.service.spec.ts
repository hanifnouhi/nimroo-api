import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from '../llm.service';
import { LlmAnalyzeTextResultDto } from '../dtos/llm-analyze-text-result.dto';
import { LlmAnalyzeTextDto } from '../dtos/llm-analyze-text.dto';
import { LlmAnalyzeProvider } from '../providers/llm-analyze.interface';
import { LlmAnalyzeResult } from '../providers/llm-analyze-result.interface';

const mockLlmAnaylyzeProvider = {
  analyze: jest.fn()
}
const meaningfulText: LlmAnalyzeTextDto = { text: 'banana' };
const notMeaningfulText: LlmAnalyzeTextDto = { text: 'aergse2fg2' };
const llmAnalyzeProviderCorrectResult: LlmAnalyzeResult = { meaningful: true, visualizable: true };

describe('LlmService', () => {
  let service: LlmService;
  let llmAnalyzeProvider: jest.Mocked<LlmAnalyzeProvider>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: 'LlmAnalyzeProvider',
          useValue: mockLlmAnaylyzeProvider
        }
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
    llmAnalyzeProvider = module.get('LlmAnalyzeProvider');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return an object containing meaningful and visualizable properties for provided text', async () => {
    llmAnalyzeProvider.analyze.mockResolvedValue(llmAnalyzeProviderCorrectResult);
    const result = await service.analyzeText(meaningfulText);
    expect(result).toMatchObject({ meaningful: expect.any(Boolean), visualizable: expect.any(Boolean) });
    expect(result).toStrictEqual(expect.objectContaining({ meaningful: true, visualizable: true }));
  });

  it('should return undefined if undefined returned from llm provider', async () => {
    llmAnalyzeProvider.analyze.mockResolvedValue(undefined);
    const result = await service.analyzeText(meaningfulText);
    expect(result).toBeUndefined();
    expect(mockLlmAnaylyzeProvider.analyze).toHaveBeenCalledWith(meaningfulText);
  });

  it('should throw error if llm provider encountered error', async () => {
    llmAnalyzeProvider.analyze.mockRejectedValue(new Error(`Failed to parse LLM response: ${meaningfulText.text}`));
    await expect(service.analyzeText(meaningfulText)).rejects.toThrow(`Failed to parse LLM response: ${meaningfulText.text}`);
  });

  it('should return an object containing with false values for meaningful and visualizable properties for not meaningful text', async () => {
    llmAnalyzeProvider.analyze.mockResolvedValue({ meaningful: false, visualizable: false });
    const result = await service.analyzeText(notMeaningfulText);
    expect(result).toMatchObject({ meaningful: expect.any(Boolean), visualizable: expect.any(Boolean) });
    expect(result).toStrictEqual(expect.objectContaining({ meaningful: false, visualizable: false }));
  });
});

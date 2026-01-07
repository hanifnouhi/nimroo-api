import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from '../llm.service';
import { LlmAnalyzeTextResultDto } from '../dtos/llm-analyze-text-result.dto';
import { LlmAnalyzeTextDto } from '../dtos/llm-analyze-text.dto';
import { LlmAnalyzeProvider } from '../providers/llm-analyze.interface';
import { LlmAnalyzeResult } from '../providers/llm-analyze-result.interface';
import { CacheService } from '../../cache/cache.service';
import { mocks, globalUseMocker } from '../../../test/mocks/use-mocker';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';
import { LlmTextDataResultDto } from '../dtos/llm-text-data-result.dto';

const mockLlmAnaylyzeProvider = {
  analyze: jest.fn(),
  textData: jest.fn(),
};
const meaningfulText: LlmAnalyzeTextDto = { text: 'banana' };
const notMeaningfulText: LlmAnalyzeTextDto = { text: 'aergse2fg2' };
const llmAnalyzeProviderCorrectResult: LlmAnalyzeResult = {
  meaningful: true,
  visualizable: true,
};
const text = 'apple';
const targetLang = 'fr';
const sourceLang = 'en';
const llmTextDataCorrectResult: LlmTextDataResultDto = {
  meaning:
    'Fruit comestible, souvent rouge ou verte. Arbre qui produit ce fruit.',
  examples: [
    'Je mange une pomme.',
    'La pomme est rouge.',
    "J'aime le jus de pomme.",
    'Elle cueille une pomme.',
  ],
  synonyms: [],
  antonyms: [],
};

describe('LlmService', () => {
  let service: LlmService;
  let llmAnalyzeProvider: jest.Mocked<LlmAnalyzeProvider>;
  let cacheService: jest.Mocked<CacheService>;
  const silentPinoLogger = pino({ enabled: false });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: silentPinoLogger,
          },
        }),
      ],
      providers: [
        LlmService,
        {
          provide: 'LlmAnalyzeProvider',
          useValue: mockLlmAnaylyzeProvider,
        },
      ],
    })
      .useMocker(globalUseMocker)
      .compile();

    service = module.get<LlmService>(LlmService);
    llmAnalyzeProvider = module.get('LlmAnalyzeProvider');
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Analyze text', () => {
    it('should return an object containing meaningful and visualizable properties for provided text', async () => {
      llmAnalyzeProvider.analyze.mockResolvedValue(
        llmAnalyzeProviderCorrectResult,
      );
      const result = await service.analyzeText(meaningfulText);
      expect(result).toMatchObject({
        meaningful: expect.any(Boolean),
        visualizable: expect.any(Boolean),
      });
      expect(result).toStrictEqual(
        expect.objectContaining({ meaningful: true, visualizable: true }),
      );
    });

    it('should return undefined if undefined returned from llm provider', async () => {
      llmAnalyzeProvider.analyze.mockResolvedValue(undefined);
      const result = await service.analyzeText(meaningfulText);
      expect(result).toBeUndefined();
      expect(mockLlmAnaylyzeProvider.analyze).toHaveBeenCalledWith(
        meaningfulText,
      );
    });

    it('should throw error if llm provider encountered error', async () => {
      llmAnalyzeProvider.analyze.mockRejectedValue(
        new Error(`Failed to parse LLM response: ${meaningfulText.text}`),
      );
      await expect(service.analyzeText(meaningfulText)).rejects.toThrow(
        `Failed to parse LLM response: ${meaningfulText.text}`,
      );
    });

    it('should return an object containing with false values for meaningful and visualizable properties for not meaningful text', async () => {
      llmAnalyzeProvider.analyze.mockResolvedValue({
        meaningful: false,
        visualizable: false,
      });
      const result = await service.analyzeText(notMeaningfulText);
      expect(result).toMatchObject({
        meaningful: expect.any(Boolean),
        visualizable: expect.any(Boolean),
      });
      expect(result).toStrictEqual(
        expect.objectContaining({ meaningful: false, visualizable: false }),
      );
    });

    it('should return result from cache if found the record in the cache', async () => {
      mocks.cacheService!.getOrSetCachedValue.mockResolvedValue(
        llmAnalyzeProviderCorrectResult,
      );

      const result = await service.analyzeText(meaningfulText);

      expect(result).toBe(llmAnalyzeProviderCorrectResult);
      expect(llmAnalyzeProvider.analyze).not.toHaveBeenCalled();
      expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledWith(
        expect.stringContaining(`llm:analyze:${meaningfulText.text}:v1`),
        expect.any(Function),
      );
    });

    it('should call provider and cache result if not found in cache', async () => {
      mocks.cacheService!.getOrSetCachedValue.mockImplementation(
        (key, factoryFn, ttl) => {
          return factoryFn();
        },
      );
      llmAnalyzeProvider.analyze.mockResolvedValue(
        llmAnalyzeProviderCorrectResult,
      );

      const result = await service.analyzeText(meaningfulText);

      expect(result).toBe(llmAnalyzeProviderCorrectResult);
      expect(llmAnalyzeProvider.analyze).toHaveBeenCalledWith(meaningfulText);
      expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledWith(
        expect.stringContaining(`llm:analyze:${meaningfulText.text}:v1`),
        expect.any(Function),
      );
    });
  });

  describe('Text data', () => {
    it('should return an object containing meaning, examples, sysnonyms, antonyms', async () => {
      llmAnalyzeProvider.textData.mockResolvedValue(llmTextDataCorrectResult);
      const result = await service.textData(text, sourceLang, targetLang);
      expect(result).toMatchObject(llmTextDataCorrectResult);
      expect(result).toStrictEqual(
        expect.objectContaining(llmTextDataCorrectResult),
      );
    });

    it('should throw error if undefined returned from llm provider', async () => {
      llmAnalyzeProvider.textData.mockRejectedValue(
        new Error(`Failed to parse LLM response: ${text}`),
      );
      await expect(
        service.textData(text, sourceLang, targetLang),
      ).rejects.toThrow(`Failed to parse LLM response: ${text}`);
      expect(mockLlmAnaylyzeProvider.textData).toHaveBeenCalledWith(
        text,
        sourceLang,
        targetLang,
      );
    });

    it('should return result from cache if found the record in the cache', async () => {
      mocks.cacheService!.getOrSetCachedValue.mockResolvedValue(
        llmTextDataCorrectResult,
      );

      const result = await service.textData(text, sourceLang, targetLang);

      expect(result).toBe(llmTextDataCorrectResult);
      expect(llmAnalyzeProvider.textData).not.toHaveBeenCalled();
      expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledWith(
        expect.stringContaining(
          `llm:data:${text}:${sourceLang}:${targetLang}:v1`,
        ),
        expect.any(Function),
      );
    });

    it('should call provider and cache result if not found in cache', async () => {
      mocks.cacheService!.getOrSetCachedValue.mockImplementation(
        (key, factoryFn, ttl) => {
          return factoryFn();
        },
      );
      llmAnalyzeProvider.textData.mockResolvedValue(llmTextDataCorrectResult);

      const result = await service.textData(text, sourceLang, targetLang);

      expect(result).toBe(llmTextDataCorrectResult);
      expect(llmAnalyzeProvider.textData).toHaveBeenCalledWith(
        text,
        sourceLang,
        targetLang,
      );
      expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledWith(
        expect.stringContaining(
          `llm:data:${text}:${sourceLang}:${targetLang}:v1`,
        ),
        expect.any(Function),
      );
    });
  });
});

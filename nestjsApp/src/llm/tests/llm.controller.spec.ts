import { Test, TestingModule } from '@nestjs/testing';
import { LlmController } from '../llm.controller';
import { LlmService } from '../llm.service';
import { LlmTextDataDto } from '../dtos/llm-text-data.dto';
import { UserService } from '../../user/user.service';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../../cache/cache.service';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';

describe('LlmController', () => {
  let controller: LlmController;
  let service: LlmService;
  const silentPinoLogger = pino({ enabled: false });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: silentPinoLogger,
          },
        }),
      ],
      controllers: [LlmController],
      providers: [
        {
          provide: LlmService,
          useValue: {
            analyzeText: jest.fn(),
            textData: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            getOrSetCachedValue: jest
              .fn()
              .mockImplementation((key, factoryFn) => factoryFn()),
            getCacheValue: jest.fn().mockResolvedValue(undefined),
            setCacheValue: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUsageCount: jest.fn().mockResolvedValue(0),
            incrementUsage: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'DISABLE_MEMBERSHIP_SYSTEM') return 'false';
              return null;
            }),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LlmController>(LlmController);
    service = module.get(LlmService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Text Data', () => {
    const textDto: LlmTextDataDto = {
      text: 'apple',
      targetLang: 'fr',
      sourceLang: 'en',
    };
    it('should call textData from llm service', async () => {
      await controller.textData(textDto);
      expect(service.textData).toHaveBeenCalledWith(
        textDto.text,
        textDto.sourceLang,
        textDto.targetLang,
      );
    });

    it('should return result of textData', async () => {
      const llmTextDataResultDto = {
        meaning: 'This is a fruit of apple tree',
        examples: [
          'I eat an apple each day',
          'I bought one kilo apple from market',
        ],
        synonyms: [],
        antonyms: [],
      };
      jest.spyOn(service, 'textData').mockResolvedValue(llmTextDataResultDto);

      const result = await controller.textData(textDto);
      expect(result).toEqual(expect.objectContaining(llmTextDataResultDto));
    });

    it('should return error if textData throws un error', async () => {
      jest
        .spyOn(service, 'textData')
        .mockRejectedValue(
          new Error('llm service to requesting text data failed'),
        );

      await expect(controller.textData(textDto)).rejects.toThrow(
        'llm service to requesting text data failed',
      );
    });
  });
});

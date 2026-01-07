import { Test, TestingModule } from '@nestjs/testing';
import { TranslateService } from '../translate.service';
import axios from 'axios';
import { globalUseMocker, mocks } from '../../../test/mocks/use-mocker';
import { SpellCheckService } from '../../spell-check/spell-check.service';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import { InternalServerErrorException } from '@nestjs/common';
import pino from 'pino';
import { TranslateErrorDto } from '../dtos/translate-error.dto';
import { TranslationProvider } from '../providers/translate.interface';

// mock axios for using in tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockTranslationProvider = {
  translate: jest.fn(),
};

describe('TranslateService', () => {
  let service: TranslateService;
  const slientPinoLogger = pino({ enabled: false });
  let spellCheckService: jest.Mocked<SpellCheckService>;
  let translationProvider: jest.Mocked<TranslationProvider>;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: slientPinoLogger,
          },
        }),
      ],
      providers: [
        TranslateService,
        {
          provide: SpellCheckService,
          useValue: {
            correct: jest.fn(),
          },
        },
        {
          provide: 'TranslationProvider',
          useValue: mockTranslationProvider,
        },
      ],
    })
      .useMocker(globalUseMocker)
      .compile();

    service = module.get<TranslateService>(TranslateService);
    spellCheckService = module.get(SpellCheckService);
    translationProvider = module.get('TranslationProvider');

    // clear axios and cache manager mock before each test to prevent unwanted errors
    mockedAxios.post.mockClear();
    if (mocks.cacheService) {
      mocks.cacheService.getOrSetCachedValue.mockClear();
    }

    jest.spyOn((service as any).logger, 'debug');
    jest.spyOn((service as any).logger, 'info');
    jest.spyOn((service as any).logger, 'warn');
    jest.spyOn((service as any).logger, 'error');
    jest.spyOn((service as any).logger, 'fatal');
    jest.spyOn((service as any).logger, 'setContext');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  test('should return from azure cognitive services', async () => {
    translationProvider!.translate.mockResolvedValueOnce({
      translated: 'hello',
      detectedLanguage: 'en',
    });

    const result = await service.translate('hello');

    expect(result).toEqual(
      expect.objectContaining({ translated: 'hello', detectedLanguage: 'en' }),
    );
    expect(translationProvider.translate).toHaveBeenCalledWith('hello', 'en');
  });

  test.each([
    ['world', 'world'],
    [' world', 'world'],
    [' world ', 'world'],
    ['World', 'world'],
    ['WORLD', 'world'],
  ])(
    'should return the same translation Irrespective of uppercase and lowercase letters and leading and trailing spaces',
    async (input, expected) => {
      translationProvider.translate.mockResolvedValueOnce({
        translated: expected,
        detectedLanguage: 'en',
      });

      await service.translate(input);

      expect(translationProvider.translate).toHaveBeenCalledWith('world', 'en');
    },
  );

  test.each([
    ['world', 'جهان', 'fa'],
    ['world', 'monde', 'fr'],
    ['world', 'World', 'en'],
  ])(
    'should return translation based on language param',
    async (input, expected, lang) => {
      translationProvider.translate.mockResolvedValueOnce({
        translated: expected,
        detectedLanguage: 'en',
      });

      const result = await service.translate(input, lang);

      expect(result).toEqual(
        expect.objectContaining({
          translated: expected,
          detectedLanguage: 'en',
        }),
      );
      expect(translationProvider.translate).toHaveBeenCalledWith(input, lang);
    },
  );

  test('should return from cache if exists', async () => {
    const cachedResult = {
      translated: 'hello',
      detectedLanguage: 'en',
      correctedText: 'bonjour',
    };
    mocks.cacheService!.getOrSetCachedValue.mockResolvedValue(cachedResult);
    translationProvider.translate.mockRejectedValueOnce('hello');

    const result = await service.translate('bonjour');

    expect(result).toStrictEqual(
      expect.objectContaining({
        translated: 'hello',
        detectedLanguage: 'en',
        correctedText: 'bonjour',
      }),
    );
    expect(translationProvider.translate).not.toHaveBeenCalled();
  });

  test('should save result to cache after translation', async () => {
    translationProvider.translate.mockResolvedValueOnce({
      translated: 'hello',
      detectedLanguage: 'fr',
    });

    await service.translate('bonjour');

    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledWith(
      expect.stringContaining('translate:bonjour:en'),
      expect.any(Function),
    );
  });

  test('should throw InternalServerErrorException if API fails and log the error', async () => {
    const errorMessage = 'Network error';
    translationProvider.translate.mockRejectedValueOnce(
      new Error(errorMessage),
    );
    const translateError = new TranslateErrorDto(
      'Failed to translate text. Please try again later.',
      500,
      errorMessage,
      'hello',
    );

    await expect(service.translate('hello')).rejects.toThrow(
      new InternalServerErrorException(translateError),
    );

    expect((service as any).logger.error).toHaveBeenCalledTimes(1);
    expect((service as any).logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: errorMessage,
        stack: expect.any(String),
      }),
      'Failed to translate text. Please try again later.',
    );
  });

  test('should use "en" as default language if none is provided', async () => {
    translationProvider.translate.mockResolvedValueOnce({
      translated: 'hello',
      detectedLanguage: 'fr',
    });
    spellCheckService.correct.mockResolvedValueOnce('bonjour');

    await service.translate('bonjour');

    expect(translationProvider.translate).toHaveBeenCalledWith('bonjour', 'en');
    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledTimes(1);
  });

  test('should call spell check service with original text and detected language', async () => {
    const originalText = 'halloo';
    const detectedLang = 'nl';
    const translatedText = 'hello';
    const correctedText = 'hallo';

    translationProvider.translate.mockResolvedValueOnce({
      translated: translatedText,
      detectedLanguage: detectedLang,
    });
    spellCheckService.correct.mockResolvedValueOnce(correctedText);

    const result = await service.translate(originalText, 'en', detectedLang);

    expect(translationProvider.translate).toHaveBeenCalledWith(
      originalText.toLowerCase(),
      'en',
    );
    expect(spellCheckService.correct).toHaveBeenCalledWith(
      originalText.toLowerCase(),
      detectedLang,
    );
    expect(result).toEqual(
      expect.objectContaining({
        translated: translatedText,
        detectedLanguage: detectedLang,
        correctedText: correctedText,
      }),
    );
    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledTimes(1);
  });

  test('should call spell check even though without detected language', async () => {
    translationProvider.translate.mockResolvedValueOnce({
      translated: 'hello',
      detectedLanguage: undefined,
    });
    spellCheckService.correct.mockResolvedValueOnce('bonjour');

    await service.translate('bonjour');

    expect(translationProvider.translate).toHaveBeenCalledWith('bonjour', 'en');
    expect(spellCheckService.correct).toHaveBeenCalledWith('bonjour', 'en');
    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledTimes(1);
  });

  test('should include spellCorrection in the result if original input was corrected', async () => {
    const originalInputMisspelled = 'bonjoor';
    const correctedOriginalInput = 'bonjour';
    const translatedOutput = 'hello';
    const detectedLanguage = 'fr';

    translationProvider.translate.mockResolvedValueOnce({
      translated: translatedOutput,
      detectedLanguage: detectedLanguage,
    });
    spellCheckService.correct.mockResolvedValueOnce(correctedOriginalInput);

    const result = await service.translate(
      originalInputMisspelled,
      'en',
      detectedLanguage,
    );

    expect(translationProvider.translate).toHaveBeenCalledWith(
      originalInputMisspelled.toLowerCase(),
      'en',
    );
    expect(spellCheckService.correct).toHaveBeenCalledWith(
      originalInputMisspelled.toLowerCase(),
      detectedLanguage,
    );
    expect(result).toEqual({
      translated: translatedOutput,
      detectedLanguage: detectedLanguage,
      correctedText: correctedOriginalInput,
    });
    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledTimes(1);
  });

  test('should not include spellCorrection in the result if original input was correct, Irrespective of case sensitivity', async () => {
    const originalText = 'bonjour';
    const translatedOutput = 'hello';
    const detectedLanguage = 'fr';

    translationProvider.translate.mockResolvedValueOnce({
      translated: translatedOutput,
      detectedLanguage: detectedLanguage,
    });
    spellCheckService.correct.mockResolvedValueOnce('bonjour');

    const result = await service.translate(originalText, 'en', 'fr');

    expect(translationProvider.translate).toHaveBeenCalledWith(
      originalText.toLowerCase(),
      'en',
    );
    expect(spellCheckService.correct).toHaveBeenCalledWith(
      originalText.toLowerCase(),
      'fr',
    );
    expect(result.correctedText).not.toBeDefined;
    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledTimes(1);
  });

  test('should save corrected text to cache after a successful translation and spell check', async () => {
    const originalInputMisspelled = 'bonjoor';
    const correctedOriginalInput = 'bonjour';
    const translatedOutput = 'hello';
    const detectedLanguage = 'fr';

    translationProvider.translate.mockResolvedValueOnce({
      translated: translatedOutput,
      detectedLanguage,
    });
    spellCheckService.correct.mockResolvedValueOnce(correctedOriginalInput);

    await service.translate(originalInputMisspelled, 'en', 'fr');

    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledWith(
      'translate:bonjoor:en',
      expect.any(Function),
    );
  });

  test('should retrieve corrected text from cache and not call spell check service', async () => {
    const cachedResult = {
      translated: 'hello',
      detectedLanguage: 'fr',
      correctedText: 'bonjour',
    };
    mocks.cacheService!.getOrSetCachedValue.mockResolvedValue(cachedResult);

    const result = await service.translate('bonjoor', 'en');

    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledTimes(1);
    expect(translationProvider.translate).not.toHaveBeenCalled();
    expect(spellCheckService.correct).not.toHaveBeenCalled();
    expect(result).toEqual(cachedResult);
  });

  test('should request spell check service event if transalte API fails', async () => {
    const errorMessage = 'Network error';
    translationProvider.translate.mockRejectedValueOnce(
      new Error(errorMessage),
    );
    spellCheckService.correct.mockResolvedValueOnce('should be called');

    await expect(service.translate('hello')).rejects.toThrow(
      new InternalServerErrorException(
        'Failed to translate text. Please try again later.',
      ),
    );

    expect(translationProvider.translate).toHaveBeenCalledTimes(1);
    expect(spellCheckService.correct).toHaveBeenCalledTimes(1);
    expect((service as any).logger.error).toHaveBeenCalledTimes(1);
    expect((service as any).logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: errorMessage,
        stack: expect.any(String),
      }),
      'Failed to translate text. Please try again later.',
    );
  });

  test('should call spell check service only if the from language is supported', async () => {
    const originalText = 'こんにちは';
    const unsupportedLang = 'ja';

    translationProvider.translate.mockResolvedValueOnce({
      translated: 'hello',
      detectedLanguage: unsupportedLang,
    });
    spellCheckService.correct.mockResolvedValueOnce('Anything');
    mocks.cacheService!.getOrSetCachedValue.mockImplementation(
      (key, factoryFn, ttl) => {
        return factoryFn();
      },
    );

    const result = await service.translate(originalText, 'en', unsupportedLang);

    expect(translationProvider.translate).toHaveBeenCalledWith(
      originalText.toLowerCase(),
      'en',
    );
    expect(spellCheckService.correct).not.toHaveBeenCalled();
    expect(result.correctedText).not.toBeDefined;
    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledTimes(1);
  });

  test('sould not check spell if the spellcheck param is false', async () => {
    translationProvider.translate.mockResolvedValueOnce({
      translated: 'hello',
      detectedLanguage: undefined,
    });

    await service.translate('bonjour', undefined, undefined, false);

    expect(translationProvider.translate).toHaveBeenCalledWith('bonjour', 'en');
    expect(spellCheckService.correct).not.toHaveBeenCalled();
  });
});

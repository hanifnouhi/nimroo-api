import { Test, TestingModule } from '@nestjs/testing';
import { TranslateService } from '../translate.service';
import axios from 'axios';
import { globalUseMocker, mocks } from '../../../test/mocks/use-mocker';
import { SpellCheckService } from '../../spell-check/spell-check.service';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import { InternalServerErrorException } from '@nestjs/common';
import pino from 'pino';
import { TranslateErrorDto } from '../dtos/translate-error.dto';

// mock axios for using in tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TranslateService', () => {
  let service: TranslateService;
  const slientPinoLogger = pino({ enabled: false });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: slientPinoLogger
          },
        }),
      ],
      providers: [
        TranslateService
      ],
    })
    .useMocker(globalUseMocker)
    .compile();

    service = module.get<TranslateService>(TranslateService);

    // clear axios and cache manager mock before each test to prevent unwanted errors
    mockedAxios.post.mockClear();
    if (mocks.cacheService) {
      (mocks.cacheService.getOrSetCachedValue as jest.Mock).mockClear();
    }
    if (mocks.spellCheckService) {
        (mocks.spellCheckService.correct as jest.Mock).mockClear();
    }
    if (mocks.translationProvider) {
        mocks.translationProvider.translate.mockClear();
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
    mocks.translationProvider!.translate.mockResolvedValueOnce({
      translated: 'hello',
      detectedLanguage: 'en'
    });

    const result = await service.translate('hello');

    expect(result).toEqual(expect.objectContaining({ translated: 'hello', detectedLanguage: 'en' }));
    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith('hello', 'en');
  });

  test.each([
    ['world', 'world'],
    [' world', 'world'],
    [' world ', 'world'],
    ['World', 'world'],
    ['WORLD', 'world']
  ])('should return the same translation Irrespective of uppercase and lowercase letters and leading and trailing spaces', async (input, expected) => {
    mocks.translationProvider!.translate.mockResolvedValueOnce({
      translated: expected,
      detectedLanguage: 'en'
    });

    await service.translate(input);

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith('world', 'en');
  });

  test.each([
    ['world', 'جهان', 'fa'],
    ['world', 'monde', 'fr'],
    ['world', 'World', 'en']
  ])('should return translation based on language param', async (input, expected, lang) => {
    mocks.translationProvider!.translate.mockResolvedValueOnce({
      translated: expected,
      detectedLanguage: 'en'
    });

    const result = await service.translate(input, lang);

    expect(result).toEqual(expect.objectContaining({ translated: expected, detectedLanguage: 'en' }));
    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith(input, lang);
  });

  test('should return from cache if exists', async () => {
    const cachedResult = {
      translated: 'hello',
      detectedLanguage: 'en',
      correctedText: 'bonjour'
    };
    (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockResolvedValue(cachedResult);
    mocks.translationProvider!.translate.mockRejectedValueOnce('hello');

    const result = await service.translate('bonjour');

    expect(result).toStrictEqual(expect.objectContaining({
      translated: 'hello',
      detectedLanguage: 'en',
      correctedText: 'bonjour'
    }));
    expect(mocks.translationProvider!.translate).not.toHaveBeenCalled();
  });

  test('should save result to cache after translation', async() => {
    mocks.translationProvider!.translate.mockResolvedValueOnce({'translated': 'hello', 'detectedLanguage': 'fr'});

    await service.translate('bonjour');
    
    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledWith(
      expect.stringContaining('translate:bonjour:en'),
      expect.any(Function)
    );
  });

  test('should throw InternalServerErrorException if API fails and log the error', async () => {
    const errorMessage = 'Network error';
    mocks.translationProvider!.translate.mockRejectedValueOnce(new Error(errorMessage));
    const translateError = new TranslateErrorDto(
      'Failed to translate text. Please try again later.',
      500,
      errorMessage,
      'hello'
    );

    await expect(service.translate('hello')).rejects.toThrow(new InternalServerErrorException(translateError));

    expect((service as any).logger.error).toHaveBeenCalledTimes(1);
    expect((service as any).logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: errorMessage,
        stack: expect.any(String)
      }),
      "Failed to translate text. Please try again later."
    );
  });

  test('should use "en" as default language if none is provided', async () => {
    mocks.translationProvider!.translate.mockResolvedValueOnce({
      translated: 'hello',
      detectedLanguage: 'fr'
    });
    mocks.spellCheckService!.correct.mockResolvedValueOnce('bonjour');

    await service.translate('bonjour');

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith('bonjour', 'en');
    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledTimes(1);
  });

  test('should call spell check service with original text and detected language', async () => {
    const originalText = 'halloo';
    const detectedLang = 'nl';
    const translatedText = 'hello';
    const correctedText = 'hallo';

    mocks.translationProvider!.translate.mockResolvedValueOnce({
      translated: translatedText,
      detectedLanguage: detectedLang
    });
    mocks.spellCheckService!.correct.mockResolvedValueOnce(correctedText);

    const result = await service.translate(originalText, 'en', detectedLang);

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith(originalText.toLowerCase(), 'en');
    expect(mocks.spellCheckService!.correct).toHaveBeenCalledWith(originalText.toLowerCase(), detectedLang);
    expect(result).toEqual(expect.objectContaining({ translated: translatedText, detectedLanguage: detectedLang, correctedText: correctedText }));
    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledTimes(1);
  });

  test('should call spell check even though without detected language', async () => {
    mocks.translationProvider!.translate.mockResolvedValueOnce({translated: 'hello', detectedLanguage: undefined});
    mocks.spellCheckService!.correct.mockResolvedValueOnce('bonjour');

    await service.translate('bonjour');

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith('bonjour', 'en');
    expect(mocks.spellCheckService!.correct).toHaveBeenCalledWith('bonjour', 'en');
    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledTimes(1);
  });

  test('should include spellCorrection in the result if original input was corrected', async () => {
    const originalInputMisspelled = 'bonjoor';
    const correctedOriginalInput = 'bonjour';
    const translatedOutput = 'hello';
    const detectedLanguage = 'fr';

    mocks.translationProvider!.translate.mockResolvedValueOnce({
      translated: translatedOutput,
      detectedLanguage: detectedLanguage
    });
    mocks.spellCheckService!.correct.mockResolvedValueOnce(correctedOriginalInput);

    const result = await service.translate(originalInputMisspelled, 'en', detectedLanguage);

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith(originalInputMisspelled.toLowerCase(), 'en');
    expect(mocks.spellCheckService!.correct).toHaveBeenCalledWith(originalInputMisspelled.toLowerCase(), detectedLanguage);
    expect(result).toEqual({
      translated: translatedOutput,
      detectedLanguage: detectedLanguage,
      correctedText: correctedOriginalInput
    });
    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledTimes(1);
  });

  test('should not include spellCorrection in the result if original input was correct, Irrespective of case sensitivity', async () => {
    const originalText = 'bonjour';
    const translatedOutput = 'hello';
    const detectedLanguage = 'fr';

    mocks.translationProvider!.translate.mockResolvedValueOnce({
      translated: translatedOutput,
      detectedLanguage: detectedLanguage
    });
    mocks.spellCheckService!.correct.mockResolvedValueOnce('bonjour');

    const result = await service.translate(originalText, 'en', 'fr');

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith(originalText.toLowerCase(), 'en');
    expect(mocks.spellCheckService!.correct).toHaveBeenCalledWith(originalText.toLowerCase(), 'fr');
    expect(result.correctedText).not.toBeDefined;
    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledTimes(1);
  });

  test('should save corrected text to cache after a successful translation and spell check', async () => {
    const originalInputMisspelled = 'bonjoor';
    const correctedOriginalInput = 'bonjour';
    const translatedOutput = 'hello';
    const detectedLanguage = 'fr';

    mocks.translationProvider!.translate.mockResolvedValueOnce({
      translated: translatedOutput,
      detectedLanguage
    });
    mocks.spellCheckService!.correct.mockResolvedValueOnce(correctedOriginalInput);

    await service.translate(originalInputMisspelled, 'en', 'fr');

    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledWith(
      'translate:bonjoor:en',
      expect.any(Function)
    );
  });

  test('should retrieve corrected text from cache and not call spell check service', async () => {
    const cachedResult = {
      translated: 'hello',
      detectedLanguage: 'fr',
      correctedText: 'bonjour'
    };
    (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockResolvedValue(cachedResult);

    const result = await service.translate('bonjoor', 'en');

    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledTimes(1);
    expect(mocks.translationProvider!.translate).not.toHaveBeenCalled();
    expect(mocks.spellCheckService!.correct).not.toHaveBeenCalled();
    expect(result).toEqual(cachedResult);
  });

  test('should request spell check service event if transalte API fails', async () => {
    const errorMessage = 'Network error';
    mocks.translationProvider!.translate.mockRejectedValueOnce(new Error(errorMessage));
    mocks.spellCheckService!.correct.mockResolvedValueOnce('should be called');

    await expect(service.translate('hello')).rejects.toThrow(new InternalServerErrorException('Failed to translate text. Please try again later.'));

    expect(mocks.translationProvider!.translate).toHaveBeenCalledTimes(1);
    expect(mocks.spellCheckService!.correct).toHaveBeenCalledTimes(1);
    expect((service as any).logger.error).toHaveBeenCalledTimes(1);
    expect((service as any).logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: errorMessage,
        stack: expect.any(String)
      }),
      "Failed to translate text. Please try again later."
    );
  });

  test('should call spell check service only if the from language is supported', async () => {
    const originalText = 'こんにちは';
    const unsupportedLang = 'ja';

    mocks.translationProvider!.translate.mockResolvedValueOnce({
      translated: 'hello',
      detectedLanguage: unsupportedLang
    });
    mocks.spellCheckService!.correct.mockResolvedValueOnce('Anything');
    (mocks.cacheService!.getOrSetCachedValue as jest.Mock).mockImplementation((key, factoryFn, ttl) => {
        return factoryFn();
    });

    const result = await service.translate(originalText, 'en', unsupportedLang);

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith(originalText.toLowerCase(), 'en');
    expect(mocks.spellCheckService!.correct).not.toHaveBeenCalled();
    expect(result.correctedText).not.toBeDefined;
    expect(mocks.cacheService!.getOrSetCachedValue).toHaveBeenCalledTimes(1);
  });

});

import { Test, TestingModule } from '@nestjs/testing';
import { TranslateService } from '../translate.service';
import axios from 'axios';
import { globalUseMocker, mocks } from '../../../test/mocks/use-mocker';
import { SpellCheckService } from '../../spell-check/spell-check.service';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import { InternalServerErrorException } from '@nestjs/common';
import pino from 'pino';

// mock axios for using in tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TranslateService', () => {
  let service: TranslateService;
  let spellCheckService: SpellCheckService;
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
        TranslateService,
        SpellCheckService
      ],
    })
    .useMocker(globalUseMocker)
    .compile();

    service = module.get<TranslateService>(TranslateService);
    spellCheckService = module.get<SpellCheckService>(SpellCheckService);

    // clear axios and cache manager mock before each test to prevent unwanted errors
    mockedAxios.post.mockClear();
    mocks.cacheManager!.get.mockClear();
    mocks.cacheManager!.set.mockClear();
    mocks.translationProvider?.translate.mockClear();
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
    mocks.cacheManager!.get.mockResolvedValueOnce('hello');
    mocks.translationProvider!.translate.mockRejectedValueOnce('hello');

    const result = await service.translate('bonjour');

    expect(result).toBe('hello');
    expect(mocks.translationProvider!.translate).not.toHaveBeenCalled();
  });

  test('should save result to cache after translation', async() => {
    mocks.translationProvider!.translate.mockResolvedValueOnce({'translated': 'hello', 'detectedLanguage': 'fr'});

    await service.translate('bonjour');
    
    expect(mocks.cacheManager!.set).toHaveBeenCalledWith(
      expect.stringContaining('translate:bonjour:en'),
      expect.objectContaining({'translated': 'hello', 'detectedLanguage': 'fr'})
    );
  });

  test('should throw InternalServerErrorException if API fails and log the error', async () => {
    const errorMessage = 'Network error';
    mocks.translationProvider!.translate.mockRejectedValueOnce(new Error(errorMessage));

    await expect(service.translate('hello')).rejects.toThrow(new InternalServerErrorException('Failed to tranlate text. Please try again later.'));

    expect((service as any).logger.error).toHaveBeenCalledTimes(1);
    expect((service as any).logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: errorMessage,
        stack: expect.any(String)
      }),
      "Azure Translate API error during translation." 
    );
  });

  test('should use "en" as default language if none is provided', async () => {
    mocks.translationProvider!.translate.mockResolvedValueOnce({
      translated: 'hello',
      detectedLanguage: 'fr'
    });

    await service.translate('bonjour');

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith('bonjour', 'en');
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

    jest.spyOn(spellCheckService, 'correct').mockResolvedValueOnce(correctedText);

    const result = await service.translate(originalText, 'en', detectedLang);

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith(originalText, 'en');
    expect(spellCheckService.correct).toHaveBeenCalledWith(originalText, detectedLang);
    expect(result).toEqual(expect.objectContaining({ translated: translatedText, detectedLanguage: detectedLang }));
  });

  test('should call spell check even though without detected language', async () => {
    mocks.translationProvider!.translate.mockResolvedValueOnce({translated: 'hello', detectedLanguage: undefined});
    jest.spyOn(spellCheckService, 'correct').mockResolvedValueOnce('hello');

    await service.translate('bonjour');

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith('bonjour', 'en');
    expect(spellCheckService.correct).toHaveBeenCalledWith('bonjour', 'en');
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
    jest.spyOn(spellCheckService, 'correct').mockResolvedValueOnce(correctedOriginalInput);

    const result = await service.translate(originalInputMisspelled, 'en', detectedLanguage);

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith(originalInputMisspelled, 'en');
    expect(spellCheckService.correct).toHaveBeenCalledWith(originalInputMisspelled, detectedLanguage);
    expect(result).toEqual({
      translated: translatedOutput,
      detectedLanguage: detectedLanguage,
      correctedText: correctedOriginalInput
    });
  });

  test('should not include spellCorrection in the result if original input was correct, Irrespective of case sensitivity', async () => {
    mocks.translationProvider!.translate.mockResolvedValueOnce({
      translated: 'hello',
      detectedLanguage: 'fr'
    });
    jest.spyOn(spellCheckService, 'correct').mockResolvedValueOnce('Bonjour');

    const result = await service.translate('bonjour', 'en', 'fr');

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith('bonjour', 'en');
    expect(spellCheckService.correct).toHaveBeenCalledWith('bonjour', 'fr');
    expect(result.correctedText).toBe('');
  });

  test('should save corrected text to cache after a successful translation and spell check', async () => {
    mocks.translationProvider!.translate.mockResolvedValueOnce({
      translated: 'hello',
      detectedLanguage: 'fr'
    });
    mocks.cacheManager!.get.mockResolvedValueOnce(undefined);
    jest.spyOn(spellCheckService, 'correct').mockResolvedValueOnce('bonjour');

    await service.translate('bonjoor', 'en', 'fr');
    const expectedObjectInCache = {
      translated: 'hello',
      detectedLanguage: 'fr',
      correctedText: 'bonjour'
    };

    expect(mocks.cacheManager!.get).toHaveBeenCalledWith('translate:bonjoor:en');
    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith('bonjoor', 'en');
    expect(spellCheckService.correct).toHaveBeenCalledWith('bonjoor', 'fr');
    expect(mocks.cacheManager!.set).toHaveBeenCalledWith(
      expect.stringContaining('translate:bonjoor:en'),
      expect.objectContaining(expectedObjectInCache)
    );
  });

  test('should retrieve corrected text from cache and not call spell check service', async () => {
    const cachedResult = {
      translated: 'hello',
      detectedLanguage: 'fr',
      correctedText: 'bonjour'
    };
    
    mocks.cacheManager!.get.mockResolvedValueOnce(cachedResult);
    mocks.translationProvider!.translate.mockResolvedValueOnce({ translated: 'will not be used', detectedLanguage: 'will not be used' });
    jest.spyOn(spellCheckService, 'correct').mockResolvedValueOnce('will not be used');

    const result = await service.translate('bonjoor', 'en');

    expect(mocks.cacheManager!.get).toHaveBeenCalledWith(`translate:bonjoor:en`);
    expect(mocks.translationProvider!.translate).not.toHaveBeenCalled();
    expect(spellCheckService.correct).not.toHaveBeenCalled();
    expect(result).toEqual(cachedResult);
    expect(result.translated).toBe('hello');
    expect(result.detectedLanguage).toBe('fr');
    expect(result.correctedText).toBe('bonjour');
  });

  test('should request spell check service event if transalte API fails', async () => {
    const errorMessage = 'Network error';
    mocks.translationProvider!.translate.mockRejectedValueOnce(new Error(errorMessage));

    jest.spyOn(spellCheckService, 'correct').mockResolvedValueOnce('should be called');
    await expect(service.translate('hello')).rejects.toThrow(new InternalServerErrorException('Failed to tranlate text. Please try again later.'));

    expect((service as any).logger.error).toHaveBeenCalledTimes(1);
    expect(mocks.translationProvider!.translate).toHaveBeenCalled();
    expect(spellCheckService.correct).toHaveBeenCalled();
  });

  test('should call spell check service only if the from language is supported', async () => {
    mocks.translationProvider!.translate.mockResolvedValueOnce({
      translated: 'hello',
      detectedLanguage: 'ja'
    });
    jest.spyOn(spellCheckService, 'correct').mockResolvedValueOnce('Anything');

    const result = await service.translate('こんにちは', 'en', 'ja');

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith('こんにちは', 'en');
    expect(spellCheckService.correct).not.toHaveBeenCalled();
  });

});

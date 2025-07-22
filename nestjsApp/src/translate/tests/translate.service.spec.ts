import { Test, TestingModule } from '@nestjs/testing';
import { TranslateService } from '../translate.service';
import axios from 'axios';
import { globalUseMocker, mocks } from '../../../test/mocks/use-mocker';
import { array } from 'joi';

// mock axios for using in tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TranslateService', () => {
  let service: TranslateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslateService
      ],
    })
    .useMocker(globalUseMocker)
    .compile();

    service = module.get<TranslateService>(TranslateService);

    // clear axios and cache manager mock before each test to prevent unwanted errors
    mockedAxios.post.mockClear();
    mocks.cacheManager!.get.mockClear();
    mocks.cacheManager!.set.mockClear();
    mocks.translationProvider?.translate.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  test('should return from azure cognitive services', async () => {
    mocks.translationProvider!.translate.mockResolvedValueOnce('hello');

    const result = await service.translate('hello');

    expect(result).toBe('hello');
    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith('hello', 'en');
  });

  test.each([
    ['world', 'world'],
    [' world', 'world'],
    [' world ', 'world'],
    ['World', 'world'],
    ['WORLD', 'world']
  ])('should return the same translation Irrespective of uppercase and lowercase letters and leading and trailing spaces', async (input, expected) => {
    mocks.translationProvider!.translate.mockResolvedValueOnce(expected);

    await service.translate(input);

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith('world', 'en');
  });

  test.each([
    ['world', 'جهان', 'fa'],
    ['world', 'monde', 'fr'],
    ['world', 'World', 'en']
  ])('should return translation based on language param', async (input, expected, lang) => {
    mocks.translationProvider!.translate.mockResolvedValueOnce(expected);

    const result = await service.translate(input, lang);

    expect(result).toBe(expected);
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
    mocks.translationProvider!.translate.mockResolvedValueOnce('hello');

    await service.translate('bonjour');
    
    expect(mocks.cacheManager!.set).toHaveBeenCalledWith(
      'translate:bonjour:en',
      'hello'
    );
  });

  test('should return fallback if API fails', async () => {
    mocks.translationProvider!.translate.mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await service.translate('hello');

    expect(result).toBe('Translation failed');
    expect(mocks.translationProvider!.translate).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Azure Translate API error:',
      'Network error'
    );

    consoleSpy.mockRestore(); 
  });

  test('should use "en" as default language if none is provided', async () => {
    mocks.translationProvider!.translate.mockResolvedValueOnce('hello');

    await service.translate('bonjour');

    expect(mocks.translationProvider!.translate).toHaveBeenCalledWith('bonjour', 'en');
  });

});

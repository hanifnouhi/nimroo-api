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
      providers: [TranslateService],
    })
    .useMocker(globalUseMocker)
    .compile();

    service = module.get<TranslateService>(TranslateService);

    // clear axios and cache manager mock before each test to prevent unwanted errors
    mockedAxios.post.mockClear();
    mocks.cacheManager!.get.mockClear();
    mocks.cacheManager!.set.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  test('should return from azure cognitive services', async () => {
    mockedAxios.post.mockResolvedValue({
      data: [{ translations: [{ text: 'hello' }] }],
    });

    const result = await service.translate('hello');

    expect(result).toBe('hello');
    expect(mockedAxios.post).toHaveBeenCalled();
  });

  test.each([
    ['world', 'world'],
    [' world', 'world'],
    [' world ', 'world'],
    ['World', 'world'],
    ['WORLD', 'world']
  ])('should return the same translation Irrespective of uppercase and lowercase letters and leading and trailing spaces', async (input, expected) => {
    mockedAxios.post.mockResolvedValue({
      data: [{ translations: [{ text: expected }] }],
    });

    await service.translate(input);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({
          Text: 'world',
        }),
      ]),
      expect.any(Object)
    );
  });

  test.each([
    ['world', 'جهان', 'fa'],
    ['world', 'monde', 'fr'],
    ['world', 'World', 'en']
  ])('should return translation based on language param', async (input, expected, lang) => {
    mockedAxios.post.mockResolvedValue({
      data: [{ translations: [{ text: expected }] }]
    });

    const result = await service.translate(input, lang);

    expect(result).toBe(expected);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining(`to=${lang}`),
      expect.arrayContaining([
        expect.objectContaining({ Text: 'world' })
      ]),
      expect.any(Object)
    );
  });

  test('should return from cache if exists', async () => {
    mocks.cacheManager!.get.mockResolvedValueOnce('hello');

    const result = await service.translate('bonjour');

    expect(result).toBe('hello');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test('should save result to cache after translation', async() => {
    mockedAxios.post.mockResolvedValueOnce({
      data: [{ translations: [{ text: 'hello' }] }]
    });

    await service.translate('bonjour');
    
    expect(mocks.cacheManager!.set).toHaveBeenCalledWith(
      'translate:bonjour:en',
      'hello'
    );
  });

  test('should return fallback if API fails', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await service.translate('hello');

    expect(result).toBe('Translation failed');
    expect(mockedAxios.post).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Azure Translate API error:',
      'Network error'
    );

    consoleSpy.mockRestore(); 
  });

  test('should use "en" as default language if none is provided', async () => {
    mockedAxios.post.mockResolvedValue({
      data: [{ translations: [{ text: 'hello' }] }]
    });

    await service.translate('bonjour');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('to=en'),
      expect.any(Array),
      expect.any(Object)
    );
  });

});

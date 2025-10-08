import { UnsplashImageProvider } from '../providers/unsplash-image.provider';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PinoLogger } from 'nestjs-pino';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UnsplashImageProvider (Unit)', () => {
  let provider: UnsplashImageProvider;
  let configService: ConfigService;
  let pinoLogger: PinoLogger;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'UNSPLASH_IMAGE_SEARCH_URL') return 'https://api.unsplash.com/search/photos';
        if (key === 'UNSPLASH_IMAGE_SEARCH_ACCESS_KEY') return 'test-key';
      }),
    } as any;

    pinoLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn()
    } as any;

    provider = new UnsplashImageProvider(configService, pinoLogger);
  });

  it('should return list of images when API returns results', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        results: [
          {
            urls: { small: 'http://image.com/img1.jpg' },
            links: { download: 'http://image.com/download1' },
          },
        ],
      },
    });

    const results = await provider.search('cats');

    expect(results).toEqual([
      { url: 'http://image.com/img1.jpg', download: 'http://image.com/download1' },
    ]);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.unsplash.com/search/photos',
      expect.objectContaining({ params: expect.objectContaining({ client_id: 'test-key', query: 'cats' }) })
    );
  });

  it('should throw error on API failure', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('network error'));
    await expect(provider.search('dogs')).rejects.toThrow('network error');
  });

  it('should ignore results without urls.small', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { results: [{ urls: {}, links: {} }] },
    });

    const results = await provider.search('random');
    expect(results).toEqual([]);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UnsplashImageProvider } from '../providers/unsplash-image.provider';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UnsplashImageProvider (Integration)', () => {
  let provider: UnsplashImageProvider;
  const slientPinoLogger = pino({ enabled: false });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: slientPinoLogger,
          },
        }),
      ],
      providers: [
        UnsplashImageProvider,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'UNSPLASH_IMAGE_SEARCH_URL')
                return 'https://api.unsplash.com/search/photos';
              if (key === 'UNSPLASH_IMAGE_SEARCH_ACCESS_KEY')
                return 'integration-key';
            },
          },
        },
      ],
    }).compile();

    provider = module.get<UnsplashImageProvider>(UnsplashImageProvider);

    jest.spyOn((provider as any).logger, 'debug');
    jest.spyOn((provider as any).logger, 'info');
    jest.spyOn((provider as any).logger, 'warn');
    jest.spyOn((provider as any).logger, 'error');
    jest.spyOn((provider as any).logger, 'fatal');
    jest.spyOn((provider as any).logger, 'setContext');
  });

  it('should call axios and return results', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        results: [
          {
            urls: { small: 'http://int.com/pic.jpg' },
            links: { download: 'http://int.com/dl' },
          },
        ],
      },
    });

    const results = await provider.search('integration test');

    expect(results).toEqual([
      { url: 'http://int.com/pic.jpg', download: 'http://int.com/dl' },
    ]);
  });

  it('should throw error if axios fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('axios down'));
    await expect(provider.search('fail case')).rejects.toThrow('axios down');
  });
});

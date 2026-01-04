import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UnsplashImageProvider } from '../../providers/unsplash-image.provider';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import pino from 'pino';

describe('UnsplashImageProvider (E2E - real API)', () => {
  let app: INestApplication;
  let provider: UnsplashImageProvider;
  let silentPinoLogger = pino({ enabled: false });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        LoggerModule.forRoot({
          pinoHttp: silentPinoLogger
        })
      ],
      providers: [UnsplashImageProvider],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    provider = moduleFixture.get<UnsplashImageProvider>(UnsplashImageProvider);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should fetch real images from Unsplash', async () => {
      const results = await provider.search('mountains');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThan(6);

      const first = results[0];
      expect(first).toHaveProperty('url');
      expect(first).toHaveProperty('download');
    },
    10000,
  );

  it('should throw error when invalid access key is used', async () => {
      const mockConfigService = {
        get: (key: string) => {
          if (key === 'UNSPLASH_IMAGE_SEARCH_URL') return process.env.UNSPLASH_IMAGE_SEARCH_URL;
          if (key === 'UNSPLASH_IMAGE_SEARCH_ACCESS_KEY') return 'WRONG_KEY';
          return null;
        },
      } as any;

      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
      } as any;

      const badProvider = new UnsplashImageProvider(mockConfigService, mockLogger);

      await expect(badProvider.search('cats')).rejects.toThrow();
    },
    10000,
  );
});

import { Test, TestingModule } from '@nestjs/testing';
import { ImageController } from '../image.controller';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ImageService } from '../image.service';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';
import { CacheService } from '../../cache/cache.service';
import { UserService } from '../../user/user.service';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';

describe('ImageController', () => {
  let controller: ImageController;
  let app: INestApplication;
  let imageService: jest.Mocked<ImageService>;
  const slientPinoLogger = pino({ enabled: false });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageController],
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: slientPinoLogger,
          },
        }),
      ],
      providers: [
        {
          provide: ImageService,
          useValue: {
            search: jest.fn(),
            generate: jest.fn(),
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

    app = module.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    controller = module.get<ImageController>(ImageController);
    imageService = module.get(ImageService);

    jest.spyOn((controller as any).logger, 'debug');
    jest.spyOn((controller as any).logger, 'info');
    jest.spyOn((controller as any).logger, 'warn');
    jest.spyOn((controller as any).logger, 'error');
    jest.spyOn((controller as any).logger, 'fatal');
    jest.spyOn((controller as any).logger, 'setContext');
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Search image', () => {
    const imageSearchResult = [
      {
        imageUrl: 'http://test.com/image/default.jpg',
        downloadUrl: 'http://test.com/image/?download:default.jpg',
      },
    ];
    it('should return image result from service', async () => {
      imageService.search.mockResolvedValue(imageSearchResult);

      const res = await request(app.getHttpServer())
        .post('/image/search')
        .send({ text: 'apple', sourceLang: 'en' })
        .expect(201);

      expect(res.body).toStrictEqual(imageSearchResult);
      expect(imageService.search).toHaveBeenCalledWith('apple', 'en');
      expect((controller as any).logger.debug).toHaveBeenCalledWith(
        `Received POST request to /search with data: ${JSON.stringify({ text: 'apple', sourceLang: 'en' })}`,
      );
    });

    it('should handle service errors gracefully', async () => {
      imageService.search.mockRejectedValue(new Error('fail'));
      const res = await request(app.getHttpServer())
        .post('/image/search')
        .send({ text: 'apple', sourceLang: 'en' })
        .expect(500);

      expect(res.body).toEqual(
        expect.objectContaining({
          message: 'Internal server error',
        }),
      );
    });

    it('should return 400 if text in missing or invalid', async () => {
      await request(app.getHttpServer())
        .post('/image/search')
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post('/image/search')
        .send({ text: '' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/image/search')
        .send({ text: 369 })
        .expect(400);
    });

    it('should call image service with sourceLang parameter if provided', async () => {
      imageService.search.mockResolvedValue(imageSearchResult);

      const res = await request(app.getHttpServer())
        .post('/image/search')
        .send({ text: 'pomme', sourceLang: 'fr' })
        .expect(201);

      expect(imageService.search).toHaveBeenCalledWith('pomme', 'fr');
    });
  });

  describe('Generate image', () => {
    const imageSearchResult = [
      {
        imageUrl: 'http://test.com/image/default.jpg',
        downloadUrl: 'http://test.com/image/?download:default.jpg',
      },
    ];
    it('should return image result from service', async () => {
      imageService.generate.mockResolvedValue(imageSearchResult);

      const res = await request(app.getHttpServer())
        .post('/image/generate')
        .send({ text: 'apple' })
        .expect(201);

      expect(res.body).toStrictEqual(imageSearchResult);
      expect(imageService.generate).toHaveBeenCalledWith('apple');
      expect((controller as any).logger.debug).toHaveBeenCalledWith(
        `Received POST request to /generate with data: ${JSON.stringify({ text: 'apple' })}`,
      );
    });

    it('should handle service errors gracefully', async () => {
      imageService.generate.mockRejectedValue(new Error('fail'));
      const res = await request(app.getHttpServer())
        .post('/image/generate')
        .send({ text: 'apple' })
        .expect(500);

      expect(res.body).toEqual(
        expect.objectContaining({
          message: 'Internal server error',
        }),
      );
    });

    it('should return 400 if text in missing or invalid', async () => {
      await request(app.getHttpServer())
        .post('/image/generate')
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post('/image/generate')
        .send({ text: '' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/image/generate')
        .send({ text: 369 })
        .expect(400);
    });
  });
});

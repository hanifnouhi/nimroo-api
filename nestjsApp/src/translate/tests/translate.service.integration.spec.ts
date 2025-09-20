import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import axios from 'axios';
import { TranslateController } from '../../translate/translate.controller';
import { TranslateService } from '../../translate/translate.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TranslationProvider } from '../providers/translate.interface';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';
import { SpellCheckService } from '../../spell-check/spell-check.service';
import { CacheService } from '../../cache/cache.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockTranslationProvider = {
  translate: jest.fn(),
};

describe('TranslateController (Integration without AppModule)', () => {
  let app: INestApplication;
  const slientPinoLogger = pino({ enabled: false });
  let translateService: TranslateService;
  let spellCheckService: jest.Mocked<SpellCheckService>
  let translationProvider: jest.Mocked<TranslationProvider>
  let cacheService: jest.Mocked<CacheService>

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: slientPinoLogger
          },
        }),
      ],
      controllers: [TranslateController],
      providers: [
        {
          provide: SpellCheckService,
          useValue: {
            correct: jest.fn()
          }
        },
        TranslateService,
        {
          provide: 'TranslationProvider',
          useValue: mockTranslationProvider,
        },
        {
          provide: 'CACHE_MANAGER',
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
          }
        },
        {
          provide: CacheService,
          useValue: {
            getOrSetCachedValue: jest.fn((key, factory) => factory()) // همیشه cache miss بزنه
          }
        }
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    translateService = moduleRef.get<TranslateService>(TranslateService);
    translationProvider = moduleRef.get('TranslationProvider');
    spellCheckService = moduleRef.get(SpellCheckService);
    cacheService = moduleRef.get(CacheService);

    jest.spyOn((translateService as any).logger, 'debug');
    jest.spyOn((translateService as any).logger, 'info');
    jest.spyOn((translateService as any).logger, 'warn');
    jest.spyOn((translateService as any).logger, 'error');
    jest.spyOn((translateService as any).logger, 'fatal');
    jest.spyOn((translateService as any).logger, 'setContext');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return translated text from Azure mock', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: [{ translations: [{ text: 'hello' }], detectedLanguage: { language: 'fr' } }],
    });

    const dto = { text: 'bonjour', targetLang: 'en' };
    (cacheService.getOrSetCachedValue as jest.Mock).mockImplementation(
      async (_key, factory) => {
        return factory(); // فقط callback رو اجرا کن
      }
    );
    mockTranslationProvider.translate.mockResolvedValue({
      translated: 'hello',
      detectedLanguage: 'fr',
    });

    return request(app.getHttpServer())
      .post('/translate')
      .send(dto)
      .expect(201)
      .expect(res => {
        expect(res.body).toEqual(
          expect.objectContaining({
            translated: 'hello',
            detectedLanguage: 'fr',
          }),
        );
      });
  });
});

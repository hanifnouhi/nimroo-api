import { Test, TestingModule } from '@nestjs/testing';
import { TranslateController } from '../translate.controller';
import { globalUseMocker, mocks } from '../../../test/mocks/use-mocker';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';
import { TranslateService } from '../translate.service';

describe('TranslateController', () => {
  let app: INestApplication;
  let controller: TranslateController;
  let translateService: jest.Mocked<TranslateService>
  const slientPinoLogger = pino({ enabled: false });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranslateController],
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: slientPinoLogger
          },
        }),
      ],
      providers: [
        {
          provide: TranslateService,
          useValue: {
            translate: jest.fn()
          }
        }
      ]
    })
    .compile();

    app = module.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    controller = module.get<TranslateController>(TranslateController);
    translateService = module.get(TranslateService);

    jest.spyOn((controller as any).logger, 'debug');
    jest.spyOn((controller as any).logger, 'info');
    jest.spyOn((controller as any).logger, 'warn');
    jest.spyOn((controller as any).logger, 'error');
    jest.spyOn((controller as any).logger, 'fatal');
    jest.spyOn((controller as any).logger, 'setContext');
  });

  test('should be defined', () => {
    expect(controller).toBeDefined();
  });

  test('should return translation from service', async () => {
    translateService.translate.mockResolvedValue(
      { translated: 'hello', detectedLanguage: 'fr' }
    );

    const res = await request(app.getHttpServer())
      .post('/translate')
      .send({ text: 'bonjour', targetLang: 'en' })
      .expect(201);

    expect(res.body).toStrictEqual({ translated: 'hello', detectedLanguage: 'fr' });
    expect(translateService.translate).toHaveBeenCalledWith('bonjour', 'en', expect.anything());
    expect((controller as any).logger.debug).toHaveBeenCalledWith(
      `Received POST request to /translate with data: ${JSON.stringify({ text: 'bonjour', targetLang: 'en', fromLang: 'en' })}`
    );
    expect((controller as any).logger.info).toHaveBeenCalledWith(
        `Translation successfully done: ${JSON.stringify({ translated: 'hello', detectedLanguage: 'fr' })}`
    );
  });

  test('should handle service errors gracefully', async () => {
    translateService.translate.mockRejectedValue(new Error('fail'));
    const res = await request(app.getHttpServer())
      .post('/translate')
      .send({ text: 'bonjour', targetLang: 'en' })
      .expect(500);

    expect(res.body).toEqual(expect.objectContaining({
      message: 'Internal server error'
    }));
  });

  test('should return 400 if text in missing or invalid', async () => {
    await request(app.getHttpServer())
      .post('/translate')
      .send({ })
      .expect(400);

    await request(app.getHttpServer())
      .post('/translate')
      .send({ text: '' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/translate')
      .send({ text: 369 })
      .expect(400);
  });

  test('should call translate service with fromLang parameter if provided', async () => {
    translateService.translate.mockResolvedValue(
      { translated: 'hello', detectedLanguage: 'fr' }
    );

    const res = await request(app.getHttpServer())
      .post('/translate')
      .send({ text: 'bonjour', targetLang: 'en', fromLang: 'fr' })
      .expect(201);

    expect(translateService.translate).toHaveBeenCalledWith('bonjour', 'en', 'fr');
  });
});

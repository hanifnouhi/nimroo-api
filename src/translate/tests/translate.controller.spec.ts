import { Test, TestingModule } from '@nestjs/testing';
import { TranslateController } from '../translate.controller';
import { globalUseMocker, mocks } from '../../../test/mocks/use-mocker';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TranslateService } from '../translate.service';

describe('TranslateController', () => {
  let app: INestApplication;
  let controller: TranslateController;
  let translateService: TranslateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranslateController],
      providers: [
        {
          provide: TranslateService,
          useValue: { translate: jest.fn() }
        }
      ]
    })
    .useMocker(globalUseMocker)
    .compile();

    app = module.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    controller = module.get<TranslateController>(TranslateController);
    translateService = module.get<TranslateService>(TranslateService);
  });

  test('should be defined', () => {
    expect(controller).toBeDefined();
  });

  test('should return translation from service', async () => {
    (translateService.translate as jest.Mock).mockResolvedValue('hello');

    const res = await request(app.getHttpServer())
      .post('/translate')
      .send({ text: 'bonjour', targetLang: 'en' })
      .expect(201);

    expect(res.body).toEqual({ translation: 'hello' });
    expect(translateService.translate).toHaveBeenCalledWith('bonjour', 'en');
  });

  test('should handle service errors gracefully', async () => {
    (translateService.translate as jest.Mock).mockRejectedValue(new Error('fail'));

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
});

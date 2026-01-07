import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../app.module';
import * as request from 'supertest';
import { createAndLoginUser } from '../../../../test/utils/create-login-user';
import * as cookieParser from 'cookie-parser';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('TranslateController (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.use(cookieParser());
    await app.init();

    connection = moduleRef.get<Connection>(getConnectionToken());
  });

  afterEach(async () => {
    await connection.collection('users').deleteMany({});
  });

  afterAll(async () => {
    await app.close();
    if (connection) await connection.close();
  });

  test('should return a translated word from Azure without target language', async () => {
    const { accessToken } = await createAndLoginUser(app);
    const response = await request(app.getHttpServer())
      .post('/translate')
      .set('Cookie', accessToken)
      .send({ text: 'bonjour' });

    expect(response.status).toBe(201);
    expect(response.body.translated).toBeDefined();
    expect(typeof response.body.translated).toBe('string');
    expect(response.body.translated.toLowerCase()).toBe('hello');
  });

  test.each([
    ['bonjour', 'ja'],
    ['book', 'fa'],
    ['خانه', 'hi'],
  ])(
    'should return a translated word from azure based on the target language',
    async (text, targetLang) => {
      const { accessToken } = await createAndLoginUser(app);
      const response = await request(app.getHttpServer())
        .post('/translate')
        .set('Cookie', accessToken)
        .send({ text, targetLang });

      expect(response.status).toBe(201);
      expect(response.body.translated).toBeDefined();
      expect(typeof response.body.translated).toBe('string');
      expect(response.body.translated.length).toBeGreaterThan(0);
    },
  );

  test('should call spell check service even without successful translation', async () => {
    const { accessToken } = await createAndLoginUser(app);
    const response = await request(app.getHttpServer())
      .post('/translate')
      .set('Cookie', accessToken)
      .send({ text: 'bonjoor', fromLang: 'fr' });

    expect(response.status).toBe(201);
    expect(response.body.translated).toBeDefined();
    expect(typeof response.body.translated).toBe('string');
    expect(response.body.translated.toLowerCase()).toBe('bonjoor');
    expect(response.body.correctedText).toBe('bonjour');
  });
});

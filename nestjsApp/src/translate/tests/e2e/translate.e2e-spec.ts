import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../app.module';
import * as request from 'supertest';

describe('TranslateController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  test('should return a translated word from Azure without target language', async () => {
    
    const response = await request(app.getHttpServer())
      .post('/translate')
      .send({ text: 'bonjour' });

    expect(response.status).toBe(201);
    expect(response.body.translated).toBeDefined();
    expect(typeof response.body.translated).toBe('string');
    expect(response.body.translated.toLowerCase()).toBe('hello');
  });

  test.each([
    ['bonjour', 'ja'],
    ['book', 'fa'],
    ['خانه', 'hi']
  ])('should return a translated word from azure based on the target language', async (text, targetLang) => {

    const response = await request(app.getHttpServer())
      .post('/translate')
      .send({ text, targetLang });

    expect(response.status).toBe(201);
    expect(response.body.translated).toBeDefined();
    expect(typeof response.body.translated).toBe('string');
    expect(response.body.translated.length).toBeGreaterThan(0);
  });
});

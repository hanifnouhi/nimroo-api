import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TranslateController integration', () => {
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

  it('should return translated text from Azure mock', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: [{ translations: [{ text: 'hello' }], detectedLanguage: { language: 'fr' } }],
    });

    return request(app.getHttpServer())
      .post('/translate')
      .send({ text: 'bonjour', targetLang: 'en' })
      .expect(201)
      .expect(res => {
        expect(res.body).toStrictEqual({ translated: 'hello', detectedLanguage: 'fr' });
      });
  });
});

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { Connection } from 'mongoose';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import * as cookieParser from 'cookie-parser';

describe('Auth E2E (real Mongo)', () => {
  let app: INestApplication;
  let connection: Connection;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://127.0.0.1:27017/nimroo-test'),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    connection = moduleFixture.get<Connection>(getConnectionToken());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (connection) await connection.close();
  });

  afterEach(async () => {
    await connection.collection('users').deleteMany({});
  });

  describe('Full auth flow', () => {
    let accessToken: string;
    let refreshToken: string;

    it('/auth/signup (POST) should create a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'Nim12@34roo!#',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email', 'test@example.com');
    });

    it('/auth/login (POST) should login and set cookies', async () => {

      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'test@example.com', password: 'Nim12@34roo!#' });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Nim12@34roo!#',
        })
        .expect(201);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];

      accessToken = cookieArray.find((c) => c.startsWith('Authentication')).split(';')[0].split('=')[1];
      refreshToken = cookieArray.find((c) => c.startsWith('Refresh')).split(';')[0].split('=')[1];
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
    });

    it('/auth/refresh (POST) should refresh tokens', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'test@example.com', password: 'Nim12@34roo!#' });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'Nim12@34roo!#' });

      const cookies = loginRes.headers['set-cookie'];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];

      refreshToken = cookieArray.find((c) => c.startsWith('Refresh')).split(';')[0].split('=')[1];

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [`Refresh=${refreshToken}`])
        .expect(201);

      const newCookies = res.headers['set-cookie'];
      const newCookieArray = Array.isArray(newCookies) ? newCookies : [newCookies];
      expect(newCookieArray.find((c) => c.startsWith('Authentication'))).toBeDefined();
    });
  });
});

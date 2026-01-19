import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as cookieParser from 'cookie-parser';
import { createAndLoginUser } from '../../../../test/utils/create-login-user';

describe('UserModule (e2e) - Real MongoDB', () => {
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

  it('/users (POST) should create a user', async () => {
    const { accessToken } = await createAndLoginUser(app, true);
    const res = await request(app.getHttpServer())
      .post('/user/create')
      .set('Cookie', accessToken)
      .send({ email: 'test@test.com', password: 'Nim12@34roo!#' })
      .expect(201);

    expect(res.body.id).toBeDefined();
  });

  it('/users (POST) should not create a user if not authenticated', async () => {
    const res = await request(app.getHttpServer())
      .post('/user/create')
      .send({ email: 'test@test.com', password: 'Nim12@34roo!#' })
      .expect(401);

    expect(res.error).toBeDefined();
  });

  it('/users (GET) should return all users', async () => {
    const { accessToken } = await createAndLoginUser(app, true);
    await request(app.getHttpServer())
      .post('/user/create')
      .set('Cookie', accessToken)
      .send({ email: 'a12@test.com', password: 'Nim12@34roo!#' });

    const res = await request(app.getHttpServer())
      .get('/user/list')
      .set('Cookie', accessToken)
      .expect(200);
    expect(res.body).toHaveLength(2);
  });
});

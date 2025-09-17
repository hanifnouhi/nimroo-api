import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as cookieParser from 'cookie-parser';

async function loginAndGetToken(app: INestApplication, email: string, password: string) {

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(201);
  
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    
    return res.headers['set-cookie']?.[0].split(';')[0];
}

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
    await connection.close();
    await app.close();
  });

  afterEach(async () => {
    await connection.collection('users').deleteMany({});
  });

  it('/users (POST) should create a user', async () => {
    const res = await request(app.getHttpServer())
      .post('/user/create')
      .send({ email: 'test@test.com', password: '1234' })
      .expect(201);

    expect(res.body.id).toBeDefined();
  });

  it('/users (GET) should return all users', async () => {
    const token = await loginAndGetToken(app, 'auth@test.com', '1234');
    await request(app.getHttpServer())
        .post('/user/create')
        .send({ email: 'a12@test.com', password: '1234' });

    const res = await request(app.getHttpServer())
        .get('/user/list')
        .set('Cookie', token)
        .expect(200);
    expect(res.body).toHaveLength(2);
  });

});

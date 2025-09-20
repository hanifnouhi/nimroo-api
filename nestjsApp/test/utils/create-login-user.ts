import * as request from 'supertest';

import { INestApplication } from '@nestjs/common';

export async function createAndLoginUser(app: INestApplication) {
  const email = `user${Date.now()}@example.com`;
  const password = 'Nim12@34roo!#';

  // signup
  await request(app.getHttpServer())
    .post('/auth/signup')
    .send({ email, password })
    .expect(201);

  // login
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(201);

  const accessToken = res.headers['set-cookie']?.[0].split(';')[0];
  const refreshToken = res.headers['set-cookie']?.[1].split(';')[0];
  return {
    accessToken,
    refreshToken,
    email,
    password,
  };
}

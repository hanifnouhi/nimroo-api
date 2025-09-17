import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { UserController } from '../../user.controller';
import { UserService } from '../../user.service';
import { LoggerModule } from 'nestjs-pino';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as request from 'supertest';
import pino from 'pino';

const JWT_TEST_SECRET = 'test_secret_key';

class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: JWT_TEST_SECRET,
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}

describe('UserController (E2E with real JWT)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userService: jest.Mocked<UserService>;
  const silentLogger = pino({ enabled: false });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            create: jest.fn().mockImplementation(dto => ({ _id: '1', ...dto })),
            findAll: jest.fn().mockResolvedValue([{ _id: '1', email: 'a@test.com' }]),
          },
        },
        JwtStrategy,
      ],
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: JWT_TEST_SECRET, signOptions: { expiresIn: '1h' } }),
        LoggerModule.forRoot({ pinoHttp: { logger: silentLogger } }),
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    jwtService = module.get(JwtService);
    userService = module.get(UserService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /user/create should create user', async () => {
    const dto = { email: 'valid@test.com', password: 'StrongPass123!' };

    const res = await request(app.getHttpServer())
      .post('/user/create')
      .send(dto);

    expect(res.status).toBe(201);
    expect(res.body.email).toBe(dto.email);
    expect(userService.create).toHaveBeenCalledWith(dto);
  });

  it('GET /user/list should reject without token', async () => {
    const res = await request(app.getHttpServer()).get('/user/list');
    expect(res.status).toBe(401); // Unauthorized
  });

  it('GET /user/list should return users with valid token', async () => {
    const token = jwtService.sign({ sub: 'test-user', email: 'valid@test.com' });

    const res = await request(app.getHttpServer())
      .get('/user/list')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ _id: '1', email: 'a@test.com' }]);
  });
});

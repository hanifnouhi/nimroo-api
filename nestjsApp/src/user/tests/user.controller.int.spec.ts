import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LoggerModule } from 'nestjs-pino';
import * as request from 'supertest';
import pino from 'pino';
import { APP_GUARD } from '@nestjs/core';
import { QuerySanitizerService } from '../../common/services/query-sanitizer.service';

describe('UserController (Integration)', () => {
  let app: INestApplication;
  let userService: jest.Mocked<UserService>;
  let querySanitizerService: jest.Mocked<QuerySanitizerService>;
  const silentLogger = pino({ enabled: false });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
          },
        },
        {
          provide: QuerySanitizerService,
          useValue: {
            sanitizeFilter: jest.fn(),
            sanitizeProjection: jest.fn()
          }
        }
      ],
      imports: [LoggerModule.forRoot({ pinoHttp: { logger: silentLogger } })],
    })
      .overrideGuard(APP_GUARD)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    userService = module.get(UserService);
    querySanitizerService = module.get(QuerySanitizerService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /user/create - validation', () => {
    const url = '/user/create';

    it('should reject empty email', async () => {
      const dto = { email: '', password: 'StrongPass123!' };
      const res = await request(app.getHttpServer()).post(url).send(dto);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('email should not be empty');
    });

    it('should reject invalid email format', async () => {
      const dto = { email: 'invalid-email', password: 'StrongPass123!' };
      const res = await request(app.getHttpServer()).post(url).send(dto);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('email must be an email');
    });

    it('should reject short email', async () => {
      const dto = { email: 'a@b.com', password: 'StrongPass123!' };
      const res = await request(app.getHttpServer()).post(url).send(dto);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('email must be longer than or equal to 10 characters');
    });

    it('should reject too long email', async () => {
      const longEmail = 'a'.repeat(51) + '@test.com';
      const dto = { email: longEmail, password: 'StrongPass123!' };
      const res = await request(app.getHttpServer()).post(url).send(dto);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('email must be shorter than or equal to 50 characters');
    });

    it('should reject empty password', async () => {
      const dto = { email: 'valid@test.com', password: '' };
      const res = await request(app.getHttpServer()).post(url).send(dto);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('password should not be empty');
    });

    it('should reject short password', async () => {
      const dto = { email: 'valid@test.com', password: 'Abc1!' };
      const res = await request(app.getHttpServer()).post(url).send(dto);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('password must be longer than or equal to 8 characters');
    });

    it('should reject long password', async () => {
      const dto = { email: 'valid@test.com', password: 'Abcdefghijklmnop123!' }; // >16 chars
      const res = await request(app.getHttpServer()).post(url).send(dto);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('password must be shorter than or equal to 16 characters');
    });

    it('should reject weak password', async () => {
      const dto = { email: 'valid@test.com', password: 'abcdefgh' };
      const res = await request(app.getHttpServer()).post(url).send(dto);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('password is not strong enough');
    });

    it('should allow missing name (optional)', async () => {
      const dto = { email: 'valid@test.com', password: 'StrongPass123!' };
      userService.create.mockResolvedValue({ _id: '1', ...dto, toObject: jest.fn() } as any);

      const res = await request(app.getHttpServer()).post(url).send(dto);
      expect(res.status).toBe(201);
      expect(userService.create).toHaveBeenCalledWith(dto);
    });

    it('should reject too long name', async () => {
      const dto = { email: 'valid@test.com', password: 'StrongPass123!', name: 'a'.repeat(31) };
      const res = await request(app.getHttpServer()).post(url).send(dto);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('name must be shorter than or equal to 30 characters');
    });

    it('should reject non-string name', async () => {
      const dto: any = { email: 'valid@test.com', password: 'StrongPass123!', name: 1234 };
      const res = await request(app.getHttpServer()).post(url).send(dto);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('name must be a string');
    });

    it('should accept valid dto with all fields', async () => {
      const dto = { email: 'valid@test.com', password: 'StrongPass123!', name: 'nimroo' };
      const result = { id: '1', ...dto, toObject: jest.fn().mockReturnValue(dto) };
      userService.create.mockResolvedValue(result as any);

      const res = await request(app.getHttpServer()).post(url).send(dto);

      expect(res.status).toBe(201);
      expect(res.body).toEqual(expect.objectContaining({email: dto.email, name: dto.name}));
      expect(userService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('GET /user/list', () => {
    it('should return users', async () => {
      const users = [{ id: '1', email: 'a@test.com', name: 'User' }];
      userService.findAll.mockResolvedValue(users as any);

      const res = await request(app.getHttpServer()).get('/user/list');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(JSON.parse(JSON.stringify(users)));
    });

    it('should return empty array if no users', async () => {
      userService.findAll.mockResolvedValue([]);
      const res = await request(app.getHttpServer()).get('/user/list');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});

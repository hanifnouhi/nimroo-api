import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { UserRepository } from '../user.repository';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { createMockConfigService } from '../../../test/mocks/use-mocker';
import { ConfigModule, ConfigService } from '@nestjs/config';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';

describe('UserService - Integration (Real MongoDB)', () => {
  let service: UserService;
  let connection: Connection;
  let silentPinoLogger = pino({ enabled: false });

  beforeAll(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: silentPinoLogger
          }
        }),
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRootAsync({
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => ({
              uri: config.get<string>('DATABASE_URI'),
            }),
          }),
          MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
      providers: [
        UserService, 
        UserRepository
      ],
    })
    .overrideProvider(ConfigService)
      .useValue(
        createMockConfigService({
          DATABASE_URI: 'mongodb://127.0.0.1:27017/nimroo-test',
        }),
      )
    .compile();

    service = module.get<UserService>(UserService);
    connection = module.get<Connection>(getConnectionToken());

    jest.spyOn((service as any).logger, 'debug');
    jest.spyOn((service as any).logger, 'info');
    jest.spyOn((service as any).logger, 'warn');
    jest.spyOn((service as any).logger, 'error');
    jest.spyOn((service as any).logger, 'fatal');
    jest.spyOn((service as any).logger, 'setContext');
  });

  afterAll(async () => {
    await connection.close();
  });

  afterEach(async () => {
    await connection.collection('users').deleteMany({});
  });

  it('should create and find user by email', async () => {
    const user = await service.create({ email: 'test@test.com', password: '1234' });
    expect(user.id).toBeDefined();

    const found = await service.findByEmail('test@test.com');
    expect(found?.email).toBe('test@test.com');
    expect(found?.password).not.toBe('1234');
  });

  it('should update a user', async () => {
    const user = await service.create({ email: 'test@test.com', password: '1234' });
    const updated = await service.update(user.id.toString(), { phone: '0612345678' });
    expect(updated?.phone).toBe('0612345678');
  });

  it('should return all users', async () => {
    await service.create({ email: 'a@test.com', password: '1234' });
    await service.create({ email: 'b@test.com', password: '1234' });

    const users = await service.findAll({}, {});
    expect(users).toHaveLength(2);
  });
});

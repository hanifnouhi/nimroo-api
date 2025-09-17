import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { CreateUserDto } from '../dtos/create-user.dto';
import pino from 'pino';

describe('UserController (Unit)', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;
  const silentLogger = pino({ enabled: false });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
          },
        }
      ],
      imports: [LoggerModule.forRoot({ pinoHttp: { logger: silentLogger } })],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (context: ExecutionContext) => true })
      .compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  describe('createUser', () => {
    it('should call userService.create with dto and return result', async () => {
      const dto: CreateUserDto = { email: 'test@test.com', password: '123456', name: 'Test' };
      const result = { _id: '1', email: dto.email, name: dto.name };

      userService.create.mockResolvedValue(result as any);

      const response = await controller.createUser(dto);

      expect(userService.create).toHaveBeenCalledWith(dto);
      expect(response).toEqual(result);
    });

    it('should propagate error if userService.create fails', async () => {
      const dto: CreateUserDto = { email: 'fail@test.com', password: '123456' };
      const error = new Error('Database error');
      userService.create.mockRejectedValue(error);

      await expect(controller.createUser(dto)).rejects.toThrow(error);
    });
  });

  describe('getUsers', () => {
    it('should return list of users from userService.findAll', async () => {
      const users = [
        { _id: '1', email: 'u1@test.com', name: 'User1' },
        { _id: '2', email: 'u2@test.com', name: 'User2' },
      ];

      userService.findAll.mockResolvedValue(users as any);

      const response = await controller.getUsers();

      expect(userService.findAll).toHaveBeenCalled();
      expect(response).toEqual(users);
    });

    it('should return null if no users found', async () => {
      userService.findAll.mockResolvedValue(null);

      const response = await controller.getUsers();

      expect(response).toBeNull();
      expect(userService.findAll).toHaveBeenCalled();
    });

    it('should propagate error if userService.findAll fails', async () => {
      const error = new Error('DB connection lost');
      userService.findAll.mockRejectedValue(error);

      await expect(controller.getUsers()).rejects.toThrow(error);
    });
  });
});

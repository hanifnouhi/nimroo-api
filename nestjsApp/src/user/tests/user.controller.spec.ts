import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { CreateUserDto } from '../dtos/create-user.dto';
import pino from 'pino';
import { QuerySanitizerService } from '../../common/services/query-sanitizer.service';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserGoal } from '../user.enums';

describe('UserController (Unit)', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;
  let querySanitizerService: jest.Mocked<QuerySanitizerService>;
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
            update: jest.fn(),
            delete: jest.fn(),
            hashPassword: jest.fn(),
            updateRefreshToken: jest.fn(),
            changePassword: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: QuerySanitizerService,
          useValue: {
            sanitizeFilter: jest.fn(),
            sanitizeProjection: jest.fn(),
          },
        },
      ],
      imports: [LoggerModule.forRoot({ pinoHttp: { logger: silentLogger } })],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (context: ExecutionContext) => true })
      .compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
    querySanitizerService = module.get(QuerySanitizerService);
  });

  describe('create', () => {
    it('should call userService.create with dto and return result', async () => {
      const dto: CreateUserDto = {
        email: 'test@test.com',
        password: '123456',
        name: 'Test',
      };
      const mockedUser = { id: '1', email: dto.email, name: dto.name };
      const result = {
        ...mockedUser,
        toObject: jest.fn().mockReturnValue(mockedUser),
      };

      userService.create.mockResolvedValue(result as any);

      const response = await controller.create(dto);

      expect(userService.create).toHaveBeenCalledWith(dto);
      expect(response).toEqual(expect.objectContaining(mockedUser));
    });

    it('should propagate error if userService.create fails', async () => {
      const dto: CreateUserDto = { email: 'fail@test.com', password: '123456' };
      const error = new Error('Database error');
      userService.create.mockRejectedValue(error);

      await expect(controller.create(dto)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    it('should call userService.update with id and dto and return result', async () => {
      const id = '1';
      const dto: UpdateUserDto = {
        name: 'Test',
        phone: '1234567890',
        avatar: 'https://example.com/avatar.jpg',
        dateOfBirth: '1990-01-01',
        language: 'en',
        notificationEnabled: true,
        gender: 'male',
        goal: UserGoal.Language,
        sourceLanguage: 'en',
        targetLanguage: ['fr', 'es'],
        interests: ['reading', 'traveling'],
      };
      const mockedUser = { id: '1', name: dto.name };
      const result = {
        ...mockedUser,
        toObject: jest.fn().mockReturnValue(mockedUser),
      };

      userService.update.mockResolvedValue(result as any);

      const response = await controller.update({ user: { userId: id } }, dto);

      expect(userService.update).toHaveBeenCalledWith(id, dto);
      expect(response).toEqual(expect.objectContaining(mockedUser));
    });

    it('should propagate error if userService.update fails', async () => {
      const id = '1';
      const dto: UpdateUserDto = {
        name: 'Test',
        phone: '1234567890',
        avatar: 'https://example.com/avatar.jpg',
        dateOfBirth: '1990-01-01',
        language: 'en',
        notificationEnabled: true,
        gender: 'male',
        goal: UserGoal.Language,
        sourceLanguage: 'en',
        targetLanguage: ['fr', 'es'],
        interests: ['reading', 'traveling'],
      };
      const error = new Error('Database error');
      userService.update.mockRejectedValue(error);

      await expect(
        controller.update({ user: { userId: id } }, dto),
      ).rejects.toThrow(error);
    });
  });

  describe('delete', () => {
    it('should call userService.delete with id and return result', async () => {
      const id = '1';
      const mockedUser = { id: '1', name: 'Test' };
      const result = {
        ...mockedUser,
        toObject: jest.fn().mockReturnValue(mockedUser),
      };

      userService.delete.mockResolvedValue(result as any);

      const response = await controller.delete(id);

      expect(userService.delete).toHaveBeenCalledWith(id);
      expect(response).toEqual(expect.objectContaining(mockedUser));
    });

    it('should propagate error if userService.delete fails', async () => {
      const id = '1';
      const error = new Error('Database error');
      userService.delete.mockRejectedValue(error);

      await expect(controller.delete(id)).rejects.toThrow(error);
    });
  });

  describe('getUser', () => {
    it('should call userService.findById with id and return result', async () => {
      const id = '1';
      const mockedUser = { id: '1', name: 'Test' };
      const result = {
        ...mockedUser,
        toObject: jest.fn().mockReturnValue(mockedUser),
      };

      userService.findById.mockResolvedValue(result as any);

      const response = await controller.getUser({ user: { userId: id } });

      expect(userService.findById).toHaveBeenCalledWith(id);
      expect(response).toEqual(expect.objectContaining(mockedUser));
    });

    it('should throw NotFoundException if user is not found', async () => {
      const id = '1';
      userService.findById.mockResolvedValue(null);

      await expect(controller.getUserAdmin(id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate error if userService.findById fails', async () => {
      const id = '1';
      const error = new Error('Database error');
      userService.findById.mockRejectedValue(error);

      await expect(controller.getUserAdmin(id)).rejects.toThrow(error);
    });
  });

  describe('getUserAdmin', () => {
    it('should call userService.findById with id and return result', async () => {
      const id = '1';
      const mockedUser = { id: '1', name: 'Test' };
      const result = {
        ...mockedUser,
        toObject: jest.fn().mockReturnValue(mockedUser),
      };

      userService.findById.mockResolvedValue(result as any);

      const response = await controller.getUserAdmin(id);

      expect(userService.findById).toHaveBeenCalledWith(id);
      expect(response).toEqual(expect.objectContaining(mockedUser));
    });

    it('should throw NotFoundException if user is not found', async () => {
      const id = '1';
      userService.findById.mockResolvedValue(null);

      await expect(controller.getUserAdmin(id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should propagate error if userService.findById fails', async () => {
      const id = '1';
      const error = new Error('Database error');
      userService.findById.mockRejectedValue(error);

      await expect(controller.getUserAdmin(id)).rejects.toThrow(error);
    });
  });

  describe('getUsers', () => {
    it('should return list of users from userService.findAll', async () => {
      const users = [
        { id: '1', email: 'u1@test.com', name: 'User1' },
        { id: '2', email: 'u2@test.com', name: 'User2' },
      ];

      userService.findAll.mockResolvedValue(users as any);

      const response = await controller.getUsers();

      expect(userService.findAll).toHaveBeenCalled();
      expect(response).toEqual(users);
    });

    it('should return null if no users found', async () => {
      userService.findAll.mockResolvedValue(null);

      const response = await controller.getUsers();

      expect(response).toEqual([]);
      expect(userService.findAll).toHaveBeenCalled();
    });

    it('should propagate error if userService.findAll fails', async () => {
      const error = new Error('DB connection lost');
      userService.findAll.mockRejectedValue(error);

      await expect(controller.getUsers()).rejects.toThrow(error);
    });
  });
});

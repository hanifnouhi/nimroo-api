import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { UserRepository } from '../user.repository';
import * as bcrypt from 'bcrypt';
import { UserDocument } from '../schemas/user.schema';
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';

describe('UserService - Unit', () => {
  let service: UserService;
  let userRepository: jest.Mocked<UserRepository>;
  const silentPinoLogger = pino({ enabled: false });

  beforeEach(async () => {
    jest.resetAllMocks();
    const mockRepo = {
      findOneWithPassword: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: silentPinoLogger
          },
        }),
      ],
      providers: [
        UserService,
        { provide: UserRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(UserRepository);

    jest.spyOn((service as any).logger, 'debug');
    jest.spyOn((service as any).logger, 'info');
    jest.spyOn((service as any).logger, 'warn');
    jest.spyOn((service as any).logger, 'error');
    jest.spyOn((service as any).logger, 'fatal');
    jest.spyOn((service as any).logger, 'setContext');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = { email: 'test@test.com' } as any;
      userRepository.findOneWithPassword.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@test.com');
      expect(result).toEqual(mockUser);
    });

    it('should return null when not found', async () => {
      userRepository.findOneWithPassword.mockResolvedValue(null);

      const result = await service.findByEmail('missing@test.com');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should hash password before saving', async () => {
      const data = { email: 'test@test.com', password: '1234' } as any;
      userRepository.create.mockImplementation(async (u) => u as UserDocument);

      const result = await service.create(data);

      expect(result.password).not.toBe('1234');
      expect(await bcrypt.compare('1234', result.password)).toBe(true);
    });
  });

  describe('update', () => {
    it('should call repository with right args', async () => {
      const updatedUser = { _id: '1', name: 'Updated' } as any;
      userRepository.findOneAndUpdate.mockResolvedValue(updatedUser);

      const result = await service.update('1', { name: 'Updated' } as any);
      expect(result).toEqual(updatedUser);
      expect(userRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '1' },
        { name: 'Updated' },
      );
    });
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      userRepository.find.mockResolvedValue({data: [{ email: 'a@test.com' }]} as any);

      const result = await service.findAll({}, {});
      expect(result).toHaveLength(1);
    });
  });

  describe('updateVerificationEmailSentAt', () => {
    const userId = '123qefasd587899a';

    it('should update verificationEmailSentAt field', async () => {
      userRepository.findOneAndUpdate.mockResolvedValue({ verificationEmailSentAt: new Date() } as any);
      const result = await service.updateVerificationEmailSentAt(userId);
      expect(userRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: userId },
        { verificationEmailSentAt: expect.any(Date) },
      );
    });

    it('should throw error if user is not found', async () => {
      userRepository.findOneAndUpdate.mockRejectedValue(new Error('Error in updating verificationEmailSentAt for user with id: 123qefasd587899a.'));
      await expect(service.updateVerificationEmailSentAt(userId)).rejects.toThrow(InternalServerErrorException);
    });
    
  });
});

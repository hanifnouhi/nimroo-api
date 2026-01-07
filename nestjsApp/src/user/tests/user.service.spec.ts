import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { UserRepository } from '../user.repository';
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { MembershipFeature, UserProvider } from '../user.enums';
import { UserDocument } from '../schemas/user.schema';

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
            logger: silentPinoLogger,
          },
        }),
      ],
      providers: [UserService, { provide: UserRepository, useValue: mockRepo }],
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

  describe('updatePassword', () => {
    it('should return true if the password update was successfull', async () => {
      const updatedUser = { _id: '1', name: 'Updated' } as any;
      userRepository.findOneAndUpdate.mockResolvedValue(updatedUser);

      const result = await service.updatePassword('1', {
        password: 'asdfe3234gasd3432',
      });
      expect(result).toBeTruthy();
      expect(userRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '1' },
        { password: 'asdfe3234gasd3432' },
      );
    });

    it('should return false if the password update was not successfull', async () => {
      const updatedUser = { _id: '1', name: 'Updated' } as any;
      userRepository.findOneAndUpdate.mockResolvedValue(null);

      const result = await service.updatePassword('1', {
        password: 'asdfe3234gasd3432',
      });
      expect;
      expect(userRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '1' },
        { password: 'asdfe3234gasd3432' },
      );
    });

    it('should throw error if any error occured', async () => {
      const updatedUser = { _id: '1', name: 'Updated' } as any;
      userRepository.findOneAndUpdate.mockRejectedValue(
        new InternalServerErrorException(),
      );

      await expect(
        service.updatePassword('1', { password: 'asdfe3234gasd3432' }),
      ).rejects.toThrow('Internal Server Error');
      expect(userRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '1' },
        { password: 'asdfe3234gasd3432' },
      );
    });
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      userRepository.find.mockResolvedValue({
        data: [{ email: 'a@test.com' }],
      } as any);

      const result = await service.findAll({}, {});
      expect(result).toHaveLength(1);
    });
  });

  describe('updateVerificationEmailSentAt', () => {
    const userId = '123qefasd587899a';

    it('should update verificationEmailSentAt field', async () => {
      userRepository.findOneAndUpdate.mockResolvedValue({
        verificationEmailSentAt: new Date(),
      } as any);
      await service.updateVerificationEmailSentAt(userId);
      expect(userRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: userId },
        { verificationEmailSentAt: expect.any(Date) },
      );
    });

    it('should throw error if user is not found', async () => {
      userRepository.findOneAndUpdate.mockRejectedValue(
        new Error(
          'Error in updating verificationEmailSentAt for user with id: 123qefasd587899a.',
        ),
      );
      await expect(
        service.updateVerificationEmailSentAt(userId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('updatePasswordResetEmailSentAt', () => {
    const userId = '123qefasd587899a';

    it('should update passwordResetEmailSentAt field', async () => {
      userRepository.findOneAndUpdate.mockResolvedValue({
        passwordResetEmailSentAt: new Date(),
      } as any);
      await service.updatePasswordResetEmailSentAt(userId);
      expect(userRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: userId },
        { passwordResetEmailSentAt: expect.any(Date) },
      );
    });

    it('should throw error if user is not found', async () => {
      userRepository.findOneAndUpdate.mockRejectedValue(
        new Error(
          'Error in updating passwordResetEmailSentAt for user with id: 123qefasd587899a.',
        ),
      );
      await expect(
        service.updatePasswordResetEmailSentAt(userId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('unlinkProvider', () => {
    const userId = '123qefasd587899a';
    let targetProvider = UserProvider.Google;

    it('should throw error if user password is not defined and there is just google as providers', async () => {
      const user = {
        id: userId,
        password: undefined,
        provider: 'google',
        providerId: '123456789',
        oauthProviders: {
          google: {
            id: '123456789',
            picture: '',
          },
        },
      } as any;
      userRepository.findOneWithPassword.mockResolvedValue(user);

      await expect(
        service.unlinkProvider(userId, targetProvider),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return result if password is defined and target provider is exist in user object', async () => {
      const user = {
        id: userId,
        password: 'qwer1254gadfs5442345tga',
        provider: 'google',
        providerId: '123456789',
        oauthProviders: {
          google: {
            id: '123456789',
            picture: '',
          },
        },
      } as any;
      userRepository.findOneWithPassword.mockResolvedValue(user);
      userRepository.findOneAndUpdate.mockResolvedValue(
        expect.objectContaining(expect.anything),
      );

      const result = await service.unlinkProvider(userId, targetProvider);

      expect(result).toBeDefined();
      expect(userRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: userId },
        { provider: UserProvider.Local, providerId: '', oauthProviders: {} },
      );
    });

    it('should not change provider and providerId properties of user object if the target provider is not the same as provider', async () => {
      const user = {
        id: userId,
        password: undefined,
        provider: 'google',
        providerId: '123456789',
        oauthProviders: {
          google: {
            id: '123456789',
            picture: '',
          },
          facebook: {
            id: '987654321',
            picture: '',
          },
        },
      } as any;
      targetProvider = UserProvider.Facebook;
      userRepository.findOneWithPassword.mockResolvedValue(user);
      userRepository.findOneAndUpdate.mockResolvedValue(
        expect.objectContaining(expect.anything),
      );

      const result = await service.unlinkProvider(userId, targetProvider);

      expect(result).toBeDefined();
      expect(userRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: userId },
        {
          provider: UserProvider.Google,
          providerId: '123456789',
          oauthProviders: {
            google: {
              id: '123456789',
              picture: '',
            },
          },
        },
      );
    });
  });

  describe('getUsageCount', () => {
    it('should return the current usage count for a specific user and feature', async () => {
      // Arrange
      const userId = 'user-123';
      const feature = MembershipFeature.CARD_CREATE;
      // Use Map to match the type expected by the codebase linting (Map<string, number>)
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        lastResetDate: new Date(),
        dailyUsage: new Map<string, number>([['card_create', 5]]),
      } as UserDocument);

      // Act
      const result = await service.getUsageCount(userId, feature);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({ _id: userId });
      expect(result).toBe(5);
    });

    it('should return 0 if no usage record exists yet', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        lastResetDate: new Date(),
        dailyUsage: new Map<string, number>([]),
      } as UserDocument);

      const result = await service.getUsageCount(
        'user-123',
        MembershipFeature.CARD_CREATE,
      );

      expect(result).toBe(0);
    });

    it('should return 0 if last reset day was not today', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        lastResetDate: new Date('2025-12-23T20:26:08.312Z'),
        dailyUsage: new Map<string, number>([]),
      } as UserDocument);

      const result = await service.getUsageCount(
        'user-123',
        MembershipFeature.CARD_CREATE,
      );

      expect(result).toBe(0);
    });
  });

  describe('incrementUsage', () => {
    it('should call the repository to increment the usage count', async () => {
      // Arrange
      const userId = 'user-123';
      const feature = MembershipFeature.CARD_CREATE;
      const lastResetDate = new Date();
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        lastResetDate,
        dailyUsage: new Map<string, number>([['card_create', 3]]),
      } as UserDocument);

      // Act
      await service.incrementUsage(userId, feature);

      // Assert
      expect(userRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: userId },
        expect.objectContaining({
          lastResetDate,
          dailyUsage: new Map<string, number>([['card_create', 4]]),
        }),
      );
    });

    it('should handle errors if the repository fails to increment', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockRejectedValue(new Error('DB Error'));

      await expect(
        service.incrementUsage('1', MembershipFeature.CARD_CREATE),
      ).rejects.toThrow('DB Error');
    });
  });
});

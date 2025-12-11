import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';
import { JsonWebTokenError, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import pino from 'pino';
import { EmailService } from '../../email/email.service';

describe('AuthService - Unit', () => {
  let service: AuthService;
  let userService: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;
  let emailService: jest.Mocked<EmailService>;
  const slientPinoLogger = pino({ enabled: false });
  const userId = '123qefasd587899a';
  const userEmail = 'test@test.com';
  const token = '123rwefasdf465arwe989';

  beforeEach(async () => {
    userService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      updateRefreshToken: jest.fn(),
      updateVerificationEmailSentAt: jest.fn(),
      updatePasswordResetEmailSentAt: jest.fn()
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
      verify: jest.fn().mockReturnValue({ userId: '23afasdf234243' })
    };
    configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_TOKEN_EXPIRATION_MS') return '3600000';
        if (key === 'JWT_REFRESH_TOKEN_EXPIRATION_MS') return '86400000';
        if (key === 'JWT_ACCESS_TOKEN_SECRET') return 'access-secret';
        if (key === 'JWT_REFRESH_TOKEN_SECRET') return 'refresh-secret';
        if (key === 'JWT_EMAIL_SECRET' || key === 'JWT_RESET_PASSWORD_SECRET') return 'verify-secret';
        if (key === 'AUTH_UI_REDIRECT') return '/dashboard';
        return '';
      }),
      get: jest.fn((key: string) => (key === 'NODE_ENV' ? 'test' : '')),
    };
    const mockEmailService = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn()
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: slientPinoLogger
          },
        }),
      ],
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: EmailService, useValue: mockEmailService }
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    emailService = module.get(EmailService);
    jwtService = module.get(JwtService);
    userService = module.get(UserService);

    jest.spyOn((service as any).logger, 'debug');
    jest.spyOn((service as any).logger, 'info');
    jest.spyOn((service as any).logger, 'warn');
    jest.spyOn((service as any).logger, 'error');
    jest.spyOn((service as any).logger, 'fatal');
    jest.spyOn((service as any).logger, 'setContext');
  });

  describe('validateUser', () => {
    it('should return user dto if password matches', async () => {
      const mockUser = {
        id: '1',
        email: 'a@test.com',
        password: 'hashed',
        toJSON: () => ({ id: '1', email: 'a@test.com', password: 'hashed' }),
      };
      userService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(service, 'comparePasswords').mockResolvedValue(true);

      const result = await service.validateUser('a@test.com', '123456');

      expect(result).toMatchObject({ id: '1', email: 'a@test.com' });
      expect((service as any).logger.debug).toHaveBeenCalledWith(expect.stringContaining('validate user'));
      expect((service as any).logger.info).toHaveBeenCalledWith(expect.stringContaining('successfully validated'));
    });

    it('should throw InternalServerErrorException and log error if something fails', async () => {
      userService.findByEmail.mockRejectedValue(new Error('DB error'));

      await expect(service.validateUser('a@test.com', '123456')).rejects.toThrow(InternalServerErrorException);
      expect((service as any).logger.debug).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should set cookies and update refresh token', async () => {
      const user = { id: '1', email: 'a@test.com' } as any;
      const response = { cookie: jest.fn(), redirect: jest.fn() } as unknown as Response;

      await service.login(user, response);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(userService.updateRefreshToken).toHaveBeenCalledWith('1', expect.objectContaining({ refreshToken: expect.any(String) }));
      expect(response.cookie).toHaveBeenCalledWith('Authentication', 'signed-token', expect.any(Object));
      expect((service as any).logger.info).toHaveBeenCalledWith(expect.stringContaining('tokens cookies were set'));
    });

    it('should redirect if redirect flag is true', async () => {
      const user = { id: '1', email: 'a@test.com' } as any;
      const response = { cookie: jest.fn(), redirect: jest.fn() } as unknown as Response;

      await service.login(user, response, true);

      expect(response.redirect).toHaveBeenCalledWith('/dashboard');
      expect((service as any).logger.debug).toHaveBeenCalledWith(expect.stringContaining('Redirect to'));
    });

    it('should throw InternalServerErrorException and log error on failure', async () => {
      const user = { id: '1', email: 'a@test.com' } as any;
      const response = { cookie: jest.fn(), redirect: jest.fn() } as unknown as Response;
      userService.updateRefreshToken.mockRejectedValue(new Error('update error'));

      await expect(service.login(user, response)).rejects.toThrow(InternalServerErrorException);
      expect((service as any).logger.error).toHaveBeenCalled();
    });
  });

  describe('veryifyUserRefreshToken', () => {
    it('should return user if refresh token matches', async () => {
      const user = { id: '1', refreshToken: 'hashed' };
      userService.findById.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as any);
  
      const result = await service.veryifyUserRefreshToken('raw-token', '1');
  
      expect(result).toBe(user);
      expect((service as any).logger.info).toHaveBeenCalledWith(expect.stringContaining('refresh token verified'));
    });
  
    it('should throw UnauthorizedException if refresh token does not match', async () => {
      const user = { id: '1', refreshToken: 'hashed' };
      userService.findById.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as any);
  
      await expect(service.veryifyUserRefreshToken('wrong-token', '1'))
        .rejects.toThrow(UnauthorizedException);
  
      expect((service as any).logger.error).toHaveBeenCalled();
    });
  
    it('should throw NotFoundException if user is not found', async () => {
      userService.findById.mockResolvedValue(null);
  
      await expect(service.veryifyUserRefreshToken('any-token', '1'))
        .rejects.toThrow(NotFoundException);
  
      expect((service as any).logger.error).toHaveBeenCalled();
    });
  
    it('should throw InternalServerErrorException for unexpected errors', async () => {
      userService.findById.mockRejectedValue(new Error('DB is down'));
  
      await expect(service.veryifyUserRefreshToken('any-token', '1'))
        .rejects.toThrow(InternalServerErrorException);
  
      expect((service as any).logger.error).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should generate a token for verifying user email', async () => {
      await service.verifyEmail(userId, userEmail);

      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should call sendVerificationEmail from email module', async () => {
      jwtService.sign.mockReturnValue(token);
      await service.verifyEmail(userId, userEmail);
      
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(userEmail, token);
    });

    it('should call updateVerificationEmailSentAt from user module', async () => {
      jwtService.sign.mockReturnValue(token);
      const updateVerificationEmailSentAtSpy = jest.spyOn(userService, 'updateVerificationEmailSentAt').mockResolvedValue(undefined);
      await service.verifyEmail(userId, userEmail);
      expect(updateVerificationEmailSentAtSpy).toHaveBeenCalledWith(userId);
    });

    it('should return true if the verification email sent successfully', async () => {
      jwtService.sign.mockReturnValue(token);
      // emailService.sendVerificationEmail.mockResolvedValue(expect.any);
      const result = await service.verifyEmail(userId, userEmail);

      expect(result).toBeTruthy();
    });

    it('should return false if the verification email not sent', async () => {
      jwtService.sign.mockReturnValue(token);
      emailService.sendVerificationEmail.mockRejectedValue(new Error('Error in sending verification email to test@test.com'));
      const result = await service.verifyEmail(userId, userEmail);

      expect(result).toBeFalsy();
    });

  });

  describe('sendPasswordResetEmail', () => {
    it('should generate a token for password reset email', async () => {
      userService.findByEmail.mockResolvedValue({ id: userId, email: userEmail, isVerified: false } as any);
      await service.sendPasswordResetEmail(userEmail);

      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should call sendPasswordResetEmail from email module', async () => {
      userService.findByEmail.mockResolvedValue({ id: userId, email: userEmail, isVerified: false } as any);
      jwtService.sign.mockReturnValue(token);
      await service.sendPasswordResetEmail(userEmail);
      
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(userEmail, token);
    });

    it('should call updatePasswordResetEmailSentAt from user module', async () => {
      userService.findByEmail.mockResolvedValue({ id: userId, email: userEmail, isVerified: false } as any);
      jwtService.sign.mockReturnValue(token);
      const updatePasswordResetEmailSentAtSpy = jest.spyOn(userService, 'updatePasswordResetEmailSentAt').mockResolvedValue(undefined);
      await service.sendPasswordResetEmail(userEmail);

      expect(updatePasswordResetEmailSentAtSpy).toHaveBeenCalledWith(userId);
    });

    it('should return true if the password reset email sent successfully', async () => {
      userService.findByEmail.mockResolvedValue({ id: userId, email: userEmail, isVerified: false } as any);
      jwtService.sign.mockReturnValue(token);
      const result = await service.sendPasswordResetEmail(userEmail);

      expect(result).toBeTruthy();
    });

    it('should return false if the verification email not sent', async () => {
      userService.findByEmail.mockResolvedValue({ id: userId, email: userEmail, isVerified: false } as any);
      jwtService.sign.mockReturnValue(token);
      emailService.sendPasswordResetEmail.mockRejectedValue(new Error('Error in sending password reset email to test@test.com'));
      const result = await service.sendPasswordResetEmail(userEmail);

      expect(result).toBeFalsy();
    });

    it('should throw NotFoundException if user is not found', async () => {
      userService.findByEmail.mockResolvedValue(null);
      await expect(service.sendPasswordResetEmail(userEmail)).rejects.toThrow(NotFoundException);
    });

  });
  
  describe('resendVerificationEmail', () => {
    it('should call verifyEmail and return true if the verification email sent successfully', async () => {
      userService.findByEmail.mockResolvedValue({ id: userId, email: userEmail, isVerified: false } as any);
      emailService.sendVerificationEmail.mockResolvedValue(true);
      const verifyEmailSpy = jest.spyOn(service, 'verifyEmail').mockResolvedValue(true);
      const result = await service.resendVerificationEmail(userEmail);
      expect(verifyEmailSpy).toHaveBeenCalledWith(userId, userEmail);
      expect(result).toBeTruthy();
    });
    
    it('should throw NotFoundException if user is not found', async () => {
      userService.findByEmail.mockResolvedValue(null);
      await expect(service.resendVerificationEmail(userEmail)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is already verified', async () => {
      userService.findByEmail.mockResolvedValue({ id: userId, email: userEmail, isVerified: true } as any);
      await expect(service.resendVerificationEmail(userEmail)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if last verification email sent less than 24 hours ago', async () => {
      userService.findByEmail.mockResolvedValue({ id: userId, email: userEmail, isVerified: false, verificationEmailSentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000) } as any);
      await expect(service.resendVerificationEmail(userEmail)).rejects.toThrow(BadRequestException);
    });
  });
  
  describe('comparePasswords', () => {
    it('should call bcrypt.compare and log debug', async () => {
      const spy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as any);
      const result = await service.comparePasswords('123', 'hashed');

      expect(spy).toHaveBeenCalledWith('123', 'hashed');
      expect(result).toBe(true);
      expect((service as any).logger.debug).toHaveBeenCalledWith(expect.stringContaining('compare user password'));
    });
  });

  describe('validateVerifyEmailToken', () => {
    it('should call jwt.verify to validate email verify token', async () => {
      const spy = jest.spyOn(jwtService, 'verify');

      await service.validateVerifyEmailToken(token);
      expect(spy).toHaveBeenCalledWith(token, 'verify-secret');
    });

    it('should return false if jwt.verify throws and not call user service update', async () => {
      const spy = jest
        .spyOn(jwtService, 'verify')
        .mockImplementation(() => { throw new JsonWebTokenError('Token is not valid'); });
      const userServiceSpy = jest.spyOn(userService, 'update');

      const result = await service.validateVerifyEmailToken(token);

      expect(spy).toHaveBeenCalledWith(token, 'verify-secret');
      expect(result).toBe(false);
      expect(userServiceSpy).not.toHaveBeenCalled();
    });

    it('should call user service update with userId', async () => {
      const spy = jest.spyOn(userService, 'update');

      const result = await service.validateVerifyEmailToken(token);

      expect(spy).toHaveBeenCalledWith('23afasdf234243', { 'isVerified': true });
      expect(result).toBeTruthy();
    });
  });

  describe('validateResetPasswordToken', () => {
    it('should call jwt.verify to validate reset password token', async () => {
      const spy = jest.spyOn(jwtService, 'verify');

      await service.validateResetPasswordToken(token);
      expect(spy).toHaveBeenCalledWith(token, 'verify-secret');
    });

    it('should return false if jwt.verify throws', async () => {
      const spy = jest
        .spyOn(jwtService, 'verify')
        .mockImplementation(() => { throw new JsonWebTokenError('Token is not valid'); });

      const result = await service.validateResetPasswordToken(token);

      expect(spy).toHaveBeenCalledWith(token, 'verify-secret');
      expect(result).toBe(false);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import pino from 'pino';

describe('AuthService - Unit', () => {
  let service: AuthService;
  let userService: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;
  const slientPinoLogger = pino({ enabled: false });

  beforeEach(async () => {
    userService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };
    configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_TOKEN_EXPIRATION_MS') return '3600000';
        if (key === 'JWT_REFRESH_TOKEN_EXPIRATION_MS') return '86400000';
        if (key === 'JWT_ACCESS_TOKEN_SECRET') return 'access-secret';
        if (key === 'JWT_REFRESH_TOKEN_SECRET') return 'refresh-secret';
        if (key === 'AUTH_UI_REDIRECT') return '/dashboard';
        return '';
      }),
      get: jest.fn((key: string) => (key === 'NODE_ENV' ? 'test' : '')),
    };

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
        { provide: ConfigService, useValue: configService }
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

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
      expect(userService.update).toHaveBeenCalledWith('1', expect.objectContaining({ refreshToken: expect.any(String) }));
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
      userService.update.mockRejectedValue(new Error('update error'));

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
  
  
  describe('comparePasswords', () => {
    it('should call bcrypt.compare and log debug', async () => {
      const spy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as any);
      const result = await service.comparePasswords('123', 'hashed');

      expect(spy).toHaveBeenCalledWith('123', 'hashed');
      expect(result).toBe(true);
      expect((service as any).logger.debug).toHaveBeenCalledWith(expect.stringContaining('compare user password'));
    });
  });
});

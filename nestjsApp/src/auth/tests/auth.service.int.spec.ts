import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import pino from 'pino';
import { UserDto } from '../../user/dtos/user.dto';
import { EmailService } from '../../email/email.service';

class MockUserService {
  private users: any[];

  constructor() {
    const hashed = bcrypt.hashSync('123456', 1);
    this.users = [
      {
        id: '1',
        email: 'a@test.com',
        password: hashed,
        refreshToken: null,
        toJSON() {
          return {
            id: this.id,
            email: this.email,
            password: this.password,
            refreshToken: this.refreshToken,
          };
        },
      },
    ];
  }

  async findByEmail(email: string) {
    return this.users.find((u) => u.email === email) || null;
  }

  async findById(id: string) {
    return this.users.find((u) => u.id === id) || null;
  }

  async update(id: string, update: Partial<any>) {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, update);
    return user;
  }

  async updateRefreshToken(id: string, dto: { refreshToken: string }) {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    user.refreshToken = dto.refreshToken;
    return;
  }
}

describe('AuthService - Integration', () => {
  let service: AuthService;
  let userService: MockUserService;
  const silentPinoLogger = pino({ enabled: false });
  let emailService: jest.Mocked<EmailService>;

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        LoggerModule.forRoot({
          pinoHttp: {
            logger: silentPinoLogger,
          },
        }),
      ],
      providers: [
        AuthService,
        { provide: UserService, useClass: MockUserService },
        { provide: EmailService, useValue: mockEmailService },
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'JWT_ACCESS_TOKEN_SECRET') return 'access-secret';
              if (key === 'JWT_REFRESH_TOKEN_SECRET') return 'refresh-secret';
              if (key === 'JWT_ACCESS_TOKEN_EXPIRATION_MS') return '3600000';
              if (key === 'JWT_REFRESH_TOKEN_EXPIRATION_MS') return '86400000';
              if (key === 'AUTH_UI_REDIRECT') return '/dashboard';
              return '';
            },
            get: (key: string) => (key === 'NODE_ENV' ? 'test' : ''),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(
      UserService,
    ) as unknown as MockUserService;
    emailService = module.get(EmailService);
  });

  describe('validateUser', () => {
    it('should return a user dto if credentials are valid', async () => {
      const user = await service.validateUser('a@test.com', '123456');
      expect(user).toHaveProperty('id', '1');
      expect(user).toHaveProperty('email', 'a@test.com');
    });

    it('should throw UnauthorizedException if credentials are wrong', async () => {
      await expect(service.validateUser('a@test.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      await expect(
        service.validateUser('notfound@test.com', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should set cookies and update refresh token', async () => {
      const user = await service.validateUser('a@test.com', '123456');
      const response = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      await service.login(user as UserDto, response);

      expect(response.cookie).toHaveBeenCalledWith(
        'Authentication',
        expect.any(String),
        expect.any(Object),
      );
      expect(response.cookie).toHaveBeenCalledWith(
        'Refresh',
        expect.any(String),
        expect.any(Object),
      );

      const dbUser = await userService.findById('1');
      expect(dbUser.refreshToken).not.toBeNull();
    });

    it('should redirect if redirect flag is true', async () => {
      const user = await service.validateUser('a@test.com', '123456');
      const response = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      await service.login(user as UserDto, response, true);

      expect(response.redirect).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('veryifyUserRefreshToken', () => {
    it('should return user if refresh token is valid', async () => {
      const user = await service.validateUser('a@test.com', '123456');
      const response = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      // login sets refresh token
      await service.login(user as UserDto, response);
      const refreshCookie = (response.cookie as jest.Mock).mock.calls.find(
        (c) => c[0] === 'Refresh',
      )[1];

      const result = await service.veryifyUserRefreshToken(refreshCookie, '1');
      expect(result).toHaveProperty('id', '1');
    });

    it('should throw UnauthorizedException if refresh token is wrong', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false);
      await expect(
        service.veryifyUserRefreshToken('wrong-token', '1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      await expect(
        service.veryifyUserRefreshToken('whatever', '999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on unexpected errors', async () => {
      jest
        .spyOn(userService, 'findById')
        .mockRejectedValueOnce(new Error('DB down'));
      await expect(
        service.veryifyUserRefreshToken('token', '1'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});

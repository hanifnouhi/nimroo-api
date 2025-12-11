import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { UserService } from '../../user/user.service';
import { UserRepository } from '../../user/user.repository';
import { JwtService } from '@nestjs/jwt';
import { globalUseMocker } from '../../../test/mocks/use-mocker';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { UpdateRefreshTokenDto } from '../dtos/update-refresh-token.dto';
import { pino } from 'pino';
import { LoggerModule } from 'nestjs-pino';
import { AuthService } from '../auth.service';
import { ResendVerificationDto } from '../dtos/resend-verification.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ValidateTokenDto } from '../dtos/validate-token.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let userService: UserService;
  let authService: jest.Mocked<AuthService>;
  let silentPinoLogger = pino({ enabled: false });

  beforeEach(async () => {
    authService = {
      resendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      changePassword: jest.fn(),
      updateRefreshToken: jest.fn(),
      validateVerifyEmailToken: jest.fn(),
      validateResetPasswordToken: jest.fn()
    } as any;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: authService
        },
        {
          provide: UserRepository,
          useValue: jest.fn()
        },
        {
          provide: JwtService,
          useValue: jest.fn()
        }
      ],
      controllers: [AuthController],
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: silentPinoLogger
          },
        }),
      ],
    })
    .useMocker(globalUseMocker)
    .compile();

    controller = module.get<AuthController>(AuthController);
    userService = module.get<UserService>(UserService);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('changePassword', () => {
    it('should call authService.changePassword with id and dto and return result', async () => {
      const id = '1';
      const dto: ChangePasswordDto = { password: '123456' };
      jest.spyOn(authService, 'changePassword').mockResolvedValueOnce(true);

      const response = await controller.changePassword(id, dto);

      expect(authService.changePassword).toHaveBeenCalledWith(id, dto as ChangePasswordDto);
      expect(response).toBeTruthy();
    });

    it('should propagate error if userService.updatePassword fails', async () => {
      const id = '1';
      const dto: ChangePasswordDto = { password: '123456' };
      const error = new Error('Database error');
      const userServiceUpdatePasswordSpy = jest.spyOn(userService, 'updatePassword').mockRejectedValue(error as any);
      jest.spyOn(authService, 'changePassword').mockImplementation((id, dto) =>
        userService.updatePassword(id, dto)
      );
      
      await expect(controller.changePassword(id, dto)).rejects.toThrow(error);
      expect(userServiceUpdatePasswordSpy).rejects.toThrow(error);
    });
  });

  describe('updateRefreshToken', () => {
    it('should call authService.updateRefreshToken with id and dto and return result', async () => {
      const id = '1';
      const dto: UpdateRefreshTokenDto = { refreshToken: '123456' };
      const updateRefreshTokenSpy = jest.spyOn(userService, 'updateRefreshToken').mockResolvedValue(void 0 as any);
      jest.spyOn(authService, 'updateRefreshToken').mockImplementation((id, dto) =>
        userService.updateRefreshToken(id, dto)
      );

      const response = await controller.updateRefreshToken(id, dto);

      expect(authService.updateRefreshToken).toHaveBeenCalledWith(id, dto as UpdateRefreshTokenDto);
      expect(updateRefreshTokenSpy).toHaveBeenCalledWith(id, dto as UpdateRefreshTokenDto);
      expect(response).toEqual(void 0);
    });
  });

  describe('resendVerificationEmail', () => {
    it('should call authService.resendVerificationEmail with email and return result', async () => {
      const email = 'test@test.com';
      jest.spyOn(authService, 'resendVerificationEmail').mockResolvedValueOnce(true as any);

      const response = await controller.resendVerificationEmail({ email } as ResendVerificationDto);

      expect(authService.resendVerificationEmail).toHaveBeenCalledWith(email);
      expect(response).toEqual(true);
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword with email and return result', async () => {
      const email = 'test@test.com';
      jest.spyOn(authService, 'sendPasswordResetEmail').mockResolvedValueOnce(true as any);

      const response = await controller.forgotPassword({ email } as ForgotPasswordDto);

      expect(authService.sendPasswordResetEmail).toHaveBeenCalledWith(email);
      expect(response).toEqual(true);
    })
  });

  describe('validateEmail', () => {
    const token = 'asdf234lkfjalsdkf234';
    
    it('should call authService.validateVerifyEmailToken with token and return result', async () => {
      jest.spyOn(authService, 'validateVerifyEmailToken').mockResolvedValueOnce(true as any);

      const response = await controller.validateVerifyEmailToken({ token } as ValidateTokenDto);

      expect(authService.validateVerifyEmailToken).toHaveBeenCalledWith(token);
      expect(response).toBeTruthy();
    });

    it('should return false if any error occured in authService.validateVerifyEmailToken', async () => {
      jest.spyOn(authService, 'validateVerifyEmailToken').mockResolvedValueOnce(false as any);

      const response = await controller.validateVerifyEmailToken({ token } as ValidateTokenDto);

      expect(authService.validateVerifyEmailToken).toHaveBeenCalledWith(token);
      expect(response).toBeFalsy();
    });
  });

  describe('ResetPassword', () => {
    const token = 'asdf234lkfjalsdkf234';

    it('should call authService.validateResetPasswordToken with token and return result', async () => {
      jest.spyOn(authService, 'validateResetPasswordToken').mockResolvedValueOnce(true as any);

      const response = await controller.validateResetPasswordToken({ token } as ValidateTokenDto);

      expect(authService.validateResetPasswordToken).toHaveBeenCalledWith(token);
      expect(response).toBeTruthy();
    });

    it('should return false if any error occured in authService.validateResetPasswordToken', async () => {
      jest.spyOn(authService, 'validateResetPasswordToken').mockResolvedValueOnce(false as any);

      const response = await controller.validateResetPasswordToken({ token } as ValidateTokenDto);

      expect(authService.validateResetPasswordToken).toHaveBeenCalledWith(token);
      expect(response).toBeFalsy();
    });
  });
});

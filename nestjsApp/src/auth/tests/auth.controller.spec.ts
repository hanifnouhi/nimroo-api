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

describe('AuthController', () => {
  let controller: AuthController;
  let userService: UserService;
  let silentPinoLogger = pino({ enabled: false });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('changePassword', () => {
    it('should call userService.changePassword with id and dto and return result', async () => {
      const id = '1';
      const dto: ChangePasswordDto = { password: '123456' };
      jest.spyOn(userService, 'changePassword').mockResolvedValueOnce(void 0 as any);

      const response = await controller.changePassword(id, dto);

      expect(userService.changePassword).toHaveBeenCalledWith(id, dto as ChangePasswordDto);
      expect(response).toEqual(void 0);
    });

    it('should propagate error if userService.changePassword fails', async () => {
      const id = '1';
      const dto: ChangePasswordDto = { password: '123456' };
      const error = new Error('Database error');
      jest.spyOn(userService, 'changePassword').mockRejectedValueOnce(error as any);

      await expect(controller.changePassword(id, dto)).rejects.toThrow(error);
    });
  });

  describe('updateRefreshToken', () => {
    it('should call userService.updateRefreshToken with id and dto and return result', async () => {
      const id = '1';
      const dto: UpdateRefreshTokenDto = { refreshToken: '123456' };
      jest.spyOn(userService, 'updateRefreshToken').mockResolvedValueOnce(void 0 as any);

      const response = await controller.updateRefreshToken(id, dto);

      expect(userService.updateRefreshToken).toHaveBeenCalledWith(id, dto as UpdateRefreshTokenDto);
      expect(response).toEqual(void 0);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { UserService } from '../../user/user.service';
import { UserRepository } from '../../user/user.repository';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../../user/schemas/user.schema';
import { UserModule } from '../../user/user.module';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { globalUseMocker } from '../../../test/mocks/use-mocker';

describe('AuthController', () => {
  let controller: AuthController;

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
    })
    .useMocker(globalUseMocker)
    .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

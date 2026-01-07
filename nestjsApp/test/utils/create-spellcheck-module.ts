import { Test, TestingModule } from '@nestjs/testing';
import { SpellCheckService } from '../../src/spell-check/spell-check.service';
import {
  globalUseMocker,
  createMockConfigService,
  mocks,
} from '../mocks/use-mocker';

export const createSpellCheckTestingModule = async (configOverrides = {}) => {
  mocks.configService = createMockConfigService(configOverrides);

  const module: TestingModule = await Test.createTestingModule({
    providers: [SpellCheckService],
  })
    .useMocker(globalUseMocker)
    .compile();

  return module.get<SpellCheckService>(SpellCheckService);
};

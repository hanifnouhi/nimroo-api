import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { StabilityImageProvider } from '../../providers/stability-image.provider';

describe('StabilityImageProvider - E2E (real API)', () => {
  let provider: StabilityImageProvider;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [StabilityImageProvider],
    }).compile();

    provider = module.get<StabilityImageProvider>(StabilityImageProvider);
  });

  it('should generate an image', async () => {
      const result = await provider.generate('a red apple');
      expect(result.image.length).toBeGreaterThan(0);
      expect(result.image).toBeDefined();
    },
    30000,
  );
});

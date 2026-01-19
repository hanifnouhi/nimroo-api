import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { StabilityImageProvider } from '../../providers/stability-image.provider';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';

describe('StabilityImageProvider - E2E (real API)', () => {
  let provider: StabilityImageProvider;
  const silentPinoLogger = pino({ enabled: false });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        LoggerModule.forRoot({
          pinoHttp: silentPinoLogger,
        }),
      ],
      providers: [StabilityImageProvider],
    }).compile();

    provider = module.get<StabilityImageProvider>(StabilityImageProvider);
  });

  it('should generate an image', async () => {
    const result = await provider.generate('a red apple');
    expect(result.imageBuffer).toBeDefined();
  }, 30000);
});

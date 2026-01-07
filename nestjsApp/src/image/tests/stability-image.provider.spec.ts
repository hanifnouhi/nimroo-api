import { ConfigService } from '@nestjs/config';
import { StabilityImageProvider } from '../providers/stability-image.provider';
import axios from 'axios';
import { PinoLogger } from 'nestjs-pino';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Stability generate image unit testing', () => {
  let provider: StabilityImageProvider;
  let configService: ConfigService;
  let pinoLogger: PinoLogger;

  beforeEach(() => {
    jest.resetAllMocks();

    configService = {
      getOrThrow: jest
        .fn()
        .mockReturnValueOnce(
          'https://api.stability.ai/v1/generation/test-model/text-to-image',
        )
        .mockReturnValueOnce('test-model')
        .mockReturnValueOnce('test-api-key'),
    } as any;

    pinoLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as any;

    provider = new StabilityImageProvider(configService, pinoLogger);
  });

  it('should return base64 image as string when API return results', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        image: 'base64Image',
      },
    });

    await provider.generate('banana');
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('should return error when API failed', async () => {
    mockedAxios.post.mockRejectedValue(new Error('network error'));

    await expect(provider.generate('dogs')).rejects.toThrow('network error');
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it.each([
    [400, 'bad_request'],
    [403, 'content_moderation'],
    [413, 'payload_too_large'],
    [422, 'invalid_language'],
    [429, 'rate_limit_exceeded'],
    [500, 'internal_error'],
  ])(
    'should return appropriate message based on error code when API failed',
    async (code, message) => {
      mockedAxios.post.mockRejectedValue(new Error(message));

      await expect(provider.generate('dogs')).rejects.toThrow(message);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    },
  );
});

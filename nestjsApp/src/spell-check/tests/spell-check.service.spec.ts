import { SpellCheckService } from '../spell-check.service';
import axios from 'axios';
import { mocks } from '../../../test/mocks/use-mocker';
import { createSpellCheckTestingModule } from '../../../test/utils/create-spellcheck-module';

// mock axios for using in tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SpellCheckService', () => {
  let service: SpellCheckService;

  beforeEach(async () => {
    // clear axios mock before each test to prevent unwanted errors
    mockedAxios.post.mockClear();
  });

  test('should be defined', async () => {
    const service = await createSpellCheckTestingModule();

    expect(service).toBeDefined();
  });

  test('should return string', async () => {
    const service = await createSpellCheckTestingModule();

    const result = await service.correct('bonjoor');

    expect(typeof result).toBe('string');
  });

  test('should return corrected text from spell check service', async () => {
    const service = await createSpellCheckTestingModule();
    mockedAxios.post.mockResolvedValue({ data: { corrected: 'bonjour' } });

    const result = await service.correct('bonjoor', 'fr');

    expect(result).toBe('bonjour');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining(
        mocks.configService?.get('SPELL_CHECK_SERVICE_URL'),
      ),
      expect.objectContaining({ language: 'fr', text: 'bonjoor' }),
    );
  });

  test('should return original text if spell check url is not defined', async () => {
    const service = await createSpellCheckTestingModule({
      SPELL_CHECK_SERVICE_URL: '',
    });
    mockedAxios.post.mockResolvedValue({ data: { corrected: 'bonjour' } });

    const result = await service.correct('bonjoor', 'fr');

    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(result).toBe('bonjoor');
  });

  test('should return original text if spell check service is not enable', async () => {
    const service = await createSpellCheckTestingModule({
      SPELL_CHECK_ENABLED: false,
    });
    mockedAxios.post.mockResolvedValue({ data: { corrected: 'bonjour' } });

    const result = await service.correct('bonjoor', 'fr');

    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(result).toBe('bonjoor');
  });

  test('should return original text if spell check service throws error', async () => {
    const service = await createSpellCheckTestingModule();

    mockedAxios.post.mockRejectedValue(new Error('Service unavailable'));

    const result = await service.correct('bonjoor', 'fr');

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(result).toBe('bonjoor');
  });
});

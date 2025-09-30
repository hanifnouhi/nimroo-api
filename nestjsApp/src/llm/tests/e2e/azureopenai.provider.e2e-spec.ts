import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AzureOpenAiLlmProvider } from '../../providers/azureopenai-llm-analyze.provider';

describe('AzureOpenAiLlmProvider (E2E - real Azure)', () => {
  let provider: AzureOpenAiLlmProvider;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [AzureOpenAiLlmProvider],
    }).compile();

    provider = module.get<AzureOpenAiLlmProvider>(AzureOpenAiLlmProvider);
  });

  it(
    'should analyze a meaningful word',
    async () => {
      const result = await provider.analyze({ text: 'banana' });
      expect(result).toHaveProperty('meaningful');
      expect(result).toHaveProperty('visualizable');
      expect(typeof result!.meaningful).toBe('boolean');
      expect(result!.meaningful).toBe(true);
      expect(typeof result!.visualizable).toBe('boolean');
      expect(result!.visualizable).toBe(true);
    },
    20000,
  );

  it(
    'should analyze gibberish text',
    async () => {
      const result = await provider.analyze({ text: 'asdfghjkl' });
      expect(result).toHaveProperty('meaningful');
      expect(result).toHaveProperty('visualizable');
      expect(typeof result!.meaningful).toBe('boolean');
      expect(result!.meaningful).toBe(false);
      expect(typeof result!.visualizable).toBe('boolean');
      expect(result!.visualizable).toBe(false);
    },
    20000,
  );
});

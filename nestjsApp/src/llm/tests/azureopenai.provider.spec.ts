import { ConfigService } from "@nestjs/config"
import { AzureOpenAiLlmProvider } from "../providers/azureopenai-llm-analyze.provider";
import { AzureOpenAI } from "openai";

jest.mock('openai', () => {
    return {
        AzureOpenAI: jest.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: jest.fn()
                }
            }
        }))
    }
});

describe('AzureOpenAiProvider', () => {
    let configService: ConfigService;
    let azureOpenAiProvider: AzureOpenAiLlmProvider;
    let mockClient: any;

    beforeEach(() => {
        jest.clearAllMocks();
        configService = {
            getOrThrow: jest.fn((key: string) => {
                if (key === 'AZURE_OPEN_AI_ANALYZE_URL') return 'http://nimroo.com';
                if (key === 'AZURE_OPEN_AI_ANALYZE_KEY1') return 'http://nimroo.com';
                if (key === 'AZURE_OPEN_AI_ANALYZE_API_VERSION') return 'http://nimroo.com';
                if (key === 'AZURE_OPEN_AI_ANALYZE_DEPLOYMENT') return 'http://nimroo.com';
                else throw new Error(`Unexpected key ${key}`);
            })
        } as any;

        azureOpenAiProvider = new AzureOpenAiLlmProvider(configService);

		mockClient = (AzureOpenAI as unknown as jest.Mock).mock.results[0].value;
    });

    it('should return parsed JSON when response is valid', async () => {
        mockClient.chat.completions.create.mockResolvedValueOnce({
          choices: [{ message: { content: '{"meaningful": true, "visualizable": false}' } }],
        });
    
        const result = await azureOpenAiProvider.analyze({ text: 'banana' });
    
        expect(result).toEqual({ meaningful: true, visualizable: false });
        expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [
              expect.objectContaining({ role: 'system' }),
              { role: 'user', content: 'banana' },
            ],
            model: 'gpt-35-turbo',
          }),
        );
    });

    it('should throw error when response is invalid JSON', async () => {
        mockClient.chat.completions.create.mockResolvedValueOnce({
          choices: [{ message: { content: 'not a json' } }],
        });
    
        await expect(azureOpenAiProvider.analyze({ text: 'invalid' })).rejects.toThrow('Failed to parse LLM response');
    });
    
    it('should fallback to undefined if content is undefined', async () => {
        mockClient.chat.completions.create.mockResolvedValueOnce({
          choices: [{ message: { content: undefined } }],
        });
    
        await expect(azureOpenAiProvider.analyze({ text: 'test' })).resolves.toBeUndefined();
    });
    
})
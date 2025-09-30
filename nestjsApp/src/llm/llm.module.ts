import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AzureOpenAiLlmProvider } from './providers/azureopenai-llm-analyze.provider';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [
    LlmService,
    {
      provide: 'LlmAnalyzeProvider',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const selected = config.get<string>('LLM_ANALYZE_PROVIDER');
        switch (selected) {
          case 'azureopenai':

          default:
            return new AzureOpenAiLlmProvider(config); 
        }
      }
    }
  ]
})
export class LlmModule {}

import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AzureOpenAiLlmProvider } from './providers/azureopenai-llm-analyze.provider';
import { ConfigService } from '@nestjs/config';
import { CacheModule } from '../cache/cache.module';
import { LlmController } from './llm.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
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
      },
    },
  ],
  exports: [LlmService],
  controllers: [LlmController],
})
export class LlmModule {}

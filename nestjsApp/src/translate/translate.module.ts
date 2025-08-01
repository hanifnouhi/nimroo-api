import { Module } from '@nestjs/common';
import { TranslateService } from './translate.service';
import { TranslateController } from './translate.controller';
import { ConfigService } from '@nestjs/config';
import { AzureTranslateProvider } from './providers/azure-translate.provider';
import { SpellCheckService } from '../spell-check/spell-check.service';

@Module({
  controllers: [TranslateController],
  providers: [
    TranslateService,
    {
      provide: 'TranslationProvider',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const selected = config.get<string>('TRANSLATE_PROVIDER');

        switch (selected) {
          case 'azure':
          default:
            return new AzureTranslateProvider(config);
        }
      }
    },
    SpellCheckService
  ]
})
export class TranslateModule {}
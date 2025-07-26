import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TranslateService } from './translate/translate.service';
import { TranslateController } from './translate/translate.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { CacheModule } from '@nestjs/cache-manager';
import { AzureTranslateProvider } from './translate/providers/azure-translate.provider';
import { TranslationProvider } from './translate/providers/translate.interface'; 
import { SpellCheckService } from './spell-check/spell-check.service';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
        customProps: (req, res) => ({
          context: 'HTTP'
        }),
        serializers: {
          req(req) {
            req.body = req.raw.body;
            return req;
          },
          res(res) {
            return res;
          }
        }
      }
    }),
    CacheModule.register({
      isGlobal: true
    }),
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().port().default(3000),
        DATABASE_USER: Joi.string()
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: true
      },
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      isGlobal: true,
      cache: true
  })],
  controllers: [AppController, TranslateController],
  providers: [
    AppService, 
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
export class AppModule {}

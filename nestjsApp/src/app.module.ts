import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { CacheModule } from '@nestjs/cache-manager';
import { LoggerModule } from 'nestjs-pino';
import { TranslateModule } from './translate/translate.module';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
         uri: process.env.DATABASE_URI
      })
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' 
          ? 'info' 
          : process.env.NODE_ENV === 'test'
            ? 'silent' 
            : 'debug',
        transport: process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
          ? { target: 'pino-pretty', options: { colorize: true } } 
          : undefined,
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
    }),
    TranslateModule
  ],
  controllers: [AppController],
  providers: [
    AppService
  ]
})
export class AppModule {}

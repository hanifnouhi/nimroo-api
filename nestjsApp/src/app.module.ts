import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { CacheModule } from '@nestjs/cache-manager';
import { LoggerModule } from 'nestjs-pino';
import { TranslateModule } from './translate/translate.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { APP_FILTER} from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().port().default(3000),
        DATABASE_USER: Joi.string(),
        JWT_SECRET: Joi.string().default('thedefaultnimroo')
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: true
      },
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      isGlobal: true,
      cache: true
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
         uri: configService.getOrThrow<string>('DATABASE_URI')
      })
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV');
        return {
            pinoHttp: {
              level: nodeEnv === 'production' 
                ? 'info' 
                : nodeEnv === 'test'
                  ? 'silent' 
                  : 'debug',
              transport: nodeEnv !== 'production' && nodeEnv !== 'test'
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
        }
        
      }
    }),
    CacheModule.register({
      isGlobal: true
    }),
    TranslateModule,
    AuthModule,
    UserModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    }
  ]
})
export class AppModule {}

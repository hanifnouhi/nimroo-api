import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TranslateService } from './translate/translate.service';
import { TranslateController } from './translate/translate.controller';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
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
  providers: [AppService, TranslateService],
})
export class AppModule {}

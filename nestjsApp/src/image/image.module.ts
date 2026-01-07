import { Module } from '@nestjs/common';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { TranslateModule } from '../translate/translate.module';
import { ConfigService } from '@nestjs/config';
import { UnsplashImageProvider } from './providers/unsplash-image.provider';
import { LlmModule } from '../llm/llm.module';
import { StabilityImageProvider } from './providers/stability-image.provider';
import { PinoLogger } from 'nestjs-pino';
import { StorageModule } from '../storage/storage.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TranslateModule, LlmModule, StorageModule, UserModule],
  controllers: [ImageController],
  providers: [
    ImageService,
    {
      provide: 'ImageSearchProvider',
      inject: [ConfigService],
      useFactory: (config: ConfigService, pinoLogger: PinoLogger) => {
        const selected = config.get<string>('IMAGE_SEARCH_PROVIDER');
        switch (selected) {
          case 'unsplash':

          default:
            return new UnsplashImageProvider(config, pinoLogger);
        }
      },
    },
    {
      provide: 'ImageGenerateProvider',
      inject: [ConfigService],
      useFactory: (config: ConfigService, pinoLogger: PinoLogger) => {
        const selected = config.get<string>('IMAGE_GENERATE_PROVIDER');
        switch (selected) {
          case 'stability':

          default:
            return new StabilityImageProvider(config, pinoLogger);
        }
      },
    },
  ],
})
export class ImageModule {}

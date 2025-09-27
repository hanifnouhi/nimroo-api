import { Module } from '@nestjs/common';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { TranslateModule } from '../translate/translate.module';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { UnsplashImageProvider } from './providers/unsplash-image.provider';

@Module({
  imports: [
    TranslateModule,
    CacheModule
  ],
  controllers: [ImageController],
  providers: [
    ImageService,
    {
      provide: 'ImageSearchProvider',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
          const selected = config.get<string>('IMAGE_SEARCH_PROVIDER');
          switch (selected) {
            case 'unsplash':
              
            default:
                return new UnsplashImageProvider(config);
          }
      }
  }
  ]
})
export class ImageModule {}

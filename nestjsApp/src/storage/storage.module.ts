import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AzureBlobProvider } from './providers/azure-blob.storage.provider';
import { IFileUploader } from './providers/storage.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'IStorageProvider',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const selected = config.get<string>('STORAGE_PROVIDER');
        switch (selected) {
          case 'azure':

          default:
            return new AzureBlobProvider(config); 
        }
      }
    },
    StorageService
  ]
})
export class StorageModule {}

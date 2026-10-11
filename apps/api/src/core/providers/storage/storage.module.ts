import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { MockStorageAdapter } from './mock.adapter';
import { S3StorageAdapter } from './s3.adapter';
import { STORAGE_PROVIDER } from './storage.provider';

@Module({
  providers: [
    MockStorageAdapter,
    {
      provide: STORAGE_PROVIDER,
      inject: [APP_CONFIG, MockStorageAdapter],
      useFactory: (config: AppConfig, mock: MockStorageAdapter) =>
        config.storage.provider === 's3' ? new S3StorageAdapter(config) : mock,
    },
  ],
  exports: [STORAGE_PROVIDER, MockStorageAdapter],
})
export class StorageModule {}

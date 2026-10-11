import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { GoogleVisionAdapter } from './google.adapter';
import { MockVisionAdapter } from './mock.adapter';
import { VISION_PROVIDER } from './vision.provider';

@Module({
  providers: [
    {
      provide: VISION_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (c: AppConfig) =>
        c.ai.visionProvider === 'google' ? new GoogleVisionAdapter(c) : new MockVisionAdapter(),
    },
  ],
  exports: [VISION_PROVIDER],
})
export class VisionModule {}

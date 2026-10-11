import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { CloudflareStreamAdapter } from './cloudflare-stream.adapter';
import { MockVideoAdapter } from './mock.adapter';
import { MuxVideoAdapter } from './mux.adapter';
import { VIDEO_PROVIDER } from './video.provider';

@Module({
  providers: [
    MockVideoAdapter,
    {
      provide: VIDEO_PROVIDER,
      inject: [APP_CONFIG, MockVideoAdapter],
      useFactory: (config: AppConfig, mock: MockVideoAdapter) =>
        config.video.provider === 'cloudflare_stream'
          ? new CloudflareStreamAdapter(config)
          : config.video.provider === 'mux'
            ? new MuxVideoAdapter(config)
            : mock,
    },
  ],
  exports: [VIDEO_PROVIDER, MockVideoAdapter],
})
export class VideoModule {}

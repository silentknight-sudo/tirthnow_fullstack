import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { loadConfig, loadDotEnv } from './core/config';

async function bootstrap(): Promise<void> {
  loadDotEnv();
  const config = loadConfig(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config), {
    bufferLogs: true,
    rawBody: true, // webhook signature verification (payments, video) needs the raw body
  });
  configureApp(app, config);
  await app.listen(config.port);
}

void bootstrap();

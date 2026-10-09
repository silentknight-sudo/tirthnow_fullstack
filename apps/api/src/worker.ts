import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { loadConfig, loadDotEnv } from './core/config';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  loadDotEnv();
  const config = loadConfig({ ...process.env, PROCESS_ROLE: 'worker' });
  const app = await NestFactory.create<NestExpressApplication>(WorkerModule.forRoot(config), {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  await app.listen(config.workerPort);
  app.get(Logger).log(`Worker ready (health on :${config.workerPort})`);
}

void bootstrap();

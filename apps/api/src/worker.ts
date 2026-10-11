import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { type NextFunction, type Request, type Response } from 'express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { loadConfig, loadDotEnv } from './core/config';

/**
 * Background worker (ADR-0005): the same modules as the API with PROCESS_ROLE=worker, so
 * BullMQ processors and schedulers run here. HTTP serves only /healthz and /readyz.
 */
async function bootstrap(): Promise<void> {
  loadDotEnv();
  const config = loadConfig({ ...process.env, PROCESS_ROLE: 'worker' });
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config), {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/healthz' || req.path === '/readyz') {
      next();
      return;
    }
    res
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Worker exposes health endpoints only' } });
  });
  app.enableShutdownHooks();
  await app.listen(config.workerPort);
  app.get(Logger).log(`Worker ready (health on :${config.workerPort})`);
}

void bootstrap();

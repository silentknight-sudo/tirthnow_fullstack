import { RequestMethod } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { type AppConfig } from './core/config';
import { AllExceptionsFilter, createValidationPipe } from './core/http';
import { RedisIoAdapter } from './modules/realtime';

export const API_PREFIX = 'v1';

/** Everything applied to the HTTP app; shared by main.ts and e2e tests. */
export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.useLogger(app.get(Logger));
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');
  app.use(helmet());
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Idempotency-Key',
      'X-Request-Id',
      'Accept-Language',
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  });
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [
      { path: 'healthz', method: RequestMethod.GET },
      { path: 'readyz', method: RequestMethod.GET },
      // SOS share links sent by SMS stay short: /s/<token>.
      { path: 's/:shareToken', method: RequestMethod.GET },
    ],
  });
  app.useWebSocketAdapter(new RedisIoAdapter(app, config));
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  if (config.swaggerEnabled) {
    SwaggerModule.setup('docs', app, buildOpenApiDocument(app), { jsonDocumentUrl: 'docs-json' });
  }
}

/** The OpenAPI document served at /docs-json and exported for clients (pnpm openapi:export). */
export function buildOpenApiDocument(app: NestExpressApplication): OpenAPIObject {
  const doc = new DocumentBuilder()
    .setTitle('Tirth Now API')
    .setDescription('REST API for the Tirth Now mobile app, vendor portal and admin portal.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  return SwaggerModule.createDocument(app, doc);
}

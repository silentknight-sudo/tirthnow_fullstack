import { randomUUID } from 'node:crypto';
import { type IncomingMessage, type ServerResponse } from 'node:http';
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { APP_CONFIG, type AppConfig } from '../config';

export const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

/** Reuse a well-formed inbound x-request-id, otherwise mint one; always echo it back. */
export function resolveRequestId(req: IncomingMessage, res: ServerResponse): string {
  const inbound = req.headers[REQUEST_ID_HEADER];
  const candidate = Array.isArray(inbound) ? inbound[0] : inbound;
  const id = candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}

/** Paths redacted from every log line (PII and secrets). */
export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.refreshToken',
  '*.accessToken',
  '*.idToken',
  '*.code',
  '*.phoneE164',
  '*.email',
];

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.logLevel,
          genReqId: resolveRequestId,
          redact: { paths: LOG_REDACT_PATHS, censor: '[redacted]' },
          autoLogging: { ignore: (req) => req.url === '/healthz' || req.url === '/readyz' },
          customProps: () => ({ service: 'api' }),
          ...(config.env === 'development'
            ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
            : {}),
        },
      }),
    }),
  ],
})
export class LoggingModule {}

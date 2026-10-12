import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';

/**
 * Request body fields that hold a password or a token, replaced by
 * `[Redacted]` in the logs.
 */
const SECRET_BODY_FIELDS = [
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'confirmNewPassword',
  'refreshToken',
  'resetToken',
  'token',
];

/**
 * A client's `X-Request-Id` is reused only when it is one short word of
 * letters, digits, `_` and `-`, so it cannot flood or break the log lines.
 */
const REQUEST_ID_PATTERN = /^[\w-]{1,128}$/;

/**
 * Logs every request as JSON, except `GET /health`, with its body and a
 * request id that the response returns in `X-Request-Id`. Credentials and the
 * secret body fields are redacted.
 *
 * @see docs/adr/2026-10-12-structured-logging-with-pino.md
 */
export const loggerOptionsFactory = (config: ConfigService): Params => {
  const isProduction = config.getOrThrow('app.mode') === 'production';

  return {
    pinoHttp: {
      transport: isProduction
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true } },
      level: isProduction ? 'info' : 'debug',
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
      genReqId: (req, res) => {
        const header = req.headers['x-request-id'];
        const id =
          typeof header === 'string' && REQUEST_ID_PATTERN.test(header)
            ? header
            : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      serializers: {
        req: (req: { raw: { body?: unknown }; body?: unknown }) => {
          req.body = req.raw.body;
          return req;
        },
      },
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        ...SECRET_BODY_FIELDS.map((field) => `req.body.${field}`),
      ],
    },
  };
};

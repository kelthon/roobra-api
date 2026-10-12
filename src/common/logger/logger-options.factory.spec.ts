import { ConfigService } from '@nestjs/config';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Writable } from 'node:stream';
import { Options, pinoHttp } from 'pino-http';
import request from 'supertest';
import { loggerOptionsFactory } from './logger-options.factory.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const configFor = (mode: string) =>
  ({ getOrThrow: vi.fn().mockReturnValue(mode) }) as unknown as ConfigService;

const optionsFor = (mode: string) =>
  loggerOptionsFactory(configFor(mode)).pinoHttp as Options;

/**
 * A server that logs each request with the factory's options into `lines`.
 * It gives the request `body` before logging it, as Express's body parser does
 * before Nest's middleware runs.
 */
function createServer(body?: unknown) {
  const lines: Record<string, any>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(JSON.parse(chunk.toString()));
      callback();
    },
  });
  const logger = pinoHttp(optionsFor('production'), stream);

  const server = (req: IncomingMessage, res: ServerResponse) => {
    Object.assign(req, { body });
    logger(req, res);
    res.setHeader('Set-Cookie', 'session=secret');
    res.end();
  };

  return { server, lines };
}

describe('loggerOptionsFactory', () => {
  describe('output', () => {
    it('should print raw JSON at the info level in production', () => {
      const options = optionsFor('production');

      expect(options.transport).toBeUndefined();
      expect(options.level).toBe('info');
    });

    it.each(['development', 'test'])(
      'should pretty-print at the debug level in %s',
      (mode) => {
        const options = optionsFor(mode);

        expect(options.transport).toMatchObject({ target: 'pino-pretty' });
        expect(options.level).toBe('debug');
      },
    );
  });

  describe('request id', () => {
    it('should reuse a valid X-Request-Id and return it', async () => {
      const { server, lines } = createServer();

      const response = await request(server)
        .get('/')
        .set('X-Request-Id', 'client-id_123');

      expect(response.headers['x-request-id']).toBe('client-id_123');
      expect(lines[0].req.id).toBe('client-id_123');
    });

    it('should generate a UUID when no X-Request-Id is sent', async () => {
      const { server, lines } = createServer();

      const response = await request(server).get('/');

      expect(response.headers['x-request-id']).toMatch(UUID_PATTERN);
      expect(lines[0].req.id).toBe(response.headers['x-request-id']);
    });

    it.each([
      ['too long', 'a'.repeat(129)],
      ['with spaces', 'not a valid id'],
      ['with other symbols', 'id;drop'],
    ])(
      'should replace an X-Request-Id %s with a UUID',
      async (_case, header) => {
        const { server } = createServer();

        const response = await request(server)
          .get('/')
          .set('X-Request-Id', header);

        expect(response.headers['x-request-id']).toMatch(UUID_PATTERN);
      },
    );
  });

  describe('redaction', () => {
    it('should redact the credentials in the headers', async () => {
      const { server, lines } = createServer();

      await request(server)
        .get('/')
        .set('Authorization', 'Bearer secret-token')
        .set('Cookie', 'session=secret');

      expect(lines[0].req.headers.authorization).toBe('[Redacted]');
      expect(lines[0].req.headers.cookie).toBe('[Redacted]');
      expect(lines[0].res.headers['set-cookie']).toBe('[Redacted]');
    });

    it('should log the body and redact its passwords and tokens', async () => {
      const { server, lines } = createServer({
        email: 'user@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        currentPassword: 'Password123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!',
        refreshToken: 'refresh-token',
        resetToken: 'reset-token',
        token: 'verification-token',
      });

      await request(server).post('/');

      expect(lines[0].req.body).toEqual({
        email: 'user@test.com',
        password: '[Redacted]',
        confirmPassword: '[Redacted]',
        currentPassword: '[Redacted]',
        newPassword: '[Redacted]',
        confirmNewPassword: '[Redacted]',
        refreshToken: '[Redacted]',
        resetToken: '[Redacted]',
        token: '[Redacted]',
      });
    });
  });

  describe('health check', () => {
    it('should not log GET /health', async () => {
      const { server, lines } = createServer();

      await request(server).get('/health');

      expect(lines).toHaveLength(0);
    });
  });
});

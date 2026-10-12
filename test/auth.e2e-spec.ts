import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from 'src/app.module.js';
import { appOptions, configureApp } from 'src/app.setup.js';

describe('Auth (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app =
      moduleFixture.createNestApplication<NestExpressApplication>(appOptions);
    configureApp(app);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('protected routes', () => {
    it.each([
      ['get', '/v1/users/me'],
      ['delete', '/v1/users/me'],
      ['post', '/v1/auth/logout'],
      ['post', '/v1/auth/logout/all'],
      ['post', '/v1/auth/change-password'],
      ['get', '/v1/auth/verify-email'],
    ] as const)(
      '%s %s should return 401 without a token',
      async (method, url) => {
        await request(app.getHttpServer())[method](url).expect(401);
      },
    );

    it('should return 401 for a malformed bearer token', async () => {
      await request(app.getHttpServer())
        .get('/v1/users/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
    });
  });

  describe('request validation', () => {
    it('POST /v1/auth/register should return 400 for an invalid body', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('POST /v1/auth/register should reject mismatched password confirmation', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'john.doe@example.com',
          username: 'john_doe',
          password: 'Password123!',
          confirmPassword: 'Different123!',
        })
        .expect(400);
    });

    it('POST /v1/auth/verify-email should return 400 when the token is missing', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({})
        .expect(400);
    });

    it('POST /v1/auth/reset-password should return 400 when passwords do not match', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({
          resetToken: 'a'.repeat(64),
          newPassword: 'NewPassword123!',
          confirmNewPassword: 'Different123!',
        })
        .expect(400);
    });

    it('POST /v1/auth/forgot-password should return 400 for an invalid email', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send({ email: 'nope' })
        .expect(400);
    });

    it('POST /v1/auth/refresh-token should return 400 for an empty token', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/refresh-token')
        .send({ refreshToken: '' })
        .expect(400);
    });
  });
});

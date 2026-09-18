import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';

// Prisma is stubbed in the e2e jest config (see test/jest-e2e.json), so these
// specs only cover behaviour decided before any database access: routing,
// guards and request validation.
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('protected routes', () => {
    it.each([
      ['get', '/auth/me'],
      ['post', '/auth/logout'],
      ['post', '/auth/logout/all'],
      ['post', '/auth/change-password'],
      ['get', '/auth/verify-email'],
    ] as const)(
      '%s %s should return 401 without a token',
      async (method, url) => {
        await request(app.getHttpServer())[method](url).expect(401);
      },
    );

    it('should return 401 for a malformed bearer token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
    });
  });

  describe('request validation', () => {
    it('POST /auth/register should return 400 for an invalid body', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('POST /auth/register should reject mismatched password confirmation', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'john.doe@example.com',
          username: 'john_doe',
          password: 'Password123!',
          confirmPassword: 'Different123!',
        })
        .expect(400);
    });

    it('POST /auth/verify-email should return 400 when the token is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({})
        .expect(400);
    });

    it('POST /auth/reset-password should return 400 when passwords do not match', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          resetToken: 'a'.repeat(64),
          newPassword: 'NewPassword123!',
          confirmNewPassword: 'Different123!',
        })
        .expect(400);
    });

    it('POST /auth/forgot-password should return 400 for an invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nope' })
        .expect(400);
    });

    it('POST /auth/refresh-token should return 400 for an empty token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken: '' })
        .expect(400);
    });
  });
});

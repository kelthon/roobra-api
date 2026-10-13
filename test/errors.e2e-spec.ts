import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request, { Response } from 'supertest';
import { AppModule } from 'src/app.module.js';
import { appOptions, configureApp } from 'src/app.setup.js';
import { PrismaService } from 'src/modules/database/prisma.service.js';

// The e2e specs run without a database: the Prisma calls these routes make
// are stubbed to fail the way Postgres would.
const mockUserCreate = vi.fn();
const mockUserFindUniqueOrThrow = vi.fn();

const mockPrismaService = {
  $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
    fn({ user: { create: mockUserCreate } }),
  ),
  user: { findUniqueOrThrow: mockUserFindUniqueOrThrow },
};

const validRegistration = {
  email: 'taken@roobra.test',
  username: 'taken',
  password: 'Password123!',
  confirmPassword: 'Password123!',
};

/** The response is a problem, with the id of the request it answers */
function expectProblem(response: Response) {
  expect(response.headers['content-type']).toMatch(
    /^application\/problem\+json/,
  );
  expect(response.body.requestId).toEqual(expect.any(String));
  expect(response.body.requestId).toBe(response.headers['x-request-id']);
}

describe('Error responses (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app =
      moduleFixture.createNestApplication<NestExpressApplication>(appOptions);
    configureApp(app);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should answer an invalid body with a validation-failed problem', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ ...validRegistration, email: 'not-an-email' })
      .expect(400);

    expectProblem(response);
    expect(response.body).toMatchObject({
      type: 'https://api.roobra.com/problems/validation-failed',
      title: 'Validation failed',
      status: 400,
      detail: 'The request has 1 invalid field.',
      instance: '/v1/auth/register',
      errors: [{ field: 'email', messages: ['email must be an email'] }],
    });
  });

  it('should answer a malformed JSON body with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);

    // Express's body parser rejects it before the request gets an id
    expect(response.headers['content-type']).toMatch(
      /^application\/problem\+json/,
    );
    expect(response.body).toMatchObject({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
    });
    expect(response.body).not.toHaveProperty('requestId');
  });

  it('should answer a taken email with an email-in-use problem', async () => {
    mockUserCreate.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['email'] },
    });

    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(validRegistration)
      .expect(409);

    expectProblem(response);
    expect(response.body).toEqual({
      type: 'https://api.roobra.com/problems/email-in-use',
      title: 'Email already in use',
      status: 409,
      instance: '/v1/auth/register',
      requestId: response.headers['x-request-id'],
    });
  });

  it('should answer a missing token with an about:blank 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/users/me')
      .expect(401);

    expectProblem(response);
    expect(response.body).toMatchObject({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
      instance: '/v1/users/me',
    });
  });

  it('should answer an unknown route with an about:blank 404', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/nope')
      .expect(404);

    expectProblem(response);
    expect(response.body).toMatchObject({
      type: 'about:blank',
      title: 'Not Found',
      detail: 'Cannot GET /v1/nope',
    });
  });

  it('should answer an unexpected error with a 500 that hides it', async () => {
    mockUserFindUniqueOrThrow.mockRejectedValueOnce(
      new Error('connection string leaked'),
    );

    const response = await request(app.getHttpServer())
      .post('/v1/auth/forgot-password')
      .send({ email: 'user@roobra.test' })
      .expect(500);

    expectProblem(response);
    expect(response.body).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      instance: '/v1/auth/forgot-password',
      requestId: response.headers['x-request-id'],
    });
    expect(JSON.stringify(response.body)).not.toContain('leaked');
  });

  it('should keep the query string out of instance', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/nope?token=secret')
      .expect(404);

    expect(response.body.instance).toBe('/v1/nope');
  });
});

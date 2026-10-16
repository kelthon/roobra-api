import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { hash } from 'argon2';
import request from 'supertest';
import { AppModule } from '@app/app.module.js';
import { appOptions, configureApp } from '@app/app.setup.js';
import { PrismaService } from '@app/modules/database/prisma.service.js';

// The e2e specs run without a database: the queries these routes make are
// stubbed with one account and one session. The health check's own format
// is covered by health.e2e-spec.ts.
const user = {
  id: 'V1StGXR8_Z5jdHi6B-myT',
  email: 'user@roobra.test',
  username: 'user',
  role: 'SUBSCRIBER',
  photoUrl: null,
};

const session = {
  userAgent: 'supertest',
  operatingSystem: null,
  expiresAt: '2026-11-01T00:00:00.000Z',
  createdAt: '2026-10-15T00:00:00.000Z',
};

const mockPrismaService = {
  user: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn().mockResolvedValue(user),
  },
  refreshToken: {
    create: vi.fn().mockResolvedValue({}),
    findMany: vi.fn().mockResolvedValue([session]),
  },
  $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
    fn({
      user: { softDelete: vi.fn().mockResolvedValue(user) },
      refreshToken: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    }),
  ),
  $disconnect: vi.fn(),
};

describe('Success responses (e2e)', () => {
  let app: NestExpressApplication;
  let accessToken: string;

  beforeAll(async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      ...user,
      hashedPassword: await hash('Password123!'),
    });

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

    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: user.email, password: 'Password123!' })
      .expect(201);
    accessToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should wrap a resource in data', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: user.email, password: 'Password123!' })
      .expect(201);

    expect(Object.keys(response.body)).toEqual(['data']);
    expect(response.body.data.user).toMatchObject({ id: user.id });
  });

  it('should wrap a list in data', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({ data: [session] });
  });

  it('should send no body with a 204', async () => {
    const response = await request(app.getHttpServer())
      .delete('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    expect(response.text).toBe('');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { hash } from 'argon2';
import request from 'supertest';
import { AppModule } from '@app/app.module.js';
import { appOptions, configureApp } from '@app/app.setup.js';
import { PrismaService } from '@app/modules/database/prisma.service.js';

// The e2e specs run without a database: the queries login makes are stubbed
// with one account. The guards, the strategies and the controller are real.
const user = {
  id: 'V1StGXR8_Z5jdHi6B-myT',
  email: 'user@roobra.test',
  username: 'user',
  role: 'SUBSCRIBER',
  photoUrl: null,
};

const mockPrismaService = {
  user: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn().mockResolvedValue(user),
  },
  refreshToken: { create: vi.fn().mockResolvedValue({}) },
  $disconnect: vi.fn(),
};

describe('Login (e2e)', () => {
  let app: NestExpressApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('should sign in with the right password', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: user.email, password: 'Password123!' })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({ id: user.id });
  });

  it('should sign in when the request carries an invalid access token', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .set('Authorization', 'Bearer expired-or-invalid')
      .send({ email: user.email, password: 'Password123!' })
      .expect(201);
  });

  it('should answer invalid-credentials to a wrong password', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: user.email, password: 'Wrong123!' })
      .expect(401);

    expect(response.body.type).toBe(
      'https://api.roobra.com/problems/invalid-credentials',
    );
  });
});

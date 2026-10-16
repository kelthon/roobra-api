import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '@app/app.module.js';
import { appOptions, configureApp } from '@app/app.setup.js';
import { UserRole } from '@app/db/prisma/enums.js';
import { PrismaService } from '@app/modules/database/prisma.service.js';

// The e2e specs run without a database: the user list is stubbed. Access
// tokens are signed with the app's own JwtService, one per role.
const listedUser = {
  username: 'user',
  email: 'user@roobra.test',
  createdAt: '2026-10-16T00:00:00.000Z',
};

const mockPrismaService = {
  user: {
    findManyAndCount: vi.fn().mockResolvedValue([[listedUser], 1]),
  },
  $disconnect: vi.fn(),
};

describe('Roles (e2e)', () => {
  let app: NestExpressApplication;
  let jwtService: JwtService;

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

    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  /** An access token for a user with the given role */
  function tokenFor(role: UserRole) {
    return jwtService.signAsync({
      sub: 'V1StGXR8_Z5jdHi6B-myT',
      email: 'user@roobra.test',
      username: 'user',
      role,
    });
  }

  it.each([UserRole.ADMIN, UserRole.SUPPORT_AGENT])(
    'should let %s list the users',
    async (role) => {
      const response = await request(app.getHttpServer())
        .get('/v1/users')
        .set('Authorization', `Bearer ${await tokenFor(role)}`)
        .expect(200);

      expect(response.body.data).toEqual([listedUser]);
    },
  );

  it.each([UserRole.SUBSCRIBER, UserRole.CONTENT_MANAGER])(
    'should answer 403 to %s',
    async (role) => {
      mockPrismaService.user.findManyAndCount.mockClear();

      const response = await request(app.getHttpServer())
        .get('/v1/users')
        .set('Authorization', `Bearer ${await tokenFor(role)}`)
        .expect(403);

      expect(response.body.type).toBe('about:blank');
      expect(mockPrismaService.user.findManyAndCount).not.toHaveBeenCalled();
    },
  );

  it('should answer 401 without a token, before checking the role', async () => {
    await request(app.getHttpServer()).get('/v1/users').expect(401);
  });
});

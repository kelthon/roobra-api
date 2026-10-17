import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '@app/app.module.js';
import { appOptions, configureApp } from '@app/app.setup.js';
import { UserRole } from '@app/db/prisma/enums.js';
import { PrismaService } from '@app/modules/database/prisma.service.js';

// The e2e specs run without a database: the list query is stubbed, and the
// specs check the arguments the query string turns into.
const mockPrismaService = {
  user: { findManyAndCount: vi.fn() },
  $disconnect: vi.fn(),
};

describe('Users list (e2e)', () => {
  let app: NestExpressApplication;
  let token: string;

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

    token = await app.get(JwtService).signAsync({
      sub: 'V1StGXR8_Z5jdHi6B-myT',
      email: 'admin@roobra.test',
      username: 'admin',
      role: UserRole.ADMIN,
    });
  });

  beforeEach(() => {
    mockPrismaService.user.findManyAndCount
      .mockReset()
      .mockResolvedValue([[], 42]);
  });

  afterAll(async () => {
    await app.close();
  });

  /** Lists the users with the given query string */
  function list(query = '') {
    return request(app.getHttpServer())
      .get(`/v1/users${query}`)
      .set('Authorization', `Bearer ${token}`);
  }

  /** The arguments the last list query ran with */
  function queryArgs() {
    return mockPrismaService.user.findManyAndCount.mock.calls[0][0] as unknown;
  }

  it('should read the first 10 users, newest first, by default', async () => {
    const response = await list().expect(200);

    expect(queryArgs()).toMatchObject({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: 0,
      take: 10,
    });
    expect(response.body.meta).toEqual({
      paginationType: 'page',
      page: 1,
      limit: 10,
      totalPages: 5,
      totalItems: 42,
      nextPageURI: '?page=2&limit=10&orderBy=createdAt%3Adesc',
    });
  });

  it('should read the page, the size and the order of the query', async () => {
    const response = await list(
      '?page=3&limit=5&orderBy=username:asc&orderBy=email:desc',
    ).expect(200);

    expect(queryArgs()).toMatchObject({
      orderBy: [{ username: 'asc' }, { email: 'desc' }, { id: 'asc' }],
      skip: 10,
      take: 5,
    });
    expect(response.body.meta.previousPageURI).toBe(
      '?page=2&limit=5&orderBy=username%3Aasc&orderBy=email%3Adesc',
    );
  });

  it('should filter by the term and keep it in the page links', async () => {
    const response = await list('?term=ana&limit=5').expect(200);

    expect(queryArgs()).toMatchObject({
      where: {
        OR: [
          { username: { contains: 'ana', mode: 'insensitive' } },
          { email: { contains: 'ana', mode: 'insensitive' } },
        ],
      },
    });
    expect(response.body.meta.nextPageURI).toBe(
      '?page=2&limit=5&term=ana&orderBy=createdAt%3Adesc',
    );
  });

  it.each([
    ['a term over 100 characters', `?term=${'a'.repeat(101)}`],
    ['an order by a field that is not listed', '?orderBy=hashedPassword:asc'],
    ['an order without a direction', '?orderBy=username'],
    ['a page size over 100', '?limit=101'],
    ['a page below 1', '?page=0'],
    ['a cursor, which this list does not take', '?cursor=abc'],
  ])('should answer validation-failed to %s', async (_case, query) => {
    const response = await list(query).expect(400);

    expect(response.body.type).toBe(
      'https://api.roobra.com/problems/validation-failed',
    );
    expect(mockPrismaService.user.findManyAndCount).not.toHaveBeenCalled();
  });
});

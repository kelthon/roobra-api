import { Test, TestingModule } from '@nestjs/testing';
import { PrismaHealthIndicator } from '@nestjs/terminus';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '@app/app.module.js';
import { appOptions, configureApp } from '@app/app.setup.js';

// The e2e specs run without a database, so the ping is stubbed: these specs
// test the route, the status codes and the throttling, not Postgres itself.
const mockPrismaHealthIndicator = {
  pingCheck: vi.fn(),
};

const databaseUp = { database: { status: 'up' } };
const databaseDown = {
  database: { status: 'down', message: 'Connection refused' },
};

describe('Health check (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaHealthIndicator)
      .useValue(mockPrismaHealthIndicator)
      .compile();

    app =
      moduleFixture.createNestApplication<NestExpressApplication>(appOptions);
    configureApp(app);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockPrismaHealthIndicator.pingCheck.mockResolvedValue(databaseUp);
  });

  it('should answer 200 when the database is up', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      info: databaseUp,
      error: {},
      details: databaseUp,
    });
  });

  it('should answer 503 when the database is down', async () => {
    mockPrismaHealthIndicator.pingCheck.mockResolvedValue(databaseDown);

    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(503);

    expect(response.body).toEqual({
      status: 'error',
      info: {},
      error: databaseDown,
      details: databaseDown,
    });
  });

  it('should not be versioned', async () => {
    await request(app.getHttpServer()).get('/v1/health').expect(404);
  });

  it('should not be rate limited', async () => {
    // The global limit is 20 requests per 60 seconds.
    for (let i = 0; i < 25; i++) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
  });
});

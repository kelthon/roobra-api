import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from 'src/app.module.js';
import { appOptions, configureApp } from 'src/app.setup.js';

describe('Application config wiring (e2e)', () => {
  let app: NestExpressApplication;
  let config: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app =
      moduleFixture.createNestApplication<NestExpressApplication>(appOptions);
    configureApp(app);

    await app.init();
    config = app.get(ConfigService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should write BigInt ids as strings in JSON', () => {
    expect(JSON.stringify({ id: 42n })).toBe('{"id":"42"}');
  });

  it.each([
    'jwt.expiresIn',
    'refreshToken.length',
    'refreshToken.expiresIn',
    'passwordResetToken.length',
    'passwordResetToken.expiresIn',
    'emailVerificationToken.length',
    'emailVerificationToken.expiresIn',
    'app.frontendUrl',
    'mail.from',
  ])('should load the "%s" config key used by the auth flows', (key) => {
    expect(config.get(key)).toBeDefined();
  });
});

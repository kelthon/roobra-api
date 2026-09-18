import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from 'src/app.module';

describe('Application config wiring (e2e)', () => {
  let app: INestApplication;
  let config: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    config = app.get(ConfigService);
  });

  afterAll(async () => {
    await app.close();
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

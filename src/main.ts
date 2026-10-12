import { AppModule } from 'src/app.module.js';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { appOptions, configureApp } from 'src/app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    ...appOptions,
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  configureApp(app);

  await app.listen(3000);
}
void bootstrap();

import {
  NestApplicationOptions,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { validationProblemFactory } from 'src/common/problems/validation-problem.js';
import { serializeBigIntAsString } from 'src/common/serialization/bigint-json.js';

/**
 * Options for creating the application. The e2e specs pass them too, so they
 * route requests the way production does.
 */
export const appOptions: NestApplicationOptions = {
  routeConflictPolicy: { duplicate: 'error', shadow: 'warn' },
  routeResolutionStrategy: 'specificity',
};

/**
 * Applies what every running instance needs and `AppModule` cannot declare:
 * the proxy setting, URI versioning (`/v1/...`), request validation, which
 * answers an invalid request as a `validation-failed` problem, and `BigInt` ids
 * written as strings in JSON.
 * Called by `main.ts` and by every e2e spec, so the specs test the same app.
 *
 * @param app The application, created but not initialized
 */
export function configureApp(app: NestExpressApplication): void {
  app.set('trust proxy', 1);

  serializeBigIntAsString();

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationProblemFactory,
    }),
  );
}

import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrismaClient } from '../factories/create-prisma-client.factory.js';
import { PrismaService } from '../prisma.service.js';

export const prismaServiceProvider: Provider = {
  provide: PrismaService,
  inject: [ConfigService],
  useFactory: createPrismaClient,
};

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'src/generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(private readonly config: ConfigService) {
    const connectionString = `${config.get<string>('database.url')}`;
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

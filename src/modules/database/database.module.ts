import { ConfigModule } from '@nestjs/config';
import { Module, OnModuleDestroy } from '@nestjs/common';
import { PrismaService, prismaServiceProvider } from './prisma.service.js';

@Module({
  imports: [ConfigModule],
  providers: [prismaServiceProvider],
  exports: [PrismaService],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}

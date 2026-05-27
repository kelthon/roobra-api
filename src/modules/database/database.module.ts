import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [ConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class CommonModule {}

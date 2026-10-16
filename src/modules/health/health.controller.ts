import { Controller, Get, UseFilters, VERSION_NEUTRAL } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '@app/modules/database/prisma.service.js';
import { RawResponse } from '@app/common/decorators/response/raw-response.decorator.js';
import { HealthCheckFilter } from './health-check.filter.js';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
@SkipThrottle()
@RawResponse()
@UseFilters(HealthCheckFilter)
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }
}

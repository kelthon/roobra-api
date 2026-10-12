import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from 'src/modules/database/prisma.service.js';
import { HealthController } from './health.controller.js';

type HealthIndicatorFunction = () => Promise<unknown>;

const mockHealthCheckService = {
  check: vi.fn((indicators: HealthIndicatorFunction[]): Promise<unknown> =>
    Promise.all(indicators.map((indicator) => indicator())),
  ),
};

const mockPrismaHealthIndicator = {
  pingCheck: vi.fn(),
};

const mockPrismaService = {};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: PrismaHealthIndicator, useValue: mockPrismaHealthIndicator },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    vi.clearAllMocks();
  });

  describe('check', () => {
    it('should check only the database', async () => {
      await controller.check();

      const indicators = mockHealthCheckService.check.mock.calls[0][0];
      expect(indicators).toHaveLength(1);
    });

    it('should ping the database through PrismaService', async () => {
      await controller.check();

      expect(mockPrismaHealthIndicator.pingCheck).toHaveBeenCalledWith(
        'database',
        mockPrismaService,
      );
    });

    it('should return the result of HealthCheckService', async () => {
      const result = { status: 'ok', info: {}, error: {}, details: {} };
      mockHealthCheckService.check.mockResolvedValueOnce(result);

      await expect(controller.check()).resolves.toBe(result);
    });
  });
});

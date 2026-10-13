import { ArgumentsHost, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckFilter } from './health-check.filter.js';

describe('HealthCheckFilter', () => {
  it("should answer 503 with Terminus's report", () => {
    const report = {
      status: 'error',
      info: {},
      error: { database: { status: 'down' } },
      details: { database: { status: 'down' } },
    };
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;

    new HealthCheckFilter().catch(
      new ServiceUnavailableException(report),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith(report);
  });
});

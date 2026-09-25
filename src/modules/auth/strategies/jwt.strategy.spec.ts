import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  let configServiceMock: ConfigService;

  beforeEach(() => {
    configServiceMock = {
      getOrThrow: vi.fn((key: string) => {
        if (key === 'jwt.secret') return 'test-secret';
        throw new Error(`Unexpected config key: ${key}`);
      }),
    } as unknown as ConfigService;
  });

  it('should read the JWT secret from config on construction', () => {
    new JwtStrategy(configServiceMock);

    expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('jwt.secret');
  });

  it('should pass the decoded payload through unchanged', () => {
    const strategy = new JwtStrategy(configServiceMock);
    const payload = {
      sub: 'user-id',
      email: 'john.doe@example.com',
      username: 'john.doe',
      role: 'SUBSCRIBER',
    };

    expect(strategy.validate(payload)).toBe(payload);
  });
});

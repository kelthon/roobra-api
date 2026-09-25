import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service.js';
import { LocalStrategy } from './local.strategy.js';
import type { Mock } from 'vitest';

describe('LocalStrategy', () => {
  let authServiceMock: AuthService;
  let strategy: LocalStrategy;

  beforeEach(() => {
    authServiceMock = {
      validateUser: vi.fn(),
    } as unknown as AuthService;

    strategy = new LocalStrategy(authServiceMock);
  });

  it('should return the auth payload for valid credentials', async () => {
    const payload = {
      sub: 'user-id',
      email: 'john.doe@example.com',
      username: 'john.doe',
      role: 'SUBSCRIBER',
    };
    (authServiceMock.validateUser as Mock).mockResolvedValue(payload);

    const result = await strategy.validate(
      'john.doe@example.com',
      'Password123!',
    );

    expect(authServiceMock.validateUser).toHaveBeenCalledWith(
      'john.doe@example.com',
      'Password123!',
    );
    expect(result).toBe(payload);
  });

  it('should throw UnauthorizedException for invalid credentials', async () => {
    (authServiceMock.validateUser as Mock).mockResolvedValue(null);

    await expect(
      strategy.validate('john.doe@example.com', 'WrongPassword123!'),
    ).rejects.toThrow(UnauthorizedException);
  });
});

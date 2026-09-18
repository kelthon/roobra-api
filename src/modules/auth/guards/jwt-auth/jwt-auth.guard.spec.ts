import { UnauthorizedException } from '@nestjs/common';
import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const payload: JWTAuthPayload = {
    sub: 'user-id',
    email: 'john.doe@example.com',
    username: 'john.doe',
    role: 'SUBSCRIBER',
  };

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  describe('handleRequest', () => {
    it('should return the payload for a valid token', () => {
      expect(guard.handleRequest(null, payload)).toBe(payload);
    });

    it('should throw the original error when Passport reports one', () => {
      const error = new Error('boom');

      expect(() => guard.handleRequest(error, false)).toThrow(error);
    });

    it('should throw UnauthorizedException when there is no payload and no error', () => {
      expect(() => guard.handleRequest(null, false)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when the payload has no sub claim', () => {
      expect(() => guard.handleRequest(null, { ...payload, sub: '' })).toThrow(
        UnauthorizedException,
      );
    });
  });
});

import { JWTAuthPayload } from 'src/shared/interfaces/jwt-auth-payload';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

describe('OptionalJwtAuthGuard', () => {
  let guard: OptionalJwtAuthGuard;

  const payload: JWTAuthPayload = {
    sub: 'user-id',
    email: 'john.doe@example.com',
    username: 'john.doe',
    role: 'SUBSCRIBER',
  };

  beforeEach(() => {
    guard = new OptionalJwtAuthGuard();
  });

  describe('handleRequest', () => {
    it('should return the payload when a valid token is present', () => {
      expect(guard.handleRequest(null, payload)).toBe(payload);
    });

    it('should return undefined (not throw) when there is no token', () => {
      expect(guard.handleRequest(null, false)).toBeUndefined();
    });

    it('should return undefined (not throw) even when Passport reports an error', () => {
      // guests must never be blocked by an invalid/expired token on an
      // optional-auth route
      expect(
        guard.handleRequest(new Error('invalid token'), false),
      ).toBeUndefined();
    });
  });
});

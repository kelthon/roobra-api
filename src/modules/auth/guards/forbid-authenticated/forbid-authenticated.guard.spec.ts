import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ForbidAuthenticatedGuard } from './forbid-authenticated.guard';

describe('ForbidAuthenticatedGuard', () => {
  let guard: ForbidAuthenticatedGuard;

  const createContext = (user?: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    guard = new ForbidAuthenticatedGuard();
  });

  it('should allow the request through when there is no authenticated user', () => {
    expect(guard.canActivate(createContext(undefined))).toBe(true);
  });

  it('should throw ForbiddenException when the request carries an authenticated user', () => {
    expect(() => guard.canActivate(createContext({ sub: 'user-id' }))).toThrow(
      ForbiddenException,
    );
  });

  it('should allow the request through when the user object has no sub claim', () => {
    expect(guard.canActivate(createContext({}))).toBe(true);
  });
});

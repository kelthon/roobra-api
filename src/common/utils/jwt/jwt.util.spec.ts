import { ExecutionContext } from '@nestjs/common';
import { getJwtPayload } from './jwt.util.js';

function buildContext(request?: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('getJwtPayload', () => {
  it('should return the payload Passport attached to the request', () => {
    const payload = {
      sub: 'abc123',
      email: 'user@test.com',
      username: 'user',
      role: 'USER',
    };

    expect(getJwtPayload(buildContext({ user: payload }))).toEqual(payload);
  });

  it('should return undefined when the request has no user', () => {
    expect(getJwtPayload(buildContext({}))).toBeUndefined();
  });

  it('should return undefined when the user is null', () => {
    expect(getJwtPayload(buildContext({ user: null }))).toBeUndefined();
  });

  it('should return undefined when there is no request', () => {
    expect(getJwtPayload(buildContext(undefined))).toBeUndefined();
  });
});

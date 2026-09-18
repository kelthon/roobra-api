import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

// String literals mirror UserRole's values without importing the
// Prisma-generated enum, which jest's moduleNameMapper redirects to a
// stripped-down mock (see src/__mocks__/prisma-client.mock.ts) that only
// covers PrismaClient/Prisma, not the enums module.
const UserRole = {
  SUBSCRIBER: 'SUBSCRIBER',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
} as const;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflectorMock: Reflector;

  const createContext = (user?: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflectorMock = { get: jest.fn() } as unknown as Reflector;
    guard = new RolesGuard(reflectorMock);
  });

  it('should allow the request through when the handler has no @Roles() metadata', () => {
    (reflectorMock.get as jest.Mock).mockReturnValue(undefined);

    const result = guard.canActivate(
      createContext({ sub: 'user-id', role: UserRole.SUBSCRIBER }),
    );

    expect(result).toBe(true);
  });

  it('should allow the request through when the user has one of the required roles', () => {
    (reflectorMock.get as jest.Mock).mockReturnValue([
      UserRole.ADMIN,
      UserRole.STAFF,
    ]);

    const result = guard.canActivate(
      createContext({ sub: 'user-id', role: UserRole.ADMIN }),
    );

    expect(result).toBe(true);
  });

  it('should allow the request through when a single required role is given (non-array)', () => {
    (reflectorMock.get as jest.Mock).mockReturnValue(UserRole.ADMIN);

    const result = guard.canActivate(
      createContext({ sub: 'user-id', role: UserRole.ADMIN }),
    );

    expect(result).toBe(true);
  });

  it('should deny the request when the user does not have one of the required roles', () => {
    (reflectorMock.get as jest.Mock).mockReturnValue([UserRole.ADMIN]);

    const result = guard.canActivate(
      createContext({ sub: 'user-id', role: UserRole.SUBSCRIBER }),
    );

    expect(result).toBe(false);
  });

  it('should deny the request when there is no authenticated user', () => {
    (reflectorMock.get as jest.Mock).mockReturnValue([UserRole.ADMIN]);

    const result = guard.canActivate(createContext(undefined));

    expect(result).toBe(false);
  });
});

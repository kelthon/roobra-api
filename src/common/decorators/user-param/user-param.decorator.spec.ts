import { ExecutionContext } from '@nestjs/common';
import { User } from './user.decorator.js';

// NestJS's documented recipe for unit-testing a custom param decorator:
// createParamDecorator() only exposes the factory through route metadata,
// so we register it on a throwaway class and pull the factory back out.
function getParamDecoratorFactory(decorator: () => ParameterDecorator) {
  class TestDecorator {
    public test(@decorator() _value: unknown) {}
  }

  const args = Reflect.getMetadata('__routeArguments__', TestDecorator, 'test');
  return args[Object.keys(args)[0]].factory;
}

function buildContext(user?: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('User decorator', () => {
  const factory = getParamDecoratorFactory(User);

  it('should map the JWT payload (sub) to a UserDto (id)', () => {
    const result = factory(
      undefined,
      buildContext({
        sub: 'user-id',
        email: 'john.doe@example.com',
        username: 'john.doe',
        role: 'SUBSCRIBER',
      }),
    );

    expect(result).toEqual({
      id: 'user-id',
      email: 'john.doe@example.com',
      username: 'john.doe',
      role: 'SUBSCRIBER',
    });
  });

  it('should return undefined when the request has no authenticated user', () => {
    const result = factory(undefined, buildContext(undefined));

    expect(result).toBeUndefined();
  });
});

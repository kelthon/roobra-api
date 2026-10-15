import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Authenticates a route with a Passport strategy.
 *
 * @param strategy The strategy name; `local` checks email and password,
 *   `google` has no strategy registered yet
 */
export function LoginWith(strategy: 'local' | 'google') {
  return applyDecorators(UseGuards(AuthGuard(strategy)));
}

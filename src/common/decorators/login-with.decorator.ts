import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export function LoginWith(strategy: 'local' | 'google') {
  return applyDecorators(UseGuards(AuthGuard(strategy)));
}

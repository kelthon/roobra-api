import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth/jwt-auth.guard.js';

export function Authenticated() {
  return applyDecorators(UseGuards(JwtAuthGuard));
}

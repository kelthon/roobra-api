import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@app/modules/auth/guards/jwt-auth/jwt-auth.guard.js';

export function UserOnly() {
  return applyDecorators(UseGuards(JwtAuthGuard));
}

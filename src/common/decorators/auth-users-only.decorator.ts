import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth/jwt-auth.guard';

export function UserOnly() {
  return applyDecorators(UseGuards(JwtAuthGuard));
}

import { applyDecorators, UseGuards } from '@nestjs/common';
import { ForbidAuthenticatedGuard } from 'src/modules/auth/guards/forbid-authenticated.guard';

export function GuestOnly() {
  return applyDecorators(UseGuards(ForbidAuthenticatedGuard));
}

import { applyDecorators, UseGuards } from '@nestjs/common';
import { ForbidAuthenticatedGuard } from 'src/modules/auth/guards/forbid-authenticated/forbid-authenticated.guard';
import { OptionalJwtAuthGuard } from 'src/modules/auth/guards/optional-jwt/optional-jwt-auth.guard';

export function GuestOnly() {
  return applyDecorators(
    UseGuards(OptionalJwtAuthGuard),
    UseGuards(ForbidAuthenticatedGuard),
  );
}

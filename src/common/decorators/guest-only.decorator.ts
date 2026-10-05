import { applyDecorators, UseGuards } from '@nestjs/common';
import { ForbidAuthenticatedGuard } from 'src/modules/auth/guards/forbid-authenticated/forbid-authenticated.guard';
import { OptionalJwtAuthGuard } from 'src/modules/auth/guards/optional-jwt/optional-jwt-auth.guard';

/**
 * Restricts a route to guests. A missing, invalid or expired access token
 * counts as a guest.
 */
export function GuestOnly() {
  return applyDecorators(
    UseGuards(OptionalJwtAuthGuard),
    UseGuards(ForbidAuthenticatedGuard),
  );
}

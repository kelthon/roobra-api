import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  /**
   * Returns the verified token payload, which becomes `request.user`. Does not
   * check the database: deleting a user revokes their refresh tokens, so an
   * access token already issued stays valid until it expires (`jwt.expiresIn`).
   *
   * @param payload The verified token payload
   * @throws UnauthorizedException When the payload has no `sub` claim
   */
  validate(payload: Record<string, unknown>) {
    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new UnauthorizedException(
        'Invalid token payload: missing sub claim',
      );
    }

    return payload;
  }
}

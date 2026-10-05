import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
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
   * check the database: a deleted or blocked user keeps a valid token until it
   * expires.
   *
   * @param payload The verified token payload
   */
  validate(payload: Record<string, unknown>) {
    // TODO: add deleted/blocked users verification
    return payload;
  }
}

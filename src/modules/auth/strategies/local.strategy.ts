import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ProblemException } from '@app/common/exceptions/problem.exception.js';
import { AuthService } from '../auth.service.js';
import { Strategy } from 'passport-local';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  /**
   * Checks the email and password of a login request.
   *
   * @param email The user email
   * @param password The plain password
   * @throws ProblemException `invalid-credentials` (401) when the credentials
   *   do not match
   */
  async validate(email: string, password: string) {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new ProblemException('invalid-credentials');
    }
    return user;
  }
}

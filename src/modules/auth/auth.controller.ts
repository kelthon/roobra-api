import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { User } from '@app/common/decorators/user-param/user-param.decorator.js';
import { Authenticated } from '@app/common/decorators/auth/authenticated.decorator.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { Guest } from '@app/common/decorators/auth/guest.decorator.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { type UserDto } from '@app/common/dto/user-dto.js';
import { LoginWith } from '@app/common/decorators/auth/login-with.decorator.js';
import { Throttle } from '@nestjs/throttler';

// Shared limit for auth endpoints sensitive to brute-forcing/enumeration
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @Guest()
  @Post('register')
  async register(@Body() registerDto: RegisterUserDto) {
    return await this.authService.register(registerDto);
  }

  /**
   * Signs a user in with email and password, already checked by
   * `LoginWith('local')` before this runs.
   *
   * @param user The user the local strategy accepted
   * @param _loginDto The credentials, only declared so the body is validated
   */
  // Guards run bottom-up: Guest must run before LoginWith, or its
  // OptionalJwtAuthGuard overwrites the user LoginWith put on the request
  @Throttle(AUTH_THROTTLE)
  @LoginWith('local')
  @Guest()
  @Post('login')
  async login(@User() user: UserDto, @Body() _loginDto: LoginDto) {
    return await this.authService.login(user.id);
  }

  @Authenticated()
  @Post('logout')
  async logout(@User() user: UserDto, @Body() logoutDto: LogoutDto) {
    return await this.authService.logout(user.id, logoutDto);
  }

  @Authenticated()
  @Post('logout/all')
  async logoutAllSessions(@User() user: UserDto) {
    return await this.authService.logoutAllSessions(user.id);
  }

  @Authenticated()
  @Get('sessions')
  async getActiveSessions(@User() user: UserDto) {
    return await this.authService.getActiveSessions(user.id);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('refresh-token')
  async refreshSession(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.refreshSession(refreshTokenDto);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Authenticated()
  @Post('change-password')
  changePassword(
    @User() user: UserDto,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, changePasswordDto);
  }

  @Authenticated()
  @Get('verify-email')
  async sendVerificationEmail(@User() user: UserDto) {
    return await this.authService.sendVerificationEmail(user.id);
  }

  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return await this.authService.verifyEmail(verifyEmailDto.token);
  }
}

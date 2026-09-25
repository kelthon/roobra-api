import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { User } from 'src/common/decorators/user.decorator.js';
import { UserOnly } from 'src/common/decorators/auth-users-only.decorator.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { GuestOnly } from 'src/common/decorators/guest-only.decorator.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { type UserDto } from 'src/common/dto/user-dto.js';
import { LoginWith } from 'src/common/decorators/login-with.decorator.js';
import { Throttle } from '@nestjs/throttler';

// Shared limit for auth endpoints sensitive to brute-forcing/enumeration
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UserOnly()
  @Get('me')
  async getMe(@User() user: UserDto) {
    return await this.authService.getMe(user.id);
  }

  @Throttle(AUTH_THROTTLE)
  @GuestOnly()
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
  @Throttle(AUTH_THROTTLE)
  @GuestOnly()
  @LoginWith('local')
  @Post('login')
  async login(@User() user: UserDto, @Body() _loginDto: LoginDto) {
    return await this.authService.login(user.id);
  }

  @UserOnly()
  @Post('logout')
  async logout(@User() user: UserDto, @Body() logoutDto: LogoutDto) {
    return await this.authService.logout(user.id, logoutDto);
  }

  @UserOnly()
  @Post('logout/all')
  async logoutAllSessions(@User() user: UserDto) {
    return await this.authService.logoutAllSessions(user.id);
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

  @UserOnly()
  @Post('change-password')
  changePassword(
    @User() user: UserDto,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, changePasswordDto);
  }

  @UserOnly()
  @Get('verify-email')
  async sendVerificationEmail(@User() user: UserDto) {
    return await this.authService.sendVerificationEmail(user.id);
  }

  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return await this.authService.verifyEmail(verifyEmailDto.token);
  }
}

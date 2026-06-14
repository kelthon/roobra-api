import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { LogoutDto } from './dto/logout.dto';
import { User } from 'src/common/decorators/user.decorator';
import { AuthUsersOnly } from 'src/common/decorators/auth-users-only.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GuestOnly } from 'src/common/decorators/guest-only.decorator';
import { type AuthPayload } from 'src/shared/interfaces/auth-payload';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @AuthUsersOnly()
  @Get('me')
  async getMe(@User() user: AuthPayload) {
    const userId = user.sub;
    return await this.authService.getMe(userId);
  }

  @GuestOnly()
  @Post('register')
  async register(@Body() registerDto: RegisterUserDto) {
    return await this.authService.register(registerDto);
  }

  @GuestOnly()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @AuthUsersOnly()
  @Post('logout')
  async logout(@User() user: AuthPayload, @Body() logoutDto: LogoutDto) {
    const userId = user.sub;
    return await this.authService.logout(userId, logoutDto);
  }

  @AuthUsersOnly()
  @Post('logout-all-sessions')
  async logoutAllSessions(@User() user: AuthPayload) {
    const userId = user.sub;
    return await this.authService.logoutAllSessions(userId);
  }

  @AuthUsersOnly()
  @Post('refresh-token')
  async refreshToken(
    @User() user: AuthPayload,
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    const userId = user.sub;
    return await this.authService.refreshToken(userId, refreshTokenDto);
  }

  @AuthUsersOnly()
  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @GuestOnly()
  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @AuthUsersOnly()
  @Post('change-password')
  changePassword(
    @User() user: AuthPayload,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const userId = user.sub;
    return this.authService.changePassword(userId, changePasswordDto);
  }
}

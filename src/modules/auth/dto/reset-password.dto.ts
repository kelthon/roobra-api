import { IsNotEmpty, IsStrongPassword, IsString } from 'class-validator';
import { IsConfirmPassword } from 'src/common/decorators/is-confirm-password.decorator.js';

export class ResetPasswordDto {
  @IsStrongPassword()
  newPassword!: string;

  @IsConfirmPassword('newPassword', {})
  confirmNewPassword!: string;

  // Raw hex token from SimpleTokenService (see AuthService.forgotPassword),
  // not a JWT.
  @IsString()
  @IsNotEmpty()
  resetToken!: string;
}

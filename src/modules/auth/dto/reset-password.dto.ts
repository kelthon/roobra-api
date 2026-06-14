import { IsJWT, IsStrongPassword } from 'class-validator';
import { IsConfirmPassword } from 'src/common/decorators/is-confirm-password.decorator';

export class ResetPasswordDto {
  @IsStrongPassword()
  newPassword!: string;

  @IsConfirmPassword('newPassword', {})
  confirmNewPassword!: string;

  @IsJWT()
  resetToken!: string;
}

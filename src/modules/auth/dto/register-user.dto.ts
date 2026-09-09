import { IsEmail, IsStrongPassword } from 'class-validator';
import { IsConfirmPassword } from 'src/common/decorators/is-confirm-password.decorator';
import { IsUserName } from 'src/common/decorators/is-username.decorator';

export class RegisterUserDto {
  @IsEmail()
  email!: string;

  @IsUserName()
  username!: string;

  @IsStrongPassword()
  password!: string;

  @IsConfirmPassword('password', {})
  confirmPassword!: string;
}

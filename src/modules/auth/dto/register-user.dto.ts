import { IsEmail, IsStrongPassword } from 'class-validator';
import { IsConfirmPassword } from 'src/common/decorators/is-confirm-password.decorator';
import { IsName } from 'src/common/decorators/is-name.decorator';

export class RegisterUserDto {
  @IsEmail()
  email!: string;

  @IsName()
  username!: string;

  @IsStrongPassword()
  password!: string;

  @IsConfirmPassword('password', {})
  confirmPassword!: string;
}

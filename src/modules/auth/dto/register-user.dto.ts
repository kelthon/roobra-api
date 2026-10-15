import { IsEmail, IsStrongPassword } from 'class-validator';
import { IsConfirmPassword } from '@app/validators/is-confirm-password/is-confirm-password.decorator.js';
import { IsUserName } from '@app/validators/is-username/is-username.decorator.js';

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

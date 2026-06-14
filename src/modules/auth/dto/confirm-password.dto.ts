import { IsStrongPassword } from 'class-validator';

export class ConfirmPasswordDto {
  @IsStrongPassword()
  password!: string;
}

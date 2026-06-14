import { IsStrongPassword } from 'class-validator';

export class ChangePasswordDto {
  @IsStrongPassword()
  currentPassword!: string;

  @IsStrongPassword()
  newPassword!: string;
}

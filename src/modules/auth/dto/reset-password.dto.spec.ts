import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ResetPasswordDto } from './reset-password.dto';

describe('ResetPasswordDto', () => {
  const validPayload = {
    // Real reset tokens are raw hex strings from SimpleTokenService
    // (crypto.randomBytes(...).toString('hex')), never JWTs.
    resetToken: 'a'.repeat(64),
    newPassword: 'NewPassword123!',
    confirmNewPassword: 'NewPassword123!',
  };

  it('should accept a real (hex, non-JWT) reset token', async () => {
    const dto = plainToInstance(ResetPasswordDto, validPayload);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should reject an empty reset token', async () => {
    const dto = plainToInstance(ResetPasswordDto, {
      ...validPayload,
      resetToken: '',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'resetToken')).toBe(true);
  });

  it('should reject when confirmNewPassword does not match newPassword', async () => {
    const dto = plainToInstance(ResetPasswordDto, {
      ...validPayload,
      confirmNewPassword: 'SomethingElse123!',
    });

    const errors = await validate(dto);

    expect(
      errors.some((error) => error.property === 'confirmNewPassword'),
    ).toBe(true);
  });
});

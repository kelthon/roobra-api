import { validate } from 'class-validator';
import { IsConfirmPassword } from './is-confirm-password.decorator';

class DummyDto {
  password!: string;

  @IsConfirmPassword('password')
  confirmPassword!: string;
}

describe('IsConfirmPassword', () => {
  it('should pass when the confirmation matches the related field', async () => {
    const dto = Object.assign(new DummyDto(), {
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail when the confirmation does not match the related field', async () => {
    const dto = Object.assign(new DummyDto(), {
      password: 'Password123!',
      confirmPassword: 'SomethingElse123!',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual(
      expect.objectContaining({ isConfirmPassword: 'Passwords do not match.' }),
    );
  });

  it('should fail when the confirmation is not a string', async () => {
    const dto = Object.assign(new DummyDto(), {
      password: 'Password123!',
      confirmPassword: 12345,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });
});

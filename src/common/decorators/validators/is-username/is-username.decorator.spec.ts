import { validate } from 'class-validator';
import { IsUserName } from './is-username.decorator.js';

class DummyDto {
  @IsUserName()
  username!: string;
}

class CustomBoundsDto {
  @IsUserName(2, 5)
  username!: string;
}

describe('IsUserName', () => {
  it('should pass for a valid username with letters, digits and underscore', async () => {
    const dto = Object.assign(new DummyDto(), { username: 'john_doe_123' });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('should support unicode letters', async () => {
    const dto = Object.assign(new DummyDto(), { username: 'joão_ñandú' });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('should fail for a username shorter than the minimum length', async () => {
    const dto = Object.assign(new DummyDto(), { username: 'ab' });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('should fail for a username longer than the maximum length', async () => {
    const dto = Object.assign(new DummyDto(), { username: 'a'.repeat(76) });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('should fail for a username containing spaces or symbols', async () => {
    const dto = Object.assign(new DummyDto(), { username: 'john doe!' });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('should fail when the value is not a string', async () => {
    const dto = Object.assign(new DummyDto(), { username: 12345 });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('should respect custom min/max length bounds', async () => {
    const tooShort = Object.assign(new CustomBoundsDto(), { username: 'a' });
    const justRight = Object.assign(new CustomBoundsDto(), {
      username: 'abcde',
    });

    expect(await validate(tooShort)).toHaveLength(1);
    expect(await validate(justRight)).toHaveLength(0);
  });
});

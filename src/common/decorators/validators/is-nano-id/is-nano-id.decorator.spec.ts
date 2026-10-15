import { validate } from 'class-validator';
import { IsNanoId } from './is-nano-id.decorator.js';

class DummyDto {
  @IsNanoId()
  id!: string;
}

describe('IsNanoId', () => {
  it('should pass for a valid 21-char nano id', async () => {
    const dto = Object.assign(new DummyDto(), {
      id: 'V1StGXR8_Z5jdHi6B-myT',
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('should fail for an id shorter than 21 chars', async () => {
    const dto = Object.assign(new DummyDto(), { id: 'tooShort' });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('should fail for an id containing invalid characters', async () => {
    const dto = Object.assign(new DummyDto(), {
      id: 'V1StGXR8+Z5jdHi6B/myT',
    });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('should fail when the value is not a string', async () => {
    const dto = Object.assign(new DummyDto(), { id: 12345 });

    expect(await validate(dto)).toHaveLength(1);
  });
});

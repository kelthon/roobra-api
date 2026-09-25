import { validate } from 'class-validator';
import { IsName } from './is-name.decorator.js';

class NoSpacesDto {
  @IsName()
  name!: string;
}

class WithSpacesDto {
  @IsName(3, 75, true)
  name!: string;
}

describe('IsName', () => {
  it('should pass for a simple alphabetic name', async () => {
    const dto = Object.assign(new NoSpacesDto(), { name: 'John' });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('should pass for a hyphenated or apostrophised name', async () => {
    const dto = Object.assign(new NoSpacesDto(), { name: "O'Brien-Silva" });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('should fail for a name with spaces when allowSpaces is false', async () => {
    const dto = Object.assign(new NoSpacesDto(), { name: 'John Doe' });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('should pass for a name with spaces when allowSpaces is true', async () => {
    const dto = Object.assign(new WithSpacesDto(), { name: 'John Doe' });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('should fail for a name shorter than the minimum length', async () => {
    const dto = Object.assign(new NoSpacesDto(), { name: 'Al' });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('should fail for a name containing digits or symbols', async () => {
    const dto = Object.assign(new NoSpacesDto(), { name: 'John3' });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('should fail when the value is not a string', async () => {
    const dto = Object.assign(new NoSpacesDto(), { name: 12345 });

    expect(await validate(dto)).toHaveLength(1);
  });
});

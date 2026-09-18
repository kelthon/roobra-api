import { validate } from 'class-validator';
import { IsPhoneNumber } from './is-phone-number.decorator';

class DummyDto {
  @IsPhoneNumber()
  phoneNumber!: string;
}

describe('IsPhoneNumber', () => {
  it('should pass for a valid E.164 phone number', async () => {
    const dto = Object.assign(new DummyDto(), { phoneNumber: '+14155552671' });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('should fail for an obviously invalid phone number', async () => {
    const dto = Object.assign(new DummyDto(), { phoneNumber: 'not-a-phone' });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('should fail when the value is not a string', async () => {
    const dto = Object.assign(new DummyDto(), { phoneNumber: 14155552671 });

    expect(await validate(dto)).toHaveLength(1);
  });
});

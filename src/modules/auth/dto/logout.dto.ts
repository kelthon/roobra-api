import { RefreshTokenDto } from './refresh-token.dto';
import { PickType } from '@nestjs/mapped-types';

export class LogoutDto extends PickType(RefreshTokenDto, ['refreshToken']) {}

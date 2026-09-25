import { RefreshTokenDto } from './refresh-token.dto.js';
import { PickType } from '@nestjs/mapped-types';

export class LogoutDto extends PickType(RefreshTokenDto, ['refreshToken']) {}

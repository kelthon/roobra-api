import { Global, Module } from '@nestjs/common';
import { SimpleHashService } from './services/simple-hash/simple-hash.service.js';
import { SimpleTokenService } from './services/simple-token/simple-token.service.js';

@Global()
@Module({
  providers: [SimpleHashService, SimpleTokenService],
  exports: [SimpleHashService, SimpleTokenService],
})
export class CommonModule {}

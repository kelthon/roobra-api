import { Global, Module } from '@nestjs/common';
import { SimpleHashService } from './services/simple-hash.service';
import { SimpleTokenService } from './services/simple-token.service';

@Global()
@Module({
  providers: [SimpleHashService, SimpleTokenService],
  exports: [SimpleHashService, SimpleTokenService],
})
export class CommonModule {}

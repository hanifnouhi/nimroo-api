import { Global, Module } from '@nestjs/common';
import { QuerySanitizerService } from './services/query-sanitizer.service';

@Global()
@Module({
  providers: [QuerySanitizerService],
  exports: [QuerySanitizerService],
})
export class CommonModule {}
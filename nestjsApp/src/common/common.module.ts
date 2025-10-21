import { Module } from '@nestjs/common';
import { QuerySanitizerService } from './services/query-sanitizer.service';

@Module({
  providers: [QuerySanitizerService],
  exports: [QuerySanitizerService],
})
export class CommonModule {}
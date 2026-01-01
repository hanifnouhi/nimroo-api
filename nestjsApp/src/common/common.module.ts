import { Global, Module } from '@nestjs/common';
import { QuerySanitizerService } from './services/query-sanitizer.service';
import { UsageInterceptor } from './Interceptors/usage.interceptor';
import { UserModule } from '../user/user.module';
import { CacheModule } from '../cache/cache.module';

@Global()
@Module({
  imports: [
    UserModule,
    CacheModule
  ],
  providers: [QuerySanitizerService, UsageInterceptor],
  exports: [QuerySanitizerService, UsageInterceptor],
})
export class CommonModule {}
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { CacheService } from '../../cache/cache.service'; // Adjust path
import { PLANS_CONFIG } from '../membership/membership.config';
import { LIMIT_KEY } from '../decorators/check-limit.decorator';
import { UserService } from '../../user/user.service';
import { MembershipFeature, MembershipPlan } from '../../user/user.enums';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsageInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // First check if the membership is disabled
    const isMembershipDisabled =
      this.configService.get<string>('DISABLE_MEMBERSHIP_SYSTEM') === 'true';
    // If membership is disabled just proceed
    if (isMembershipDisabled) {
      return next.handle();
    }

    const { user } = context.switchToHttp().getRequest();
    const feature = this.reflector.get<MembershipFeature>(
      LIMIT_KEY,
      context.getHandler(),
    );

    if (!feature || !user) return next.handle();

    const userPlan = user.membership as MembershipPlan;
    const limit = PLANS_CONFIG[userPlan]?.[feature];

    // --- 1. HANDLE BOOLEAN PERMISSIONS (Binary Access) ---
    if (typeof limit === 'boolean') {
      if (limit === false) {
        throw new ForbiddenException(
          `Your ${userPlan} plan does not include ${feature}.`,
        );
      }
      // If true, just proceed. We don't track "how many times" you synced.
      return next.handle();
    }

    // --- 2. HANDLE NUMERIC QUOTAS (Daily Limits) ---
    if (typeof limit === 'number') {
      if (limit === 0) {
        throw new ForbiddenException(
          `Feature ${feature} is not available in your current plan.`,
        );
      }

      const cacheKey = `usage:${user.userId}:${feature}`;

      // Fetch current usage (from Cache or DB)
      const currentUsage = await this.cacheService.getOrSetCachedValue<number>(
        cacheKey,
        async () => await this.userService.getUsageCount(user.userId, feature),
        86400, // 24h
      );

      if (currentUsage >= limit) {
        throw new ForbiddenException(
          `Daily limit of ${limit} reached for ${feature}.`,
        );
      }

      return next.handle().pipe(
        tap(async () => {
          // Only increment for numeric quotas
          await this.userService.incrementUsage(user.userId, feature);
          await this.cacheService.setCachedValue(
            cacheKey,
            currentUsage + 1,
            86400,
          );
        }),
      );
    }

    // Fallback if the feature isn't defined in the config at all
    return next.handle();
  }
}

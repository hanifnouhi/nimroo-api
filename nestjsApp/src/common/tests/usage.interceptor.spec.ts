import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, Observable, of } from 'rxjs';
import { UsageInterceptor } from '../Interceptors/usage.interceptor';
import { CacheService } from '../../cache/cache.service';
import { UserService } from '../../user/user.service';
import { MembershipPlan, MembershipFeature } from '../../user/user.enums';
import { LIMIT_KEY } from '../decorators/check-limit.decorator';

// Mock the PLANS_CONFIG since it's an imported constant
// Using string literals to avoid initialization order issues with jest.mock hoisting
jest.mock('../membership/membership.config', () => ({
  PLANS_CONFIG: {
    free: {
      cloud_storage: true,
      cloud_sync: false,
      card_create: 5,
      image_generation: 0,
    },
  },
}));

describe('UsageInterceptor', () => {
  let interceptor: UsageInterceptor;
  let reflector: Reflector;
  let cacheService: CacheService;
  let userService: UserService;
  let configService: ConfigService;

  const mockCallHandler: CallHandler = {
    handle: jest.fn().mockReturnValue(of('data')),
  };

  const createMockContext = (
    user: any,
    handler: any,
  ): Partial<ExecutionContext> => ({
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user }),
    }),
    getHandler: jest.fn().mockReturnValue(handler),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageInterceptor,
        {
          provide: Reflector,
          useValue: { get: jest.fn() },
        },
        {
          provide: CacheService,
          useValue: {
            getOrSetCachedValue: jest.fn(),
            setCachedValue: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: { getUsageCount: jest.fn(), incrementUsage: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    interceptor = module.get<UsageInterceptor>(UsageInterceptor);
    reflector = module.get<Reflector>(Reflector);
    cacheService = module.get<CacheService>(CacheService);
    userService = module.get<UserService>(UserService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('Global Membership Toggle', () => {
    it('should proceed if DISABLE_MEMBERSHIP_SYSTEM is true', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('true');
      const context = createMockContext({}, {}) as ExecutionContext;

      const result = await interceptor.intercept(context, mockCallHandler);
      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('Boolean Permissions', () => {
    it('should throw ForbiddenException if feature is false in plan', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('false');
      jest
        .spyOn(reflector, 'get')
        .mockReturnValue(MembershipFeature.CLOUD_SYNC);

      const context = createMockContext(
        { userId: '1', membership: MembershipPlan.FREE },
        {},
      ) as ExecutionContext;

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow access if feature is true in plan', async () => {
      jest
        .spyOn(reflector, 'get')
        .mockReturnValue(MembershipFeature.CLOUD_STORAGE);
      const context = createMockContext(
        { userId: '1', membership: MembershipPlan.FREE },
        {},
      ) as ExecutionContext;

      const result = await interceptor.intercept(context, mockCallHandler);
      expect(result).toBeDefined();
    });
  });

  describe('Numeric Quotas', () => {
    it('should throw ForbiddenException if daily limit is reached', async () => {
      jest
        .spyOn(reflector, 'get')
        .mockReturnValue(MembershipFeature.CARD_CREATE);
      jest.spyOn(cacheService, 'getOrSetCachedValue').mockResolvedValue(5); // Limit is 5

      const context = createMockContext(
        { userId: '1', membership: MembershipPlan.FREE },
        {},
      ) as ExecutionContext;

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow access and increment usage if under limit', async () => {
      jest
        .spyOn(reflector, 'get')
        .mockReturnValue(MembershipFeature.CARD_CREATE);
      jest.spyOn(cacheService, 'getOrSetCachedValue').mockResolvedValue(2); // Under limit (5)

      const context = createMockContext(
        { userId: 'user-123', membership: MembershipPlan.FREE },
        {},
      ) as ExecutionContext;

      const observable = await interceptor.intercept(context, mockCallHandler);

      await lastValueFrom(observable);

      expect(userService.incrementUsage).toHaveBeenCalledWith(
        'user-123',
        MembershipFeature.CARD_CREATE,
      );
      expect(cacheService.setCachedValue).toHaveBeenCalledWith(
        'usage:user-123:card_create',
        3,
        86400,
      );
    });

    it('should NOT increment usage if the request handler fails', async () => {
      jest
        .spyOn(reflector, 'get')
        .mockReturnValue(MembershipFeature.CARD_CREATE);
      jest.spyOn(cacheService, 'getOrSetCachedValue').mockResolvedValue(2);

      // Mock the handler to throw an error
      const failingHandler = {
        handle: jest
          .fn()
          .mockReturnValue(
            new Observable((sub) => sub.error(new Error('Boom'))),
          ),
      };

      const context = createMockContext(
        { userId: 'user-123', membership: MembershipPlan.FREE },
        {},
      ) as ExecutionContext;

      const observable = await interceptor.intercept(context, failingHandler);

      try {
        await lastValueFrom(observable);
      } catch (e) {
        // Expected error
      }

      expect(userService.incrementUsage).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should pass through if no feature metadata is found', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(undefined); // No @CheckLimit decorator
      const context = createMockContext(
        { userId: '1' },
        {},
      ) as ExecutionContext;

      const result = await interceptor.intercept(context, mockCallHandler);
      await lastValueFrom(result);
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should pass through if no user is on the request', async () => {
      jest
        .spyOn(reflector, 'get')
        .mockReturnValue(MembershipFeature.CARD_CREATE);
      const context = createMockContext(undefined, {}) as ExecutionContext; // Request has no user

      const result = await interceptor.intercept(context, mockCallHandler);
      await lastValueFrom(result);
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should use 86400s TTL when getting or setting cache', async () => {
      const feature = MembershipFeature.CARD_CREATE;
      const userId = 'user-abc';
      jest.spyOn(reflector, 'get').mockReturnValue(feature);
      jest.spyOn(cacheService, 'getOrSetCachedValue').mockResolvedValue(0);

      const context = createMockContext(
        { userId, membership: MembershipPlan.FREE },
        {},
      ) as ExecutionContext;
      const result = await interceptor.intercept(context, mockCallHandler);
      await lastValueFrom(result);

      // Verify the TTL (24h) is passed to getOrSetCachedValue
      expect(cacheService.getOrSetCachedValue).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        86400,
      );

      // Verify the TTL (24h) is passed to setCachedValue on increment
      expect(cacheService.setCachedValue).toHaveBeenCalledWith(
        `usage:${userId}:${feature}`,
        1,
        86400,
      );
    });

    it('should throw ForbiddenException if limit is 0', async () => {
      jest
        .spyOn(reflector, 'get')
        .mockReturnValue(MembershipFeature.IMAGE_GENERATION);

      const context = createMockContext(
        { userId: '1', membership: MembershipPlan.FREE },
        {},
      ) as ExecutionContext;

      await expect(
        interceptor.intercept(context, mockCallHandler),
      ).rejects.toThrow(
        new ForbiddenException(
          `Feature ${MembershipFeature.IMAGE_GENERATION} is not available in your current plan.`,
        ),
      );

      expect(cacheService.getOrSetCachedValue).not.toHaveBeenCalled();
    });
  });
});

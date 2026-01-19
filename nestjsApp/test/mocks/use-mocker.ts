// test/mocks/use-mocker.ts
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from '../../src/cache/cache.service';

export const mocks: {
  cacheManager?: { get: jest.Mock; set: jest.Mock };
  configService?: { get: jest.Mock };
  cacheService?: {
    getOrSetCachedValue: jest.Mock;
    getCacheValue: jest.Mock;
    setCacheValue: jest.Mock;
  };
} = {};

/**
 * Factory function to generate a mock ConfigService with optional overrides.
 */
export const createMockConfigService = (
  overrides: Record<string, any> = {},
) => {
  const defaultValues: Record<string, any> = {
    TRANSLATE_PROVIDER: 'azure',
    AZURE_TRANSLATE_KEY1: 'mock-key',
    AZURE_TRANSLATE_URL: 'https://mock-url.com',
    AZURE_TRANSLATE_REGION: 'France Central',
    SPELL_CHECK_ENABLED: 'true',
    SPELL_CHECK_SERVICE_URL: 'https://mock-url.com',
    DATABASE_URI: 'mongodb://127.0.0.1:27017/nimroo-test',
    JWT_ACCESS_TOKEN_SECRET: 'nim123roo456',
    JWT_ACCESS_TOKEN_EXPIRATION_MS: '3600000',
    JWT_REFRESH_TOKEN_SECRET: 'nim123roo456refresh',
    JWT_REFRESH_TOKEN_EXPIRATION_MS: '604800000',
  };

  const mockGet = jest.fn((key: string) => {
    if (key in overrides) return overrides[key];
    return defaultValues[key] ?? null;
  });

  const mockConfig = { get: mockGet };
  mocks.configService = mockConfig;

  return mockConfig;
};

export const globalUseMocker = (token: any) => {
  // Use dynamic config if previously created
  if (token === ConfigService && mocks.configService) {
    return mocks.configService;
  }

  if (token === ConfigService) {
    return createMockConfigService();
  }

  if (token === CACHE_MANAGER) {
    const mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    mocks.cacheManager = mockCache;
    return mockCache;
  }

  if (token === CacheService) {
    const mockCacheService = {
      getOrSetCachedValue: jest
        .fn()
        .mockImplementation((key, factoryFn, ttl) => {
          return factoryFn();
        }),
      getCacheValue: jest.fn().mockResolvedValue(undefined),
      setCacheValue: jest.fn().mockResolvedValue(undefined),
    };
    mocks.cacheService = mockCacheService;
    return mockCacheService;
  }

  if (typeof token === 'function') {
    const mock = {};
    for (const key of Object.getOwnPropertyNames(token.prototype)) {
      if (key !== 'constructor') {
        mock[key] = jest.fn();
      }
    }
    return mock;
  }

  return {};
};

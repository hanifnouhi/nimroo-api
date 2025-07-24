// test/mocks/use-mocker.ts
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

export const mocks: {
  cacheManager?: { get: jest.Mock; set: jest.Mock };
  configService?: { get: jest.Mock };
  translationProvider?: { translate: jest.Mock }
} = {};

/**
 * Factory function to generate a mock ConfigService with optional overrides.
 */
export const createMockConfigService = (overrides: Record<string, any> = {}) => {
  const defaultValues: Record<string, any> = {
    TRANSLATE_PROVIDER: 'azure',
    AZURE_TRANSLATE_KEY1: 'mock-key',
    AZURE_TRANSLATE_URL: 'https://mock-url.com',
    AZURE_TRANSLATE_REGION: 'France Central',
    SPELL_CHECK_ENABLED: 'true',
    SPELL_CHECK_SERVICE_URL: 'https://mock-url.com',
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

  if (token === 'TranslationProvider') {
    const mockTranslationProvider = {
      translate: jest.fn(),
    };
    mocks.translationProvider = mockTranslationProvider;
    return mockTranslationProvider;
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

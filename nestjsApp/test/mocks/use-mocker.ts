// test/mocks/use-mocker.ts
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PinoLogger } from 'nestjs-pino';
import { TranslateService } from '../../src/translate/translate.service';

interface MockTranslationResult {
  translated: string;
  detectedLanguage?: string | undefined;
  correctedText?: string | undefined;
}

export const mocks: {
  cacheManager?: { get: jest.Mock; set: jest.Mock };
  configService?: { get: jest.Mock };
  translationProvider?: { translate: jest.Mock<Promise<MockTranslationResult>, [string, string]> };
  pinoLogger?: { 
    debug: jest.Mock; 
    info: jest.Mock; 
    warn: jest.Mock; 
    error: jest.Mock; 
    fatal: jest.Mock; 
    setContext: jest.Mock; 
    log: jest.Mock; 
    child: jest.Mock; 
    isLevelEnabled: jest.Mock;
    bindings: Map<string, any>;
  };
  translateService?: {
    translate: jest.Mock;
  };
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
      translate: jest.fn().mockResolvedValue({ translated: 'hello', detectedLanguage: 'en' }),
    };
    mocks.translationProvider = mockTranslationProvider;
    return mockTranslationProvider;
  }

  if (token === PinoLogger) {
    const mockPinoLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      setContext: jest.fn(),
      log: jest.fn(),
      child: jest.fn((options) => {
        const childLogger = {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          fatal: jest.fn(),
          setContext: jest.fn(),
          log: jest.fn(),
          isLevelEnabled: jest.fn(() => true),
          child: jest.fn(() => childLogger),
          bindings: new Map()
        };
        if (options && options.context) {
          childLogger.bindings.set('context', options.context);
        }
        return childLogger;
      }),
      isLevelEnabled: jest.fn(() => true),
      bindings: new Map()
    };
    mocks.pinoLogger = mockPinoLogger;
    return mockPinoLogger;
  }

  if (token === TranslateService) {
    const mockTranslateService = {
      translate: jest.fn().mockResolvedValue({ translated: 'mocked', detectedLanguage: 'en' }),
    };
    mocks.translateService = mockTranslateService;
    return mockTranslateService;
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

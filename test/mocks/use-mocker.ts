// test/mocks/use-mocker.ts
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';


export const mocks: {
  cacheManager?: { get: jest.Mock; set: jest.Mock };
  configService?: { get: jest.Mock };
} = {};

export const globalUseMocker = (token: any) => {
  if (token === ConfigService) {
    const mockConfig =  {
      get: jest.fn((key: string) => {
        if (key === 'AZURE_TRANSLATE_KEY1') return 'mock-key';
        if (key === 'AZURE_TRANSLATE_URL') return 'https://mock-url.com';
        if (key === 'AZURE_TRANSLATE_REGION') return 'France Central';
        return null;
      }),
    };
    mocks.configService = mockConfig;
    return mockConfig;
  }

  if (token === CACHE_MANAGER) {
    const mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    mocks.cacheManager = mockCache;
    return mockCache;
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

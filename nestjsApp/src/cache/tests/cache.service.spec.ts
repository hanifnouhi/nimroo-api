import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../cache.service';
import { Cache } from 'cache-manager';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
} as unknown as Cache;

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: Cache;
  const slientPinoLogger = pino({ enabled: false });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: slientPinoLogger,
          },
        }),
      ],
      providers: [
        CacheService,
        {
          provide: 'CACHE_MANAGER',
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get<Cache>('CACHE_MANAGER');

    jest.spyOn((service as any).logger, 'debug');
    jest.spyOn((service as any).logger, 'info');
    jest.spyOn((service as any).logger, 'error');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCachedValue', () => {
    const key = 'test-key';

    it('should return the cached value when found', async () => {
      const expectedValue = { data: 'test-data' };
      (cacheManager.get as jest.Mock).mockResolvedValue(expectedValue);

      const result = await service.getCachedValue<{ data: string }>(key);

      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(expectedValue);
    });

    it('should return undefined when the cached value is not found', async () => {
      (cacheManager.get as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getCachedValue<string>(key);

      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(result).toBeUndefined();
    });

    it('should return undefined and log error if cache manager throws an error', async () => {
      const error = new Error('Cache GET failed');
      (cacheManager.get as jest.Mock).mockRejectedValue(error);

      await expect(service.getCachedValue(key)).rejects.toThrow(error);
      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(cacheManager.get).rejects.toThrow(error);

      expect(
        jest.spyOn((service as any).logger, 'error'),
      ).not.toHaveBeenCalled();
    });
  });

  describe('setCachedValue', () => {
    const key = 'test-set-key';
    const value = { item: 123 };
    const ttl = 300;

    it('should call cacheManager.set with key, value, and ttl', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

      await service.setCachedValue(key, value, ttl);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });

    it('should call cacheManager.set without ttl when not provided', async () => {
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

      await service.setCachedValue(key, value);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, undefined);
    });

    it('should reject and log error if cache manager throws an error', async () => {
      const error = new Error('Cache SET failed');
      (cacheManager.set as jest.Mock).mockRejectedValue(error);

      await expect(service.setCachedValue(key, value)).rejects.toThrow(error);
      expect(cacheManager.set).toHaveBeenCalledWith(key, value, undefined);
    });
  });

  describe('getOrSetCachedValue', () => {
    const key = 'test-get-or-set-key';
    const ttl = 600;
    const factoryResult = { result: 'from-factory' };
    const factory = jest.fn().mockResolvedValue(factoryResult);

    it('should return the cached value if found and NOT call the factory', async () => {
      const cachedValue = { cached: 'data' };

      jest.spyOn(service, 'getCachedValue').mockResolvedValue(cachedValue);

      const result = await service.getOrSetCachedValue(key, factory, ttl);

      expect(result).toEqual(cachedValue);
      expect(service.getCachedValue).toHaveBeenCalledWith(key);
      expect(factory).not.toHaveBeenCalled();
      expect(jest.spyOn(service, 'setCachedValue')).not.toHaveBeenCalled();
    });

    it('should call the factory, set the new value, and return it if cache is NOT found', async () => {
      jest.spyOn(service, 'getCachedValue').mockResolvedValue(undefined);
      jest.spyOn(service, 'setCachedValue').mockResolvedValue(undefined);

      const result = await service.getOrSetCachedValue(key, factory, ttl);

      expect(result).toEqual(factoryResult);
      expect(service.getCachedValue).toHaveBeenCalledWith(key);
      expect(factory).toHaveBeenCalled();
      expect(service.setCachedValue).toHaveBeenCalledWith(
        key,
        factoryResult,
        ttl,
      );
    });

    it('should log an error on getCachedValue failure and then call factory and set the value', async () => {
      const cacheGetError = new Error('Cache GET failure');
      jest.spyOn(service, 'getCachedValue').mockRejectedValue(cacheGetError);
      jest.spyOn(service, 'setCachedValue').mockResolvedValue(undefined);

      const result = await service.getOrSetCachedValue(key, factory, ttl);

      expect(result).toEqual(factoryResult);

      expect(jest.spyOn((service as any).logger, 'error')).toHaveBeenCalledWith(
        { error: cacheGetError.message, stack: cacheGetError.stack },
        `Error in get the value from cache with key ${key}`,
      );

      expect(factory).toHaveBeenCalled();
      expect(service.setCachedValue).toHaveBeenCalledWith(
        key,
        factoryResult,
        ttl,
      );
    });

    it('should log an error on setCachedValue failure but still return the factory result', async () => {
      const cacheSetError = new Error('Cache SET failure');
      jest.spyOn(service, 'getCachedValue').mockResolvedValue(undefined);
      jest.spyOn(service, 'setCachedValue').mockRejectedValue(cacheSetError);

      const result = await service.getOrSetCachedValue(key, factory, ttl);

      expect(result).toEqual(factoryResult);

      expect(jest.spyOn((service as any).logger, 'error')).toHaveBeenCalledWith(
        { error: cacheSetError.message, stack: cacheSetError.stack },
        `Error in set the value to cache with key ${key}`,
      );

      expect(factory).toHaveBeenCalled();
    });

    it('should throw and log an error if the factory function fails', async () => {
      const factoryError = new Error('Factory function failed');
      jest.spyOn(service, 'getCachedValue').mockResolvedValue(undefined);
      factory.mockRejectedValueOnce(factoryError);

      await expect(
        service.getOrSetCachedValue(key, factory, ttl),
      ).rejects.toThrow(factoryError);

      expect(jest.spyOn((service as any).logger, 'error')).toHaveBeenCalledWith(
        { error: factoryError.message, stack: factoryError.stack },
        `Error in running call back function`,
      );
      expect(jest.spyOn(service, 'setCachedValue')).not.toHaveBeenCalled();
    });
  });
});

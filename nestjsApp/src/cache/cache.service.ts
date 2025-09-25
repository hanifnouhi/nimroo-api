import { Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

@Injectable()
export class CacheService { 

    constructor(
        @Inject('CACHE_MANAGER') private cacheManager: Cache,
        @InjectPinoLogger(CacheService.name) private readonly logger: PinoLogger
    ){}

    /**
     * Get cached value from cache manager
     * 
     * @param {string} key - The cache key
     * @returns {Promise<T | undefined>} A promise resolving generic type based on cached value or undefined
     */
    async getCachedValue<T>(key: string): Promise<T | undefined> {
        this.logger.debug(`Attempting to get the cached value with key: ${key}`);
        const cachedValue: T | undefined = await this.cacheManager.get<T>(key);
        return cachedValue;
    }

    /**
     * Set cache value for the cacke key
     * 
     * @param {string} key - The cache key
     * @param {T} value - The cache value
     * @param {number} ttl - The optional time to live for cache
     * @returns {Promise<void>} A promise resolving void
     */
    async setCachedValue<T>(key: string, value: T, ttl?: number): Promise<void> {
        this.logger.debug(`Attempting to set the cached value with key: ${key} and value: ${value} and ttl: ${ttl}`);
        await this.cacheManager.set<T>(key, value, ttl);
    }

    /**
     * Check for cached value, if no cache found, call the factory function 
     * and then set the result for cache
     * 
     * @param {string} key - The cache key
     * @param {function} factory - The function to be call if the cache was not found
     * @param {number} ttl - The optional time to live for cache
     * @returns {Promise<T>} A generic type promise
     */
    async getOrSetCachedValue<T>(
        key: string,
        factory: () => Promise<T>,
        ttl?: number,
    ): Promise<T> {
        this.logger.debug(`Attempting to get or set the cache value with key: ${key}`);
        try {
            //If cache was found, return the cache
            const cached = await this.getCachedValue<T>(key);
            if (cached !== undefined) {
                return cached;
            }
        } catch (error) {
            this.logger.error({ error: error.message, stack: error.stack }, `Error in get the value from cache with key ${key}`);
        }
        
        try {
            //If cache was not found, call the factory function and set the result in the cache
            this.logger.debug(`Attempting to run call back function in case of not found in the cache with key: ${key}`);
            const newValue = await factory();
            try {
                await this.setCachedValue<T>(key, newValue, ttl);
            } catch (error) {
                this.logger.error({ error: error.message, stack: error.stack }, `Error in set the value to cache with key ${key}`);
            }
            return newValue;
        } catch (error) {
            this.logger.error({ error: error.message, stack: error.stack }, `Error in running call back function`);
            throw error;
        }
    }
}
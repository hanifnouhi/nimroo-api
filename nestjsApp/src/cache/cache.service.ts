import { Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";

@Injectable()
export class CacheService { 

    constructor(@Inject('CACHE_MANAGER') private cacheManager: Cache){
        
    }

    /**
     * Get cached value from cache manager
     * 
     * @param {string} key - The cache key
     * @returns {Promise<T | undefined>} A promise resolving generic type based on cached value or undefined
     */
    async getCachedValue<T>(key: string): Promise<T | undefined> {
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
        //If cache was found, return the cache
        const cached = await this.getCachedValue<T>(key);
        if (cached !== undefined) {
            return cached;
        }

        //If cache was not found, call the factory function and set the result in the cache
        const newValue = await factory();
        await this.setCachedValue<T>(key, newValue, ttl);
        return newValue;
    }
}
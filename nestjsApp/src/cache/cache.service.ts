import { Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";

@Injectable()
export class CacheService { 

    constructor(@Inject('CACHE_MANAGER') private cacheManager: Cache){
        
    }

    async getCachedValue<T>(key: string): Promise<T | undefined> {
        const cachedValue: T | undefined = await this.cacheManager.get<T>(key);
        return cachedValue;
    }

    async setCachedValue<T>(key: string, value: T, ttl?: number): Promise<void> {
        await this.cacheManager.set<T>(key, value, ttl);
    }

    async getOrSetCachedValue<T>(
        key: string,
        factory: () => Promise<T>,
        ttl?: number,
    ): Promise<T> {
        const cached = await this.getCachedValue<T>(key);
        if (cached !== undefined) {
        return cached;
        }

        const newValue = await factory();
        await this.setCachedValue<T>(key, newValue, ttl);
        return newValue;
    }
}
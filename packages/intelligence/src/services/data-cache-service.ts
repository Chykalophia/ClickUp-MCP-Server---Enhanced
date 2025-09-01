export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  cleanupInterval: number;
  enableMetrics: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
  evictions: number;
}

export class DataCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    memoryUsage: 0,
    evictions: 0
  };
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: CacheConfig = {
    defaultTTL: 300000, // 5 minutes
    maxSize: 10000,
    cleanupInterval: 60000, // 1 minute
    enableMetrics: true
  }) {
    this.config = config;
    this.startCleanup();
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    // Evict if at max size
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.updateMetrics();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.metrics.hits++;
    this.updateHitRate();
    
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateMetrics();
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.updateMetrics();
  }

  // Batch operations
  setMany<T>(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  getMany<T>(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();
    keys.forEach(key => {
      const value = this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    });
    return results;
  }

  // Task-specific cache methods
  cacheTask(taskId: string, taskData: any, ttl?: number): void {
    this.set(`task:${taskId}`, taskData, ttl);
  }

  getCachedTask(taskId: string): any {
    return this.get(`task:${taskId}`);
  }

  cacheTaskList(listId: string, tasks: any[], ttl?: number): void {
    this.set(`tasks:list:${listId}`, tasks, ttl);
  }

  getCachedTaskList(listId: string): any[] | null {
    return this.get(`tasks:list:${listId}`);
  }

  // Analytics cache
  cacheAnalytics(key: string, data: any, ttl: number = 60000): void {
    this.set(`analytics:${key}`, data, ttl);
  }

  getCachedAnalytics(key: string): any {
    return this.get(`analytics:${key}`);
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metrics.evictions++;
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateMetrics();
  }

  private updateMetrics(): void {
    this.metrics.size = this.cache.size;
    this.metrics.memoryUsage = this.estimateMemoryUsage();
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // UTF-16 characters
      size += JSON.stringify(entry).length * 2;
    }
    return size;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  getConfig(): CacheConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

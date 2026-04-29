import { supabase } from './supabase';

class DataService {
  constructor() {
    this.memoryCache = new Map();
    this.pendingRequests = new Map();
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2
    };
  }

  _getCacheKey(table, query) {
    return `${table}:${JSON.stringify(query)}`;
  }

  _getLocalCache(key) {
    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) return null;
      const { data, timestamp, ttl } = JSON.parse(item);
      if (Date.now() - timestamp > ttl) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  _setLocalCache(key, data, ttlMinutes = 30) {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
        ttl: ttlMinutes * 60 * 1000
      }));
    } catch (e) {
      console.warn('本地缓存写入失败:', e);
    }
  }

  _clearLocalCache(key) {
    localStorage.removeItem(`cache_${key}`);
  }

  async _retryOperation(operation, operationName) {
    let lastError;
    let delay = this.retryConfig.retryDelay;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const isRetryable = error.message?.includes('network') ||
                           error.message?.includes('timeout') ||
                           error.message?.includes('abort') ||
                           error.code === 'ECONNABORTED' ||
                           error.status === 503 ||
                           error.status === 502 ||
                           error.status === 504 ||
                           !error.status;

        if (!isRetryable || attempt === this.retryConfig.maxRetries) {
          throw error;
        }

        console.warn(`${operationName} 失败，${delay}ms 后重试 (${attempt + 1}/${this.retryConfig.maxRetries})...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= this.retryConfig.backoffMultiplier;
      }
    }

    throw lastError;
  }

  async query(table, options = {}) {
    const {
      select = '*',
      filters = [],
      order = null,
      limit = null,
      single = false,
      cacheTtl = 5,
      forceRefresh = false
    } = options;

    const cacheKey = this._getCacheKey(table, { select, filters, order, limit, single });

    if (!forceRefresh) {
      if (this.memoryCache.has(cacheKey)) {
        return this.memoryCache.get(cacheKey);
      }
      const localCache = this._getLocalCache(cacheKey);
      if (localCache) {
        this.memoryCache.set(cacheKey, localCache);
        return localCache;
      }
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this._executeQuery(table, {
      select, filters, order, limit, single, cacheKey, cacheTtl
    });

    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async _executeQuery(table, options) {
    const { select, filters, order, limit, single, cacheKey, cacheTtl } = options;

    const operation = async () => {
      let query = supabase.from(table).select(select);

      filters.forEach(({ column, operator, value }) => {
        switch (operator) {
          case 'eq': query = query.eq(column, value); break;
          case 'neq': query = query.neq(column, value); break;
          case 'gt': query = query.gt(column, value); break;
          case 'gte': query = query.gte(column, value); break;
          case 'lt': query = query.lt(column, value); break;
          case 'lte': query = query.lte(column, value); break;
          case 'like': query = query.like(column, value); break;
          case 'ilike': query = query.ilike(column, value); break;
          case 'in': query = query.in(column, value); break;
          case 'is': query = query.is(column, value); break;
          default: query = query.eq(column, value);
        }
      });

      if (order) {
        query = query.order(order.column, {
          ascending: order.ascending !== false,
          nullsFirst: order.nullsFirst
        });
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = single ? await query.single() : await query;

      if (error) {
        const enhancedError = new Error(error.message);
        enhancedError.status = error.status;
        enhancedError.code = error.code;
        throw enhancedError;
      }

      return data;
    };

    const result = await this._retryOperation(operation, `查询 ${table}`);

    this.memoryCache.set(cacheKey, result);
    this._setLocalCache(cacheKey, result, cacheTtl);

    return result;
  }

  async mutate(table, operation, data, options = {}) {
    const mutateOperation = async () => {
      let query;
      switch (operation) {
        case 'insert':
          query = supabase.from(table).insert(data);
          break;
        case 'upsert':
          query = supabase.from(table).upsert(data, options.upsertOptions || {});
          break;
        case 'update':
          query = supabase.from(table).update(data);
          if (options.filters) {
            options.filters.forEach(({ column, operator, value }) => {
              if (operator === 'eq') query = query.eq(column, value);
            });
          }
          break;
        case 'delete':
          query = supabase.from(table).delete();
          if (options.filters) {
            options.filters.forEach(({ column, operator, value }) => {
              if (operator === 'eq') query = query.eq(column, value);
            });
          }
          break;
        default:
          throw new Error(`不支持的操作: ${operation}`);
      }

      const { data: result, error } = await query;

      if (error) {
        const enhancedError = new Error(error.message);
        enhancedError.status = error.status;
        enhancedError.code = error.code;
        throw enhancedError;
      }

      return result;
    };

    const result = await this._retryOperation(mutateOperation, `${operation} ${table}`);

    const tableCachePrefix = `${table}:`;
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(tableCachePrefix)) {
        this.memoryCache.delete(key);
        this._clearLocalCache(key);
      }
    }

    return result;
  }

  invalidateTable(table) {
    const tableCachePrefix = `${table}:`;
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(tableCachePrefix)) {
        this.memoryCache.delete(key);
        this._clearLocalCache(key);
      }
    }
  }

  clearAllCache() {
    this.memoryCache.clear();
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  async getGenealogyData() {
    return this.query('genealogy_data', {
      select: 'data',
      filters: [{ column: 'id', operator: 'eq', value: 1 }],
      single: true,
      cacheTtl: 10
    });
  }

  async getChangeLogs(limit = 100) {
    return this.query('change_logs', {
      select: '*',
      order: { column: 'created_at', ascending: false },
      limit,
      cacheTtl: 2
    });
  }

  async getBackups(limit = 10) {
    return this.query('genealogy_backups', {
      select: '*',
      order: { column: 'created_at', ascending: false },
      limit,
      cacheTtl: 5
    });
  }

  async getDevelopers() {
    return this.query('user_roles', {
      select: '*',
      order: { column: 'created_at', ascending: false },
      cacheTtl: 5
    });
  }

  async saveGenealogyData(data, updatedBy) {
    return this.mutate('genealogy_data', 'upsert', {
      id: 1,
      data,
      updated_by: updatedBy,
      updated_at: new Date().toISOString()
    }, {
      upsertOptions: { onConflict: 'id' }
    });
  }

  async addChangeLog(log) {
    return this.mutate('change_logs', 'insert', {
      log_id: log.id,
      time: log.time,
      type: log.type,
      module: log.module,
      content: log.content,
      editor: log.editor,
      details: log.details,
      browser: log.browser,
      user_agent: navigator.userAgent,
      created_at: new Date().toISOString()
    });
  }

  async createBackup(backupName, data) {
    return this.mutate('genealogy_backups', 'insert', {
      backup_name: backupName,
      data,
      created_at: new Date().toISOString(),
      backup_size: JSON.stringify(data).length
    });
  }

  async deleteBackup(backupId) {
    return this.mutate('genealogy_backups', 'delete', null, {
      filters: [{ column: 'id', operator: 'eq', value: backupId }]
    });
  }

  async setDeveloperRole(userId, githubUsername, role) {
    return this.mutate('user_roles', 'upsert', {
      user_id: userId,
      github_username: githubUsername,
      role,
      updated_at: new Date().toISOString()
    }, {
      upsertOptions: { onConflict: 'github_username' }
    });
  }

  async removeDeveloper(githubUsername) {
    return this.mutate('user_roles', 'delete', null, {
      filters: [{ column: 'github_username', operator: 'eq', value: githubUsername }]
    });
  }
}

export const dataService = new DataService();
export default dataService;

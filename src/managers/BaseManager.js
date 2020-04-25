'use strict';

const Collection = require('../util/Collection');
let Structures;

/**
 * 데이터 모델의 API 메소드를 관리하고 캐시에 저장합니다.
 * @abstract
 */
class BaseManager {
  constructor(client, iterable, holds, cacheType = Collection, ...cacheOptions) {
    if (!Structures) Structures = require('../util/Structures');
    /**
     * 이 매니저가 귀속한 데이터 구조
     * @name BaseManager#holds
     * @type {Function}
     * @private
     * @readonly
     */
    Object.defineProperty(this, 'holds', { value: Structures.get(holds.name) || holds });

    /**
     * 이 매니저와 연결된 클라이언트 인스턴스
     * @name BaseManager#client
     * @type {Client}
     * @readonly
     */
    Object.defineProperty(this, 'client', { value: client });

    /**
     * 매니저의 컬렉션 타입
     * @type {Collection}
     */
    this.cacheType = cacheType;

    /**
     * Holds the cache for the data model
     * @type {Collection}
     */
    this.cache = new cacheType(...cacheOptions);
    if (iterable) for (const i of iterable) this.add(i);
  }

  add(data, cache = true, { id, extras = [] } = {}) {
    const existing = this.cache.get(id || data.id);
    if (existing && existing._patch && cache) existing._patch(data);
    if (existing) return existing;

    const entry = this.holds ? new this.holds(this.client, data, ...extras) : data;
    if (cache) this.cache.set(id || entry.id, entry);
    return entry;
  }

  /**
   * Resolves a data entry to a data Object.
   * @param {string|Object} idOrInstance The id or instance of something in this Manager
   * @returns {?Object} An instance from this Manager
   */
  resolve(idOrInstance) {
    if (idOrInstance instanceof this.holds) return idOrInstance;
    if (typeof idOrInstance === 'string') return this.cache.get(idOrInstance) || null;
    return null;
  }

  /**
   * Resolves a data entry to a instance ID.
   * @param {string|Object} idOrInstance The id or instance of something in this Manager
   * @returns {?Snowflake}
   */
  resolveID(idOrInstance) {
    if (idOrInstance instanceof this.holds) return idOrInstance.id;
    if (typeof idOrInstance === 'string') return idOrInstance;
    return null;
  }

  valueOf() {
    return this.cache;
  }
}

module.exports = BaseManager;

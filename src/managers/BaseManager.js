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
     * 데이터 모델에 귀속된 캐시
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
   * 전달받은 ID 또는 인스턴스를 매니저 캐시에서 찾아 인스턴스로 돌려줍니다.
   * @param {string|Object} idOrInstance 매니저가 관리하는 캐시 데이터의 ID 또는 인스턴스
   * @returns {?Object} 찾아낸 데이터 인스턴스
   */
  resolve(idOrInstance) {
    if (idOrInstance instanceof this.holds) return idOrInstance;
    if (typeof idOrInstance === 'string') return this.cache.get(idOrInstance) || null;
    return null;
  }

  /**
   * 전달받은 ID 또는 인스턴스를 매니저 캐시에서 찾아 인스턴스 ID로 돌려줍니다.
   * @param {string|Object} idOrInstance 매니저가 관리하는 캐시 데이터의 ID 또는 인스턴스
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

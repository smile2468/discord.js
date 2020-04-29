'use strict';

const BaseManager = require('./BaseManager');
const { Presence } = require('../structures/Presence');

/**
 * 프리센스의 API 메소드를 관리하고 캐시에 저장합니다.
 * @extends {BaseManager}
 */
class PresenceManager extends BaseManager {
  constructor(client, iterable) {
    super(client, iterable, Presence);
  }

  /**
   * 이 매니저에 귀속된 프리센스 캐시
   * @type {Collection<Snowflake, Presence>}
   * @name PresenceManager#cache
   */

  add(data, cache) {
    const existing = this.cache.get(data.user.id);
    return existing ? existing.patch(data) : super.add(data, cache, { id: data.user.id });
  }

  /**
   * 프리센스 객체로 리졸브 가능한 데이터. 가능한 데이터:
   * * 프리센스 클래스
   * * 유저 객체로 리졸브 가능한 데이터
   * * Snowflake
   * @typedef {Presence|UserResolvable|Snowflake} PresenceResolvable
   */

  /**
   * 프리센스로 리졸브 가능한 데이터를 프리센스 객체 데이터로 리졸브합니다.
   * @param {PresenceResolvable} presence 리졸브 할 프리센스 데이터
   * @returns {?Presence}
   */
  resolve(presence) {
    const presenceResolvable = super.resolve(presence);
    if (presenceResolvable) return presenceResolvable;
    const UserResolvable = this.client.users.resolveID(presence);
    return super.resolve(UserResolvable) || null;
  }

  /**
   * 프리센스로 리졸브 가능한 데이터를 프리센스 ID 문자열로 리졸브합니다.
   * @param {PresenceResolvable} presence 리졸브 할 프리센스 데이터
   * @returns {?Snowflake}
   */
  resolveID(presence) {
    const presenceResolvable = super.resolveID(presence);
    if (presenceResolvable) return presenceResolvable;
    const userResolvable = this.client.users.resolveID(presence);
    return this.cache.has(userResolvable) ? userResolvable : null;
  }
}

module.exports = PresenceManager;

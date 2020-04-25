'use strict';

const { TypeError } = require('../errors');
const Collection = require('../util/Collection');

/**
 * 역할들에 귀속된 이모지의 API 메소드를 관리하고 캐시에 저장합니다.
 */
class GuildEmojiRoleManager {
  constructor(emoji) {
    /**
     * 이 매니저에 귀속된 이모지
     * @type {GuildEmoji}
     */
    this.emoji = emoji;
    /**
     * The guild belonging to this manager
     * @type {Guild}
     */
    this.guild = emoji.guild;
    /**
     * The client belonging to this manager
     * @type {Client}
     * @readonly
     */
    Object.defineProperty(this, 'client', { value: emoji.client });
  }

  /**
   * 길드 이모지를 사용 가능한 역할 컬렉션
   * @type {Collection<Snowflake, Role>}
   * @private
   * @readonly
   */
  get _roles() {
    return this.guild.roles.cache.filter(role => this.emoji._roles.includes(role.id));
  }

  /**
   * 이 매니저에 귀속된 역할 캐시
   * @type {Collection<Snowflake, Role>}
   * @readonly
   */
  get cache() {
    return this._roles;
  }

  /**
   * 역할 또는 역할들을 이 이모지를 사용 가능한 역할 목록에 추가합니다.
   * @param {RoleResolvable|RoleResolvable[]|Collection<Snowflake, Role>} roleOrRoles 추가할 역할 또는 역할들
   * @returns {Promise<GuildEmoji>}
   */
  add(roleOrRoles) {
    if (roleOrRoles instanceof Collection) return this.add(roleOrRoles.keyArray());
    if (!Array.isArray(roleOrRoles)) return this.add([roleOrRoles]);
    roleOrRoles = roleOrRoles.map(r => this.guild.roles.resolve(r));

    if (roleOrRoles.includes(null)) {
      return Promise.reject(new TypeError('INVALID_TYPE', 'roles', 'Array or Collection of Roles or Snowflakes', true));
    }

    const newRoles = [...new Set(roleOrRoles.concat(...this._roles.values()))];
    return this.set(newRoles);
  }

  /**
   * 역할 또는 역할들을 이 이모지를 사용 가능한 역할 목록에서 제거합니다.
   * @param {RoleResolvable|RoleResolvable[]|Collection<Snowflake, Role>} roleOrRoles 제거할 역할 또는 역할들
   * @returns {Promise<GuildEmoji>}
   */
  remove(roleOrRoles) {
    if (roleOrRoles instanceof Collection) return this.remove(roleOrRoles.keyArray());
    if (!Array.isArray(roleOrRoles)) return this.remove([roleOrRoles]);
    roleOrRoles = roleOrRoles.map(r => this.guild.roles.resolveID(r));

    if (roleOrRoles.includes(null)) {
      return Promise.reject(new TypeError('INVALID_TYPE', 'roles', 'Array or Collection of Roles or Snowflakes', true));
    }

    const newRoles = this._roles.keyArray().filter(role => !roleOrRoles.includes(role));
    return this.set(newRoles);
  }

  /**
   * 이 이모지를 사용 가능한 역할 목록을 덮어씌웁니다.
   * @param {Collection<Snowflake, Role>|RoleResolvable[]} roles 덮어씌울 역할들 또는 역할들 ID
   * @returns {Promise<GuildEmoji>}
   * @example
   * // 한 역할만 이 이모지를 사용 가능하도록 덮어씌웁니다
   * guildEmoji.roles.set(['391156570408615936'])
   *   .then(console.log)
   *   .catch(console.error);
   * @example
   * // 이모지를 사용 가능한 역할 목록에서 모든 역할들을 제거합니다
   * guildEmoji.roles.set([])
   *    .then(console.log)
   *    .catch(console.error);
   */
  set(roles) {
    return this.emoji.edit({ roles });
  }

  clone() {
    const clone = new this.constructor(this.emoji);
    clone._patch(this._roles.keyArray().slice());
    return clone;
  }

  /**
   * 타입 검사를 무시하고 역할 목록을 캐시에 귀속합니다
   * @param {Snowflake[]} roles 새로운 역할들
   * @private
   */
  _patch(roles) {
    this.emoji._roles = roles;
  }
}

module.exports = GuildEmojiRoleManager;

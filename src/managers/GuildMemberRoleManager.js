'use strict';

const { TypeError } = require('../errors');
const Collection = require('../util/Collection');

/**
 * 서버 유저들의 역할 API 메소드를 관리하고 캐시에 저장합니다.
 */
class GuildMemberRoleManager {
  constructor(member) {
    /**
     * 이 매니저에 귀속된 서버 유저
     * @type {GuildMember}
     */
    this.member = member;
    /**
     * 이 매니저에 귀속된 길드
     * @type {Guild}
     */
    this.guild = member.guild;
    Object.defineProperty(this, 'client', { value: member.client });
  }

  /**
   * 이 서버 유저의 역할들이 필터링된 컬렉션
   * @type {Collection<Snowflake, Role>}
   * @private
   * @readonly
   */
  get _roles() {
    const everyone = this.guild.roles.everyone;
    return this.guild.roles.cache.filter(role => this.member._roles.includes(role.id)).set(everyone.id, everyone);
  }

  /**
   * 이 서버 유저의 역할 캐시
   * @type {Collection<Snowflake, Role>}
   * @readonly
   */
  get cache() {
    return this._roles;
  }

  /**
   * 유저 목록에서 별도의 카테고리로 서버 유저를 들어 올리는데 사용되는 멤버의 역할
   * @type {?Role}
   * @readonly
   */
  get hoist() {
    const hoistedRoles = this._roles.filter(role => role.hoist);
    if (!hoistedRoles.size) return null;
    return hoistedRoles.reduce((prev, role) => (!prev || role.comparePositionTo(prev) > 0 ? role : prev));
  }

  /**
   * 서버 유저에게 적용되는 역할 색깔
   * @type {?Role}
   * @readonly
   */
  get color() {
    const coloredRoles = this._roles.filter(role => role.color);
    if (!coloredRoles.size) return null;
    return coloredRoles.reduce((prev, role) => (!prev || role.comparePositionTo(prev) > 0 ? role : prev));
  }

  /**
   * 서버 유저의 가장 높은 위치를 가진 역할
   * @type {Role}
   * @readonly
   */
  get highest() {
    return this._roles.reduce((prev, role) => (role.comparePositionTo(prev) > 0 ? role : prev), this._roles.first());
  }

  /**
   * 서버 유저에게 역할 또는 역할들을 추가합니다.
   * @param {RoleResolvable|RoleResolvable[]|Collection<Snowflake, Role>} roleOrRoles 추가할 역할 또는 역할들
   * @param {string} [reason] 역할을 추가하는 이유
   * @returns {Promise<GuildMember>}
   */
  async add(roleOrRoles, reason) {
    if (roleOrRoles instanceof Collection || Array.isArray(roleOrRoles)) {
      roleOrRoles = roleOrRoles.map(r => this.guild.roles.resolve(r));
      if (roleOrRoles.includes(null)) {
        throw new TypeError('INVALID_TYPE', 'roles', 'Array or Collection of Roles or Snowflakes', true);
      }

      const newRoles = [...new Set(roleOrRoles.concat(...this._roles.values()))];
      return this.set(newRoles, reason);
    } else {
      roleOrRoles = this.guild.roles.resolve(roleOrRoles);
      if (roleOrRoles === null) {
        throw new TypeError(
          'INVALID_TYPE',
          'roles',
          'Role, Snowflake or Array or Collection of Roles or Snowflakes',
          true,
        );
      }

      await this.client.api.guilds[this.guild.id].members[this.member.id].roles[roleOrRoles.id].put({ reason });

      const clone = this.member._clone();
      clone._roles = [...this._roles.keys(), roleOrRoles.id];
      return clone;
    }
  }

  /**
   * 서버 유저에게 역할 또는 역할들을 제거합니다.
   * @param {RoleResolvable|RoleResolvable[]|Collection<Snowflake, Role>} roleOrRoles 제거할 역할 또는 역할들
   * @param {string} [reason] 역할을 제거하는 이유
   * @returns {Promise<GuildMember>}
   */
  async remove(roleOrRoles, reason) {
    if (roleOrRoles instanceof Collection || Array.isArray(roleOrRoles)) {
      roleOrRoles = roleOrRoles.map(r => this.guild.roles.resolve(r));
      if (roleOrRoles.includes(null)) {
        throw new TypeError('INVALID_TYPE', 'roles', 'Array or Collection of Roles or Snowflakes', true);
      }

      const newRoles = this._roles.filter(role => !roleOrRoles.includes(role));
      return this.set(newRoles, reason);
    } else {
      roleOrRoles = this.guild.roles.resolve(roleOrRoles);
      if (roleOrRoles === null) {
        throw new TypeError('INVALID_TYPE', 'roles', 'Array or Collection of Roles or Snowflakes', true);
      }

      await this.client.api.guilds[this.guild.id].members[this.member.id].roles[roleOrRoles.id].delete({ reason });

      const clone = this.member._clone();
      const newRoles = this._roles.filter(role => role.id !== roleOrRoles.id);
      clone._roles = [...newRoles.keys()];
      return clone;
    }
  }

  /**
   * 서버 유저의 역할을 이 역할들로 덮어씌웁니다.
   * @param {Collection<Snowflake, Role>|RoleResolvable[]} roles 덮어씌울 역할들 또는 역할의 ID들
   * @param {string} [reason] 역할을 덮어씌우는 이유
   * @returns {Promise<GuildMember>}
   * @example
   * // 서버 유저의 역할을 이 역할만 가지도록 덮어씌웁니다
   * guildMember.roles.set(['391156570408615936'])
   *   .then(console.log)
   *   .catch(console.error);
   * @example
   * // 서버 유저의 모든 역할을 제거합니다
   * guildMember.roles.set([])
   *   .then(member => console.log(`서버 유저의 역할 수는 이제 ${member.roles.cache.size}개입니다`))
   *   .catch(console.error);
   */
  set(roles, reason) {
    return this.member.edit({ roles }, reason);
  }

  clone() {
    const clone = new this.constructor(this.member);
    clone.member._roles = [...this._roles.keyArray()];
    return clone;
  }
}

module.exports = GuildMemberRoleManager;

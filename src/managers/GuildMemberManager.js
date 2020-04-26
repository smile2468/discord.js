'use strict';

const BaseManager = require('./BaseManager');
const { Error, TypeError } = require('../errors');
const GuildMember = require('../structures/GuildMember');
const Collection = require('../util/Collection');
const { Events, OPCodes } = require('../util/Constants');

/**
 * 서버 유저들의 API 메소드를 관리하고 캐시에 저장합니다.
 * @extends {BaseManager}
 */
class GuildMemberManager extends BaseManager {
  constructor(guild, iterable) {
    super(guild.client, iterable, GuildMember);
    /**
     * 이 매니저에 귀속된 길드
     * @type {Guild}
     */
    this.guild = guild;
  }

  /**
   * 이 매니저에 귀속된 서버 유저 캐시
   * @type {Collection<Snowflake, GuildMember>}
   * @name GuildMemberManager#cache
   */

  add(data, cache = true) {
    return super.add(data, cache, { id: data.user.id, extras: [this.guild] });
  }

  /**
   * 서버 유저 객체로 리졸브 가능한 데이터. 가능한 데이터:
   * * 서버 유저 객체
   * * 리졸브 가능한 유저 객체
   * @typedef {GuildMember|UserResolvable} GuildMemberResolvable
   */

  /**
   * 서버 유저로 리졸브 가능한 데이터를 길드 채널 객체 데이터로 리졸브합니다.
   * @param {GuildMemberResolvable} member 리졸브 할 서버 유저 데이터
   * @returns {?GuildMember}
   */
  resolve(member) {
    const memberResolvable = super.resolve(member);
    if (memberResolvable) return memberResolvable;
    const userResolvable = this.client.users.resolveID(member);
    if (userResolvable) return super.resolve(userResolvable);
    return null;
  }

  /**
   * 서버 유저로 리졸브 가능한 데이터를 서버 유저 ID 문자열로 리졸브합니다.
   * @param {GuildMemberResolvable} member 리졸브 할 서버 유저 데이터
   * @returns {?Snowflake}
   */
  resolveID(member) {
    const memberResolvable = super.resolveID(member);
    if (memberResolvable) return memberResolvable;
    const userResolvable = this.client.users.resolveID(member);
    return this.cache.has(userResolvable) ? userResolvable : null;
  }

  /**
   * 길드에서 한 서버 유저를 불러올때 사용할 옵션.
   * @typedef {Object} FetchMemberOptions
   * @property {UserResolvable} user 불러올 유저의 데이터
   * @property {boolean} [cache=true] 불러올 유저의 캐싱 여부
   */

  /**
   * 길드에서 여러 서버 유저를 불러올때 사용할 옵션.
   * @typedef {Object} FetchMembersOptions
   * @property {UserResolvable|UserResolvable[]} user 불러올 유저(들)의 데이터
   * @property {?string} query 비슷한 이름을 가진 서버 유저만 불러옵니다
   * @property {number} [limit=0] 불러올 서버 유저의 제한 수
   * @property {boolean} [withPresences=false] Presence 데이터를 포함 여부
   * @property {number} [time=120e3] 불러오는 시간 제한
   */

  /**
   * 디스코드에서 서버 유저를 불러옵니다 (오프라인인 경우 포함).
   * @param {UserResolvable|FetchMemberOptions|FetchMembersOptions} [options] 만약 유저로 리졸브 가능한 데이터면 불러올 유저.ㅛ
   * 만약 undefined 값이면 모든 유저를 불러옵니다.
   * 만약 query 값이 문자열이면 비슷한 이름을 가진 모든 유저를 불러옵니다.
   * @returns {Promise<GuildMember>|Promise<Collection<Snowflake, GuildMember>>}
   * @example
   * // 길드의 모든 유저를 불러옵니다
   * guild.members.fetch()
   *   .then(console.log)
   *   .catch(console.error);
   * @example
   * // 한 서버 유저를 불러옵니다
   * guild.members.fetch('66564597481480192')
   *   .then(console.log)
   *   .catch(console.error);
   * @example
   * // 한 서버를 불러오지만 캐싱을 하지 않습니다
   * guild.members.fetch({ user, cache: false })
   *   .then(console.log)
   *   .catch(console.error);
   * @example
   * // Presence 데이터를 유저 데이터에 포함하면서 유저 ID 배열로 불러옵니다
   * guild.members.fetch({ user: ['66564597481480192', '191615925336670208'], withPresences: true })
   *   .then(console.log)
   *   .catch(console.error);
   * @example
   * // query 값으로 불러옵니다
   * guild.members.fetch({ query: '히드라', limit: 1 })
   *   .then(console.log)
   *   .catch(console.error);
   */
  fetch(options) {
    if (!options) return this._fetchMany();
    const user = this.client.users.resolveID(options);
    if (user) return this._fetchSingle({ user, cache: true });
    if (options.user) {
      if (Array.isArray(options.user)) {
        options.user = options.user.map(u => this.client.users.resolveID(u));
        return this._fetchMany(options);
      } else {
        options.user = this.client.users.resolveID(options.user);
      }
      if (!options.limit && !options.withPresences) return this._fetchSingle(options);
    }
    return this._fetchMany(options);
  }

  /**
   * 서버 유저들이 몇일 동안 잠수였는지 따라 서버 유저를 정리합니다.
   * <info>만약 길드가 크다면 options.count를 `false`로 하는 것이 추천됩니다.</info>
   * @param {Object} [options] 정리 옵션
   * @param {number} [options.days=7] 추방하기 위해서 필요한 서버 유저가 잠수 상태인 일 수
   * @param {boolean} [options.dry=false] 추방이 될 서버 유저 수를 구합니다 (추방은 되지 않습니다)
   * @param {boolean} [options.count=true] 추방된 유저 수를 구합니다.
   * @param {string} [options.reason] 정리를 하는 이유
   * @returns {Promise<number|null>} 추방될/된 서버 유저 수
   * @example
   * // 정리될 서버 유저 수를 확인합니다
   * guild.members.prune({ dry: true })
   *   .then(pruned => console.log(`이것은 ${pruned}명을 정리할 것입니다!`))
   *   .catch(console.error);
   * @example
   * // Actually prune the members
   * guild.members.prune({ days: 1, reason: '서버 유저가 너무 많아서요!' })
   *   .then(pruned => console.log(`${pruned}명을 정리 했습니다!`))
   *   .catch(console.error);
   */
  prune({ days = 7, dry = false, count = true, reason } = {}) {
    if (typeof days !== 'number') throw new TypeError('PRUNE_DAYS_TYPE');
    return this.client.api
      .guilds(this.guild.id)
      .prune[dry ? 'get' : 'post']({
        query: {
          days,
          compute_prune_count: count,
        },
        reason,
      })
      .then(data => data.pruned);
  }

  /**
   * 길드에서 한 유저를 차단합니다.
   * @param {UserResolvable} user 차단할 유저
   * @param {Object} [options] 차단 옵션
   * @param {number} [options.days=0] 삭제할 메시지 일수
   * @param {string} [options.reason] 차단하는 이유
   * @returns {Promise<GuildMember|User|Snowflake>} Result object will be resolved as specifically as possible.
   * If the GuildMember cannot be resolved, the User will instead be attempted to be resolved. If that also cannot
   * be resolved, the user ID will be the result.
   * @example
   * // Ban a user by ID (or with a user/guild member object)
   * guild.members.ban('84484653687267328')
   *   .then(user => console.log(`Banned ${user.username || user.id || user} from ${guild.name}`))
   *   .catch(console.error);
   */
  ban(user, options = { days: 0 }) {
    if (options.days) options['delete-message-days'] = options.days;
    const id = this.client.users.resolveID(user);
    if (!id) return Promise.reject(new Error('BAN_RESOLVE_ID', true));
    return this.client.api
      .guilds(this.guild.id)
      .bans[id].put({ query: options })
      .then(() => {
        if (user instanceof GuildMember) return user;
        const _user = this.client.users.resolve(id);
        if (_user) {
          const member = this.resolve(_user);
          return member || _user;
        }
        return id;
      });
  }

  /**
   * Unbans a user from the guild.
   * @param {UserResolvable} user The user to unban
   * @param {string} [reason] Reason for unbanning user
   * @returns {Promise<User>}
   * @example
   * // Unban a user by ID (or with a user/guild member object)
   * guild.members.unban('84484653687267328')
   *   .then(user => console.log(`Unbanned ${user.username} from ${guild.name}`))
   *   .catch(console.error);
   */
  unban(user, reason) {
    const id = this.client.users.resolveID(user);
    if (!id) return Promise.reject(new Error('BAN_RESOLVE_ID'));
    return this.client.api
      .guilds(this.guild.id)
      .bans[id].delete({ reason })
      .then(() => this.client.users.resolve(user));
  }

  _fetchSingle({ user, cache }) {
    const existing = this.cache.get(user);
    if (existing && !existing.partial) return Promise.resolve(existing);
    return this.client.api
      .guilds(this.guild.id)
      .members(user)
      .get()
      .then(data => this.add(data, cache));
  }

  _fetchMany({ limit = 0, withPresences: presences = false, user: user_ids, query, time = 120e3 } = {}) {
    return new Promise((resolve, reject) => {
      if (this.guild.memberCount === this.cache.size && !query && !limit && !presences && !user_ids) {
        resolve(this.cache);
        return;
      }
      if (!query && !user_ids) query = '';
      this.guild.shard.send({
        op: OPCodes.REQUEST_GUILD_MEMBERS,
        d: {
          guild_id: this.guild.id,
          presences,
          user_ids,
          query,
          limit,
        },
      });
      const fetchedMembers = new Collection();
      const option = query || limit || presences || user_ids;
      const handler = (members, guild) => {
        if (guild.id !== this.guild.id) return;
        timeout.refresh();
        for (const member of members.values()) {
          if (option) fetchedMembers.set(member.id, member);
        }
        if (
          this.guild.memberCount <= this.cache.size ||
          (option && members.size < 1000) ||
          (limit && fetchedMembers.size >= limit)
        ) {
          this.guild.client.removeListener(Events.GUILD_MEMBERS_CHUNK, handler);
          let fetched = option ? fetchedMembers : this.cache;
          if (user_ids && !Array.isArray(user_ids) && fetched.size) fetched = fetched.first();
          resolve(fetched);
        }
      };
      const timeout = this.guild.client.setTimeout(() => {
        this.guild.client.removeListener(Events.GUILD_MEMBERS_CHUNK, handler);
        reject(new Error('GUILD_MEMBERS_TIMEOUT'));
      }, time);
      this.guild.client.on(Events.GUILD_MEMBERS_CHUNK, handler);
    });
  }
}

module.exports = GuildMemberManager;

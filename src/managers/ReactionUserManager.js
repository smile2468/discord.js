'use strict';

const BaseManager = require('./BaseManager');
const { Error } = require('../errors');
const Collection = require('../util/Collection');

/**
 * 리액션을 한 유저의 API 메소드를 관리하고 캐시에 저장합니다.
 * @extends {BaseManager}
 */
class ReactionUserManager extends BaseManager {
  constructor(client, iterable, reaction) {
    super(client, iterable, { name: 'User' });
    /**
     * 이 매니저에 귀속된 리액션
     * @type {MessageReaction}
     */
    this.reaction = reaction;
  }

  /**
   * 이 매니저의 리액션 유저 캐시
   * @type {Collection<Snowflake, User>}
   * @name ReactionUserManager#cache
   */

  /**
   * 이 리액션을 한 모든 유저를 컬렉션 데이터로 불러옵니다.
   * @param {Object} [options] 불러오는 옵션
   * @param {number} [options.limit=100] 불러올 유저의 최대 수 (기본값: 100)
   * @param {Snowflake} [options.before] 이 ID보다 수가 적은 유저만 불러옵니다
   * @param {Snowflake} [options.after] 이 ID보다 수가 높은 유저만 불러옵니다
   * @returns {Promise<Collection<Snowflake, User>>}
   */
  async fetch({ limit = 100, after, before } = {}) {
    const message = this.reaction.message;
    const data = await this.client.api.channels[message.channel.id].messages[message.id].reactions[
      this.reaction.emoji.identifier
    ].get({ query: { limit, before, after } });
    const users = new Collection();
    for (const rawUser of data) {
      const user = this.client.users.add(rawUser);
      this.cache.set(user.id, user);
      users.set(user.id, user);
    }
    return users;
  }

  /**
   * 이 리액션을 한 유저를 제거합니다.
   * @param {UserResolvable} [user=this.reaction.message.client.user] 리액션을 제거할 유저
   * @returns {Promise<MessageReaction>}
   */
  remove(user = this.reaction.message.client.user) {
    const message = this.reaction.message;
    const userID = message.client.users.resolveID(user);
    if (!userID) return Promise.reject(new Error('REACTION_RESOLVE_USER'));
    return message.client.api.channels[message.channel.id].messages[message.id].reactions[
      this.reaction.emoji.identifier
    ][userID === message.client.user.id ? '@me' : userID]
      .delete()
      .then(() => this.reaction);
  }
}

module.exports = ReactionUserManager;

'use strict';

const BaseManager = require('./BaseManager');
const Message = require('../structures/Message');
const Collection = require('../util/Collection');
const LimitedCollection = require('../util/LimitedCollection');

/**
 * 메세지의 API 메소드를 관리하고 캐시에 저장합니다.
 * @extends {BaseManager}
 */
class MessageManager extends BaseManager {
  constructor(channel, iterable) {
    super(channel.client, iterable, Message, LimitedCollection, channel.client.options.messageCacheMaxSize);
    /**
     * 이 매니저에 귀속된 채널
     * @type {TextBasedChannel}
     */
    this.channel = channel;
  }

  /**
   * 이 매니저에 귀속된 메세지 캐시
   * @type {Collection<Snowflake, Message>}
   * @name MessageManager#cache
   */

  add(data, cache) {
    return super.add(data, cache, { extras: [this.channel] });
  }

  /**
   * 메세지 기록을 불러올때 사용하는 옵션들입니다. `around`, `before`와
   * `after`은 상호 배타적입니다. 모든 옵션들은 선택입니다.
   * @typedef {Object} ChannelLogsQueryOptions
   * @property {number} [limit=50] 불러올 메세지의 수
   * @property {Snowflake} [before] 이 메세지 ID 전의 메세지들을 불러옵니다
   * @property {Snowflake} [after] 이 메세지 ID 후의 메세지들을 불러옵니다
   * @property {Snowflake} [around] 이 메세지 ID 쯤의 메세지들을 불러옵니다
   */

  /**
   * 메세지 또는 메세지들을 이 채널에서 불러옵니다.
   * <info>만약 캐싱이 되지 않았다면 돌려진 컬렉션은 리액션 데이터를 포함하지 않습니다.
   * 이 데이터들을 포함하려면 메세지를 나뉘어 불러야합니다.</info>
   * @param {Snowflake|ChannelLogsQueryOptions} [message] 불러올 메세지의 ID 또는 쿼리 파라미터.
   * @param {boolean} [cache=true] 이 메세지(들)의 캐싱 여부
   * @returns {Promise<Message>|Promise<Collection<Snowflake, Message>>}
   * @example
   * // 한 메세지를 불러옵니다
   * channel.messages.fetch('99539446449315840')
   *   .then(message => console.log(message.content))
   *   .catch(console.error);
   * @example
   * // 최근 10개의 메세지를 불러옵니다
   * channel.messages.fetch({ limit: 10 })
   *   .then(messages => console.log(`${messages.size}개의 메세지들을 전달 받았습니다`))
   *   .catch(console.error);
   * @example
   * // 최근 50개의 메세지를 불러오고 메세지를 보낸 유저로 필터링합니다
   * channel.messages.fetch()
   *   .then(messages => console.log(`${messages.filter(m => m.author.id === '84484653687267328').size}개의 메세지들`))
   *   .catch(console.error);
   */
  fetch(message, cache = true) {
    return typeof message === 'string' ? this._fetchId(message, cache) : this._fetchMany(message, cache);
  }

  /**
   * 해당 채널에 고정된 메세지들을 불러와 컬렉션으로 돌려줍니다.
   * <info>만약 캐싱이 되지 않았다면 돌려진 컬렉션은 리액션 데이터를 포함하지 않습니다.
   * 이 데이터들을 포함하려면 메세지를 나뉘어 불러야합니다.</info>
   * @param {boolean} [cache=true] Whether to cache the message(s)
   * @returns {Promise<Collection<Snowflake, Message>>}
   * @example
   * // 고정된 메세지들을 불러옵니다
   * channel.fetchPinned()
   *   .then(messages => console.log(`${messages.size}개의 메세지들을 받았습니다`))
   *   .catch(console.error);
   */
  fetchPinned(cache = true) {
    return this.client.api.channels[this.channel.id].pins.get().then(data => {
      const messages = new Collection();
      for (const message of data) messages.set(message.id, this.add(message, cache));
      return messages;
    });
  }

  /**
   * 메세지 객체로 리졸브 가능한 데이터. 가능한 데이터:
   * * 메세지 클래스
   * * Snowflake
   * @typedef {Message|Snowflake} MessageResolvable
   */

  /**
   * 메세지로 리졸브 가능한 데이터를 메세지 객체 데이터로 리졸브합니다.
   * @method resolve
   * @memberof MessageManager
   * @instance
   * @param {MessageResolvable} message 리졸브 할 메세지 데이터
   * @returns {?Message}
   */

  /**
   * 메세지로 리졸브 가능한 데이터를 메세지 ID 문자열로 리졸브합니다.
   * @method resolveID
   * @memberof MessageManager
   * @instance
   * @param {MessageResolvable} message 리졸브 할 메세지 데이터
   * @returns {?Snowflake}
   */

  /**
   * 캐싱이 되지 않았어도 메세지를 삭제합니다.
   * @param {MessageResolvable} message 삭제할 메세지
   * @param {string} [reason] 만약 클라이언트에게 귀속된 메세지가 아니라면 이 메세지를 삭제하는 이유
   * @returns {Promise<void>}
   */
  async delete(message, reason) {
    message = this.resolveID(message);
    if (message) {
      await this.client.api
        .channels(this.channel.id)
        .messages(message)
        .delete({ reason });
    }
  }

  async _fetchId(messageID, cache) {
    const existing = this.cache.get(messageID);
    if (existing && !existing.partial) return existing;
    const data = await this.client.api.channels[this.channel.id].messages[messageID].get();
    return this.add(data, cache);
  }

  async _fetchMany(options = {}, cache) {
    const data = await this.client.api.channels[this.channel.id].messages.get({ query: options });
    const messages = new Collection();
    for (const message of data) messages.set(message.id, this.add(message, cache));
    return messages;
  }
}

module.exports = MessageManager;

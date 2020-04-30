'use strict';

const BaseManager = require('./BaseManager');
const MessageReaction = require('../structures/MessageReaction');

/**
 * 리액션의 API 메소드를 관리하고 캐시에 저장합니다.
 * @extends {BaseManager}
 */
class ReactionManager extends BaseManager {
  constructor(message, iterable) {
    super(message.client, iterable, MessageReaction);

    /**
     * 이 매니저에 귀속된 메세지
     * @type {Message}
     */
    this.message = message;
  }

  add(data, cache) {
    return super.add(data, cache, { id: data.emoji.id || data.emoji.name, extras: [this.message] });
  }

  /**
   * 이 매니저에 귀속된 리액션 캐시
   * @type {Collection<Snowflake, MessageReaction>}
   * @name ReactionManager#cache
   */

  /**
   * 메세지 리액션 객체로 리졸브 가능한 데이터. 가능한 데이터:
   * * MessageReaction 클래스
   * * Snowflake
   * @typedef {MessageReaction|Snowflake} MessageReactionResolvable
   */

  /**
   * 메세지 리액션으로 리졸브 가능한 데이터를 메세지 리액션 객체 데이터로 리졸브합니다.
   * @method resolve
   * @memberof ReactionManager
   * @instance
   * @param {MessageReactionResolvable} reaction 리졸브 할 메세지 리액션 데이터
   * @returns {?MessageReaction}
   */

  /**
   * 프리센스로 리졸브 가능한 데이터를 프리센스 ID 문자열로 리졸브합니다.
   * @method resolveID
   * @memberof ReactionManager
   * @instance
   * @param {MessageReactionResolvable} reaction 리졸브 할 메세지 리액션 데이터
   * @returns {?Snowflake}
   */

  /**
   * 이 메세지의 모든 리액션을 제거합니다.
   * @returns {Promise<Message>}
   */
  removeAll() {
    return this.client.api
      .channels(this.message.channel.id)
      .messages(this.message.id)
      .reactions.delete()
      .then(() => this.message);
  }
}

module.exports = ReactionManager;

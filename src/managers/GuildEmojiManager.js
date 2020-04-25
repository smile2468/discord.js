'use strict';

const BaseManager = require('./BaseManager');
const { TypeError } = require('../errors');
const GuildEmoji = require('../structures/GuildEmoji');
const ReactionEmoji = require('../structures/ReactionEmoji');
const Collection = require('../util/Collection');
const DataResolver = require('../util/DataResolver');

/**
 * 길드 이모지들의 API 메소드를 관리하고 캐시에 저장합니다.
 * @extends {BaseManager}
 */
class GuildEmojiManager extends BaseManager {
  constructor(guild, iterable) {
    super(guild.client, iterable, GuildEmoji);
    /**
     * 이 매니저에 귀속된 길드
     * @type {Guild}
     */
    this.guild = guild;
  }

  /**
   * 이 매니저에 귀속된 길드 이모지 캐시
   * @type {Collection<Snowflake, GuildEmoji>}
   * @name GuildEmojiManager#cache
   */

  add(data, cache) {
    return super.add(data, cache, { extras: [this.guild] });
  }

  /**
   * 길드에 새로운 커스텀 이모지를 생성합니다.
   * @param {BufferResolvable|Base64Resolvable} attachment 이모지의 사진
   * @param {string} name 이모지의 이름
   * @param {Object} [options] 옵션
   * @param {Collection<Snowflake, Role>|RoleResolvable[]} [options.roles] 이 이모지를 사용할수 있는 역할들을 제한
   * @param {string} [options.reason] 이모지를 추가하는 이유
   * @returns {Promise<Emoji>} The created emoji
   * @example
   * // url에서 이모지를 생성합니다
   * guild.emojis.create('https://i.imgur.com/w3duR07.png', 'rip')
   *   .then(emoji => console.log(`${emoji.name}의 이름을 가진 이모지를 생성 했습니다!`))
   *   .catch(console.error);
   * @example
   * // 해당 컴퓨터의 파일에서 이모지를 생성합니다
   * guild.emojis.create('./memes/banana.png', 'banana')
   *   .then(emoji => console.log(`${emoji.name}의 이름을 가진 이모지를 생성 했습니다!`))
   *   .catch(console.error);
   */
  async create(attachment, name, { roles, reason } = {}) {
    attachment = await DataResolver.resolveImage(attachment);
    if (!attachment) throw new TypeError('REQ_RESOURCE_TYPE');

    const data = { image: attachment, name };
    if (roles) {
      data.roles = [];
      for (let role of roles instanceof Collection ? roles.values() : roles) {
        role = this.guild.roles.resolve(role);
        if (!role) {
          return Promise.reject(
            new TypeError('INVALID_TYPE', 'options.roles', 'Array or Collection of Roles or Snowflakes', true),
          );
        }
        data.roles.push(role.id);
      }
    }

    return this.client.api
      .guilds(this.guild.id)
      .emojis.post({ data, reason })
      .then(emoji => this.client.actions.GuildEmojiCreate.handle(this.guild, emoji).emoji);
  }

  /**
   * 길드 이모지 객체로 리졸브 가능한 데이터. 가능한 데이터:
   * * 커스텀 이모지 ID
   * * 길드 이모지 객체
   * * 리액션 이모지 객체
   * @typedef {Snowflake|GuildEmoji|ReactionEmoji} EmojiResolvable
   */

  /**
   * 길드 이모지로 리졸브 가능한 데이터를 길드 이모지 객체 데이터로 리졸브합니다.
   * @param {EmojiResolvable} emoji 리졸브 할 길드 이모지 데이터
   * @returns {?GuildEmoji}
   */
  resolve(emoji) {
    if (emoji instanceof ReactionEmoji) return super.resolve(emoji.id);
    return super.resolve(emoji);
  }

  /**
   * 길드 이모지로 리졸브 가능한 데이터를 길드 이모지 ID 문자열로 리졸브합니다.
   * @param {EmojiResolvable} emoji 리졸브 할 길드 이모지 데이터
   * @returns {?Snowflake}
   */
  resolveID(emoji) {
    if (emoji instanceof ReactionEmoji) return emoji.id;
    return super.resolveID(emoji);
  }

  /**
   * 이모지 식별자로 리졸브 가능한 데이터. 가능한 데이터:
   * * 이모지의 유니코드 표현
   * * EmojiResolvable
   * @typedef {string|EmojiResolvable} EmojiIdentifierResolvable
   */

  /**
   * 이모지로 리졸브 가능한 데이터를 이모지 식별자로 리졸브합니다
   * @param {EmojiIdentifierResolvable} emoji 리졸브 할 이모지 데이터
   * @returns {?string}
   */
  resolveIdentifier(emoji) {
    const emojiResolvable = this.resolve(emoji);
    if (emojiResolvable) return emojiResolvable.identifier;
    if (emoji instanceof ReactionEmoji) return emoji.identifier;
    if (typeof emoji === 'string') {
      if (!emoji.includes('%')) return encodeURIComponent(emoji);
      else return emoji;
    }
    return null;
  }
}

module.exports = GuildEmojiManager;

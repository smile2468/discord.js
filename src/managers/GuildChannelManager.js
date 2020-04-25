'use strict';

const BaseManager = require('./BaseManager');
const GuildChannel = require('../structures/GuildChannel');
const PermissionOverwrites = require('../structures/PermissionOverwrites');
const { ChannelTypes } = require('../util/Constants');

/**
 * 길드 채널들의 API 메소드를 관리하고 캐시에 저장합니다.
 * @extends {BaseManager}
 */
class GuildChannelManager extends BaseManager {
  constructor(guild, iterable) {
    super(guild.client, iterable, GuildChannel);

    /**
     * 매니저에 귀속된 길드
     * @type {Guild}
     */
    this.guild = guild;
  }

  /**
   * 이 매니저에 귀속된 캐시
   * @type {Collection<Snowflake, GuildChannel>}
   * @name GuildChannelManager#cache
   */

  add(channel) {
    const existing = this.cache.get(channel.id);
    if (existing) return existing;
    this.cache.set(channel.id, channel);
    return channel;
  }

  /**
   * 길드 채널 객체로 리졸브 가능한 데이터. 가능한 데이터:
   * * 길드 채널 객체
   * * Snowflake
   * @typedef {GuildChannel|Snowflake} GuildChannelResolvable
   */

  /**
   * 길드 채널로 리졸브 가능한 데이터를 길드 채널 객체 데이터로 리졸브합니다.
   * @method resolve
   * @memberof GuildChannelManager
   * @instance
   * @param {GuildChannelResolvable} channel 리졸브 할 길드 채널 데이터
   * @returns {?Channel}
   */

  /**
   * 길드 채널로 리졸브 가능한 데이터를 길드 채널 ID 문자열로 리졸브합니다.
   * @method resolveID
   * @memberof GuildChannelManager
   * @instance
   * @param {GuildChannelResolvable} channel 리졸브 할 길드 채널 데이터
   * @returns {?Snowflake}
   */

  /**
   * 길드에 새로운 채널을 생성합니다.
   * @param {string} name 새로운 채널의 이름
   * @param {Object} [options] 옵션
   * @param {string} [options.type='text'] 새로운 채널의 타입 (text, voice, category)
   * @param {string} [options.topic] 새로운 채널의 주제(토픽)
   * @param {boolean} [options.nsfw] 새로운 채널의 nsfw 여부
   * @param {number} [options.bitrate] 새로운 채널의 비트레이트를 bit 단위로 설정 (음성 채널만 가능)
   * @param {number} [options.userLimit] 새로운 채널에 접속 허용된 유저 제한 수 (음성 채널 가능)
   * @param {ChannelResolvable} [options.parent] 새로운 채널의 부모 채널(카테고리)
   * @param {OverwriteResolvable[]|Collection<Snowflake, OverwriteResolvable>} [options.permissionOverwrites]
   * 덮어씌울 새로운 채널의 권한
   * @param {number} [options.position] 새로운 채널의 위치
   * @param {number} [options.rateLimitPerUser] 새로운 채널의 레이트리밋(슬로우모드)
   * @param {string} [options.reason] 새로운 채널을 생성하는 이유
   * @returns {Promise<GuildChannel>}
   * @example
   * //새로운 텍스트 채널을 생성합니다
   * guild.channels.create('새로운-채팅방', { reason: '채팅 폭주로 인한 탈주' })
   *   .then(console.log)
   *   .catch(console.error);
   * @example
   * // 새로운 채널을 생성하고 아래의 권한으로 덮어씌웁니다
   * guild.channels.create('새로운-음성채널', {
   *   type: 'voice',
   *   permissionOverwrites: [
   *      {
   *        id: message.author.id,
   *        deny: ['VIEW_CHANNEL'],
   *     },
   *   ],
   * })
   */
  async create(name, options = {}) {
    let {
      type,
      topic,
      nsfw,
      bitrate,
      userLimit,
      parent,
      permissionOverwrites,
      position,
      rateLimitPerUser,
      reason,
    } = options;
    if (parent) parent = this.client.channels.resolveID(parent);
    if (permissionOverwrites) {
      permissionOverwrites = permissionOverwrites.map(o => PermissionOverwrites.resolve(o, this.guild));
    }

    const data = await this.client.api.guilds(this.guild.id).channels.post({
      data: {
        name,
        topic,
        type: type ? ChannelTypes[type.toUpperCase()] : ChannelTypes.TEXT,
        nsfw,
        bitrate,
        user_limit: userLimit,
        parent_id: parent,
        position,
        permission_overwrites: permissionOverwrites,
        rate_limit_per_user: rateLimitPerUser,
      },
      reason,
    });
    return this.client.actions.ChannelCreate.handle(data).channel;
  }
}

module.exports = GuildChannelManager;

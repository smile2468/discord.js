'use strict';

const BaseManager = require('./BaseManager');
const Channel = require('../structures/Channel');
const { Events } = require('../util/Constants');

/**
 * 클라이언트에 귀속된 채널 매니저
 * @extends {BaseManager}
 */
class ChannelManager extends BaseManager {
  constructor(client, iterable) {
    super(client, iterable, Channel);
  }

  /**
   * 채널들의 캐시
   * @type {Collection<Snowflake, Channel>}
   * @name ChannelManager#cache
   */

  add(data, guild, cache = true) {
    const existing = this.cache.get(data.id);
    if (existing) {
      if (existing._patch && cache) existing._patch(data);
      if (guild) guild.channels.add(existing);
      return existing;
    }

    const channel = Channel.create(this.client, data, guild);

    if (!channel) {
      this.client.emit(Events.DEBUG, `Failed to find guild, or unknown type for channel ${data.id} ${data.type}`);
      return null;
    }

    if (cache) this.cache.set(channel.id, channel);

    return channel;
  }

  remove(id) {
    const channel = this.cache.get(id);
    if (channel.guild) channel.guild.channels.cache.delete(id);
    this.cache.delete(id);
  }

  /**
   * 채널 객체로 리졸브 가능한 데이터. 가능한 데이터:
   * * A Channel object
   * * A Snowflake
   * @typedef {Channel|Snowflake} ChannelResolvable
   */

  /**
   * 채널로 리졸브 가능한 데이터를 채널 객체 데이터로 리졸브합니다.
   * @method resolve
   * @memberof ChannelManager
   * @instance
   * @param {ChannelResolvable} channel The channel resolvable to resolve
   * @returns {?Channel}
   */

  /**
   * 채널로 리졸브 가능한 데이터를 채널 ID 문자열로 리졸브합니다.
   * @method resolveID
   * @memberof ChannelManager
   * @instance
   * @param {ChannelResolvable} channel 리졸브할 채널 데이터
   * @returns {?Snowflake}
   */

  /**
   * 디스코드로부터 채널을 불러오거나 캐시 데이터에 이미 있는 경우 캐시에서 불러옵니다.
   * @param {Snowflake} id 채널 ID
   * @param {boolean} [cache=true] 불러온 채널의 캐싱 여부
   * @returns {Promise<Channel>}
   * @example
   * // 채널을 ID로 불러옵니다
   * client.channels.fetch('222109930545610754')
   *   .then(channel => console.log(channel.name))
   *   .catch(console.error);
   */
  async fetch(id, cache = true) {
    const existing = this.cache.get(id);
    if (existing && !existing.partial) return existing;

    const data = await this.client.api.channels(id).get();
    return this.add(data, null, cache);
  }
}

module.exports = ChannelManager;

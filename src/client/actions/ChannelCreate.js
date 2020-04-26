'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class ChannelCreateAction extends Action {
  handle(data) {
    const client = this.client;
    const existing = client.channels.cache.has(data.id);
    const channel = client.channels.add(data);
    if (!existing && channel) {
      /**
       * 채널이 생성될 때 실행됩니다.
       * @event Client#channelCreate
       * @param {DMChannel|GuildChannel} channel 생성된 채널
       */
      client.emit(Events.CHANNEL_CREATE, channel);
    }
    return { channel };
  }
}

module.exports = ChannelCreateAction;

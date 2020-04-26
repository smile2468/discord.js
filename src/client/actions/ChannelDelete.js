'use strict';

const Action = require('./Action');
const DMChannel = require('../../structures/DMChannel');
const { Events } = require('../../util/Constants');

class ChannelDeleteAction extends Action {
  constructor(client) {
    super(client);
    this.deleted = new Map();
  }

  handle(data) {
    const client = this.client;
    let channel = client.channels.cache.get(data.id);

    if (channel) {
      client.channels.remove(channel.id);
      channel.deleted = true;
      if (channel.messages && !(channel instanceof DMChannel)) {
        for (const message of channel.messages.cache.values()) {
          message.deleted = true;
        }
      }
      /**
       * 채널이 삭제될 때 실행됩니다.
       * @event Client#channelDelete
       * @param {DMChannel|GuildChannel} channel 삭제된 채널
       */
      client.emit(Events.CHANNEL_DELETE, channel);
    }

    return { channel };
  }
}

module.exports = ChannelDeleteAction;

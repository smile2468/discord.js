'use strict';

const Action = require('./Action');
const Collection = require('../../util/Collection');
const { Events } = require('../../util/Constants');

class MessageDeleteBulkAction extends Action {
  handle(data) {
    const client = this.client;
    const channel = client.channels.cache.get(data.channel_id);

    if (channel) {
      const ids = data.ids;
      const messages = new Collection();
      for (const id of ids) {
        const message = this.getMessage(
          {
            id,
            guild_id: data.guild_id,
          },
          channel,
          false,
        );
        if (message) {
          message.deleted = true;
          messages.set(message.id, message);
          channel.messages.cache.delete(id);
        }
      }

      /**
       * 메세지 여러개가 삭제될 때 실행됩니다.
       * @event Client#messageDeleteBulk
       * @param {Collection<Snowflake, Message>} messages 삭제된 메세지들 (ID로 매핑)
       */
      if (messages.size > 0) client.emit(Events.MESSAGE_BULK_DELETE, messages);
      return { messages };
    }
    return {};
  }
}

module.exports = MessageDeleteBulkAction;

'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class MessageDeleteAction extends Action {
  handle(data) {
    const client = this.client;
    const channel = this.getChannel(data);
    let message;
    if (channel) {
      message = this.getMessage(data, channel);
      if (message) {
        channel.messages.cache.delete(message.id);
        message.deleted = true;
        /**
         * 메세지가 삭제될 때 실행됩니다.
         * @event Client#messageDelete
         * @param {Message} message 삭제된 메세지
         */
        client.emit(Events.MESSAGE_DELETE, message);
      }
    }

    return { message };
  }
}

module.exports = MessageDeleteAction;

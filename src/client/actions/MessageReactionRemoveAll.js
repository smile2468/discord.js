'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class MessageReactionRemoveAll extends Action {
  handle(data) {
    // Verify channel
    const channel = this.getChannel(data);
    if (!channel || channel.type === 'voice') return false;

    // Verify message
    const message = this.getMessage(data, channel);
    if (!message) return false;

    message.reactions.cache.clear();
    this.client.emit(Events.MESSAGE_REACTION_REMOVE_ALL, message);

    return { message };
  }
}

/**
 * 모든 반응이 캐시된 메세지에 삭제될 때 실행됩니다.
 * @event Client#messageReactionRemoveAll
 * @param {Message} message 반응이 삭제된 메세지
 */

module.exports = MessageReactionRemoveAll;

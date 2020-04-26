'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class MessageReactionRemoveEmoji extends Action {
  handle(data) {
    const channel = this.getChannel(data);
    if (!channel || channel.type === 'voice') return false;

    const message = this.getMessage(data, channel);
    if (!message) return false;

    const reaction = this.getReaction(data, message);
    if (!reaction) return false;
    if (!message.partial) message.reactions.cache.delete(reaction.emoji.id || reaction.emoji.name);

    /**
     * 봇이 캐시된 메세지에서 반응이 삭제했을 때 실행됩니다.
     * @event Client#messageReactionRemoveEmoji
     * @param {MessageReaction} reaction 삭제된 반응
     */
    this.client.emit(Events.MESSAGE_REACTION_REMOVE_EMOJI, reaction);
    return { reaction };
  }
}

module.exports = MessageReactionRemoveEmoji;

'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

/*
{ user_id: 'id',
     message_id: 'id',
     emoji: { name: '�', id: null },
     channel_id: 'id' } }
*/

class MessageReactionRemove extends Action {
  handle(data) {
    if (!data.emoji) return false;

    const user = this.getUser(data);
    if (!user) return false;

    // Verify channel
    const channel = this.getChannel(data);
    if (!channel || channel.type === 'voice') return false;

    // Verify message
    const message = this.getMessage(data, channel);
    if (!message) return false;

    // Verify reaction
    const reaction = this.getReaction(data, message, user);
    if (!reaction) return false;
    reaction._remove(user);
    /**
     * 반응이 캐시된 메세지에 삭제될 때 실행됩니다.
     * @event Client#messageReactionRemove
     * @param {MessageReaction} messageReaction 반응 객체
     * @param {User} user 이모지가 삭제된 유저
     */
    this.client.emit(Events.MESSAGE_REACTION_REMOVE, reaction, user);

    return { message, reaction, user };
  }
}

module.exports = MessageReactionRemove;

'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');
const { PartialTypes } = require('../../util/Constants');

/*
{ user_id: 'id',
     message_id: 'id',
     emoji: { name: '�', id: null },
     channel_id: 'id' } }
*/

class MessageReactionAdd extends Action {
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
    if (message.partial && !this.client.options.partials.includes(PartialTypes.REACTION)) return false;
    const reaction = message.reactions.add({
      emoji: data.emoji,
      count: message.partial ? null : 0,
      me: user.id === this.client.user.id,
    });
    if (!reaction) return false;
    reaction._add(user);
    /**
     * 반응을 캐시된 메세지에 추가될 때 실행됩니다.
     * @event Client#messageReactionAdd
     * @param {MessageReaction} messageReaction 반응 객체
     * @param {User} user 이모지를 추가한 유저
     */
    this.client.emit(Events.MESSAGE_REACTION_ADD, reaction, user);

    return { message, reaction, user };
  }
}

module.exports = MessageReactionAdd;

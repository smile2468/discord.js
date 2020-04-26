'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class GuildEmojiUpdateAction extends Action {
  handle(current, data) {
    const old = current._update(data);
    /**
     * 커스텀 이모지가 길드에서 업데이트될 때 실행됩니다.
     * @event Client#emojiUpdate
     * @param {GuildEmoji} oldEmoji 이전 이모지
     * @param {GuildEmoji} newEmoji 새로운 이모지
     */
    this.client.emit(Events.GUILD_EMOJI_UPDATE, old, current);
    return { emoji: current };
  }
}

module.exports = GuildEmojiUpdateAction;

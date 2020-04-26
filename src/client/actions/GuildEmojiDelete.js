'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class GuildEmojiDeleteAction extends Action {
  handle(emoji) {
    emoji.guild.emojis.cache.delete(emoji.id);
    emoji.deleted = true;
    /**
     * 커스텀 이모지가 삭제될 때 실행됩니다.
     * @event Client#emojiDelete
     * @param {GuildEmoji} emoji 삭제된 이모지
     */
    this.client.emit(Events.GUILD_EMOJI_DELETE, emoji);
    return { emoji };
  }
}

module.exports = GuildEmojiDeleteAction;

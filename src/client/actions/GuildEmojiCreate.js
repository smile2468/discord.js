'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class GuildEmojiCreateAction extends Action {
  handle(guild, createdEmoji) {
    const emoji = guild.emojis.add(createdEmoji);
    /**
     * 길드에 커스텀 이모지가 생성될 때 실행됩니다.
     * @event Client#emojiCreate
     * @param {GuildEmoji} emoji 생성된 이모지
     */
    this.client.emit(Events.GUILD_EMOJI_CREATE, emoji);
    return { emoji };
  }
}

module.exports = GuildEmojiCreateAction;

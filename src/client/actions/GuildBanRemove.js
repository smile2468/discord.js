'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class GuildBanRemove extends Action {
  handle(data) {
    const client = this.client;
    const guild = client.guilds.cache.get(data.guild_id);
    const user = client.users.add(data.user);
    /**
     * 멤버가 길드에서 차단 해제되면 실행됩니다.
     * @event Client#guildBanRemove
     * @param {Guild} guild 차단 해제가 발생한 길드
     * @param {User} user 차단 해제된 유저
     */
    if (guild && user) client.emit(Events.GUILD_BAN_REMOVE, guild, user);
  }
}

module.exports = GuildBanRemove;

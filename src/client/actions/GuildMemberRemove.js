'use strict';

const Action = require('./Action');
const { Events, Status } = require('../../util/Constants');

class GuildMemberRemoveAction extends Action {
  handle(data, shard) {
    const client = this.client;
    const guild = client.guilds.cache.get(data.guild_id);
    let member = null;
    if (guild) {
      member = this.getMember(data, guild);
      guild.memberCount--;
      if (member) {
        member.deleted = true;
        guild.members.cache.delete(member.id);
        /**
         * 유저가 길드를 나가거나, 추방되었을 때 실행됩니다.
         * @event Client#guildMemberRemove
         * @param {GuildMember} member 길드를 나가거나, 추방된 유저
         */
        if (shard.status === Status.READY) client.emit(Events.GUILD_MEMBER_REMOVE, member);
      }
      guild.voiceStates.cache.delete(data.user.id);
    }
    return { guild, member };
  }
}

module.exports = GuildMemberRemoveAction;

'use strict';

const Action = require('./Action');
const Invite = require('../../structures/Invite');
const { Events } = require('../../util/Constants');

class InviteCreateAction extends Action {
  handle(data) {
    const client = this.client;
    const channel = client.channels.cache.get(data.channel_id);
    const guild = client.guilds.cache.get(data.guild_id);
    if (!channel && !guild) return false;

    const inviteData = Object.assign(data, { channel, guild });
    const invite = new Invite(client, inviteData);
    /**
     * 초대링크가 생성될 때 실행됩니다.
     * <info> 이 이벤트는 클라이언트가 `길드 관리(MANAGE_GUILD)` 
     * 또는 해당 채널에 `채널 관리 (MANAGE_CHANNEL)` 권한이 있을 때만 실행됩니다.</info>
     * @event Client#inviteCreate
     * @param {Invite} invite 생성된 초대
     */
    client.emit(Events.INVITE_CREATE, invite);
    return { invite };
  }
}

module.exports = InviteCreateAction;

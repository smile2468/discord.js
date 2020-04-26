'use strict';

const Action = require('./Action');
const Invite = require('../../structures/Invite');
const { Events } = require('../../util/Constants');

class InviteDeleteAction extends Action {
  handle(data) {
    const client = this.client;
    const channel = client.channels.cache.get(data.channel_id);
    const guild = client.guilds.cache.get(data.guild_id);
    if (!channel && !guild) return false;

    const inviteData = Object.assign(data, { channel, guild });
    const invite = new Invite(client, inviteData);
    /**
     * 초대링크가 삭제될 때 실행됩니다.
     * <info> 이 이벤트는 클라이언트가 `길드 관리(MANAGE_GUILD)`
     * 또는 해당 채널에 `채널 관리 (MANAGE_CHANNEL)` 권한이 있을 때만 실행됩니다.</info>
     * @event Client#inviteDelete
     * @param {Invite} invite The invite that was deleted
     */
    client.emit(Events.INVITE_DELETE, invite);
    return { invite };
  }
}

module.exports = InviteDeleteAction;

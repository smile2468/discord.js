'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class PresenceUpdateAction extends Action {
  handle(data) {
    let user = this.client.users.cache.get(data.user.id);
    if (!user && data.user.username) user = this.client.users.add(data.user);
    if (!user) return;

    if (data.user && data.user.username) {
      if (!user.equals(data.user)) this.client.actions.UserUpdate.handle(data.user);
    }

    const guild = this.client.guilds.cache.get(data.guild_id);
    if (!guild) return;

    let oldPresence = guild.presences.cache.get(user.id);
    if (oldPresence) oldPresence = oldPresence._clone();
    let member = guild.members.cache.get(user.id);
    if (!member && data.status !== 'offline') {
      member = guild.members.add({
        user,
        roles: data.roles,
        deaf: false,
        mute: false,
      });
      this.client.emit(Events.GUILD_MEMBER_AVAILABLE, member);
    }
    guild.presences.add(Object.assign(data, { guild }));
    if (member && this.client.listenerCount(Events.PRESENCE_UPDATE)) {
      /**
       * 길드 멤버의 프리센스 ( 예) 상태, 게임)이 변경 되었을 때 실행됩니다.
       * @event Client#presenceUpdate
       * @param {?Presence} oldPresence 업데이트 이전의 프리센스 (존재하는 경우)
       * @param {Presence} newPresence 업데이트 이후의 프리센스
       */
      this.client.emit(Events.PRESENCE_UPDATE, oldPresence, member.presence);
    }
  }
}

module.exports = PresenceUpdateAction;

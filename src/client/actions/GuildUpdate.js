'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class GuildUpdateAction extends Action {
  handle(data) {
    const client = this.client;

    const guild = client.guilds.cache.get(data.id);
    if (guild) {
      const old = guild._update(data);
      /**
       * 길드가 업데이트되었을 때 실행됩니다. - 예) 이름 변경
       * @event Client#guildUpdate
       * @param {Guild} oldGuild 업데이트 이전의 길드
       * @param {Guild} newGuild 업데이트 이후의 길드
       */
      client.emit(Events.GUILD_UPDATE, old, guild);
      return {
        old,
        updated: guild,
      };
    }

    return {
      old: null,
      updated: null,
    };
  }
}

module.exports = GuildUpdateAction;

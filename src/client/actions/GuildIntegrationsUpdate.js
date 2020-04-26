'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class GuildIntegrationsUpdate extends Action {
  handle(data) {
    const client = this.client;
    const guild = client.guilds.cache.get(data.guild_id);
    /**
     * 길드의 연동 정보가 업데이트될 때 실행됩니다.
     * @event Client#guildIntegrationsUpdate
     * @param {Guild} guild 연동 정보가 업데이트된 길드
     */
    if (guild) client.emit(Events.GUILD_INTEGRATIONS_UPDATE, guild);
  }
}

module.exports = GuildIntegrationsUpdate;

'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class GuildRoleCreate extends Action {
  handle(data) {
    const client = this.client;
    const guild = client.guilds.cache.get(data.guild_id);
    let role;
    if (guild) {
      const already = guild.roles.cache.has(data.role.id);
      role = guild.roles.add(data.role);
      /**
       * 역할이 생성될 때 실행됩니다.
       * @event Client#roleCreate
       * @param {Role} role 생성된 역할
       */
      if (!already) client.emit(Events.GUILD_ROLE_CREATE, role);
    }
    return { role };
  }
}

module.exports = GuildRoleCreate;

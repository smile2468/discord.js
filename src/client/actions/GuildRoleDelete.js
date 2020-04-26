'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class GuildRoleDeleteAction extends Action {
  handle(data) {
    const client = this.client;
    const guild = client.guilds.cache.get(data.guild_id);
    let role;

    if (guild) {
      role = guild.roles.cache.get(data.role_id);
      if (role) {
        guild.roles.cache.delete(data.role_id);
        role.deleted = true;
        /**
         * 역할이 삭제될 때 실행됩니다.
         * @event Client#roleDelete
         * @param {Role} role 삭제된 역할
         */
        client.emit(Events.GUILD_ROLE_DELETE, role);
      }
    }

    return { role };
  }
}

module.exports = GuildRoleDeleteAction;

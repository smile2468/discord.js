'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class GuildRoleUpdateAction extends Action {
  handle(data) {
    const client = this.client;
    const guild = client.guilds.cache.get(data.guild_id);

    if (guild) {
      let old = null;

      const role = guild.roles.cache.get(data.role.id);
      if (role) {
        old = role._update(data.role);
        /**
         * 길드 역할이 업데이트될 때 실행됩니다.
         * @event Client#roleUpdate
         * @param {Role} oldRole 업데이트 이전의 역할
         * @param {Role} newRole 업데이트 이후의 역할
         */
        client.emit(Events.GUILD_ROLE_UPDATE, old, role);
      }

      return {
        old,
        updated: role,
      };
    }

    return {
      old: null,
      updated: null,
    };
  }
}

module.exports = GuildRoleUpdateAction;

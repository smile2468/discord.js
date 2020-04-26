'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class GuildDeleteAction extends Action {
  constructor(client) {
    super(client);
    this.deleted = new Map();
  }

  handle(data) {
    const client = this.client;

    let guild = client.guilds.cache.get(data.id);
    if (guild) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.type === 'text') channel.stopTyping(true);
      }

      if (data.unavailable) {
        // 길드가 사용불가합니다.
        guild.available = false;

        /**
         * 길드가 사용 불가능 할 때 실행됩니다. 예를 들어, 복구 중일 때 실행됩니다
         * @event Client#guildUnavailable
         * @param {Guild} guild 사용 불가능해진 길드
         */
        client.emit(Events.GUILD_UNAVAILABLE, guild);

        // Stops the GuildDelete packet thinking a guild was actually deleted,
        // handles emitting of event itself
        return {
          guild: null,
        };
      }

      for (const channel of guild.channels.cache.values()) this.client.channels.remove(channel.id);
      if (guild.voice && guild.voice.connection) guild.voice.connection.disconnect();

      // 길드 삭제
      client.guilds.cache.delete(guild.id);
      guild.deleted = true;

      /**
       *길드가 클라이언트를 추방하거나 길드를 삭제/나갈 때마다 실행됩니다.
       * @event Client#guildDelete
       * @param {Guild} guild 삭제된 길드
       */
      client.emit(Events.GUILD_DELETE, guild);

      this.deleted.set(guild.id, guild);
      this.scheduleForDeletion(guild.id);
    } else {
      guild = this.deleted.get(data.id) || null;
    }

    return { guild };
  }

  scheduleForDeletion(id) {
    this.client.setTimeout(() => this.deleted.delete(id), this.client.options.restWsBridgeTimeout);
  }
}

module.exports = GuildDeleteAction;

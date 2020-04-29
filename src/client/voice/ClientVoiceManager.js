'use strict';

const VoiceBroadcast = require('./VoiceBroadcast');
const VoiceConnection = require('./VoiceConnection');
const { Error } = require('../../errors');
const Collection = require('../../util/Collection');

/**
 * 클라이언트의 음성 연결을 관리합니다.
 */
class ClientVoiceManager {
  constructor(client) {
    /**
     * 해당 음성 매니저를 인스턴스화한 클라이언트
     * @type {Client}
     * @readonly
     * @name ClientVoiceManager#client
     */
    Object.defineProperty(this, 'client', { value: client });

    /**
     * 연결 객체들을 ID들로 매핑한 컬랙션
     * @type {Collection<Snowflake, VoiceConnection>}
     */
    this.connections = new Collection();

    /**
     * 생성된 활성 음성 브로드케스트
     * @type {VoiceBroadcast[]}
     */
    this.broadcasts = [];
  }

  /**
   * 음성 브로드케스트를 생성합니다.
   * @returns {VoiceBroadcast}
   */
  createBroadcast() {
    const broadcast = new VoiceBroadcast(this.client);
    this.broadcasts.push(broadcast);
    return broadcast;
  }

  onVoiceServer({ guild_id, token, endpoint }) {
    this.client.emit('debug', `[VOICE] voiceServer guild: ${guild_id} token: ${token} endpoint: ${endpoint}`);
    const connection = this.connections.get(guild_id);
    if (connection) connection.setTokenAndEndpoint(token, endpoint);
  }

  onVoiceStateUpdate({ guild_id, session_id, channel_id }) {
    const connection = this.connections.get(guild_id);
    this.client.emit('debug', `[VOICE] connection? ${!!connection}, ${guild_id} ${session_id} ${channel_id}`);
    if (!connection) return;
    if (!channel_id) {
      connection._disconnect();
      this.connections.delete(guild_id);
      return;
    }
    connection.channel = this.client.channels.cache.get(channel_id);
    connection.setSessionID(session_id);
  }

  /**
   * 음성 채널에 접속하도록 요청을 설정합니다.
   * @param {VoiceChannel} channel 접속할 음성 채널
   * @returns {Promise<VoiceConnection>}
   * @private
   */
  joinChannel(channel) {
    return new Promise((resolve, reject) => {
      if (!channel.joinable) {
        throw new Error('VOICE_JOIN_CHANNEL', channel.full);
      }

      let connection = this.connections.get(channel.guild.id);

      if (connection) {
        if (connection.channel.id !== channel.id) {
          this.connections.get(channel.guild.id).updateChannel(channel);
        }
        resolve(connection);
        return;
      } else {
        connection = new VoiceConnection(this, channel);
        connection.on('debug', msg =>
          this.client.emit('debug', `[VOICE (${channel.guild.id}:${connection.status})]: ${msg}`),
        );
        connection.authenticate();
        this.connections.set(channel.guild.id, connection);
      }

      connection.once('failed', reason => {
        this.connections.delete(channel.guild.id);
        reject(reason);
      });

      connection.on('error', reject);

      connection.once('authenticated', () => {
        connection.once('ready', () => {
          resolve(connection);
          connection.removeListener('error', reject);
        });
        connection.once('disconnect', () => this.connections.delete(channel.guild.id));
      });
    });
  }
}

module.exports = ClientVoiceManager;

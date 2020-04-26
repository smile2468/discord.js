'use strict';

const BasePlayer = require('./BasePlayer');

/**
 * 음성 연결을 위한 오디오 플레이어
 * @private
 * @extends {BasePlayer}
 */
class AudioPlayer extends BasePlayer {
  constructor(voiceConnection) {
    super();
    /**
     * 음성 플레이어가 제공하는 음성 연결
     * @type {VoiceConnection}
     */
    this.voiceConnection = voiceConnection;
  }

  playBroadcast(broadcast, options) {
    const dispatcher = this.createDispatcher(options, { broadcast });
    broadcast.add(dispatcher);
    return dispatcher;
  }
}

module.exports = AudioPlayer;

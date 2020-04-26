'use strict';

const BasePlayer = require('./BasePlayer');
const BroadcastDispatcher = require('../dispatcher/BroadcastDispatcher');

/**
 * 음성 연결을 위한 오디오 플레이어
 * @private
 * @extends {BasePlayer}
 */
class AudioPlayer extends BasePlayer {
  constructor(broadcast) {
    super();
    /**
     * 음성 플레이어가 실행하는 보로드케스트
     * @type {VoiceBroadcast}
     */
    this.broadcast = broadcast;
  }

  createDispatcher(options, streams) {
    this.destroyDispatcher();
    const dispatcher = (this.dispatcher = new BroadcastDispatcher(this, options, streams));
    return dispatcher;
  }
}

module.exports = AudioPlayer;

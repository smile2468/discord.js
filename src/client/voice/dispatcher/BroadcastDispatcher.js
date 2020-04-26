'use strict';

const StreamDispatcher = require('./StreamDispatcher');

/**
 * 음성 패킷 데이터를 음성 연결로 보내는 클래스입니다.
 * @implements {VolumeInterface}
 * @extends {StreamDispatcher}
 */
class BroadcastDispatcher extends StreamDispatcher {
  constructor(player, options, streams) {
    super(player, options, streams);
    this.broadcast = player.broadcast;
  }

  _write(chunk, enc, done) {
    if (!this.startTime) this.startTime = Date.now();
    for (const dispatcher of this.broadcast.subscribers) {
      dispatcher._write(chunk, enc);
    }
    this._step(done);
  }

  _destroy(err, cb) {
    if (this.player.dispatcher === this) this.player.dispatcher = null;
    const { streams } = this;
    if (streams.opus) streams.opus.unpipe(this);
    if (streams.ffmpeg) streams.ffmpeg.destroy();
    super._destroy(err, cb);
  }

  /**
   * 호환되는 Opus 스트림을 사용하는 경우 현재 Opus 인코더의 비트 전송률을 설정합니다.
   * @param {number} value 새로운 비트 전송률(kbps)
   * `'auto'로 설정하면 48kbps가 사용됩니다.`
   * @returns {boolean} 비트 전송률이 성공적으로 변경되었는지 여부
   */
  setBitrate(value) {
    if (!value || !this.streams.opus || !this.streams.opus.setBitrate) return false;
    const bitrate = value === 'auto' ? 48 : value;
    this.streams.opus.setBitrate(bitrate * 1000);
    return true;
  }
}

module.exports = BroadcastDispatcher;

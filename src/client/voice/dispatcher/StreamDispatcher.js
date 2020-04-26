'use strict';

const { Writable } = require('stream');
const secretbox = require('../util/Secretbox');
const Silence = require('../util/Silence');
const VolumeInterface = require('../util/VolumeInterface');

const FRAME_LENGTH = 20;
const CHANNELS = 2;
const TIMESTAMP_INC = (48000 / 100) * CHANNELS;

const MAX_NONCE_SIZE = 2 ** 32 - 1;
const nonce = Buffer.alloc(24);

/**
 * @external WritableStream
 * @see {@link https://nodejs.org/api/stream.html#stream_class_stream_writable}
 */

/**
 * 음성 패킷 데이터를 음성 연결로 보내는 클래스입니다.
 * ```js
 * // 다음으로 가져옵니다.
 * voiceChannel.join().then(connection => {
 *   // 파일 또는 스트림을 재생할 수 있습니다:
 *   const dispatcher = connection.play('/home/hydrabolt/audio.mp3');
 * });
 * ```
 * @implements {VolumeInterface}
 * @extends {WritableStream}
 */
class StreamDispatcher extends Writable {
  constructor(player, { seek = 0, volume = 1, fec, plp, bitrate = 96, highWaterMark = 12 } = {}, streams) {
    const streamOptions = { seek, volume, fec, plp, bitrate, highWaterMark };
    super(streamOptions);
    /**
     * 디스파처(dispatcher)를 관리하는 오디오 플레이어
     * @type {AudioPlayer}
     */
    this.player = player;
    this.streamOptions = streamOptions;
    this.streams = streams;
    this.streams.silence = new Silence();

    this._nonce = 0;
    this._nonceBuffer = Buffer.alloc(24);

    /**
     * 스트림이 일시 중지된 시간 (중지되지 않은 경우 null)
     * @type {?number}
     */
    this.pausedSince = null;
    this._writeCallback = null;

    /**
     * 이 디스파처(dispatcher)를 제어하는 브로드캐스트 (존재하는 경우)
     * @type {?VoiceBroadcast}
     */
    this.broadcast = this.streams.broadcast;

    this._pausedTime = 0;
    this._silentPausedTime = 0;
    this.count = 0;

    this.on('finish', () => {
      this._cleanup();
      this._setSpeaking(0);
    });

    this.setVolume(volume);
    this.setBitrate(bitrate);
    if (typeof fec !== 'undefined') this.setFEC(fec);
    if (typeof plp !== 'undefined') this.setPLP(plp);

    const streamError = (type, err) => {
      /**
       * 발송인에게 오류가 발생할 때 실행됩니다.
       * @event StreamDispatcher#error
       */
      if (type && err) {
        err.message = `${type} stream: ${err.message}`;
        this.emit(this.player.dispatcher === this ? 'error' : 'debug', err);
      }
      this.destroy();
    };

    this.on('error', () => streamError());
    if (this.streams.input) this.streams.input.on('error', err => streamError('input', err));
    if (this.streams.ffmpeg) this.streams.ffmpeg.on('error', err => streamError('ffmpeg', err));
    if (this.streams.opus) this.streams.opus.on('error', err => streamError('opus', err));
    if (this.streams.volume) this.streams.volume.on('error', err => streamError('volume', err));
  }

  get _sdata() {
    return this.player.streamingData;
  }

  _write(chunk, enc, done) {
    if (!this.startTime) {
      /**
       * 스트림이 재생되기 시작하면 실행됩니다.
       * @event StreamDispatcher#start
       */
      this.emit('start');
      this.startTime = Date.now();
    }
    this._playChunk(chunk);
    this._step(done);
  }

  _destroy(err, cb) {
    this._cleanup();
    super._destroy(err, cb);
  }

  _cleanup() {
    if (this.player.dispatcher === this) this.player.dispatcher = null;
    const { streams } = this;
    if (streams.broadcast) streams.broadcast.delete(this);
    if (streams.opus) streams.opus.destroy();
    if (streams.ffmpeg) streams.ffmpeg.destroy();
  }

  /**
   * 재생을 일시 중지합니다.
   * @param {boolean} [silence=false] 오디오 결함을 방지하기 위해 일시 중지된 상태에서 고요함(silence)을 재생할지 여부
   */
  pause(silence = false) {
    if (this.paused) return;
    if (this.streams.opus) this.streams.opus.unpipe(this);
    if (silence) {
      this.streams.silence.pipe(this);
      this._silence = true;
    } else {
      this._setSpeaking(0);
    }
    this.pausedSince = Date.now();
  }

  /**
   * 재생 일시 정지 여부
   * @type {boolean}
   * @readonly
   */
  get paused() {
    return Boolean(this.pausedSince);
  }

  /**
   * 이 디스파처(dispatcher)가 일시 중지된 총 시간(밀리초)입니다.
   * @type {number}
   * @readonly
   */
  get pausedTime() {
    return this._silentPausedTime + this._pausedTime + (this.paused ? Date.now() - this.pausedSince : 0);
  }

  /**
   * 재생을 다시 시작합니다.
   */
  resume() {
    if (!this.pausedSince) return;
    this.streams.silence.unpipe(this);
    if (this.streams.opus) this.streams.opus.pipe(this);
    if (this._silence) {
      this._silentPausedTime += Date.now() - this.pausedSince;
      this._silence = false;
    } else {
      this._pausedTime += Date.now() - this.pausedSince;
    }
    this.pausedSince = null;
    if (typeof this._writeCallback === 'function') this._writeCallback();
  }

  /**
   * 이 디스파처(dispatcher)가 실제로 오디오를 재생한 시간 (밀리초)
   * @type {number}
   * @readonly
   */
  get streamTime() {
    return this.count * FRAME_LENGTH;
  }

  /**
   * 건너뛰기와 일시정지를 포함해, 디스파처(dispatcher)가 오디오를 재생한 시간 (밀리초)
   * @type {number}
   * @readonly
   */
  get totalStreamTime() {
    return Date.now() - this.startTime;
  }

  /**
   * 호환되는 Opus 스트림을 사용하는 경우 현재 Opus 인코더의 비트 전송률을 설정합니다.
   * @param {number} value 새 비트 전송률(kbps)
   * 'auto'로 설정하면 48kps가 사용됨
   * @returns {boolean} 비트 전송률이 성공적으로 변경되었는지 여부
   */
  setBitrate(value) {
    if (!value || !this.bitrateEditable) return false;
    const bitrate = value === 'auto' ? this.player.voiceConnection.channel.bitrate : value;
    this.streams.opus.setBitrate(bitrate * 1000);
    return true;
  }

  /**
   * 호환되는 Opus 스트림을 사용하는 경우 예상되는 패킷 손실 비율을 설정하세요.
   * @param {number} value 0에서 1사이
   * @returns {boolean} 성공적으로 설정된 경우 "true"를 반환합니다.
   */
  setPLP(value) {
    if (!this.bitrateEditable) return false;
    this.streams.opus.setPLP(value);
    return true;
  }

  /**
   * 호환되는 Opus 스트림을 사용하는 경우 오류 전달 보정을 활성화하거나 비활성화하세요.
   * @param {boolean} enabled true to enable
   * @returns {boolean} 성공적으로 설정된 경우 "true"를 반환합니다.
   */
  setFEC(enabled) {
    if (!this.bitrateEditable) return false;
    this.streams.opus.setFEC(enabled);
    return true;
  }

  _step(done) {
    this._writeCallback = () => {
      this._writeCallback = null;
      done();
    };
    if (!this.streams.broadcast) {
      const next = FRAME_LENGTH + this.count * FRAME_LENGTH - (Date.now() - this.startTime - this._pausedTime);
      setTimeout(() => {
        if ((!this.pausedSince || this._silence) && this._writeCallback) this._writeCallback();
      }, next);
    }
    this._sdata.sequence++;
    this._sdata.timestamp += TIMESTAMP_INC;
    if (this._sdata.sequence >= 2 ** 16) this._sdata.sequence = 0;
    if (this._sdata.timestamp >= 2 ** 32) this._sdata.timestamp = 0;
    this.count++;
  }

  _final(callback) {
    this._writeCallback = null;
    callback();
  }

  _playChunk(chunk) {
    if (this.player.dispatcher !== this || !this.player.voiceConnection.authentication.secret_key) return;
    this._sendPacket(this._createPacket(this._sdata.sequence, this._sdata.timestamp, chunk));
  }

  _encrypt(buffer) {
    const { secret_key, mode } = this.player.voiceConnection.authentication;
    if (mode === 'xsalsa20_poly1305_lite') {
      this._nonce++;
      if (this._nonce > MAX_NONCE_SIZE) this._nonce = 0;
      this._nonceBuffer.writeUInt32BE(this._nonce, 0);
      return [secretbox.methods.close(buffer, this._nonceBuffer, secret_key), this._nonceBuffer.slice(0, 4)];
    } else if (mode === 'xsalsa20_poly1305_suffix') {
      const random = secretbox.methods.random(24);
      return [secretbox.methods.close(buffer, random, secret_key), random];
    } else {
      return [secretbox.methods.close(buffer, nonce, secret_key)];
    }
  }

  _createPacket(sequence, timestamp, buffer) {
    const packetBuffer = Buffer.alloc(12);
    packetBuffer[0] = 0x80;
    packetBuffer[1] = 0x78;

    packetBuffer.writeUIntBE(sequence, 2, 2);
    packetBuffer.writeUIntBE(timestamp, 4, 4);
    packetBuffer.writeUIntBE(this.player.voiceConnection.authentication.ssrc, 8, 4);

    packetBuffer.copy(nonce, 0, 0, 12);
    return Buffer.concat([packetBuffer, ...this._encrypt(buffer)]);
  }

  _sendPacket(packet) {
    /**
     * 디스파처(dispatcher)에게 디버그 정보가 있을 때마다 방출됩니다.
     * @event StreamDispatcher#debug
     * @param {string} info The debug info
     */
    this._setSpeaking(1);
    if (!this.player.voiceConnection.sockets.udp) {
      this.emit('debug', 'Failed to send a packet - no UDP socket');
      return;
    }
    this.player.voiceConnection.sockets.udp.send(packet).catch(e => {
      this._setSpeaking(0);
      this.emit('debug', `Failed to send a packet - ${e}`);
    });
  }

  _setSpeaking(value) {
    if (typeof this.player.voiceConnection !== 'undefined') {
      this.player.voiceConnection.setSpeaking(value);
    }
    /**
     * 디스파처(dispatcher)가 말하기를 시작/중지할 때 실행됩니다.
     * @event StreamDispatcher#speaking
     * @param {boolean} value 디스파처(dispatcher)가 말하고 있는지 여부
     */
    this.emit('speaking', value);
  }

  get volumeEditable() {
    return Boolean(this.streams.volume);
  }

  /**
   * 이 스트림의 Opus 비트 전송률을 편집할 수 있는지 여부를 나타냅니다.
   * @type {boolean}
   * @readonly
   */
  get bitrateEditable() {
    return this.streams.opus && this.streams.opus.setBitrate;
  }

  // 볼륨
  get volume() {
    return this.streams.volume ? this.streams.volume.volume : 1;
  }

  setVolume(value) {
    if (!this.streams.volume) return false;
    /**
     * 이 디스파처(dispatcher)의 볼륨이 변경될 때 실행됩니다.
     * @event StreamDispatcher#volumeChange
     * @param {number} oldVolume 업데이트 이전의 볼륨
     * @param {number} newVolume 업데이트 이후의 볼륨
     */
    this.emit('volumeChange', this.volume, value);
    this.streams.volume.setVolume(value);
    return true;
  }

  // Volume stubs for docs
  /* eslint-disable no-empty-function*/
  get volumeDecibels() {}
  get volumeLogarithmic() {}
  setVolumeDecibels() {}
  setVolumeLogarithmic() {}
}

VolumeInterface.applyToClass(StreamDispatcher);

module.exports = StreamDispatcher;

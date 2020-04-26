'use strict';

const EventEmitter = require('events');
const prism = require('prism-media');
const PacketHandler = require('./PacketHandler');
const { Error } = require('../../../errors');

/**
 * 음성 연결에서 오디오 패킷 수신합니다.
 * @example
 * const receiver = connection.createReceiver();
 * // OpusStream은 읽기 쉬운 스트림이다. 여러분이 원한다면 음성 채널로 다시 재생할 수 있습니다.
 * const opusStream = receiver.createStream(user);
 */
class VoiceReceiver extends EventEmitter {
  constructor(connection) {
    super();
    this.connection = connection;
    this.packets = new PacketHandler(this);
    /**
     * 경고가 있는 경우 실행됩니다.
     * @event VoiceReceiver#debug
     * @param {Error|string} error 디버깅을 위한 에러 혹은 메세지
     */
    this.packets.on('error', err => this.emit('debug', err));
  }

  /**
   * `VoiceReceiver#createStream`에 대한 옵션이 전달되었습니다.
   * @typedef {Object} ReceiveStreamOptions
   * @property {string} [mode='opus'] 오디오 출력 모드. 이 기본값은 opus로, 즉 discord.js가 디코딩되지 않음을 의미합니다.
   * 당신에 대한 패킷. 스트림의 출력이 16비트 작은 endian 스테레오가 되도록 이것을 'pcm'로 설정할 수 있다.
   * @property {string} [end='silence'] When the stream should be destroyed. If `silence`, this will be when the user
   * stops talking. Otherwise, if `manual`, this should be handled by you.
   */

  /**
   *"새 오디오 수신 스트림을 생성합니다. 유저를 위한 스트림이 이미 존재하는 경우, 
   * 새로 생성하지 않고 존재하던 스트림을 반환합니다.
   * @param {UserResolvable} user The user to start listening to.
   * @param {ReceiveStreamOptions} options Options.
   * @returns {ReadableStream}
   */
  createStream(user, { mode = 'opus', end = 'silence' } = {}) {
    user = this.connection.client.users.resolve(user);
    if (!user) throw new Error('VOICE_USER_MISSING');
    const stream = this.packets.makeStream(user.id, end);
    if (mode === 'pcm') {
      const decoder = new prism.opus.Decoder({ channels: 2, rate: 48000, frameSize: 960 });
      stream.pipe(decoder);
      return decoder;
    }
    return stream;
  }
}

module.exports = VoiceReceiver;

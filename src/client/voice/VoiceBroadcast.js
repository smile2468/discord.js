'use strict';

const EventEmitter = require('events');
const BroadcastAudioPlayer = require('./player/BroadcastAudioPlayer');
const PlayInterface = require('./util/PlayInterface');
const { Events } = require('../../util/Constants');

/**
 * 음성 브로드케스트의 스트림의 공유의 향상된 효율성을 위해, 여러 음성 연결을 통해 재생할 수 있습니다.
 *
 * 예시:
 * ```js
 * const broadcast = client.voice.createBroadcast();
 * broadcast.play('./music.mp3');
 * // 클라이언트가 있는 모든 음성 연결이 "music.mp3"를 재생합니다.
 * for (const connection of client.voice.connections.values()) {
 *   connection.play(broadcast);
 * }
 * ```
 * @implements {PlayInterface}
 * @extends {EventEmitter}
 */
class VoiceBroadcast extends EventEmitter {
  constructor(client) {
    super();
    /**
     * 브로드케스트를 생성한 클라이언트
     * @type {Client}
     */
    this.client = client;
    /**
     * 해당 브로드케스트를 연결한(subscribed) 스트림 디스파처들(StreamDispatchers)
     * @type {StreamDispatcher[]}
     */
    this.subscribers = [];
    this.player = new BroadcastAudioPlayer(this);
  }

  /**
   * 현재 마스터 디스파처 (존재하는 경우)
   * 해당 디스파처에 연결된(subscribed) 디스파처들에서 재생되는 모든 것을 제어합니다.
   * @type {?BroadcastDispatcher}
   * @readonly
   */
  get dispatcher() {
    return this.player.dispatcher;
  }

  /**
   * 오디오 리소스를 재생합니다.
   * @param {ReadableStream|string} resource 플레이할 리소스
   * @param {StreamOptions} [options] 재생 옵션
   * @example
   * // 로컬 파일을 재생합니다.
   * broadcast.play('/home/hydrabolt/audio.mp3', { volume: 0.5 });
   * @example
   * // ReadableStream 을 재생합니다.
   * broadcast.play(ytdl('https://www.youtube.com/watch?v=ZlAU_w7-Xp8', { filter: 'audioonly' }));
   * @example
   * // 다른 프로토콜을 사용합니다: https://ffmpeg.org/ffmpeg-protocols.html
   * broadcast.play('http://www.sample-videos.com/audio/mp3/wave.mp3');
   * @returns {BroadcastDispatcher}
   */
  play() {
    return null;
  }

  /**
   * 브로드케스트를 종료하고, 연결한(subscribed) 모든 채널의 연결 해제하고, 브로드캐스트를 삭제합니다.
   * Ends the broadcast, unsubscribing all subscribed channels and deleting the broadcast
   */
  end() {
    for (const dispatcher of this.subscribers) this.delete(dispatcher);
    const index = this.client.voice.broadcasts.indexOf(this);
    if (index !== -1) this.client.voice.broadcasts.splice(index, 1);
  }

  add(dispatcher) {
    const index = this.subscribers.indexOf(dispatcher);
    if (index === -1) {
      this.subscribers.push(dispatcher);
      /**
       * 스트림 디스파처가 브로드케스트를 연결(subscribe)하면 실행됩니다.
       * @event VoiceBroadcast#subscribe
       * @param {StreamDispatcher} subscriber 연결한 디스파처
       */
      this.emit(Events.VOICE_BROADCAST_SUBSCRIBE, dispatcher);
      return true;
    } else {
      return false;
    }
  }

  delete(dispatcher) {
    const index = this.subscribers.indexOf(dispatcher);
    if (index !== -1) {
      this.subscribers.splice(index, 1);
      dispatcher.destroy();
      /**
       * 스트림 디스파처가 브로드캐스트에서 연결 해제(unsubscribe)할 때 실행됩니다.
       * @event VoiceBroadcast#unsubscribe
       * @param {StreamDispatcher} dispatcher The unsubscribed dispatcher
       */
      this.emit(Events.VOICE_BROADCAST_UNSUBSCRIBE, dispatcher);
      return true;
    }
    return false;
  }
}

PlayInterface.applyToClass(VoiceBroadcast);

module.exports = VoiceBroadcast;

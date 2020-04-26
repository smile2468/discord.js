'use strict';

const EventEmitter = require('events');
const WebSocket = require('../../../WebSocket');
const { Error } = require('../../../errors');
const { OPCodes, VoiceOPCodes } = require('../../../util/Constants');

/**
 * 음성 연결의 웹소켓을 나타냅니다.
 * @extends {EventEmitter}
 * @private
 */
class VoiceWebSocket extends EventEmitter {
  constructor(connection) {
    super();
    /**
     * 이 웹소켓이 제공하는 음성 연결
     * @type {VoiceConnection}
     */
    this.connection = connection;

    /**
     * 연결 시도 횟수
     * @type {number}
     */
    this.attempts = 0;

    this.dead = false;
    this.connection.on('closing', this.shutdown.bind(this));
  }

  /**
   * 해당 음성 웹소켓의 클라이언트
   * @type {Client}
   * @readonly
   */
  get client() {
    return this.connection.client;
  }

  shutdown() {
    this.emit('debug', `[WS] shutdown requested`);
    this.dead = true;
    this.reset();
  }

  /**
   * 현재 웹소켓을 리셋합니다.
   */
  reset() {
    this.emit('debug', `[WS] reset requested`);
    if (this.ws) {
      if (this.ws.readyState !== WebSocket.CLOSED) this.ws.close();
      this.ws = null;
    }
    this.clearHeartbeat();
  }

  /**
   * 음성 웹소켓 길드에 연결을 시도합니다.
   */
  connect() {
    this.emit('debug', `[WS] connect requested`);
    if (this.dead) return;
    if (this.ws) this.reset();
    if (this.attempts >= 5) {
      this.emit('debug', new Error('VOICE_CONNECTION_ATTEMPTS_EXCEEDED', this.attempts));
      return;
    }

    this.attempts++;

    /**
     * 음성 웹소켓 서버에 사용되는 실제 웹소켓
     * @type {WebSocket}
     */
    this.ws = WebSocket.create(`wss://${this.connection.authentication.endpoint}/`, { v: 4 });
    this.emit('debug', `[WS] connecting, ${this.attempts} attempts, ${this.ws.url}`);
    this.ws.onopen = this.onOpen.bind(this);
    this.ws.onmessage = this.onMessage.bind(this);
    this.ws.onclose = this.onClose.bind(this);
    this.ws.onerror = this.onError.bind(this);
  }

  /**
   * 열려 있는 경우 웹소켓으로 데이터를 보냅니다.
   * @param {string} data 웹소켓으로 전송할 데이터
   * @returns {Promise<string>}
   */
  send(data) {
    this.emit('debug', `[WS] >> ${data}`);
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error('WS_NOT_OPEN', data);
      this.ws.send(data, null, error => {
        if (error) reject(error);
        else resolve(data);
      });
    });
  }

  /**
   * JSON.stringify를 하고 패킷을 웹소켓 길드로 보냅니다.
   * @param {Object} packet 전송할 패킷
   * @returns {Promise<string>}
   */
  sendPacket(packet) {
    try {
      packet = JSON.stringify(packet);
    } catch (error) {
      return Promise.reject(error);
    }
    return this.send(packet);
  }

  /**
   * 웹소켓이 열릴 때 실행됩니다.
   */
  onOpen() {
    this.emit('debug', `[WS] opened at gateway ${this.connection.authentication.endpoint}`);
    this.sendPacket({
      op: OPCodes.DISPATCH,
      d: {
        server_id: this.connection.channel.guild.id,
        user_id: this.client.user.id,
        token: this.connection.authentication.token,
        session_id: this.connection.authentication.sessionID,
      },
    }).catch(() => {
      this.emit('error', new Error('VOICE_JOIN_SOCKET_CLOSED'));
    });
  }

  /**
   * 웹소켓이 메세지를 감지할 때, 실행됩니다.
   * @param {MessageEvent} event 수신된 메세지 이벤트
   * @returns {void}
   */
  onMessage(event) {
    try {
      return this.onPacket(WebSocket.unpack(event.data, 'json'));
    } catch (error) {
      return this.onError(error);
    }
  }

  /**
   * 웹소켓 길드에 대한 연결이 끊길 때 실행됩니다.
   */
  onClose() {
    this.emit('debug', `[WS] closed`);
    if (!this.dead) this.client.setTimeout(this.connect.bind(this), this.attempts * 1000);
  }

  /**
   * 웹소켓 에러가 발생했을 때 실행됩니다.
   * @param {Error} error 발생한 에러
   */
  onError(error) {
    this.emit('debug', `[WS] Error: ${error}`);
    this.emit('error', error);
  }

  /**
   * 웹소켓에 유효한 패킷이 수신될 때마다 호출됩니다.
   * @param {Object} packet 수신된 패킷
   */
  onPacket(packet) {
    this.emit('debug', `[WS] << ${JSON.stringify(packet)}`);
    switch (packet.op) {
      case VoiceOPCodes.HELLO:
        this.setHeartbeat(packet.d.heartbeat_interval);
        break;
      case VoiceOPCodes.READY:
        /**
         * 웹소켓이 준비 패킷을 수신하면 실행됩니다.
         * @param {Object} packet 수신된 패킷
         * @event VoiceWebSocket#ready
         */
        this.emit('ready', packet.d);
        break;
      /* eslint-disable no-case-declarations */
      case VoiceOPCodes.SESSION_DESCRIPTION:
        packet.d.secret_key = new Uint8Array(packet.d.secret_key);
        /**
         * 음성 웹소켓이 이 음성 세션에 대한 설명을 수신하면 실행됩니다.
         * @param {Object} packet The received packet
         * @event VoiceWebSocket#sessionDescription
         */
        this.emit('sessionDescription', packet.d);
        break;
      case VoiceOPCodes.CLIENT_CONNECT:
        this.connection.ssrcMap.set(+packet.d.audio_ssrc, packet.d.user_id);
        break;
      case VoiceOPCodes.CLIENT_DISCONNECT:
        const streamInfo = this.connection.receiver && this.connection.receiver.packets.streams.get(packet.d.user_id);
        if (streamInfo) {
          this.connection.receiver.packets.streams.delete(packet.d.user_id);
          streamInfo.stream.push(null);
        }
        break;
      case VoiceOPCodes.SPEAKING:
        /**
         * 말하기 패킷이 수신될 때마다 실행됩니다.
         * @param {Object} data
         * @event VoiceWebSocket#startSpeaking
         */
        this.emit('startSpeaking', packet.d);
        break;
      default:
        /**
         * 핸들되지 않은 패킷이 수신될 때 실행됩니다.
         * @param {Object} packet
         * @event VoiceWebSocket#unknownPacket
         */
        this.emit('unknownPacket', packet);
        break;
    }
  }

  /**
   * 웹소켓이 하트비트 패킷을 보낼 간격을 설정합니다.
   * @param {number} interval 하트비트 패킷을 보내는 간격
   */
  setHeartbeat(interval) {
    if (!interval || isNaN(interval)) {
      this.onError(new Error('VOICE_INVALID_HEARTBEAT'));
      return;
    }
    if (this.heartbeatInterval) {
      /**
       *음성 웹소켓이 치명적이지 않은 오류가 발생할 때마다 실행됩니다.
       * @param {string} warn 경고
       * @event VoiceWebSocket#warn
       */
      this.emit('warn', 'A voice heartbeat interval is being overwritten');
      this.client.clearInterval(this.heartbeatInterval);
    }
    this.heartbeatInterval = this.client.setInterval(this.sendHeartbeat.bind(this), interval);
  }

  /**
   * 하트비트 간격 존재하는 경우을 초기화합니다.
   */
  clearHeartbeat() {
    if (!this.heartbeatInterval) {
      this.emit('warn', 'Tried to clear a heartbeat interval that does not exist');
      return;
    }
    this.client.clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
  }

  /**
   * 하트비트 패킷을 전송합니다.
   */
  sendHeartbeat() {
    this.sendPacket({ op: VoiceOPCodes.HEARTBEAT, d: Math.floor(Math.random() * 10e10) }).catch(() => {
      this.emit('warn', 'Tried to send heartbeat, but connection is not open');
      this.clearHeartbeat();
    });
  }
}

module.exports = VoiceWebSocket;

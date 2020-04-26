'use strict';

const EventEmitter = require('events');
const WebSocket = require('../../WebSocket');
const { browser, Status, Events, ShardEvents, OPCodes, WSEvents } = require('../../util/Constants');

const STATUS_KEYS = Object.keys(Status);
const CONNECTION_STATE = Object.keys(WebSocket.WebSocket);

let zlib;

if (!browser) {
  try {
    zlib = require('zlib-sync');
  } catch {} // eslint-disable-line no-empty
}

/**
 * 샤드의 웹소켓 연결을 나타냅니다.
 */
class WebSocketShard extends EventEmitter {
  constructor(manager, id) {
    super();

    /**
     * "샤드의 웹소켓 매니저
     * @type {WebSocketManager}
     */
    this.manager = manager;

    /**
     * 샤드의 ID
     * @type {number}
     */
    this.id = id;

    /**
     * 샤드의 현재상태
     * @type {Status}
     */
    this.status = Status.IDLE;

    /**
     * 샤드의 현재 시퀀스
     * @type {number}
     * @private
     */
    this.sequence = -1;

    /**
     * 닫힌 뒤 샤드의 시퀀스
     * @type {number}
     * @private
     */
    this.closeSequence = 0;

    /**
     * 샤드의 현재 세션 ID
     * @type {string}
     * @private
     */
    this.sessionID = undefined;

    /**
     * 샤드의 이전 하트비트 지연시간
     * @type {number}
     */
    this.ping = -1;

    /**
     * 지연시간이 마지막으로 전송된 시간 (타임 스탬프).
     * @type {number}
     * @private
     */
    this.lastPingTimestamp = -1;

    /**
     *  하트 비트 ACK를 다시받은 경우. 좀비 연결을 식별하는 데 사용
     * @type {boolean}
     * @private
     */
    this.lastHeartbeatAcked = true;

    /**
     * 레이트리밋 대기열 및 메타 데이터를 포함합니다
     * @type {Object}
     * @private
     */
    Object.defineProperty(this, 'ratelimit', {
      value: {
        queue: [],
        total: 120,
        remaining: 120,
        time: 60e3,
        timer: null,
      },
    });

    /**
     * 현재 샤드의 웹소켓 연결
     * @type {?WebSocket}
     * @private
     */
    Object.defineProperty(this, 'connection', { value: null, writable: true });

    /**
     * @external Inflate
     * @see {@link https://www.npmjs.com/package/zlib-sync}
     */

    /**
     * 사용될 압축
     * @type {?Inflate}
     * @private
     */
    Object.defineProperty(this, 'inflate', { value: null, writable: true });

    /**
     * HELLO 타임아웃
     * @type {?NodeJS.Timer}
     * @private
     */
    Object.defineProperty(this, 'helloTimeout', { value: undefined, writable: true });

    /**
     * 매니저가 샤드에 이벤트 핸들러를 사용했는지 여부
     * @type {boolean}
     * @private
     */
    Object.defineProperty(this, 'eventsAttached', { value: false, writable: true });

    /**
     * 샤드가 수신 할 것으로 예상하는 길드 ID 셋
     * @type {?Set<string>}
     * @private
     */
    Object.defineProperty(this, 'expectedGuilds', { value: undefined, writable: true });

    /**
     * 준비 시간초과
     * @type {?NodeJS.Timer}
     * @private
     */
    Object.defineProperty(this, 'readyTimeout', { value: undefined, writable: true });

    /**
     * 웹소켓 연결이 열린 시간
     * @type {number}
     * @private
     */
    Object.defineProperty(this, 'connectedAt', { value: 0, writable: true });
  }

  /**
   * 디버그 이벤트가 발생하면, 실행됩니다.
   * @param {string} message 디버그 메세지
   * @private
   */
  debug(message) {
    this.manager.debug(message, this);
  }

  /**
   * 샤드를 게이트웨이에 연결합니다.
   * @private
   * @returns {Promise<void>} 샤드가 성공적으로 켜질 경우, 리졸브하고
   * 연결할 수 없을 때는 리젝트하는 프로미스(Promise)
   */
  connect() {
    const { gateway, client } = this.manager;

    if (this.connection && this.connection.readyState === WebSocket.OPEN && this.status === Status.READY) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.removeListener(ShardEvents.CLOSE, onClose);
        this.removeListener(ShardEvents.READY, onReady);
        this.removeListener(ShardEvents.RESUMED, onResumed);
        this.removeListener(ShardEvents.INVALID_SESSION, onInvalidOrDestroyed);
        this.removeListener(ShardEvents.DESTROYED, onInvalidOrDestroyed);
      };

      const onReady = () => {
        cleanup();
        resolve();
      };

      const onResumed = () => {
        cleanup();
        resolve();
      };

      const onClose = event => {
        cleanup();
        reject(event);
      };

      const onInvalidOrDestroyed = () => {
        cleanup();
        // eslint-disable-next-line prefer-promise-reject-errors
        reject();
      };

      this.once(ShardEvents.READY, onReady);
      this.once(ShardEvents.RESUMED, onResumed);
      this.once(ShardEvents.CLOSE, onClose);
      this.once(ShardEvents.INVALID_SESSION, onInvalidOrDestroyed);
      this.once(ShardEvents.DESTROYED, onInvalidOrDestroyed);

      if (this.connection && this.connection.readyState === WebSocket.OPEN) {
        this.debug('An open connection was found, attempting an immediate identify.');
        this.identify();
        return;
      }

      if (this.connection) {
        this.debug(`A connection object was found. Cleaning up before continuing.
    State: ${CONNECTION_STATE[this.connection.readyState]}`);
        this.destroy({ emit: false });
      }

      const wsQuery = { v: client.options.ws.version };

      if (zlib) {
        this.inflate = new zlib.Inflate({
          chunkSize: 65535,
          flush: zlib.Z_SYNC_FLUSH,
          to: WebSocket.encoding === 'json' ? 'string' : '',
        });
        wsQuery.compress = 'zlib-stream';
      }

      this.debug(
        `[CONNECT]
    Gateway    : ${gateway}
    Version    : ${client.options.ws.version}
    Encoding   : ${WebSocket.encoding}
    Compression: ${zlib ? 'zlib-stream' : 'none'}`,
      );

      this.status = this.status === Status.DISCONNECTED ? Status.RECONNECTING : Status.CONNECTING;
      this.setHelloTimeout();

      this.connectedAt = Date.now();

      const ws = (this.connection = WebSocket.create(gateway, wsQuery));
      ws.onopen = this.onOpen.bind(this);
      ws.onmessage = this.onMessage.bind(this);
      ws.onerror = this.onError.bind(this);
      ws.onclose = this.onClose.bind(this);
    });
  }

  /**
   * 연결이 게이트웨이를 열 때마다 실행됩니다.
   * @private
   */
  onOpen() {
    this.debug(`[CONNECTED] ${this.connection.url} in ${Date.now() - this.connectedAt}ms`);
    this.status = Status.NEARLY;
  }

  /**
   * 메세지가 수신될 때 실행됩니다.
   * @param {MessageEvent} event 수신된 이벤트
   * @private
   */
  onMessage({ data }) {
    let raw;
    if (data instanceof ArrayBuffer) data = new Uint8Array(data);
    if (zlib) {
      const l = data.length;
      const flush =
        l >= 4 && data[l - 4] === 0x00 && data[l - 3] === 0x00 && data[l - 2] === 0xff && data[l - 1] === 0xff;

      this.inflate.push(data, flush && zlib.Z_SYNC_FLUSH);
      if (!flush) return;
      raw = this.inflate.result;
    } else {
      raw = data;
    }
    let packet;
    try {
      packet = WebSocket.unpack(raw);
      this.manager.client.emit(Events.RAW, packet, this.id);
      if (packet.op === OPCodes.DISPATCH) this.manager.emit(packet.t, packet.d, this.id);
    } catch (err) {
      this.manager.client.emit(Events.SHARD_ERROR, err, this.id);
      return;
    }
    this.onPacket(packet);
  }

  /**
   * 웹소켓에 에러가 발생할 경우 실행됩니다.
   * @param {ErrorEvent} event 발생한 에러
   * @private
   */
  onError(event) {
    const error = event && event.error ? event.error : event;
    if (!error) return;

    /**
     * 샤드의 웹소켓에 연결 오류가 발생할 때마다 실행됩니다.
     * @event Client#shardError
     * @param {Error} error 발생한 에러
     * @param {number} shardID 에러가 발생한 샤드
     */
    this.manager.client.emit(Events.SHARD_ERROR, error, this.id);
  }

  /**
   * @external CloseEvent
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent}
   */

  /**
   * @external ErrorEvent
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ErrorEvent}
   */

  /**
   * @external MessageEvent
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent}
   */

  /**
   * 게이트웨이에 대한 연결이 닫힐 때마다 실행됩니다.
   * @param {CloseEvent} event 수신된 닫기 이벤트
   * @private
   */
  onClose(event) {
    if (this.sequence !== -1) this.closeSequence = this.sequence;
    this.sequence = -1;

    this.debug(`[CLOSE]
    Event Code: ${event.code}
    Clean     : ${event.wasClean}
    Reason    : ${event.reason || 'No reason received'}`);

    this.setHeartbeatTimer(-1);
    this.setHelloTimeout(-1);
    // If we still have a connection object, clean up its listeners
    if (this.connection) this._cleanupConnection();

    this.status = Status.DISCONNECTED;

    /**
     * 샤드의 웹소켓이 닫힐 때 실행됩니다.
     * @private
     * @event WebSocketShard#close
     * @param {CloseEvent} event 수신된 이벤트
     */
    this.emit(ShardEvents.CLOSE, event);
  }

  /**
   * 패킷이 수신될 때 실행됩니다.
   * @param {Object} packet 수신된 패킷
   * @private
   */
  onPacket(packet) {
    if (!packet) {
      this.debug(`Received broken packet: '${packet}'.`);
      return;
    }

    switch (packet.t) {
      case WSEvents.READY:
        /**
         * 샤드가 READY 페이로드 수신 후 길드를 대기 중일 때 실행됩니다.
         * @event WebSocketShard#ready
         */
        this.emit(ShardEvents.READY);

        this.sessionID = packet.d.session_id;
        this.expectedGuilds = new Set(packet.d.guilds.map(d => d.id));
        this.status = Status.WAITING_FOR_GUILDS;
        this.debug(`[READY] Session ${this.sessionID}.`);
        this.lastHeartbeatAcked = true;
        this.sendHeartbeat('ReadyHeartbeat');
        break;
      case WSEvents.RESUMED: {
        /**
         * 샤드가 다시 성공적으로 재개될 때 실행됩니다.
         * @event WebSocketShard#resumed
         */
        this.emit(ShardEvents.RESUMED);

        this.status = Status.READY;
        const replayed = packet.s - this.closeSequence;
        this.debug(`[RESUMED] Session ${this.sessionID} | Replayed ${replayed} events.`);
        this.lastHeartbeatAcked = true;
        this.sendHeartbeat('ResumeHeartbeat');
        break;
      }
    }

    if (packet.s > this.sequence) this.sequence = packet.s;

    switch (packet.op) {
      case OPCodes.HELLO:
        this.setHelloTimeout(-1);
        this.setHeartbeatTimer(packet.d.heartbeat_interval);
        this.identify();
        break;
      case OPCodes.RECONNECT:
        this.debug('[RECONNECT] Discord asked us to reconnect');
        this.destroy({ closeCode: 4000 });
        break;
      case OPCodes.INVALID_SESSION:
        this.debug(`[INVALID SESSION] Resumable: ${packet.d}.`);
        // If we can resume the session, do so immediately
        if (packet.d) {
          this.identifyResume();
          return;
        }
        // Reset the sequence
        this.sequence = -1;
        // Reset the session ID as it's invalid
        this.sessionID = undefined;
        // Set the status to reconnecting
        this.status = Status.RECONNECTING;
        // Finally, emit the INVALID_SESSION event
        this.emit(ShardEvents.INVALID_SESSION);
        break;
      case OPCodes.HEARTBEAT_ACK:
        this.ackHeartbeat();
        break;
      case OPCodes.HEARTBEAT:
        this.sendHeartbeat('HeartbeatRequest', true);
        break;
      default:
        this.manager.handlePacket(packet, this);
        if (this.status === Status.WAITING_FOR_GUILDS && packet.t === WSEvents.GUILD_CREATE) {
          this.expectedGuilds.delete(packet.d.id);
          this.checkReady();
        }
    }
  }

  /**
   * 샤드가 준비됬다고 표시될 수 있는지 확인합니다.
   * @private
   */
  checkReady() {
    // Step 0. Clear the ready timeout, if it exists
    if (this.readyTimeout) {
      this.manager.client.clearTimeout(this.readyTimeout);
      this.readyTimeout = undefined;
    }
    // Step 1. If we don't have any other guilds pending, we are ready
    if (!this.expectedGuilds.size) {
      this.debug('Shard received all its guilds. Marking as fully ready.');
      this.status = Status.READY;

      /**
       * 샤드가 완전히 준비되었을 때 실행됩니다.
       * 이 이벤트는 다음과 같은 경우에 발생합니다.
       * * 모든 길드가 이 샤드에 의해 수신될 때
       * * 준비 시간 초과가 만료되었으며 일부 길드는 사용할 수 없음
       * @event WebSocketShard#allReady
       * @param {?Set<string>} unavailableGuilds 복구중인 길드 셋 (존재하는 경우)
       */
      this.emit(ShardEvents.ALL_READY);
      return;
    }
    // Step 2. Create a 15s timeout that will mark the shard as ready if there are still unavailable guilds
    this.readyTimeout = this.manager.client.setTimeout(() => {
      this.debug(`Shard did not receive any more guild packets in 15 seconds.
  Unavailable guild count: ${this.expectedGuilds.size}`);

      this.readyTimeout = undefined;

      this.status = Status.READY;

      this.emit(ShardEvents.ALL_READY, this.expectedGuilds);
    }, 15000);
  }

  /**
   * Sets the HELLO packet timeout.
   * @param {number} [time] If set to -1, it will clear the hello timeout timeout
   * @private
   */
  setHelloTimeout(time) {
    if (time === -1) {
      if (this.helloTimeout) {
        this.debug('Clearing the HELLO timeout.');
        this.manager.client.clearTimeout(this.helloTimeout);
        this.helloTimeout = undefined;
      }
      return;
    }
    this.debug('Setting a HELLO timeout for 20s.');
    this.helloTimeout = this.manager.client.setTimeout(() => {
      this.debug('Did not receive HELLO in time. Destroying and connecting again.');
      this.destroy({ reset: true, closeCode: 4009 });
    }, 20000);
  }

  /**
   * 샤드의 하트비트 타이머를 설정합니다.
   * @param {number} time 간격을 지우는 경우 -1, 다른 숫자는 간격을 설정합니다.
   * @private
   */
  setHeartbeatTimer(time) {
    if (time === -1) {
      if (this.heartbeatInterval) {
        this.debug('Clearing the heartbeat interval.');
        this.manager.client.clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = undefined;
      }
      return;
    }
    this.debug(`Setting a heartbeat interval for ${time}ms.`);
    // Sanity checks
    if (this.heartbeatInterval) this.manager.client.clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = this.manager.client.setInterval(() => this.sendHeartbeat(), time);
  }

  /**
   * 웹소켓에 하트비트를 보냅니다.
   * 만약 이전에 이 샤드가 하트비트를 받지 못했다면, 삭제하고 재연결합니다.
   * @param {string} [tag='HeartbeatTimer'] 이 하트비트를 보낸 원인
   * @param {boolean} [ignoreHeartbeatAck] 하트비트를 강제로 보내야하는지 여부
   * @private
   */
  sendHeartbeat(
    tag = 'HeartbeatTimer',
    ignoreHeartbeatAck = [Status.WAITING_FOR_GUILDS, Status.IDENTIFYING, Status.RESUMING].includes(this.status),
  ) {
    if (ignoreHeartbeatAck && !this.lastHeartbeatAcked) {
      this.debug(`[${tag}] Didn't process heartbeat ack yet but we are still connected. Sending one now.`);
    } else if (!this.lastHeartbeatAcked) {
      this.debug(
        `[${tag}] Didn't receive a heartbeat ack last time, assuming zombie connection. Destroying and reconnecting.
    Status          : ${STATUS_KEYS[this.status]}
    Sequence        : ${this.sequence}
    Connection State: ${this.connection ? CONNECTION_STATE[this.connection.readyState] : 'No Connection??'}`,
      );

      this.destroy({ closeCode: 4009, reset: true });
      return;
    }

    this.debug(`[${tag}] Sending a heartbeat.`);
    this.lastHeartbeatAcked = false;
    this.lastPingTimestamp = Date.now();
    this.send({ op: OPCodes.HEARTBEAT, d: this.sequence }, true);
  }

  /**
   * 심장 박동을 인정합니다.
   * @private
   */
  ackHeartbeat() {
    this.lastHeartbeatAcked = true;
    const latency = Date.now() - this.lastPingTimestamp;
    this.debug(`Heartbeat acknowledged, latency of ${latency}ms.`);
    this.ping = latency;
  }

  /**
   * 연결에서 클라이언트를 식별합니다.
   * @private
   * @returns {void}
   */
  identify() {
    return this.sessionID ? this.identifyResume() : this.identifyNew();
  }

  /**
   * 게이트웨이의 새 연결로 식별합니다.
   * @private
   */
  identifyNew() {
    const { client } = this.manager;
    if (!client.token) {
      this.debug('[IDENTIFY] No token available to identify a new session.');
      return;
    }

    this.status = Status.IDENTIFYING;

    // 식별 페이로드를 복제하고 토큰 및 샤드 정보를 할당합니다.
    const d = {
      ...client.options.ws,
      token: client.token,
      shard: [this.id, Number(client.options.shardCount)],
    };

    this.debug(`[IDENTIFY] Shard ${this.id}/${client.options.shardCount}`);
    this.send({ op: OPCodes.IDENTIFY, d }, true);
  }

  /**
   * 게이트웨이의 세션을 다시 시작합니다.
   * @private
   */
  identifyResume() {
    if (!this.sessionID) {
      this.debug('[RESUME] No session ID was present; identifying as a new session.');
      this.identifyNew();
      return;
    }

    this.status = Status.RESUMING;

    this.debug(`[RESUME] Session ${this.sessionID}, sequence ${this.closeSequence}`);

    const d = {
      token: this.manager.client.token,
      session_id: this.sessionID,
      seq: this.closeSequence,
    };

    this.send({ op: OPCodes.RESUME, d }, true);
  }

  /**
   * 게이트웨이로 보낼 대기열에 패킷을 추가합니다.
   * <warn>이 메서드를 사용한다면,
   * 모든 [페이로드](https://discordapp.com/developers/docs/topics/gateway#commands-and-events-gateway-commands)를 포함하도록 합니다.
   * 만약 당신이 무엇을 하고 있는지 모른다면 이 메서드를 사용하지 마세요.</warn>
   * @param {Object} data 전송할 전체 패킷
   * @param {boolean} [important=false] 이 패킷을 대기열에 먼저 추가해야 하는 여부
   */
  send(data, important = false) {
    this.ratelimit.queue[important ? 'unshift' : 'push'](data);
    this.processQueue();
  }

  /**
   * 대기열을 무시하고 데이터를 보냅니다.
   * @param {Object} data 전송할 패킷
   * @returns {void}
   * @private
   */
  _send(data) {
    if (!this.connection || this.connection.readyState !== WebSocket.OPEN) {
      this.debug(`Tried to send packet '${JSON.stringify(data)}' but no WebSocket is available!`);
      this.destroy({ close: 4000 });
      return;
    }

    this.connection.send(WebSocket.pack(data), err => {
      if (err) this.manager.client.emit(Events.SHARD_ERROR, err, this.id);
    });
  }

  /**
   * 현재 웹소켓 대기열을 처리합니다.
   * @returns {void}
   * @private
   */
  processQueue() {
    if (this.ratelimit.remaining === 0) return;
    if (this.ratelimit.queue.length === 0) return;
    if (this.ratelimit.remaining === this.ratelimit.total) {
      this.ratelimit.timer = this.manager.client.setTimeout(() => {
        this.ratelimit.remaining = this.ratelimit.total;
        this.processQueue();
      }, this.ratelimit.time);
    }
    while (this.ratelimit.remaining > 0) {
      const item = this.ratelimit.queue.shift();
      if (!item) return;
      this._send(item);
      this.ratelimit.remaining--;
    }
  }

  /**
   * 이 샤드를 삭제하고 웹소켓 연결을 닫습니다.
   * @param {Object} [options={ closeCode: 1000, reset: false, emit: true, log: true }] Options for destroying the shard
   * @private
   */
  destroy({ closeCode = 1000, reset = false, emit = true, log = true } = {}) {
    if (log) {
      this.debug(`[DESTROY]
    Close Code    : ${closeCode}
    Reset         : ${reset}
    Emit DESTROYED: ${emit}`);
    }

    // Step 0: Remove all timers
    this.setHeartbeatTimer(-1);
    this.setHelloTimeout(-1);

    // Step 1: Close the WebSocket connection, if any, otherwise, emit DESTROYED
    if (this.connection) {
      // If the connection is currently opened, we will (hopefully) receive close
      if (this.connection.readyState === WebSocket.OPEN) {
        this.connection.close(closeCode);
      } else {
        // Connection is not OPEN
        this.debug(`WS State: ${CONNECTION_STATE[this.connection.readyState]}`);
        // Remove listeners from the connection
        this._cleanupConnection();
        // Attempt to close the connection just in case
        try {
          this.connection.close(closeCode);
        } catch {
          // No-op
        }
        // Emit the destroyed event if needed
        if (emit) this._emitDestroyed();
      }
    } else if (emit) {
      // We requested a destroy, but we had no connection. Emit destroyed
      this._emitDestroyed();
    }

    // Step 2: Null the connection object
    this.connection = null;

    // Step 3: Set the shard status to DISCONNECTED
    this.status = Status.DISCONNECTED;

    // Step 4: Cache the old sequence (use to attempt a resume)
    if (this.sequence !== -1) this.closeSequence = this.sequence;

    // Step 5: Reset the sequence and session ID if requested
    if (reset) {
      this.sequence = -1;
      this.sessionID = undefined;
    }

    // Step 6: reset the ratelimit data
    this.ratelimit.remaining = this.ratelimit.total;
    this.ratelimit.queue.length = 0;
    if (this.ratelimit.timer) {
      this.manager.client.clearTimeout(this.ratelimit.timer);
      this.ratelimit.timer = null;
    }
  }

  /**
   * 웹소켓 연결 리스너를 정리합니다.
   * @private
   */
  _cleanupConnection() {
    this.connection.onopen = this.connection.onclose = this.connection.onerror = this.connection.onmessage = null;
  }

  /**
   * DESTROYED 이벤트를 샤드에서 실행합니다.
   * @private
   */
  _emitDestroyed() {
    /**
     * 샤드가 파괴되었지만 WebSocket 연결이 존재하지 않을 때 실행됩니다.
     * @private
     * @event WebSocketShard#destroyed
     */
    this.emit(ShardEvents.DESTROYED);
  }
}

module.exports = WebSocketShard;

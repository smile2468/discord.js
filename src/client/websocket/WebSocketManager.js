'use strict';

const EventEmitter = require('events');
const WebSocketShard = require('./WebSocketShard');
const PacketHandlers = require('./handlers');
const { Error: DJSError } = require('../../errors');
const Collection = require('../../util/Collection');
const { Events, ShardEvents, Status, WSCodes, WSEvents } = require('../../util/Constants');
const Util = require('../../util/Util');

const BeforeReadyWhitelist = [
  WSEvents.READY,
  WSEvents.RESUMED,
  WSEvents.GUILD_CREATE,
  WSEvents.GUILD_DELETE,
  WSEvents.GUILD_MEMBERS_CHUNK,
  WSEvents.GUILD_MEMBER_ADD,
  WSEvents.GUILD_MEMBER_REMOVE,
];

const UNRECOVERABLE_CLOSE_CODES = Object.keys(WSCodes)
  .slice(1)
  .map(Number);
const UNRESUMABLE_CLOSE_CODES = [1000, 4006, 4007];

/**
 * 클라이언트의 웹소켓 매니저입니다.
 * <info>이 클래스는 raw dispatch 이벤트를 전달합니다.
 * 더 알아보고 싶으시다면 {@link https://discordapp.com/developers/docs/topics/gateway}를 읽어보세요.</info>
 * @extends EventEmitter
 */
class WebSocketManager extends EventEmitter {
  constructor(client) {
    super();

    /**
     * 이 웹소켓 매니저를 인스턴스화한 클라이언트
     * @type {Client}
     * @readonly
     * @name WebSocketManager#client
     */
    Object.defineProperty(this, 'client', { value: client });

    /**
     * 해당 매니저가 사용하는 게이트웨이
     * @type {?string}
     */
    this.gateway = undefined;

    /**
     * 매니저가 핸들하는 샤드의 개수
     * @private
     * @type {number}
     */
    this.totalShards = this.client.options.shards.length;

    /**
     * 매니저가 핸들하는 모든 샤드 모음
     * @type {Collection<number, WebSocketShard>}
     */
    this.shards = new Collection();

    /**
     * 연결하거나, 재연결해야하는 샤드의 배열
     * @type {Set<WebSocketShard>}
     * @private
     * @name WebSocketManager#shardQueue
     */
    Object.defineProperty(this, 'shardQueue', { value: new Set(), writable: true });

    /**
     * 이 웹소켓 매니저가 준비되기 전에 대기열에 있는 이벤트의 배열
     * @type {object[]}
     * @private
     * @name WebSocketManager#packetQueue
     */
    Object.defineProperty(this, 'packetQueue', { value: [] });

    /**
     * 웹소켓 매니저의 현재 상태
     * @type {number}
     */
    this.status = Status.IDLE;

    /**
     * 만약 매니저가 종료되었다면, 샤드가 다시 연결되는걸 방지할 수 있습니다.
     * @type {boolean}
     * @private
     */
    this.destroyed = false;

    /**
     * 이 매니저가 현재 하나 이상의 샤드에 다시 연결하는 경우
     * @type {boolean}
     * @private
     */
    this.reconnecting = false;

    /**
     * 클라이언트의 현재 세션 제한
     * @private
     * @type {?Object}
     * @prop {number} total 사용 가능한 총 개수
     * @prop {number} remaining 남은 개수
     * @prop {number} reset_after 제한이 재설정되는 시간 (밀리초)
     */
    this.sessionStartLimit = undefined;
  }

  /**
   * 웹소켓 샤드들의 평균 지연시간
   * @type {number}
   * @readonly
   */
  get ping() {
    const sum = this.shards.reduce((a, b) => a + b.ping, 0);
    return sum / this.shards.size;
  }

  /**
   * 디버그 메세지를 전송합니다.
   * @param {string} message 디버그 메세지
   * @param {?WebSocketShard} [shard] 이 메세지를 보낸 샤드(존재하는 경우)
   * @private
   */
  debug(message, shard) {
    this.client.emit(Events.DEBUG, `[WS => ${shard ? `Shard ${shard.id}` : 'Manager'}] ${message}`);
  }

  /**
   * 해당 매니저를 게이트웨이에 연결합니다.
   * @private
   */
  async connect() {
    const invalidToken = new DJSError(WSCodes[4004]);
    const {
      url: gatewayURL,
      shards: recommendedShards,
      session_start_limit: sessionStartLimit,
    } = await this.client.api.gateway.bot.get().catch(error => {
      throw error.httpStatus === 401 ? invalidToken : error;
    });

    this.sessionStartLimit = sessionStartLimit;

    const { total, remaining, reset_after } = sessionStartLimit;

    this.debug(`Fetched Gateway Information
    URL: ${gatewayURL}
    Recommended Shards: ${recommendedShards}`);

    this.debug(`Session Limit Information
    Total: ${total}
    Remaining: ${remaining}`);

    this.gateway = `${gatewayURL}/`;

    let { shards } = this.client.options;

    if (shards === 'auto') {
      this.debug(`Using the recommended shard count provided by Discord: ${recommendedShards}`);
      this.totalShards = this.client.options.shardCount = recommendedShards;
      shards = this.client.options.shards = Array.from({ length: recommendedShards }, (_, i) => i);
    }

    this.totalShards = shards.length;
    this.debug(`Spawning shards: ${shards.join(', ')}`);
    this.shardQueue = new Set(shards.map(id => new WebSocketShard(this, id)));

    await this._handleSessionLimit(remaining, reset_after);

    return this.createShards();
  }

  /**
   * 샤드의 생성을 핸들합니다.
   * @returns {Promise<boolean>}
   * @private
   */
  async createShards() {
    // If we don't have any shards to handle, return
    if (!this.shardQueue.size) return false;

    const [shard] = this.shardQueue;

    this.shardQueue.delete(shard);

    if (!shard.eventsAttached) {
      shard.on(ShardEvents.ALL_READY, unavailableGuilds => {
        /**
         * 샤드가 준비되면 실행됩니다
         * @event Client#shardReady
         * @param {number} id 준비된 샤드 ID
         * @param {?Set<string>} unavailableGuilds 복구중인 길드들의 ID 셋 (있는 경우)
         */
        this.client.emit(Events.SHARD_READY, shard.id, unavailableGuilds);

        if (!this.shardQueue.size) this.reconnecting = false;
        this.checkShardsReady();
      });

      shard.on(ShardEvents.CLOSE, event => {
        if (event.code === 1000 ? this.destroyed : UNRECOVERABLE_CLOSE_CODES.includes(event.code)) {
          /**
           * 샤드의 웹소켓이 연결이 끊기고 다시 재연결하지 않을 때 실행됩니다.
           * @event Client#shardDisconnect
           * @param {CloseEvent} event 웹소켓 해제 이벤트
           * @param {number} id 연결 해제된 샤드 ID
           */
          this.client.emit(Events.SHARD_DISCONNECT, event, shard.id);
          this.debug(WSCodes[event.code], shard);
          return;
        }

        if (UNRESUMABLE_CLOSE_CODES.includes(event.code)) {
          // These event codes cannot be resumed
          shard.sessionID = undefined;
        }

        /**
         * 샤드가 재연결이나 재인증을 시도할 때 실행됩니다.
         * @event Client#shardReconnecting
         * @param {number} id 재연결할 샤드 ID
         */
        this.client.emit(Events.SHARD_RECONNECTING, shard.id);

        this.shardQueue.add(shard);

        if (shard.sessionID) {
          this.debug(`Session ID is present, attempting an immediate reconnect...`, shard);
          this.reconnect(true);
        } else {
          shard.destroy({ reset: true, emit: false, log: false });
          this.reconnect();
        }
      });

      shard.on(ShardEvents.INVALID_SESSION, () => {
        this.client.emit(Events.SHARD_RECONNECTING, shard.id);
      });

      shard.on(ShardEvents.DESTROYED, () => {
        this.debug('Shard was destroyed but no WebSocket connection was present! Reconnecting...', shard);

        this.client.emit(Events.SHARD_RECONNECTING, shard.id);

        this.shardQueue.add(shard);
        this.reconnect();
      });

      shard.eventsAttached = true;
    }

    this.shards.set(shard.id, shard);

    try {
      await shard.connect();
    } catch (error) {
      if (error && error.code && UNRECOVERABLE_CLOSE_CODES.includes(error.code)) {
        throw new DJSError(WSCodes[error.code]);
        // Undefined if session is invalid, error event for regular closes
      } else if (!error || error.code) {
        this.debug('Failed to connect to the gateway, requeueing...', shard);
        this.shardQueue.add(shard);
      } else {
        throw error;
      }
    }
    // If we have more shards, add a 5s delay
    if (this.shardQueue.size) {
      this.debug(`Shard Queue Size: ${this.shardQueue.size}; continuing in 5 seconds...`);
      await Util.delayFor(5000);
      await this._handleSessionLimit();
      return this.createShards();
    }

    return true;
  }

  /**
   * 해당 매니저의 재연결을 핸들합니다.
   * @param {boolean} [skipLimit=false] 다시 연결할때 세션 제한 확인을 건너뛸지 여부
   * @private
   * @returns {Promise<boolean>}
   */
  async reconnect(skipLimit = false) {
    if (this.reconnecting || this.status !== Status.READY) return false;
    this.reconnecting = true;
    try {
      if (!skipLimit) await this._handleSessionLimit();
      await this.createShards();
    } catch (error) {
      this.debug(`Couldn't reconnect or fetch information about the gateway. ${error}`);
      if (error.httpStatus !== 401) {
        this.debug(`Possible network error occurred. Retrying in 5s...`);
        await Util.delayFor(5000);
        this.reconnecting = false;
        return this.reconnect();
      }
      // If we get an error at this point, it means we cannot reconnect anymore
      if (this.client.listenerCount(Events.INVALIDATED)) {
        /**
         * 클라이언트 세션이 무효화될 때 실행됩니다.
         * 프로세스를 부드럽게 닫고 부트 루프를 방지하는 작업을 수행할 것으로 예상합니다.
         * 이 이벤트를 듣고 있는 경우 말이죠.
         * @event Client#invalidated
         */
        this.client.emit(Events.INVALIDATED);
        // Destroy just the shards. This means you have to handle the cleanup yourself
        this.destroy();
      } else {
        this.client.destroy();
      }
    } finally {
      this.reconnecting = false;
    }
    return true;
  }

  /**
   * 해당 매니저가 핸들하는 모든 샤드로 패킷을 전송합니다.
   * @param {Object} packet 전송할 패킷
   * @private
   */
  broadcast(packet) {
    for (const shard of this.shards.values()) shard.send(packet);
  }

  /**
   * 이 매니저와 해당되는 샤드들을 삭제합니다.
   * @private
   */
  destroy() {
    if (this.destroyed) return;
    this.debug(`Manager was destroyed. Called by:\n${new Error('MANAGER_DESTROYED').stack}`);
    this.destroyed = true;
    this.shardQueue.clear();
    for (const shard of this.shards.values()) shard.destroy({ closeCode: 1000, reset: true, emit: false, log: false });
  }

  /**
   * 더 이상 식별할 수 없는 경우 요구된 타임아웃을 핸들합니다.
   * @param {number} [remaining] 현재 수행할 수 있는 남은 세션의 양
   * @param {number} [resetAfter] 식별 카운터가 재설정되는 시간
   * @private
   */
  async _handleSessionLimit(remaining, resetAfter) {
    if (typeof remaining === 'undefined' && typeof resetAfter === 'undefined') {
      const { session_start_limit } = await this.client.api.gateway.bot.get();
      this.sessionStartLimit = session_start_limit;
      remaining = session_start_limit.remaining;
      resetAfter = session_start_limit.reset_after;
      this.debug(`Session Limit Information
    Total: ${session_start_limit.total}
    Remaining: ${remaining}`);
    }
    if (!remaining) {
      this.debug(`Exceeded identify threshold. Will attempt a connection in ${resetAfter}ms`);
      await Util.delayFor(resetAfter);
    }
  }

  /**
   * 이 웹소켓 매니저가 준비되지 않은 경우 패킷을 처리하고 대기열에 넣습니다.
   * @param {Object} [packet] 핸들해야하는 패킷
   * @param {WebSocketShard} [shard] 이 패킷을 핸들할 샤드
   * @returns {boolean}
   * @private
   */
  handlePacket(packet, shard) {
    if (packet && this.status !== Status.READY) {
      if (!BeforeReadyWhitelist.includes(packet.t)) {
        this.packetQueue.push({ packet, shard });
        return false;
      }
    }

    if (this.packetQueue.length) {
      const item = this.packetQueue.shift();
      this.client.setImmediate(() => {
        this.handlePacket(item.packet, item.shard);
      });
    }

    if (packet && PacketHandlers[packet.t]) {
      PacketHandlers[packet.t](this.client, packet, shard);
    }

    return true;
  }

  /**
   * 클라이언트가 준비됨으로 표시될 준비가 되었는지 확인합니다.
   * @private
   */
  async checkShardsReady() {
    if (this.status === Status.READY) return;
    if (this.shards.size !== this.totalShards || this.shards.some(s => s.status !== Status.READY)) {
      return;
    }

    this.status = Status.NEARLY;

    if (this.client.options.fetchAllMembers) {
      try {
        const promises = this.client.guilds.cache.map(guild => {
          if (guild.available) return guild.members.fetch();
          // Return empty promise if guild is unavailable
          return Promise.resolve();
        });
        await Promise.all(promises);
      } catch (err) {
        this.debug(`Failed to fetch all members before ready! ${err}\n${err.stack}`);
      }
    }

    this.triggerClientReady();
  }

  /**
   * 클라이언트가 준비됨으로 표시되고 준비 이벤트를 전송합니다.
   * @private
   */
  triggerClientReady() {
    this.status = Status.READY;

    this.client.readyAt = new Date();

    /**
     * 클라이언트가 준비되고, 일을 시작하면 실행됩니다.
     * @event Client#ready
     */
    this.client.emit(Events.CLIENT_READY);

    this.handlePacket();
  }
}

module.exports = WebSocketManager;

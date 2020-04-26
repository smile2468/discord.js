'use strict';

const BaseClient = require('./BaseClient');
const ActionsManager = require('./actions/ActionsManager');
const ClientVoiceManager = require('./voice/ClientVoiceManager');
const WebSocketManager = require('./websocket/WebSocketManager');
const { Error, TypeError, RangeError } = require('../errors');
const ChannelManager = require('../managers/ChannelManager');
const GuildEmojiManager = require('../managers/GuildEmojiManager');
const GuildManager = require('../managers/GuildManager');
const UserManager = require('../managers/UserManager');
const ShardClientUtil = require('../sharding/ShardClientUtil');
const ClientApplication = require('../structures/ClientApplication');
const GuildPreview = require('../structures/GuildPreview');
const Invite = require('../structures/Invite');
const VoiceRegion = require('../structures/VoiceRegion');
const Webhook = require('../structures/Webhook');
const Collection = require('../util/Collection');
const { Events, browser, DefaultOptions } = require('../util/Constants');
const DataResolver = require('../util/DataResolver');
const Intents = require('../util/Intents');
const Permissions = require('../util/Permissions');
const Structures = require('../util/Structures');

/**
 * Discord API와 상호 작용하는 주요 허브 및 모든봇의 시작점.
 * @extends {BaseClient}
 */
class Client extends BaseClient {
  /**
   * @param {ClientOptions} [options] 클라이언트의 옵션
   */
  constructor(options = {}) {
    super(Object.assign({ _tokenType: 'Bot' }, options));

    // 환경 정보 또는 현재 워커 스레드 샤드 정보를 가져옵니다.
    let data = process.env;
    try {
      // 워커 스레드 모듈이 현재 사용되는지 테스트
      data = require('worker_threads').workerData || data;
    } catch {
      // 아무것도 하지 않기
    }

    if (this.options.shards === DefaultOptions.shards) {
      if ('SHARDS' in data) {
        this.options.shards = JSON.parse(data.SHARDS);
      }
    }

    if (this.options.shardCount === DefaultOptions.shardCount) {
      if ('SHARD_COUNT' in data) {
        this.options.shardCount = Number(data.SHARD_COUNT);
      } else if (Array.isArray(this.options.shards)) {
        this.options.shardCount = this.options.shards.length;
      }
    }

    const typeofShards = typeof this.options.shards;

    if (typeofShards === 'undefined' && typeof this.options.shardCount === 'number') {
      this.options.shards = Array.from({ length: this.options.shardCount }, (_, i) => i);
    }

    if (typeofShards === 'number') this.options.shards = [this.options.shards];

    if (Array.isArray(this.options.shards)) {
      this.options.shards = [
        ...new Set(
          this.options.shards.filter(item => !isNaN(item) && item >= 0 && item < Infinity && item === (item | 0)),
        ),
      ];
    }

    this._validateOptions();

    /**
     * 클라이언트의 웹소켓 매니저
     * @type {WebSocketManager}
     */
    this.ws = new WebSocketManager(this);

    /**
     * 클라이언트의 액션 매니저
     * @type {ActionsManager}
     * @private
     */
    this.actions = new ActionsManager(this);

    /**
     * 클라이언트의 음성 매니저 (브라우저에서는 `null`)
     * @type {?ClientVoiceManager}
     */
    this.voice = !browser ? new ClientVoiceManager(this) : null;

    /**
     * 클라이언트에 대한 Shard 핼퍼 ({@link ShardingManager} 로 프로세스가 생성되었을 때만 해당됩니다.)
     * @type {?ShardClientUtil}
     */
    this.shard =
      !browser && process.env.SHARDING_MANAGER
        ? ShardClientUtil.singleton(this, process.env.SHARDING_MANAGER_MODE)
        : null;

    /**
     * 모든 캐시된 {@link User} 오브젝트 (ID로 매핑됨)
     * @type {UserManager}
     */
    this.users = new UserManager(this);

    /**
     * 클라이언트가 현재 핸들링하고 있는 모든 길드 (ID로 매핑됨)
     * 만약 샤딩을 사용하고 있지 않다면, 봇이 멤버인 *모든* 길드에 해당합니다.
     * @type {GuildManager}
     */
    this.guilds = new GuildManager(this);

    /**
     *  클라이언트가 현재 핸들링하고 있는 모든 채널({@link Channel}) (ID로 매핑됨)
     * 만약 샤딩을 사용하고 있지 않다면, 봇이 멤버인 *모든* 길드에 있는 *모든* 채널에 해당합니다.
     * DM 채널은 초기에 캐싱되지 않으므로 존재하지 않는다는 점에 유의하시길 바랍니다.
     * 매니저가 명시적으로 가져오거나 사용하지 않는 경우에 해당합니다.
     * @type {ChannelManager}
     */
    this.channels = new ChannelManager(this);

    const ClientPresence = Structures.get('ClientPresence');
    /**
     * 클라이언트의 프리센스(Presence)
     * @private
     * @type {ClientPresence}
     */
    this.presence = new ClientPresence(this);

    Object.defineProperty(this, 'token', { writable: true });
    if (!browser && !this.token && 'DISCORD_TOKEN' in process.env) {
      /**
       * 로그인된 봇의 인증 토큰
       * <warn>토큰은 언제나 비밀리 보관되어야합니다.</warn>
       * @type {?string}
       */
      this.token = process.env.DISCORD_TOKEN;
    } else {
      this.token = null;
    }

    /**
     * 클라이언트가 로그인되어있는 유저
     * @type {?ClientUser}
     */
    this.user = null;

    /**
     * 클라이언트가 마지막으로 `준비(READY)` 상태로 표시된 시간
     * (클라이언트가 끊기고 성공적으로 다시 연결될때, 이것은 덮어써질 것입니다)
     * @type {?Date}
     */
    this.readyAt = null;

    if (this.options.messageSweepInterval > 0) {
      this.setInterval(this.sweepMessages.bind(this), this.options.messageSweepInterval * 1000);
    }
  }

  /**
   * 클라이언트가 접근할 수 있는 모든 커스텀 이모지들 (ID로 매핑됨)
   * @type {GuildEmojiManager}
   * @readonly
   */
  get emojis() {
    const emojis = new GuildEmojiManager({ client: this });
    for (const guild of this.guilds.cache.values()) {
      if (guild.available) for (const emoji of guild.emojis.cache.values()) emojis.cache.set(emoji.id, emoji);
    }
    return emojis;
  }

  /**
   * 클라이언트가 마지막으로 `준비`되었던 시간의 타임스탬프
   * @type {?number}
   * @readonly
   */
  get readyTimestamp() {
    return this.readyAt ? this.readyAt.getTime() : null;
  }

  /**
   * 클라이언트가 마지막으로 `준비` 상태로 전환된 후 경과 시간(밀리초)
   * @type {?number}
   * @readonly
   */
  get uptime() {
    return this.readyAt ? Date.now() - this.readyAt : null;
  }

  /**
   * 클라이언트를 로그인하고 디스코드에 대한 웹 소켓 연결을 설정하세요
   * @param {string} token 로그인할 계정의 토큰
   * @returns {Promise<string>} 계정에 사용된 토큰
   * @example
   * client.login('나의 토큰');
   */
  async login(token = this.token) {
    if (!token || typeof token !== 'string') throw new Error('TOKEN_INVALID');
    this.token = token = token.replace(/^(Bot|Bearer)\s*/i, '');
    this.emit(
      Events.DEBUG,
      `Provided token: ${token
        .split('.')
        .map((val, i) => (i > 1 ? val.replace(/./g, '*') : val))
        .join('.')}`,
    );

    if (this.options.presence) {
      this.options.ws.presence = await this.presence._parse(this.options.presence);
    }

    this.emit(Events.DEBUG, 'Preparing to connect to the gateway...');

    try {
      await this.ws.connect();
      return this.token;
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  /**
   * 로그아웃하여 디스코드와의 연결을 종료하고 클라이언트를 종료합니다.
   * @returns {void}
   */
  destroy() {
    super.destroy();
    this.ws.destroy();
    this.token = null;
  }

  /**
   * 디스코드에서 초대링크를 가져옵니다.
   * @param {InviteResolvable} invite 초대 코드 또는 URL
   * @returns {Promise<Invite>}
   * @example
   * client.fetchInvite('https://discord.gg/bRCvFy9')
   *   .then(invite => console.log(`초대 정보를 코드로 가져왔습니다: ${invite.code}`))
   *   .catch(console.error);
   */
  fetchInvite(invite) {
    const code = DataResolver.resolveInviteCode(invite);
    return this.api
      .invites(code)
      .get({ query: { with_counts: true } })
      .then(data => new Invite(this, data));
  }

  /**
   * 디스코드에서 웹훅을 가져옵니다.
   * @param {Snowflake} id 웹훅의 아이디
   * @param {string} [token] 웹훅의 토큰
   * @returns {Promise<Webhook>}
   * @example
   * client.fetchWebhook('id', 'token')
   *   .then(webhook => console.log(`${webhook.name} 이름의 웹훅을 가져옵니다`))
   *   .catch(console.error);
   */
  fetchWebhook(id, token) {
    return this.api
      .webhooks(id, token)
      .get()
      .then(data => new Webhook(this, data));
  }

  /**
   * 디스코드에서 가능한 음성 길드위치를 가져옵니다.
   * @returns {Promise<Collection<string, VoiceRegion>>}
   * @example
   * client.fetchVoiceRegions()
   *   .then(regions => console.log(`가능한 음성 길드위치는: ${regions.map(region => region.name).join(', ')}`))
   *   .catch(console.error);
   */
  fetchVoiceRegions() {
    return this.api.voice.regions.get().then(res => {
      const regions = new Collection();
      for (const region of res) regions.set(region.id, new VoiceRegion(region));
      return regions;
    });
  }

  /**
   * 모든 텍스트 기반 채널의 메시지를 스위프하고 최대 메시지 수명보다 오래된 메시지를 제거합니다.
   * 메시지가 수정된 경우, 원본 메시지의 시간이 아닌 메세지 수정 시간이 사용됩니다.
   * @param {number} [lifetime=this.options.messageCacheLifetime] 이것보다 오래된 메세지 (단위: 초)
   * 캐시에서 삭제될겁니다. 기본값은 {@link ClientOptions#messageCacheLifetime} 를 참고하시길 바랍니다
   * @returns {number} 캐시에서 삭제된 메세지의 양
   * 메세지 캐시에 제한이 없다면 -1
   * @example
   * // 1800초보다 오래된 모든 메세지를 메세지 캐시에서 삭제합니다.
   * const amount = client.sweepMessages(1800);
   * console.log(`성공적으로 ${amount} 개의 메세지가 메세지 캐시에서 삭제되었습니다.`);
   */
  sweepMessages(lifetime = this.options.messageCacheLifetime) {
    if (typeof lifetime !== 'number' || isNaN(lifetime)) {
      throw new TypeError('INVALID_TYPE', 'lifetime', 'number');
    }
    if (lifetime <= 0) {
      this.emit(Events.DEBUG, "Didn't sweep messages - lifetime is unlimited");
      return -1;
    }

    const lifetimeMs = lifetime * 1000;
    const now = Date.now();
    let channels = 0;
    let messages = 0;

    for (const channel of this.channels.cache.values()) {
      if (!channel.messages) continue;
      channels++;

      messages += channel.messages.cache.sweep(
        message => now - (message.editedTimestamp || message.createdTimestamp) > lifetimeMs,
      );
    }

    this.emit(
      Events.DEBUG,
      `Swept ${messages} messages older than ${lifetime} seconds in ${channels} text-based channels`,
    );
    return messages;
  }

  /**
   * 해당 봇의 OAuth 애플리케이션을 디스코드에서 가져옵니다
   * @returns {Promise<ClientApplication>}
   */
  fetchApplication() {
    return this.api.oauth2
      .applications('@me')
      .get()
      .then(app => new ClientApplication(this, app));
  }

  /**
   * 디스코드에서 길드 미리보기를 얻습니다. 공개 길드에서만 사용할 수 있습니다.
   * @param {GuildResolvable} guild 미리보기를 가져올 길드
   * @returns {Promise<GuildPreview>}
   */
  fetchGuildPreview(guild) {
    const id = this.guilds.resolveID(guild);
    if (!id) throw new TypeError('INVALID_TYPE', 'guild', 'GuildResolvable');
    return this.api
      .guilds(id)
      .preview.get()
      .then(data => new GuildPreview(this, data));
  }

  /**
   * 봇을 길드에 초대할 때 사용될 수 있는 링크를 생성합니다.
   * @param {PermissionResolvable} [permissions] 요청할 권한
   * @returns {Promise<string>}
   * @example
   * client.generateInvite(['SEND_MESSAGES', 'MANAGE_GUILD', 'MENTION_EVERYONE'])
   *   .then(link => console.log(`봇 초대링크가 생성되었습니다: ${link}`))
   *   .catch(console.error);
   */
  async generateInvite(permissions) {
    permissions = Permissions.resolve(permissions);
    const application = await this.fetchApplication();
    const query = new URLSearchParams({
      client_id: application.id,
      permissions: permissions,
      scope: 'bot',
    });
    return `${this.options.http.api}${this.api.oauth2.authorize}?${query}`;
  }

  toJSON() {
    return super.toJSON({
      readyAt: false,
      presences: false,
    });
  }

  /**
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval} 를 실행합니다
   * 클라이언트는 `this`로 선언됩니다.
   * @param {string} script 실행할 스크립트
   * @returns {*}
   * @private
   */
  _eval(script) {
    return eval(script);
  }

  /**
   * 클라이언트 옵션의 유효성을 검사합니다.
   * @param {ClientOptions} [options=this.options] 유효성을 검사할 옵션
   * @private
   */
  _validateOptions(options = this.options) {
    if (typeof options.ws.intents !== 'undefined') {
      options.ws.intents = Intents.resolve(options.ws.intents);
    }
    if (typeof options.shardCount !== 'number' || isNaN(options.shardCount) || options.shardCount < 1) {
      throw new TypeError('CLIENT_INVALID_OPTION', 'shardCount', 'a number greater than or equal to 1');
    }
    if (options.shards && !(options.shards === 'auto' || Array.isArray(options.shards))) {
      throw new TypeError('CLIENT_INVALID_OPTION', 'shards', "'auto', a number or array of numbers");
    }
    if (options.shards && !options.shards.length) throw new RangeError('CLIENT_INVALID_PROVIDED_SHARDS');
    if (typeof options.messageCacheMaxSize !== 'number' || isNaN(options.messageCacheMaxSize)) {
      throw new TypeError('CLIENT_INVALID_OPTION', 'messageCacheMaxSize', 'a number');
    }
    if (typeof options.messageCacheLifetime !== 'number' || isNaN(options.messageCacheLifetime)) {
      throw new TypeError('CLIENT_INVALID_OPTION', 'The messageCacheLifetime', 'a number');
    }
    if (typeof options.messageSweepInterval !== 'number' || isNaN(options.messageSweepInterval)) {
      throw new TypeError('CLIENT_INVALID_OPTION', 'messageSweepInterval', 'a number');
    }
    if (typeof options.fetchAllMembers !== 'boolean') {
      throw new TypeError('CLIENT_INVALID_OPTION', 'fetchAllMembers', 'a boolean');
    }
    if (typeof options.disableMentions !== 'string') {
      throw new TypeError('CLIENT_INVALID_OPTION', 'disableMentions', 'a string');
    }
    if (!Array.isArray(options.partials)) {
      throw new TypeError('CLIENT_INVALID_OPTION', 'partials', 'an Array');
    }
    if (typeof options.restWsBridgeTimeout !== 'number' || isNaN(options.restWsBridgeTimeout)) {
      throw new TypeError('CLIENT_INVALID_OPTION', 'restWsBridgeTimeout', 'a number');
    }
    if (typeof options.restRequestTimeout !== 'number' || isNaN(options.restRequestTimeout)) {
      throw new TypeError('CLIENT_INVALID_OPTION', 'restRequestTimeout', 'a number');
    }
    if (typeof options.restSweepInterval !== 'number' || isNaN(options.restSweepInterval)) {
      throw new TypeError('CLIENT_INVALID_OPTION', 'restSweepInterval', 'a number');
    }
    if (typeof options.retryLimit !== 'number' || isNaN(options.retryLimit)) {
      throw new TypeError('CLIENT_INVALID_OPTION', 'retryLimit', 'a number');
    }
  }
}

module.exports = Client;

/**
 * 일반적인 경고가 발생할 때 실행됩니다.
 * @event Client#warn
 * @param {string} info 경고
 */

/**
 * 일반적인 디버그 정보가 발생할 때 실행됩니다.
 * @event Client#debug
 * @param {string} info 디버그 정보
 */

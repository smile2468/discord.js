'use strict';

const BaseManager = require('./BaseManager');
const Guild = require('../structures/Guild');
const GuildChannel = require('../structures/GuildChannel');
const GuildEmoji = require('../structures/GuildEmoji');
const GuildMember = require('../structures/GuildMember');
const Invite = require('../structures/Invite');
const Role = require('../structures/Role');
const {
  Events,
  VerificationLevels,
  DefaultMessageNotifications,
  ExplicitContentFilterLevels,
} = require('../util/Constants');
const DataResolver = require('../util/DataResolver');
const Permissions = require('../util/Permissions');
const { resolveColor } = require('../util/Util');

/**
 * 길드들의 API 메소드를 관리하고 캐시에 저장합니다.
 * @extends {BaseManager}
 */
class GuildManager extends BaseManager {
  constructor(client, iterable) {
    super(client, iterable, Guild);
  }

  /**
   * 이 매니저에 귀속된 길드 캐시
   * @type {Collection<Snowflake, Guild>}
   * @name GuildManager#cache
   */

  /**
   * 길드 객체로 리졸브 가능한 데이터. 가능한 데이터:
   * * 길드 객체
   * * 길드 채널 객체
   * * 길드 이모지 객체
   * * 역할 객체
   * * Snowflake
   * * 초대 객체
   * @typedef {Guild|GuildChannel|GuildMember|GuildEmoji|Role|Snowflake|Invite} GuildResolvable
   */

  /**
   * 역할의 partial 데이터.
   * @typedef {Object} PartialRoleData
   * @property {number} [id] 채널의 권한을 설정하기 위해 쓰일 역할의 ID
   * (이것은 placeholder이며 이후 API의 의해서 값이 바뀝니다.)
   * @property {string} [name] 역할의 이름
   * @property {ColorResolvable} [color] 역할의 색깔 (Base10 숫자 또는 HEX 코드)
   * @property {boolean} [hoist] 역할의 호이스팅 여부
   * @property {number} [position] 역할의 위치(순서)
   * @property {PermissionResolvable|number} [permissions] 역할의 권한
   * @property {boolean} [mentionable] 역할의 언급 가능 여부
   */

  /**
   * 덮어씌울 partial 데이터.
   * @typedef {Object} PartialOverwriteData
   * @property {number|Snowflake} id 덮어씌울 역할ID 도는 유저ID
   * @property {string} [type] 덮어씌울 타입
   * @property {PermissionResolvable} [allow] 허용할 권한
   * @property {PermissionResolvable} [deny] 거부할 권한
   */

  /**
   * 채널의 partial 데이터.
   * @typedef {Object} PartialChannelData
   * @property {number} [id] 부모(카테고리)를 설정하기 위한 채널 ID
   * (이것은 placeholder이며 이후 API의 의해서 값이 바뀝니다.)
   * @property {number} [parentID] 채널의 부모(카테고리) 채널 ID
   * @property {string} [type] 채널의 타입(종류)
   * @property {string} name 채널의 이름
   * @property {string} [topic] 텍스트 채널의 주제(토픽)
   * @property {boolean} [nsfw] 채널의 NSFW 여부
   * @property {number} [bitrate] 보이스 채널의 비트레이트
   * @property {number} [userLimit] 채널의 유저 제한
   * @property {PartialOverwriteData} [permissionOverwrites]
   * 덮어씌운 권한 데이터
   * @property {number} [rateLimitPerUser] 각 유저의 초당 레이트리밋(슬로우모드)
   */

  /**
   * 길드로 리졸브 가능한 데이터를 길드 객체 데이터로 리졸브합니다.
   * @method resolve
   * @memberof GuildManager
   * @instance
   * @param {GuildResolvable} guild 리졸브 할 길드 데이터
   * @returns {?Guild}
   */
  resolve(guild) {
    if (
      guild instanceof GuildChannel ||
      guild instanceof GuildMember ||
      guild instanceof GuildEmoji ||
      guild instanceof Role ||
      (guild instanceof Invite && guild.guild)
    ) {
      return super.resolve(guild.guild);
    }
    return super.resolve(guild);
  }

  /**
   * 길드로 리졸브 가능한 데이터를 길드 ID 문자열로 리졸브합니다.
   * @method resolveID
   * @memberof GuildManager
   * @instance
   * @param {GuildResolvable} guild 리졸브 할 길드 데이터
   * @returns {?Snowflake}
   */
  resolveID(guild) {
    if (
      guild instanceof GuildChannel ||
      guild instanceof GuildMember ||
      guild instanceof GuildEmoji ||
      guild instanceof Role ||
      (guild instanceof Invite && guild.guild)
    ) {
      return super.resolveID(guild.guild.id);
    }
    return super.resolveID(guild);
  }

  /**
   * 길드를 생성합니다.
   * <warn>이 기능은 서버 수가 10 미만인 봇에게만 제공됩니다.</warn>
   * @param {string} name 길드의 이름
   * @param {Object} [options] 생성을 위한 옵션
   * @param {PartialChannelData[]} [options.channels] 이 길드의 채널들
   * @param {DefaultMessageNotifications} [options.defaultMessageNotifications] 기본 메세지 알림 설정
   * @param {ExplicitContentFilterLevel} [options.explicitContentFilter] 유해 미디어 컨텐츠 필터 설정
   * @param {BufferResolvable|Base64Resolvable} [options.icon=null] 길드의 아이콘
   * @param {string} [options.region] 길드의 위치 (기본값: 봇 서버에서 가장 가까운 위치)
   * @param {PartialRoleData[]} [options.roles] 이 길드의 역할들
   * (배열의 첫 요소는 everyone 역할을 설정하기 위해서 사용됩니다.)
   * @param {VerificationLevel} [options.verificationLevel] 길드의 보안 수준
   * @returns {Promise<Guild>} 생성된 길드
   */
  async create(
    name,
    {
      channels = [],
      defaultMessageNotifications,
      explicitContentFilter,
      icon = null,
      region,
      roles = [],
      verificationLevel,
    } = {},
  ) {
    icon = await DataResolver.resolveImage(icon);
    if (typeof verificationLevel !== 'undefined' && typeof verificationLevel !== 'number') {
      verificationLevel = VerificationLevels.indexOf(verificationLevel);
    }
    if (typeof defaultMessageNotifications !== 'undefined' && typeof defaultMessageNotifications !== 'number') {
      defaultMessageNotifications = DefaultMessageNotifications.indexOf(defaultMessageNotifications);
    }
    if (typeof explicitContentFilter !== 'undefined' && typeof explicitContentFilter !== 'number') {
      explicitContentFilter = ExplicitContentFilterLevels.indexOf(explicitContentFilter);
    }
    for (const channel of channels) {
      channel.parent_id = channel.parentID;
      delete channel.parentID;
      if (!channel.permissionOverwrites) continue;
      for (const overwrite of channel.permissionOverwrites) {
        if (overwrite.allow) overwrite.allow = Permissions.resolve(overwrite.allow);
        if (overwrite.deny) overwrite.deny = Permissions.resolve(overwrite.deny);
      }
      channel.permission_overwrites = channel.permissionOverwrites;
      delete channel.permissionOverwrites;
    }
    for (const role of roles) {
      if (role.color) role.color = resolveColor(role.color);
      if (role.permissions) role.permissions = Permissions.resolve(role.permissions);
    }
    return new Promise((resolve, reject) =>
      this.client.api.guilds
        .post({
          data: {
            name,
            region,
            icon,
            verification_level: verificationLevel,
            default_message_notifications: defaultMessageNotifications,
            explicit_content_filter: explicitContentFilter,
            channels,
            roles,
          },
        })
        .then(data => {
          if (this.client.guilds.cache.has(data.id)) return resolve(this.client.guilds.cache.get(data.id));

          const handleGuild = guild => {
            if (guild.id === data.id) {
              this.client.removeListener(Events.GUILD_CREATE, handleGuild);
              this.client.clearTimeout(timeout);
              resolve(guild);
            }
          };
          this.client.on(Events.GUILD_CREATE, handleGuild);

          const timeout = this.client.setTimeout(() => {
            this.client.removeListener(Events.GUILD_CREATE, handleGuild);
            resolve(this.client.guilds.add(data));
          }, 10000);
          return undefined;
        }, reject),
    );
  }
}

module.exports = GuildManager;

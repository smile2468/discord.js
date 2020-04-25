'use strict';

const BaseClient = require('./BaseClient');
const Webhook = require('../structures/Webhook');

/**
 * The webhook client.
 * @implements {Webhook}
 * @extends {BaseClient}
 */
class WebhookClient extends BaseClient {
  /**
   * @param {Snowflake} id 웹훅의 ID
   * @param {string} token 웹훅의 토큰
   * @param {ClientOptions} [options] 웹훅에 대한 옵션
   * @example
   * // 새로운 웹훅을 생성하고 메세지를 보냅니다.
   * const hook = new Discord.WebhookClient('1234', 'ㅁㄴㅇㄹ');
   * hook.send('이것이 메세지를 전송할 것입니다.').catch(console.error);
   */
  constructor(id, token, options) {
    super(options);
    Object.defineProperty(this, 'client', { value: this });
    this.id = id;
    Object.defineProperty(this, 'token', { value: token, writable: true, configurable: true });
  }
}

Webhook.applyToClass(WebhookClient);

module.exports = WebhookClient;

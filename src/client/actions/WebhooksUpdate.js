'use strict';

const Action = require('./Action');
const { Events } = require('../../util/Constants');

class WebhooksUpdate extends Action {
  handle(data) {
    const client = this.client;
    const channel = client.channels.cache.get(data.channel_id);
    /**
     * 길드의 텍스트 채널이 웹훅 업데이트를 포함한 경우 실행됩니다.

     * @event Client#webhookUpdate
     * @param {TextChannel} channel 웹훅이 업데이트된 채널
     */
    if (channel) client.emit(Events.WEBHOOKS_UPDATE, channel);
  }
}

module.exports = WebhooksUpdate;

'use strict';

/**
 * Send a message using a webhook
 */

// Import the discord.js module
const Discord = require('discord.js');
/*
 * Create a new webhook
 * The Webbooks ID and token can be found in the URL, when you request that URL, or in the response body.
 * https://discordapp.com/api/webhooks/12345678910/T0kEn0fw3Bh00K
 *                                     ^^^^^^^^^^  ^^^^^^^^^^^^ 
 *                                     Webhook ID  Webhook Token
 */
const hook = new Discord.WebhookClient('webhook id', 'webhook token');

// Send a message using the webhook
hook.send('I am now alive!');


'use strict';

/**
 * 웹훅을 이용하여 메세지 보내기
 */

// discord.js 모듈을 불러옵니다.
const Discord = require('discord.js');
/*
 * 새 웹훅을 만듭니다.
 * 당신은 URL 또는 URL 리퀘스트시의 응답에서 Webbooks ID와 토큰은 URL에서 확인할 수 있습니다.
 * https://discordapp.com/api/webhooks/12345678910/T0kEn0fw3Bh00K
 *                                     ^^^^^^^^^^  ^^^^^^^^^^^^ 
 *                                       웹훅 ID     웹훅 토큰
 */
const hook = new Discord.WebhookClient('웹훅 id', '웹훅 토큰');

// 웹훅을 사용하여 메세지를 보냅니다.
hook.send('난 이제 살아 있어요!');

'use strict';

/**
 * 유저에게 자신의 아바타 링크를 전송합니다
 */

// discord.js 모듈 인포트
const Discord = require('./node_modules/discord.js.js');

// 디스코드 클라이언트 인스턴트를 생성
const client = new Discord.Client();

/**
 * ready 이벤트는 중요하며, 이 이벤트만이 봇이 정보에 반응을 시작된다는 것을 의미합니다.
 * 디스코드로 부터 정보가 전달됩니다.
 */
client.on('ready', () => {
  console.log('준비되었습니다!');
});

// 메세지에 대한 이벤트 리스너를 생성합니다.
client.on('message', message => {
  // 만약 메세지가 "내 아바타는 뭐니" 라면
  if (message.content === '내 아바타는 뭐니') {
    // 유저의 아바타 URL을 전송
    message.reply(message.author.displayAvatarURL());
  }
});

//  https://discordapp.com/developers/applications/me 에 있는 토큰을 이용하여 봇에로그인하세요
client.login('토큰을 이곳에 입력하세요');
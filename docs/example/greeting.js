'use strict';

/**
 *  당신이 "핑"을 보낼 때마다 봇은 "퐁"을 응답합니다.
 */

// discord.js 모듈 임포트
const Discord = require('discord.js');

// 디스코드 클라이언트 인스턴트를 생성
const client = new Discord.Client();

/**
 * ready 이벤트는 중요하며, 이 이벤트만이 봇이 정보에 반응을 시작된다는 것을 의미합니다.
 * 디스코드로 부터 정보가 전달됩니다.
 */
client.on('ready', () => {
  console.log('준비되었습니다!');
});

// 새로운 유저 추가에 대한 이벤트 리스너를 생성합니다.
client.on('guildMemberAdd', member => {
  // 서버에서 지정된 채널에 메시지 보내기:
  const channel = member.guild.channels.cache.find(ch => ch.name === '유저-로그');
  // 만약 아무 채널도 발견되지 않았다면 보내지 않기
  if (!channel) return;
  // 유저를 맨션하며, 메세지를 전송
  channel.send(`Welcome to the server, ${member}`);
});

// https://discordapp.com/developers/applications/me 에 있는 토큰을 이용하여 봇에로그인하세요
client.login('토큰을 이곳에 입력하세요');

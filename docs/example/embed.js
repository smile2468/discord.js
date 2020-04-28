'use strict';

/**
 * 임베드를 전송하는 예시입니다.
 */

// 요구되는 클래스를 discord.js 모듈에서 가져옵니다.
const { Client, MessageEmbed } = require('discord.js');

// 디스코드 클라이언트의 인스턴스를 생성합니다.
const client = new Client();

/**
 * Ready 이벤트는 중요하며, 이 이벤트만이 봇이 정보에 반응을 시작된다는 것을 의미합니다.
 * 디스코드로 부터 정보가 전달됩니다.
 */
client.on('ready', () => {
  console.log('준비되었습니다!');
});

client.on('message', message => {
  // 만약 메세지가 "임베드 어떻게"
  if (message.content === '임베드 어떻게') {
    // MessageEmbed 컨스트럭터를 이용하여, 임베드를 생성할 수 있습니다.
    // 컨스트럭터로 더 할 수 있는 것들을 확인해보세요
    // https://discord-kr.js.org/#/docs/main/master/class/MessageEmbed
    const embed = new MessageEmbed()
      // 필드의 제목을 설정합니다.
      .setTitle('임베드 제목')
      // 임베드의 색을 설정합니다.
      .setColor(0xff0000)
      // 임베드의 메인 설명을 설정합니다.
      .setDescription('안녕하세요! 여긴 임베드 설명입니다.');
    // 메시지가 전송된 채널과 동일한 채널로 임베드를 전송합니다.
    message.channel.send(embed);
  }
});

//  https://discordapp.com/developers/applications/me 에 있는 토큰을 이용하여 봇에로그인하세요
client.login('토큰을 이곳에 입력하세요');

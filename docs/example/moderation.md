 # 관리

이곳에서는, 유저를 추방하거나 차단하는 예시를 확인하실 수 있습니다!

## 유저 추방하기

추방하고 싶다는 유저가 있다고 가정해봅시다. 여기 어떻게 __할 수 있는지__ 예시가 있습니다

```js
// discord.js 모듈을 인포트합니다
const Discord = require('discord.js');

// Discord 클라이언트의 인스턴스 생성
const client = new Discord.Client();

/**
 * ready 이벤트는 중요하며, 이 이벤트만이 봇이 정보에 반응을 시작된다는 것을 의미합니다.
 * 디스코드로 부터 정보가 전달됩니다.
 */
client.on('ready', () => {
  console.log('준비되었습니다!');
});

client.on('message', message => {
  // 길드에서 오지 않은 메세지는 무시합니다.
  if (!message.guild) return;

  // 만약 메세지가 "!kick"으로 시작한다면
  if (message.content.startsWith('!kick')) {
  // 메시지에서 누군가를 언급한다고 가정하면, 유저가 반환됩니다.
  // https://discord-kr.js.org/#/docs/main/master/class/messageMentions 에서 언급된 내용을 자세히 읽어보십시오.
    const user = message.mentions.users.first();
    // 만약 유저가 언급되었다면
    if (user) {
      // 유저에서 멤버 객체를 가져옵니다.
      const member = message.guild.member(user);
      // 만약 해당 유저가 길드에 있다면
      if (member) {
        /**
         * 유저를 추방합니다.
         * 길드 멤버에 실행하도록 하시길 바랍니다
         * 이건 아주 중요한 사항입니다!
         */
        member
          .kick('감사로그에 표시될 사유를 입력해주세요 (선택) ')
          .then(() => {
            // 메세지 전송자에게 성공적으로 추방했다고 알려줍니다.
            message.reply(`${user.tag}를 성공적으로 추방했습니다.`);
          })
          .catch(err => {
            // 에러가 발생하였습니다.
            // 이 에러는 보통 봇이 유저를 추방할 수 없을 때 발생합니다.
            // 권한이 부족하거나, 역할의 낮을 때
            message.reply('유저 추방에 실패하였습니다.');
            // 에러를 출력합니다.
            console.error(err);
          });
      } else {
        // 언급된 유저가 길드에 존재하지 않을 때
        message.reply("해당 유저는 길드에 존재하지 않습니다!");
      }
      // 유저가 언급되지 않았을 때
    } else {
      message.reply("추방할 유저를 언급하지 않았습니다!");
    }
  }
});

// https://discordapp.com/developers/applications/me 에 있는 토큰을 이용하여 봇에로그인하세요
client.login('토큰');
```

결과:

![결과 이미지](/static/kick-example.png)

## 유저 차단하기

차단은 추방과 같은 방식으로 작동하지만, 바꿀 수 있는 옵션이 약간 더 많다.

```js
// 길드에서 오지 않은 메세지는 무시합니다.
const Discord = require('discord.js');

// Discord 클라이언트의 인스턴스 생성
const client = new Discord.Client();

/**
 * ready 이벤트는 중요하며, 이 이벤트만이 봇이 정보에 반응을 시작된다는 것을 의미합니다.
 * 디스코드로 부터 정보가 전달됩니다.
 */
client.on('ready', () => {
  console.log('준비되었습니다.');
});

client.on('message', message => {
  // 언급된 유저가 길드에 존재하지 않을 때
  if (!message.guild) return;

  // 만약 메세지가 "!ban"으로 시작한다면
  if (message.content.startsWith('!ban')) {
  // 메시지에서 누군가를 언급한다고 가정하면, 유저가 반환됩니다.
  // https://discord-kr.js.org/#/docs/main/master/class/messageMentions 에서 언급된 내용을 자세히 읽어보십시오.
    const user = message.mentions.users.first();
    // 만약 해당 유저가 길드에 있다면
    if (user) {
      // 유저에서 멤버 객체를 가져옵니다.
      const member = message.guild.member(user);
      // 만약 해당 유저가 길드에 있다면
      if (member) {
        /**
         * 유저를 차단합니다.
         * 길드 멤버에 실행하도록 하시길 바랍니다!
         * 이건 아주 중요한 사항입니다!
         * 옵션에 대해 더 알아보고 싶다면
         * https://discord-kr.js.org/#/docs/main/master/class/GuildMember?scrollTo=ban 를 참고하시길 바랍니다
         */

        member
          .ban({
            reason: '나빠요!?',
          })
          .then(() => {
            // 메세지 전송자에게 성공적으로 차단했다고 알려줍니다.
            message.reply(`${user.tag}를 성공적으로 차단했습니다.`);
          })
          .catch(err => {
            // 에러가 발생하였습니다.
            // 이 에러는 보통 봇이 유저를 차단할 수 없을 때 발생합니다.
            // 권한이 부족하거나, 역할의 낮을 때
            message.reply('유저 추방에 실패하였습니다.');
            // 에러를 출력합니다.
            console.error(err);
          });
      } else {
        // 언급된 유저가 길드에 존재하지 않을 때
        message.reply("That user isn't in this guild!");
      }
    } else {
      // 유저가 언급되지 않았을 때
      message.reply("추방할 유저를 언급하지 않았습니다!");
    }
  }
});

// https://discordapp.com/developers/applications/me 에 있는 토큰을 이용하여 봇에로그인하세요
client.login('토큰');
```

And the result is:

![Image showing the result](/static/ban-example.png)
# 첨부파일 보내기

discord.js 를 이용하여, 첨부파일을 보낼 수 있는 몇가지 예를 볼 수 있습니다.

## URL을 사용하여 첨부파일 보내기

몇가지 방법이 있지만, 가장 쉬운 방법을 보여드리겠습니다.

다음 예시는 [MessageAttachment](/#/docs/main/master/class/MessageAttachment)를 참고해주세요.

```js
// discord.js 모듈 임포트
const { Client, MessageAttachment } = require("discord.js");

// 디스코드 클라이언트 인스턴트를 생성
const client = new Client();

/**
 * ready 이벤트는 중요하며, 이 이벤트만이 봇이 정보에 반응을 시작된다는 것을 의미합니다.
 * 디스코드로 부터 정보가 전달됩니다.
 */
client.on("ready", () => {
  console.log("I am ready!");
});

client.on("message", message => {
  // If the message is '!rip'
  if (message.content === "!rip") {
    // MessageAttachment를 이용하여 첨부파일을 생성합니다.
    const attachment = new MessageAttachment("https://i.imgur.com/w3duR07.png");
    // 메세치 채널에 첨부파일을 보냅니다.
    message.channel.send(attachment);
  }
});

// https://discordapp.com/developers/applications/me 에 있는 토큰을 이용하여 봇에 로그인하세요.
client.login("토큰을 이곳에 입력하세요");
```

결과:

![Image showing the result](/static/attachment-example1.png)

메세지 내용과 첨부파일을 같이 보내려면 어떻게 해야하나요? 겁내지 마세요, 그렇게 하는 것도 쉬워요! 사용 가능한 다른 옵션을 보려면 [the TextChannel's "send" function documentation](/#/docs/main/master/class/TextChannel?scrollTo=send)을 읽는 것이 좋아요.
```js
// discord.js 모듈 임포트
const { Client, MessageAttachment } = require("discord.js");

// 디스코드 클라이언트 인스턴트를 생성
const client = new Client();

/**
 * ready 이벤트는 중요하며, 이 이벤트만이 봇이 정보에 반응을 시작된다는 것을 의미합니다.
 * 디스코드로 부터 정보가 전달됩니다.
 */
client.on("ready", () => {
  console.log("I am ready!");
});

client.on("message", message => {
  // If the message is '!rip'
  if (message.content === "!rip") {
    // MessageAttachment를 이용하여 첨부파일을 생성합니다.
    const attachment = new MessageAttachment("https://i.imgur.com/w3duR07.png");
    // 메세지와 첨부파일을 메세지 채널에 함께 보냅니다.
    message.channel.send(`${message.author},`, attachment);
  }
});

// https://discordapp.com/developers/applications/me 에 있는 토큰을 이용하여 봇에 로그인하세요.
client.login("토큰을 이곳에 입력하세요");
```

또다른 결과:

![Image showing the result](/static/attachment-example2.png)

## 로컬 파일 또는 버퍼 보내기

로컬 파일 전송도 어렵지 않습니다! [MessageAttachment](/#/docs/main/master/class/MessageAttachment)의 예시도 사용할 예정입니다.

```js
// discord.js 모듈 임포트
const { Client, MessageAttachment } = require("discord.js");

// 디스코드 클라이언트 인스턴트를 생성
const client = new Client();

/**
 * ready 이벤트는 중요하며, 이 이벤트만이 봇이 정보에 반응을 시작된다는 것을 의미합니다.
 * 디스코드로 부터 정보가 전달됩니다.
 */
client.on("ready", () => {
  console.log("I am ready!");
});

client.on("message", message => {
  // If the message is '!rip'
  if (message.content === "!rip") {
    // MessageAttachment를 이용하여 첨부파일을 생성합니다.
    const attachment = new MessageAttachment("./rip.png");
    // 메세지와 첨부파일을 메세지 채널에 함께 보냅니다.
    message.channel.send(`${message.author},`, attachment);
  }
});

// https://discordapp.com/developers/applications/me 에 있는 토큰을 이용하여 봇에 로그인하세요.
client.login("토큰을 이곳에 입력하세요");
```

URL 예제와 동일한 결과:

![Image showing result](/static/attachment-example1.png)

그러나 이미지 버퍼가 있다면 어떨까요? 아니면 텍스트 문서라면? 하지만 로컬 파일이나 URL를 이용하여 보내는 것과 같습니다!

다음 예시에서, `memes.txt` 파일의 버파를 가져와서 메세지 채널에 보냅니다.
원하는 모든 버퍼를 사용하여 전송할 수 있습니다. 파일이 이미지가 아닌 경우, 파일 이름을 덮어쓰기만 하면 됩니다!

```js
// discord.js 모듈 임포트
const { Client, MessageAttachment } = require("discord.js");

// fs 
const fs = require("fs");

// 디스코드 클라이언트 인스턴트를 생성
const client = new Client();

/**
 * ready 이벤트는 중요하며, 이 이벤트만이 봇이 정보에 반응을 시작된다는 것을 의미합니다.
 * 디스코드로 부터 정보가 전달됩니다.
 */
client.on("ready", () => {
  console.log("I am ready!");
});

client.on("message", message => {
  // If the message is '!memes'
  if (message.content === "!memes") {
    // 'memes.txt' 파일이 있다고 가정할때, 'memes.txt' 파일에서 버퍼를 가져옵니다.
    const buffer = fs.readFileSync("./memes.txt");

    /**
     * MessageAttachment를 이용하여 첨부파일을 생성하십시오.,
     * 파일 이름을 'mems.txt'로 덮어쓰십시오.
     * 자세한 내용은 여기서 확인 할 수 있습니다.
     * http://discord-kr.js.org/#/docs/main/master/class/MessageAttachment
     */
    const attachment = new MessageAttachment(buffer, "memes.txt");
    // 메세지와 첨부파일을 메세지 채널에 함께 보냅니다.
    message.channel.send(`${message.author}, 밈이 여기있어요!`, attachment);
  }
});

// https://discordapp.com/developers/applications/me 에 있는 토큰을 이용하여 봇에 로그인하세요.
client.login("토큰을 이곳에 입력하세요");
```

결과는 이렇습니다:

![Attachment File example 3](/static/attachment-example3.png)

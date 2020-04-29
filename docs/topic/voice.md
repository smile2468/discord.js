# 음성 기능 소개

discord.js 에서의 음성 기능은 다양한 방법으로 사용될 수 있습니다. 예를 들어, 뮤직봇이나 녹음하거나 오디오를 스트리밍 할
수 있습니다.

discord.js 에서 `음성채널(VoiceChannel)`에 연결하면 음성을 사용하여 오디오를 스트리밍하고 수신할 수 있는 `음성연결(Voice Connection)`을 얻을 수 있습니다.

시작하기 위해, 다음을 확인해주시길 바랍니다:

- FFmpeg - `npm install ffmpeg-static`
- opus 인코더는 다음 중에 골라주시길 바랍니다:
  - `npm install @discordjs/opus` (더 나은 성능)
  - `npm install opusscript`
- 좋은 인터넷 연결 상태

추천하는 opus 엔진은 @discordjs/opus입니다. opusscript보다 훨씬 원할하게 작동합니다. 만약 두 개 모두 사용이 가능할 경우,
discord.js 는 자동적으로 @discordjs/opus 를 선택합니다.
opusscript를 사용하는 경우에는 단지 @discordjs/opus를 사용하기 힘든 개발환경에서만 권장됩니다.
개발용 봇의 경우 @discordjs/opus 사용은 필수사항이여야 하며, 특히 여러 길드에서 실행될 경우 더욱 그러해야 합니다.

## 음성 채널에 접속하기

아래 예시는 메세지에 응답하여, 메세지 전송자의 음성 채널에 에러를 확인하지 않고 접속합니다. 이 사항은 중요합니다.
오디오를 스트리밍할 수 있는 `음성연결(VoiceConnection)`을 얻을 수 있기 때문이다.

```js
const Discord = require("discord.js");
const client = new Discord.Client();

client.login("토큰");

client.on("message", async message => {
  // 음성 기능은 길드에서만 작동됩니다. 길드가 아닐 경우,
  // 무시합니다.
  if (!message.guild) return;

  if (message.content === "/join") {
    // 유저의 음성 채널이 존재하는 경우에만 음성채널에 접속을 시도합니다.
    if (message.member.voice.channel) {
      const connection = await message.member.voice.channel.join();
    } else {
      message.reply("음성 채널에 먼저 접속해주세요!");
    }
  }
});
```

## 음성채널에 스트리밍하기

위 예시에서, 어떻게 음성채널에 접속하여 `음성연결VoiceConnection`을 얻을 수 있는 지 알아보았습니다. 음성연결을 제공 받았
다면,
오디오 스트리밍을 시작할 수 있습니다.

### 음성연결에 플레이하기

음성연결을 통해 오디오를 재생하는 가장 일반적인 예시는 로컬파일입니다.

```js
const dispatcher = connection.play("/home/discord/audio.mp3");
```

여기서의 `dispatcher`는 `StreamDispatcher` 입니다. - 이것으로 음성연결의 볼륨 및 재생상황 제어할 수 있습니다.

```js
dispatcher.pause();
dispatcher.resume();

dispatcher.setVolume(0.5); // 볼륨을 절반으로 줄입니다.

dispatcher.on("finish", () => {
  console.log("재생이 종료되었습니다!");
});

dispatcher.destroy(); // 재생을 종료합니다.
```

또한, 먼저 재생을 시작할 때, 옵션을 설정할 수도 있습니다.

```js
const dispatcher = connection.play("/home/discord/audio.mp3", {
  volume: 0.5
});
```

### 무엇을 재생할 수 있을까요?

Discord.js 는 다음을 재생하게 해줍니다.

```js
// 재생 가능한 스트림, 예를 들어 유튜브 오디오입니다.
const ytdl = require("ytdl-core");
connection.play(
  ytdl("https://www.youtube.com/watch?v=ZlAU_w7-Xp8", { filter: "audioonly" })
);

// 인터넷에 있는 파일
connection.play("http://www.sample-videos.com/audio/mp3/wave.mp3");

// 로컬 파일
connection.play("/home/discord/audio.mp3");
```

v12의 새로운 기능은 Ffmpeg 대신 훨씬 더 나은 성능으로 OggOpus와 WebmOpus 으로 스트림을 재생하는 기능입니다. 이는 스트림
에 대한 볼륨 제어를 더 이상 지원하지 않는다는 점에 유의하십시오.

```js
connection.play(fs.createReadStream("./media.webm"), {
  type: "webm/opus"
});

connection.play(fs.createReadStream("./media.ogg"), {
  type: "ogg/opus"
});
```

재생할 수 있는 모든 목록은 문서를 참조하십시오. 여기에는 더 쓸게 너무 많아서요!

## 음성 보르드케스트

음성 보르드케스트은 여러 채널에서 동일한 오디오를 재생하는 "라디오" 봇에 매우 유용합니다. 오디오가 한 번만 변환되고, 성
능이 훨씬 좋습니다.

```js
const broadcast = client.voice.createBroadcast();

broadcast.on("subscribe", dispatcher => {
  console.log("새로운 보르드케스트 구독자!");
});

broadcast.on("unsubscribe", dispatcher => {
  console.log("채널에서 보르드케스트 구독을 취소했습니다 :(");
});
```

`broadcast`는 `VoiceBroadcast`의 한 예로서, `)`에 연결하면 음성을 사용하여 오디오를 스트리밍하고 수신할 수 있는 `음성연 결(VoiceConnection)`을 얻을 수 있습니다.

시작하기 위해, 다음을 확인해주시길 바랍니다:

- FFmpeg - `npm install ffmpeg-static`
- opus 인코더, 다음 중에 골라주시길 바랍니다:
  - `npm install @discordjs/opus` (더 나은 성능)
  - `npm install opusscript`
- 좋은 인터넷 연결 상태

추천하는 opus 엔진은 @discordjs/opus입니다. opusscript보다 훨씬 원할하게 작동합니다. 만약 두 개 모두 사용이 가능할 경우,
discord.js 는 자동적으로 @discordjs/opus 를 선택합니다.
opusscript를 사용하는 경우에는 단지 @discordjs/opus를 사용하기 힘든 개발환경에서만 권장됩니다.
개발용 봇의 경우 @discordjs/opus 사용은 필수사항이여야 하며, 특히 여러 길드에서 실행될 경우 더욱 그러해야 합니다.

## 음성 채널에 접속하기

아래 예시는 메세지에 응답하여, 메세지 전송자의 음성 채널에 에러를 확인하지 않고 접속합니다. 이 사항은 중요합니다.
오디오를 스트리밍할 수 있는 `음성연결(VoiceConnection)`을 얻을 수 있기 때문이다.

```js
const Discord = require("discord.js");
const client = new Discord.Client();

client.login("토큰");

client.on("message", async message => {
  // 음성 기능은 길드에서만 작동됩니다. 길드가 아닐 경우,
  // 무시합니다.
  if (!message.guild) return;

  if (message.content === "/join") {
    // 유저의 음성 채널이 존재하는 경우에만 음성채널에 접속을 시도합니다.
    if (message.member.voice.channel) {
      const connection = await message.member.voice.channel.join();
    } else {
      message.reply("음성 채널에 먼저 접속해주세요!");
    }
  }
});
```

## 음성채널에 스트리밍하기

위 예시에서, 어떻게 음성채널에 접속하여 `음성연결VoiceConnection`을 얻을 수 있는 지 알아보았습니다. 음성연결을 제공 받았
다면,
오디오 스트리밍을 시작할 수 있습니다.

### 음성연결에 플레이하는 방법

음성연결을 통해 오디오를 재생하는 가장 일반적인 예시는 로컬파일입니다.

```js
const dispatcher = connection.play("/home/discord/audio.mp3");
```

여기서의 `dispatcher`는 `StreamDispatcher` 입니다. - 이것으로 음성연결의 볼륨 및 재생상황 제어할 수 있습니다.

```js
dispatcher.pause();
dispatcher.resume();

dispatcher.setVolume(0.5); // 볼륨을 절반으로 줄입니다.

dispatcher.on("finish", () => {
  console.log("재생이 종료되었습니다!");
});

dispatcher.destroy(); // 재생을 종료합니다.
```

또한, 먼저 재생을 시작할 때, 옵션을 설정할 수도 있습니다.

```js
const dispatcher = connection.play("/home/discord/audio.mp3", {
  volume: 0.5
});
```

### 무엇을 재생할 수 있을까요?

Discord.js 는 다음을 재생하게 해줍니다.

```js
// 재생 가능한 스트림, 예를 들어 유튜브 오디오입니다.
const ytdl = require("ytdl-core");
connection.play(
  ytdl("https://www.youtube.com/watch?v=ZlAU_w7-Xp8", { filter: "audioonly" })
);

// 인터넷에 있는 파일
connection.play("http://www.sample-videos.com/audio/mp3/wave.mp3");

// 로컬 파일
connection.play("/home/discord/audio.mp3");
```

v12의 새로운 기능은 Ffmpeg 대신 훨씬 더 나은 성능으로 OggOpus와 WebmOpus 으로 스트림을 재생하는 기능입니다. 이는 스트림
에 대한 볼륨 제어를 더 이상 지원하지 않는다는 점에 유의하십시오.

```js
connection.play(fs.createReadStream("./media.webm"), {
  type: "webm/opus"
});

connection.play(fs.createReadStream("./media.ogg"), {
  type: "ogg/opus"
});
```

재생할 수 있는 모든 목록은 문서를 참조하십시오. 여기에는 더 쓸게 너무 많아서요!

## 음성 보르드케스트하기

음성 보르드케스트은 여러 채널에서 동일한 오디오를 재생하는 "라디오" 봇에 매우 유용합니다. 오디오가 한 번만 변환되고, 성
능이 훨씬 좋습니다.

```js
const broadcast = client.voice.createBroadcast();

broadcast.on("subscribe", dispatcher => {
  console.log("새로운 보르드케스트 구독자!");
});

broadcast.on("unsubscribe", dispatcher => {
  console.log("채널에서 보르드케스트 구독을 취소했습니다 :(");
});
```

`broadcast`는 `VoiceBroadcast`의 한 예로서, 일반 VoiceConnections 과 같은 `play` 메서드를 사용합니다.

```js
const dispatcher = broadcast.play("./audio.mp3");

connection.play(broadcast);
```

위에 저장된 `dispatcher`는 BroadcastDispatcher라는 점을 유의해야 한다. - 이것은 보르드케스트에 등록되어 있는 모든 음성을
통제한다. 예를 들어, 이 볼륨 설정은 모든 음성의 볼륨에 영향을 미친다.

## 음성 수신

곧 찾아뵙겠습니다!
coming soon&trade;

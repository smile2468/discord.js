# 웹 빌드
일반적인 Node.js 애플리케이션 외에도 discord.js에는 웹 브라우저에서 실행할 수 있는 특별한 배포 버전이 있습니다..
이것은 Discord API와 상호작용이 필요한 클라이언트측 웹 앱에 유용합니다.
[Webpack 3](https://webpack.js.org/) 는 이걸 빌드할 때 필요합니다.

## 제한

- 웹 브라우저가 지원하지 않는 외부 기본 라이브러리 없이는 오디오 인코딩/디코딩 기능이 없기에 현재 보이스 관련 기능은 사
용할 수 없습니다.
-  ShardingManager도 사용할 수 없습니다. 왜냐하면 child process를 만드는것에만 의존하기 때문입니다.
- 어떤 기본 패키지도 사용할 수 없습니다.

### 필요한 라이브러리

만약 웹팩 프로젝트를 개발할경우, discord.js를 사용하면 `discord.js/browser`를 사용할 수 있습니다. 다음처럼 말이죠:
```js
const Discord = require('discord.js/browser');
// 디스코드로 평소처럼 하세요
```

### 웹팩 파일

GitHub 저장소의 [webpack branch](https://github.com/discordjs/discord.js/tree/webpack)  에서 원하는 버전의 discord.js 웹
 빌드를 얻을 수 있습니다. 라이브러리의 각 지점과 버전에 대한 파일이 있으며, `.min.js`로 끝나는 파일은 소스코드의 크기를 실질
적으로 줄이기 위해 압축됩니다.

다른 JS 라이브러리와 마찬가지로 다음 코드를 포함하면 됩니다.
```html
<script type="text/javascript" src="discord.VERSION.min.js"></script>
```
`require('discord.js')`로 discord.js를 이용하면 전체 `디스코드`를 전역(window)으로 사용할 수 있습니다. API의 사용은 Node.js
에서 사용하는 것과 조금도 다르지 않습니다.

#### 예시

```html
<script type="text/javascript" src="discord.11.1.0.min.js"></script>
<script type="text/javascript">
  const client = new Discord.Client();

  client.on('message', msg => {
    const guildTag = msg.channel.type === 'text' ? `[${msg.guild.name}]` : '[DM]';
    const channelTag = msg.channel.type === 'text' ? `[#${msg.channel.name}]` : '';
    console.log(`${guildTag}${channelTag} ${msg.author.tag}: ${msg.content}`);
  });

  client.login('토큰');
</script>
```
# 자주 물어보는 질문

이 질문들은 가장 자주 물어보는 것들입니다.

## `SyntaxError: Block-scoped declarations (let, const, function, class) not yet supported outside strict mode` 에러를 신경쓰지마시길 바랍니다

Node.js 12.0.0 또는 더 최신 버전으로 업데이트하시면 이 에러는 해결됩니다

## 보이스는 어떻게 작동하게 하나요?

- FFMPEG를 설치합니다.
- `@discordjs/opus` 패키지 또는 `opusscript` 패키지를 설치합니다.
  @discordjs/opus는 성능이 현저하게 향상되었기 때문에 크게 선호된다.

## FFMPEG는 어떻게 설치하나요?

- **npm:** `npm install ffmpeg-static`
- **Ubuntu 16.04:** `sudo apt install ffmpeg`
- **Ubuntu 14.04:** `sudo apt-get install libav-tools`
- **Windows:** `npm install ffmpeg-static` 또는 [AoDude의 가이드에서 FFMPEG 섹션(영문)](https://github.com/bdistin/OhGodMusicBot/blob/master/README.md#download-ffmpeg)을 확인해보시길 바랍니다.

## @discordjs/opus를 어떻게 설정하나요?

- **Ubuntu:** 간단하게 `npm install @discordjs/opus`, 를 실행하고 끝입니다. 축하합니다!
- **Windows:** `npm install --global --production windows-build-tools` 를 매니저 명령어 프롬포트 또는 PowerShell 에서
  실행하시길 바랍니다
  그리고 `npm install @discordjs/opus` 를 실행하면 봇 디랙토리는 성공적으로 빌드할것입니다. 우후!

다른 질문들은 [공식 Discord.js 가이드(영문)](https://discordjs.guide/popular-topics/common-questions.html) 에서 찾을 수
있습니다.
만약 이곳에 써있지 않은 이슈가 있다면, 편하게 [공식 Discord.js 길드(영문)](https://discord.gg/bRCvFy9) 방문해보세셔도
됩니다.
항상 [문서](https://discord.js.org/#/docs/main/stable/general/welcome)를 먼저 읽어보시길 바랍니다.
(한국어 도움이 필요하시다면 [한국어 비공식 Discord.js 길드](https://discord.gg/TwZeg6z) 에서 도와드리겠습니다!)

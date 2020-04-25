<div align="center">
  <br />
  <p>
      <a href="https://discord.js.org"><img src="https://discord.js.org/static/logo.svg" width="546" alt="discord.js" /></a>

  </p>
  <br />
  <p>
    <a href="https://discord.gg/bRCvFy9"><img src="https://discordapp.com/api/guilds/222078108977594368/embed.png" alt="Discord server" /></a>
    <a href="https://www.npmjs.com/package/discord.js"><img src="https://img.shields.io/npm/v/discord.js.svg?maxAge=3600" alt="NPM version" /></a>
    <a href="https://www.npmjs.com/package/discord.js"><img src="https://img.shields.io/npm/dt/discord.js.svg?maxAge=3600" alt="NPM downloads" /></a>
    <a href="https://travis-ci.org/discordjs/discord.js"><img src="https://travis-ci.org/discordjs/discord.js.svg" alt="Build status" /></a>
    <a href="https://david-dm.org/discordjs/discord.js"><img src="https://img.shields.io/david/discordjs/discord.js.svg?maxAge=3600" alt="Dependencies" /></a>
    <a href="https://www.patreon.com/discordjs"><img src="https://img.shields.io/badge/donate-patreon-F96854.svg" alt="Patreon" /></a>
  </p>
  <p>
    <a href="https://nodei.co/npm/discord.js/"><img src="https://nodei.co/npm/discord.js.png?downloads=true&stars=true" alt="NPM info" /></a>
  </p>
</div>

# 환영합니다!

discord.js v12 문서에 오신 걸을 환영합니다!

## 머릿말

discord.js 는 강력한 [Node.js](https://nodejs.org) 모듈로써 [디스코드 API](https://discordapp.com/developers/docs/intro)와 쉽게 상호작용하게 해줍니다.

- 객체 지향적
- 빠르고 효율적
- 다양한 기능
- 유연함
- 100% Promise 기반

## 설치

**12.0.0 버전 이상의 Node.js 가 요구됩니다**
모두 선택 사항이기 때문에 비적합한 동위 종속성(unmet peer dependencies)에 대한 모든 경고를 무시하시길 바랍니다.
음성 기능이 필요 없다면: `npm install discord.js`
음성 기능과 함께: ([@discordjs/opus](https://www.npmjs.com/package/@discordjs/opus)): `npm install discord.js @discordjs/opus`
음성 기능과 함께: ([opusscript](https://www.npmjs.com/package/opusscript)): `npm install discord.js opusscript`

### 오디오 엔진

추천하는 opus 엔진은 @discordjs/opus입니다. opusscript보다 훨씬 원할하게 작동합니다. 만약 두 개 모두 사용이 가능할 경우, discord.js 는 자동적으로 @discordjs/opus 를 선택합니다.
opusscript를 사용하는 경우에는 단지 @ discordjs/opus를 사용하기 힘든 개발환경에서만 권장됩니다.
개발용 봇의 경우 @discordjs/opus 사용은 필수사항이여야 하며, 특히 여러 길드에서 실행될 경우 더욱 그러해야 합니다.

### 선택적인 패키지들

- [zlib-sync](https://www.npmjs.com/package/zlib-sync) 웹소켓 데이터 압축 및 가속 (`npm install zlib-sync`)
- [erlpack](https://github.com/discordapp/erlpack) 훨씬 더 빠른 웹소켓 데이터 (de)serialisation (`npm install discordapp/erlpack`)
- 다음 패키지들 중 하나는 더 빠른 패킷 암호화 및 암호 해독을 위해 설치될 수 있습니다:
  - [sodium](https://www.npmjs.com/package/sodium) (`npm install sodium`)
  - [libsodium.js](https://www.npmjs.com/package/libsodium-wrappers) (`npm install libsodium-wrappers`)
- [bufferutil](https://www.npmjs.com/package/bufferutil) 훨씬 더 빠른 웹소켓 연결 (`npm install bufferutil`)
- [utf-8-validate](https://www.npmjs.com/package/utf-8-validate) 훨씬 빠른 웹소켓 처리를 위해 `bufferutil`과 조합 (`npm install utf-8-validate`)

## 예시

```js
const Discord = require("discord.js");
const client = new Discord.Client();
client.on("ready", () => {
  console.log(`${client.user.tag}에 로그인하였습니다!`);
});
client.on("message", msg => {
  if (msg.content === "핑") {
    msg.reply("퐁!");
  }
});
client.login("토큰");
```

## 관련링크

- [공식 웹사이트 (영문)](https://discord.js.org/) ([source](https://github.com/discordjs/website))
- [공식 문서 (영문)](https://discord.js.org/#/docs/main/master/general/welcome)
- [가이드 (영문)](https://discordjs.guide/) ([source](https://github.com/discordjs/guide)) - this is still for stable  
  또한 [업데이트 가이드 (영문)](https://discordjs.guide/additional-info/changes-in-v12.html) 의 진행중인 작업을 확인하시길 바랍니다. 라이브러리에서 업데이트되거나 제거된 항목들을 포함합니다.
- [Discord.js 공식 디스코드 길드 (영문)](https://discord.gg/bRCvFy9)
- [디스코드 API 디스코드 길드](https://discord.gg/discord-api)
- [GitHub](https://github.com/discordjs/discord.js)
- [NPM](https://www.npmjs.com/package/discord.js)
- [관련된 라이브러리들](https://discordapi.com/unofficial/libs.html)
- [Discord.js 비공식 한국 디스코드 길드](https://discord.gg/TwZeg6z)

### 확장

- [RPC](https://www.npmjs.com/package/discord-rpc) ([source](https://github.com/discordjs/RPC))

## 기여하기

이슈를 작성하기 전에 아직 보고/제안되지 않았는지 확인하고 해당 이슈를 다시 확인하십시오.
[문서](https://discord.js.org/#/docs).  
PR를 등록하고 싶으시다면 [기여 가이드](https://github.com/discordjs/discord.js/blob/master/.github/CONTRIBUTING.md)를 먼저 확인해보시길 바랍니다.

## 도움

문서에 있는 내용을 이해하지 못하거나, 문제가 발생한다면 부드럽게 처리하면 됩니다.
올바른 방향으로 나아가세요. 주저하지 마시고 공식 [Discord.js 길드 (영문)](https://discord.gg/bRCvFy9)를 방문하시길 바랍니다.

- [Discord.js 비공식 한국 디스코드 길드](https://discord.gg/TwZeg6z)

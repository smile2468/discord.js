# 버전 12.0.0

12.0.0 버전은 많은 새롭고 개선된 기능들과 최적화, 버그 픽스들이 이루어져 있습니다.
[변경 로그](https://github.com/discordjs/discord.js/releases/tag/12.0.0) 에 모든 변경 사항들이 있습니다.
당신은 또한 [가이드](https://discordjs.guide/additional-info/changes-in-v12.html) 를 참고해 당신의 v11 코드를 v12 로 업
데이트 할 수 있습니다.

# 버전 11.1.0

v11.1.0 은 게이트웨이와 음성 기능이 안정되고 개선되었습니다 또한 감사 로그 및 메시지 검색과 같은 새로운 기능을 지원합니
다.
[변경 로그](https://github.com/discordjs/discord.js/releases/tag/11.1.0) 에 모든 변경 사항들과 사용 중지된 기능들이 포함
되어 있습니다.

# 버전 11

버전 11 은 새로운 기능과 향상된 기능, 최적화 및 버그 수정이 포함되어 있습니다.
[변경 로그](https://github.com/discordjs/discord.js/releases/tag/11.0.0) 에 모든 변경 사항들이 있습니다.

## 증요한 사항

- 메세지 반응과 임베드 (풍부한 글)
- 성능 향상을 위해 uws 와 erlpack 지원
- OAuth 애플리케이션 지원
- 웹 배포

## 주요 변경

### Client.login() - 더이상 이메일 + 패스워드 로그인을 지원하지 않습니다.

적절한 토큰 지원이 출현한 이후 이메일과 암호로 로그인하는 것은 항상 크게 좌절되었지만, v11에서는 Hammer & Chisel이 공식
적으로 해서는 [안 된다고 언급](https://github.com/hammerandchisel/discord-api-docs/issues/69#issuecomment-223886862)했기
때문에 기능을 완전히 제거하기로 결정했습니다.

사용자 계정은 봇 계정처럼 토큰으로 로그인할 수 있습니다. 사용자 계정에 대한 토큰을 얻으려면 해당 계정으로 Discord에 로그
인하고 Ctrl + Shift + I를 사용하여 개발자 도구를 열 수 있습니다. 콘솔 탭에서 `localStorage.token`를 평가하면 해당 계정에
대한 토큰이 제공됩니다.

### ClientUser.setEmail()/setPassword()에는 현재 암호와 사용자 계정의 setUsername()이 필요합니다.

e-메일 및 비밀번호로 더 이상 로그인할 수 없으므로 사용자 계정(셀프봇)에 대한 `setEmail()`과 `setPassword()` 및 `setUsern ame()` 메서드에 현재 계정 비밀번호를 입력해야 합니다.

### 제거 : TextBasedChannel.sendTTSMessage()

이 방법은 사실상 아무도 사용하지 않는 전혀 무의미한 지름길로 여겨졌습니다.
`send()` 또는 `SendMessage()` 옵션을 사용하면 동일한 결과를 얻을 수 있습니다.

예시:

```js
channel.send("안녕!", { tts: true });
```

### Collection.find()/exists()를 ID와 함께 사용하면 오류가 발생합니다.

이것은 단순히 자주 일어나는 흔한 실수를 막기 위한 것입니다.
ID를 사용하여 무언가를 찾거나 존재 여부를 확인하려면 [ES6 지도 클래스](https://developer.mozilla.org/en/docs/Web/JavaScr
ipt/Reference/Global_Objects/Map)의 일부인 `.get()`와 `.has()`를 사용해야 하며, 이는 컬렉션의 extension입니다.

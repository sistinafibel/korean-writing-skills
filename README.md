# korean-writing-skills

Claude Code 같은 코딩 에이전트가 한국어 문장과 커밋, PR 문서를 일관된 기준으로 쓰게 하는 스킬셋입니다. 스킬 두 개가 서로를 참조하도록 묶여 있어서, 에이전트가 답변을 쓸 때와 커밋이나 PR을 쓸 때 같은 문장 기준을 따릅니다.

| 스킬 | 다루는 것 |
|------|-----------|
| `natural-korean` | 한국어 답변, 문서, 화면 문구의 문장 지침입니다. 문장 성분과 조사를 생략하지 않게 하고, AI가 쓴 글에서 반복되는 문형('단순히 A가 아니라 B이다', '~하는 순간 ~된다', 불필요한 '우리', 거창한 수식어, 같은 내용의 반복 정리)을 피하게 합니다. |
| `git-writing-korean` | 커밋 메시지와 PR 문서의 작성 기준입니다. 커밋 타입 목록, 명사형으로 끝나는 제목(추가, 숨김), 고정된 PR 본문 절(작업 배경, 변경 사항, 배포 참고 사항, 확인 사항), 사용하지 않는 어휘와 기호(가운뎃점, 엠대시, 엔대시, 화살표)를 정합니다. 작성한 초안은 올리기 전에 natural-korean의 조항으로 검사합니다. |

## 만든 이유

저장소가 여러 개가 되면 커밋 메시지와 PR 본문이 그때그때 다르게 쓰입니다. 같은 사람이 쓴 저장소들에서도 새 기능 타입이 `feat`과 `feature`로 갈리고, 제목이 "추가", "뺌", "맞추기", "더한다"처럼 서로 다른 형태로 끝나고, PR 본문의 절 이름이 요약, 변경 내용, 검증, 테스트 계획으로 PR마다 달랐습니다. 에이전트에게 커밋과 PR을 맡기면 이 차이가 더 빨리 늘어납니다. 이 스킬셋은 문장 기준과 문서 구조를 한 곳에서 정해서, 사람이 쓰든 에이전트가 쓰든 같은 형식의 기록이 남게 합니다.

## 설치

### Claude Code 플러그인으로 설치

Claude Code에서 아래 두 명령을 차례로 입력합니다.

```
/plugin marketplace add sistinafibel/korean-writing-skills
/plugin install korean-writing@korean-writing-skills
```

설치하면 두 스킬이 `korean-writing:natural-korean`, `korean-writing:git-writing-korean`이라는 이름으로 등록됩니다.

### 스킬 폴더에 직접 복사

플러그인을 쓰지 않는다면 `plugins/korean-writing/skills/` 아래의 두 폴더를 `~/.claude/skills/`로 복사합니다. 프로젝트 하나에만 적용하려면 그 프로젝트의 `.claude/skills/`로 복사합니다.

### 항상 적용되게 하기

스킬은 에이전트가 필요하다고 판단할 때 불러옵니다. 커밋과 PR을 쓸 때마다 확실히 적용되게 하려면 `CLAUDE.md`나 `AGENTS.md`에 아래처럼 한 줄을 적어 둡니다.

```markdown
커밋 메시지, PR 제목, PR 본문은 git-writing-korean 스킬을 읽고 그 기준대로 쓴다.
```

## 저장소에 함께 맞춰 둘 것

`git-writing-korean`은 저장소의 commitlint 설정과 PR 템플릿이 스킬보다 우선한다고 정합니다. 그래서 저장소 쪽 설정이 스킬과 다르면 스킬 기준이 적용되지 않습니다. 기준을 여러 저장소에 적용할 때에는 다음 두 가지 설정도 함께 변경합니다.

- `commitlint.config.*`의 `type-enum`: `feature`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `ci`, `deploy`
- `.github/pull_request_template.md`: 작업 배경, 변경 사항, 배포 참고 사항, 확인 사항

PR 템플릿에 넣을 절 구성은 [git-writing-korean 스킬](plugins/korean-writing/skills/git-writing-korean/SKILL.md)에 있습니다.

## 출처

`natural-korean`은 [snflkd/fluent-korean](https://github.com/snflkd/fluent-korean)의 조항을 그대로 포함하고 그 위에 새 조항을 더한 통합본입니다. fluent-korean의 라이선스 전문은 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 있습니다.

## 라이선스

[MIT](LICENSE)

# korean-writing-skills

Claude Code 같은 코딩 에이전트가 한국어 문장과 커밋, PR 문서를 일관된 기준으로 쓰게 하는 스킬셋입니다. 스킬 두 개가 서로를 참조하도록 묶여 있어서, 에이전트가 답변을 쓸 때와 커밋이나 PR 을 쓸 때 같은 문장 기준을 따릅니다.

| 스킬 | 다루는 것 |
|------|-----------|
| `natural-korean` | 한국어 답변, 문서, 화면 문구의 문장 지침입니다. 문장 성분과 조사를 생략하지 않게 하고, AI 가 쓴 글에서 반복되는 문형('단순히 A가 아니라 B이다', '~하는 순간 ~된다', 불필요한 '우리', 거창한 수식어, 같은 내용의 반복 정리)을 피하게 합니다. |
| `git-writing-korean` | 커밋 메시지와 PR 문서의 작성 기준입니다. 커밋 타입 목록, 명사형으로 끝나는 제목(추가, 숨김), 고정된 PR 본문 절(작업 배경, 변경 사항, 배포 참고 사항, 확인 사항), 사용하지 않는 어휘와 기호(가운뎃점, 엠대시, 엔대시, 화살표)를 정합니다. 작성한 초안은 올리기 전에 natural-korean 의 조항으로 검사합니다. |

스킬을 넣지 않았을 때와 넣었을 때의 출력이 어떻게 다른지는 [벤치마크](#벤치마크) 절에서 실제 출력으로 확인할 수 있습니다.

## 만든 이유

저장소가 여러 개가 되면 커밋 메시지와 PR 본문이 그때그때 다르게 쓰입니다. 같은 사람이 쓴 저장소들에서도 새 기능 타입이 `feat` 과 `feature` 로 갈리고, 제목이 "추가", "뺌", "맞추기", "더한다"처럼 서로 다른 형태로 끝나고, PR 본문의 절 이름이 요약, 변경 내용, 검증, 테스트 계획으로 PR 마다 달랐습니다. 에이전트에게 커밋과 PR 을 맡기면 이 차이가 더 빨리 늘어납니다. 이 스킬셋은 문장 기준과 문서 구조를 한 곳에서 정해서, 사람이 쓰든 에이전트가 쓰든 같은 형식의 기록이 남게 합니다.

## 설치

### Claude Code 플러그인으로 설치

Claude Code 에서 아래 두 명령을 차례로 입력합니다.

```
/plugin marketplace add sistinafibel/korean-writing-skills
/plugin install korean-writing@korean-writing-skills
```

설치하면 두 스킬이 `korean-writing:natural-korean`, `korean-writing:git-writing-korean` 이라는 이름으로 등록됩니다.

### 스킬 폴더에 직접 복사

플러그인을 쓰지 않는다면 `plugins/korean-writing/skills/` 아래의 두 폴더를 `~/.claude/skills/` 로 복사합니다. 프로젝트 하나에만 적용하려면 그 프로젝트의 `.claude/skills/` 로 복사합니다.

### 항상 적용되게 하기

스킬은 에이전트가 필요하다고 판단할 때 불러옵니다. 커밋과 PR 을 쓸 때마다 확실히 적용되게 하려면 `CLAUDE.md` 나 `AGENTS.md` 에 아래처럼 한 줄을 적어 둡니다.

```markdown
커밋 메시지, PR 제목, PR 본문은 git-writing-korean 스킬을 읽고 그 기준대로 쓴다.
```

## 저장소에 함께 맞춰 둘 것

`git-writing-korean` 은 저장소의 commitlint 설정과 PR 템플릿이 스킬보다 우선한다고 정합니다. 그래서 저장소 쪽 설정이 스킬과 다르면 스킬 기준이 적용되지 않습니다. 기준을 여러 저장소에 적용할 때에는 다음 두 가지 설정도 함께 변경합니다.

- `commitlint.config.*` 의 `type-enum`: `feature`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `ci`, `deploy`
- `.github/pull_request_template.md`: 작업 배경, 변경 사항, 배포 참고 사항, 확인 사항

PR 템플릿에 넣을 절 구성은 [git-writing-korean 스킬](plugins/korean-writing/skills/git-writing-korean/SKILL.md)에 있습니다.

## 벤치마크

2026-11-24 에 실행한 결과에서 이후 스킬의 출력은 규칙 위반이 한 건도 없었고, 설명 답변과 화면 문구는 블라인드 판정에서도 세 조건 가운데 가장 높게 평가되었습니다. 그러나 전체 케이스의 블라인드 순위 평균은 세 조건이 거의 같았고, 글을 고쳐 쓰는 케이스와 커밋, PR 케이스에서는 이후 스킬이 더 낮게 평가되었습니다. 낮게 평가된 이유와 스킬에 반영을 검토할 점은 [eval/results/2026-11-24/notes.md](eval/results/2026-11-24/notes.md) 에 정리되어 있습니다.

<!-- benchmark:start -->

같은 모델(`claude-sonnet-5-5`)에 같은 입력을 보내고 시스템 프롬프트에 넣는 지침만 바꿔서 출력을 비교했습니다. 케이스 12개를 조건마다 3번씩 생성했고, 실행한 날짜는 2026-11-24 입니다. 조건 이름은 지침이 없는 조건을 "처음", fluent-korean 원본만 넣은 조건을 "이전 스킬", 이 저장소의 최신 스킬 두 개를 넣은 조건을 "이후 스킬"로 표기합니다.

| 조건 | 시스템 프롬프트에 넣은 지침 | 출력 1건당 규칙 위반 수 | 블라인드 순위 평균 (1~3, 낮을수록 좋음) | 시스템 프롬프트 토큰 수 |
| --- | --- | --- | --- | --- |
| 처음 | 없음 | 1.14 | 2.00 | 0 |
| 이전 스킬 | fluent-korean 원본 | 1.31 | 1.97 | 2,602 |
| 이후 스킬 | 이 저장소의 natural-korean 과 git-writing-korean | 0.00 | 2.03 | 11,470 |

규칙 위반 수는 사용하지 않는 기호와 상투적인 문형, 커밋과 PR 의 형식 기준을 스크립트로 센 값입니다. 커밋 타입이나 절 이름처럼 이 저장소의 스킬만 정하고 있는 기준이 포함되어 있으므로, 그 기준을 받지 않은 두 조건의 수치가 높게 나오는 것은 당연한 결과입니다. 블라인드 순위는 이 기준을 받지 않은 판정 모델(`claude-opus-5-5`)이 조건 이름을 가린 출력을 명확성, 자연스러움, 정보량, 지시 준수로 평가해서 정한 순위이고, 순서를 뒤집어서 두 번 판정한 값의 평균입니다. 판정 기준과 케이스별 수치, 전체 출력은 [eval/](eval/README.md) 와 [eval/results/2026-11-24/summary.md](eval/results/2026-11-24/summary.md), [eval/results/2026-11-24/side-by-side.md](eval/results/2026-11-24/side-by-side.md) 에 있습니다.

### 같은 입력에 대한 세 조건의 출력

갈래마다 첫 번째 케이스의 첫 번째 생성 결과를 실었습니다. 결과를 보고 고른 출력이 아니므로 이후 스킬에 불리한 출력도 그대로 실려 있습니다. 출력은 모델이 쓴 Markdown 원문을 고치지 않고 글자 그대로 표시했고, 1,200자를 넘는 출력은 앞부분만 싣고 전체 파일을 링크했습니다. Markdown 이 적용된 모습과 나머지 생성 결과는 [eval/results/2026-11-24/side-by-side.md](eval/results/2026-11-24/side-by-side.md) 에서 볼 수 있습니다.

#### 설명 답변: CI 에서만 실패하는 빌드의 원인 설명

<details>
<summary>입력 보기</summary>

`````text
CI 에서만 빌드가 실패합니다. 로컬(macOS)에서는 `pnpm build` 가 잘 되는데 GitHub Actions(ubuntu-latest)에서는 아래 오류가 납니다. 원인이 무엇이고 어떻게 고치면 되는지 설명해 주세요.

```
src/features/booking/BookingForm.tsx:4:28 - error TS2307: Cannot find module '@/lib/dateFormat' or its corresponding type declarations.

4 import { formatDate } from '@/lib/dateFormat';
                             ~~~~~~~~~~~~~~~~~~

Found 1 error in src/features/booking/BookingForm.tsx:4
```

`src/lib` 폴더에는 이런 파일이 있습니다.

```
src/lib/DateFormat.ts
src/lib/currency.ts
src/lib/http.ts
```

tsconfig.json 의 paths 는 `"@/*": ["./src/*"]` 입니다.
`````

</details>

<table>
<tr><th width="33%">처음</th><th width="33%">이전 스킬</th><th width="33%">이후 스킬</th></tr>
<tr>
<td valign="top">
## 원인<br>
<br>
**파일명의 대소문자 불일치**입니다.<br>
<br>
- 실제 파일: `src/lib/DateFormat.ts` (대문자 D, F)<br>
- import 경로: `@/lib/dateFormat` (소문자 d)<br>
<br>
macOS의 기본 파일시스템(APFS/HFS+)은 **대소문자를 구분하지 않아서(case-insensitive)** `dateFormat`으로 써도 `DateFormat.ts`를 찾아 줍니다. 반면 GitHub Actions의 ubuntu-latest(ext4)는 **대소문자를 구분하므로(case-sensitive)** `dateFormat.ts`를 찾지 못하고 TS2307 오류가 납니다. paths 설정(`"@/*": ["./src/*"]`)은 정상이고 문제와 무관합니다.<br>
<br>
## 해결 방법<br>
<br>
방법은 두 가지이며, 보통 **1번(import 수정)** 이 가장 간단합니다.<br>
<br>
### 1. import를 실제 파일명에 맞추기<br>
<br>
```ts<br>
import { formatDate } from '@/lib/DateFormat';<br>
```<br>
<br>
### 2. 파일명을 다른 파일들의 컨벤션에 맞게 소문자로 바꾸기<br>
<br>
`currency.ts`, `http.ts`가 모두 camelCase/소문자 시작이므로 `dateFormat.ts`로 통일하는 편이 일관적입니다. 단, **git은 기본적으로 macOS에서 대소문자만 바꾼 rename을 감지하지 못하는 경우가 있으므로** 반드시 `git mv`를 사용하세요.<br>
<br>
```bash<br>
git mv src/lib/DateFormat.ts src/lib/dateFormat.ts<br>
```<br>
<br>
이미 `git mv`가 잘 안 먹히면 두 단계로 나눠서 하면 확실합니다.<br>
<br>
```bash<br>
git mv src/lib/DateFormat.ts src/lib/dateFormat_tmp.ts<br>
git mv src/lib/dateFormat_tmp.ts src/lib/dateFormat.ts<br>
```<br>
<br>
이후 다른 곳에서 `DateFormat`으로 import하는 코드가 없는지도 확인해야 합니다.<br>
<br>
```bash<br>
grep -rn "lib/DateFormat" src<br>
```<br>
<br>
## 재발 방지<br>
<br>
- **tsconfig.json**에 아래 옵션을 켜 두면 로컬(macOS)에서도 같은 오류를 바로 잡아 줍니다.<br>
&nbsp;&nbsp;```json<br>
&nbsp;&nbsp;{<br>
&nbsp;&nbsp;&nbsp;&nbsp;"compilerOptions": {<br>
(뒷부분 생략. <a href="eval/results/2026-11-24/outputs/01-explain-build-error/baseline.1.md">전체 보기</a>)
</td>
<td valign="top">
## 원인<br>
<br>
파일 시스템의 대소문자 구분 방식이 macOS와 Linux에서 서로 다르기 때문에 발생한 오류입니다.<br>
<br>
- 실제 파일 이름은 `src/lib/DateFormat.ts`이고, 코드에서는 `@/lib/dateFormat`으로 가져오고 있습니다. 두 이름은 첫 글자의 대소문자가 다릅니다.<br>
- macOS의 기본 파일 시스템(APFS)은 대소문자를 구분하지 않으므로, 로컬에서는 두 이름을 같은 파일로 인식하여 빌드가 성공합니다.<br>
- GitHub Actions의 ubuntu-latest는 대소문자를 구분하는 파일 시스템을 사용하므로, `dateFormat.ts`라는 파일을 찾지 못하고 TS2307 오류를 출력합니다.<br>
<br>
## 해결 방법<br>
<br>
### 방법 1: import 경로를 실제 파일 이름에 맞추기 (가장 간단함)<br>
<br>
```ts<br>
import { formatDate } from '@/lib/DateFormat';<br>
```<br>
<br>
`DateFormat`을 가져오는 다른 파일도 같은 오류가 발생할 수 있으므로, 프로젝트 전체에서 `dateFormat`으로 검색하여 함께 수정해야 합니다.<br>
<br>
### 방법 2: 파일 이름을 다른 파일들의 관례에 맞추기<br>
<br>
`currency.ts`, `http.ts`가 모두 소문자로 시작하므로, 파일 이름을 `dateFormat.ts`로 바꾸는 편이 일관성 측면에서 더 좋습니다. 다만 macOS에서 대소문자만 바꾸는 이름 변경은 Git이 변경 사항을 인식하지 못하는 경우가 있어서, 아래처럼 두 단계로 진행하는 방식이 안전합니다.<br>
<br>
```bash<br>
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts<br>
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts<br>
```<br>
<br>
이후 `git ls-files src/lib`로 저장소에 기록된 이름이 `dateFormat.ts`인지 확인한 뒤 커밋하면 됩니다.<br>
<br>
## 재발 방지<br>
<br>
1. `tsconfig.json`의 `compilerOptions`에 `"forceConsistentCasingInFileNames": true`를 추가하면, 로컬에서도 대소문자가 다른 import를 오류로 처리합니다. 최신 TypeScript에서는 기본값이 `true`인 경우도 있으나, 명시해 두면 설정이 분명해집니다.<br>
(뒷부분 생략. <a href="eval/results/2026-11-24/outputs/01-explain-build-error/fluent-korean.1.md">전체 보기</a>)
</td>
<td valign="top">
원인은 파일 이름과 import 경로의 대소문자가 서로 다르기 때문입니다. 실제 파일은 `src/lib/DateFormat.ts`인데 `BookingForm.tsx`에서는 `@/lib/dateFormat`으로 불러오고 있습니다. macOS의 기본 파일 시스템은 대소문자를 구분하지 않아서 로컬에서는 두 이름이 같은 파일로 해석되지만, ubuntu-latest는 대소문자를 구분하므로 `dateFormat.ts`를 찾지 못해 TS2307 오류가 발생합니다.<br>
<br>
## 고치는 방법<br>
<br>
같은 폴더의 `currency.ts`와 `http.ts`가 소문자로 시작하므로 파일 이름을 import에 맞추는 편이 일관됩니다. macOS에서는 대소문자만 바꾸는 이름 변경이 git에 반영되지 않는 경우가 있어서, 임시 이름을 거쳐 두 단계로 변경하는 것이 안전합니다.<br>
<br>
```bash<br>
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts<br>
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts<br>
```<br>
<br>
파일 이름을 바꾸면 `DateFormat`으로 불러오는 다른 import가 로컬에서는 문제없이 동작하다가 CI에서 다시 실패할 수 있으므로, 아래 명령으로 남은 참조를 확인해서 함께 수정해야 합니다.<br>
<br>
```bash<br>
grep -rn "lib/DateFormat" src<br>
```<br>
<br>
파일 이름을 바꾸고 싶지 않다면 `BookingForm.tsx`의 import를 `@/lib/DateFormat`으로 수정해도 오류는 해결됩니다.<br>
<br>
## 재발 방지<br>
<br>
`tsconfig.json`의 `compilerOptions`에 `"forceConsistentCasingInFileNames": true`가 설정되어 있는지 확인하세요. 이 옵션은 디스크의 실제 파일 이름과 다른 대소문자로 불러오는 import를 대소문자를 구분하지 않는 환경에서도 오류로 보고합니다. 옵션이 켜져 있었다면 이번 문제는 로컬 빌드에서 먼저 발견되었을 것이므로, `false`로 지정되어 있거나 TypeScript 버전이 낮아서 기본값이 적용되지 않았을 가능성이 있습니다.<br>
</td>
</tr>
</table>

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 처음 | 0.3 | 3.00 |
| 이전 스킬 | 0.0 | 1.83 |
| 이후 스킬 | 0.0 | 1.17 |

#### 화면 문구: 카드사 점검 시간에 결제가 거절됐을 때의 오류 팝업

<details>
<summary>입력 보기</summary>

`````text
쇼핑몰 앱의 결제 화면에 넣을 문구를 써 주세요. 이 앱의 화면 문구는 해요체를 씁니다.

상황: 사용자가 결제 버튼을 눌렀는데 카드사 점검 시간(매일 23:50~00:10)이라 결제가 거절됐습니다. 장바구니와 입력한 배송지는 그대로 남아 있습니다. 다른 카드나 계좌이체로는 지금 바로 결제할 수 있습니다.

필요한 문구:
1. 오류 팝업의 제목
2. 오류 팝업의 본문 (두세 문장)
3. 버튼 두 개에 들어갈 글자 (다른 결제 수단을 고르는 버튼, 팝업을 닫는 버튼)
`````

</details>

<table>
<tr><th width="33%">처음</th><th width="33%">이전 스킬</th><th width="33%">이후 스킬</th></tr>
<tr>
<td valign="top">
**1. 제목**<br>
지금은 카드 결제가 어려워요<br>
<br>
**2. 본문**<br>
카드사 점검 시간(매일 23:50~00:10)이라 결제가 진행되지 않았어요. 장바구니와 배송지 정보는 그대로 저장되어 있어요. 다른 카드나 계좌이체로는 지금 바로 결제할 수 있어요.<br>
<br>
**3. 버튼**<br>
- 다른 결제 수단 선택<br>
- 닫기<br>
</td>
<td valign="top">
## 1. 팝업 제목<br>
카드사 점검으로 결제하지 못했어요<br>
<br>
## 2. 팝업 본문<br>
지금은 카드사 점검 시간(매일 23:50~00:10)이라 결제가 거절되었어요. 장바구니와 입력하신 배송지는 그대로 저장되어 있으니 다시 입력하지 않으셔도 돼요. 다른 카드나 계좌이체를 선택하시면 지금 바로 결제하실 수 있어요.<br>
<br>
## 3. 버튼 문구<br>
- 결제 수단을 고르는 버튼: **다른 결제 수단 선택**<br>
- 팝업을 닫는 버튼: **닫기**<br>
<br>
점검이 끝난 뒤 같은 카드로 다시 결제하려는 사용자도 있을 수 있어서, 본문에 점검 시간을 명시했어요. 버튼 문구를 더 짧게 줄이고 싶으시면 "다른 수단으로 결제"로 바꾸셔도 의미가 유지돼요.<br>
</td>
<td valign="top">
**1. 제목**<br>
카드사 점검 때문에 결제하지 못했어요<br>
<br>
**2. 본문**<br>
매일 23:50부터 00:10까지는 카드사가 점검 중이라 결제가 거절돼요. 장바구니와 입력한 배송지는 그대로 남아 있고, 다른 카드나 계좌이체로는 지금 바로 결제할 수 있어요.<br>
<br>
**3. 버튼**<br>
- 다른 결제 수단 고르기<br>
- 닫기<br>
<br>
버튼 글자는 화면에서 흔히 쓰는 짧은 명사구로 맞췄습니다. 본문에는 점검 시간대를 구체적으로 적어서, 사용자가 00:10 이후에 같은 카드로 다시 시도할 수 있다는 점도 알 수 있게 했습니다.<br>
</td>
</tr>
</table>

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 처음 | 0.0 | 2.33 |
| 이전 스킬 | 0.0 | 1.67 |
| 이후 스킬 | 0.0 | 2.00 |

#### 고쳐 쓰기: 캐시 도입 회고 단락 고쳐 쓰기

<details>
<summary>입력 보기</summary>

`````text
아래 단락은 제가 혼자 진행한 작업을 사내 기술 블로그에 올리려고 쓴 초안인데, AI 가 쓴 티가 난다는 말을 들었습니다. 내용과 수치는 그대로 두고 자연스러운 한국어로 고쳐 써 주세요. 고친 글만 출력해 주세요.

<원문>
캐시는 단순히 속도를 높이는 도구가 아니라, 서비스의 안정성을 책임지는 핵심적인 구성 요소입니다. 우리는 지난 분기에, 상품 상세 API 앞에 Redis 캐시를 도입했고, 그 결과, 평균 응답 시간이 480ms에서 95ms로 줄었으며, DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 하지만 캐시를 도입하는 순간, 데이터 정합성이라는 새로운 과제가 시작됩니다. 우리는 가격이 바뀌었는데도, 캐시에 남은 예전 가격이, 최대 10분 동안 노출되는 문제를 겪었습니다. 이를 해결하기 위해, 우리는 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 즉시 삭제하는, 효율적이고 체계적인 무효화 전략을 도입했습니다. 캐시 운영은 단순한 기술 선택을 넘어, 팀의 운영 역량을 보여주는 지표입니다. 정리하면, 캐시는 빠르지만, 그만큼 신중한 관리가 필요합니다.
</원문>
`````

</details>

<table>
<tr><th width="33%">처음</th><th width="33%">이전 스킬</th><th width="33%">이후 스킬</th></tr>
<tr>
<td valign="top">
지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 평균 응답 시간은 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 두면 데이터 정합성 문제가 따라옵니다. 실제로 가격이 바뀌었는데도 캐시에 남은 예전 가격이 최대 10분 동안 노출되는 문제가 있었습니다. 그래서 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 바로 삭제하도록 바꿨습니다. 캐시는 빠르지만, 그만큼 신중하게 관리해야 합니다.<br>
</td>
<td valign="top">
캐시는 응답 속도를 높이는 데 그치지 않고, 서비스가 안정적으로 운영되도록 돕는 역할도 합니다. 저는 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 그 결과 평균 응답 시간이 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 낮아졌습니다. 그러나 캐시를 도입하면 원본 데이터와 캐시 데이터의 정합성을 유지해야 하는 새로운 문제가 생깁니다. 실제로 상품 가격이 변경된 뒤에도 캐시에 남아 있던 이전 가격이 최대 10분 동안 사용자에게 노출되는 문제가 발생했습니다. 이를 해결하기 위해 가격 변경 이벤트를 수신하면 해당 상품의 캐시 키를 즉시 삭제하도록 무효화 방식을 적용했습니다. 캐시를 얼마나 잘 운영하는지는 팀의 운영 역량을 가늠하는 기준이 되기도 합니다. 캐시는 응답을 빠르게 해 주지만, 그만큼 신중하게 관리해야 합니다.<br>
</td>
<td valign="top">
저는 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 그 결과 평균 응답 시간이 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 도입하고 나니 데이터 정합성 문제가 생겼습니다. 가격이 바뀌었는데도 캐시에 남은 예전 가격이 최대 10분 동안 노출되었습니다. 이를 해결하려고 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 즉시 삭제하도록 했습니다. 캐시는 빠르지만 데이터 정합성을 유지하려면 무효화 방식까지 함께 설계해야 합니다.<br>
</td>
</tr>
</table>

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 처음 | 0.0 | 1.50 |
| 이전 스킬 | 0.0 | 1.83 |
| 이후 스킬 | 0.0 | 2.67 |

#### 커밋 메시지: 만료된 쿠폰이 사용되던 시간대 버그 수정의 커밋 메시지

<details>
<summary>입력 보기</summary>

`````text
아래 상황과 diff 를 보고 커밋 메시지를 한국어로 써 주세요. 커밋 메시지만 출력하고, 다른 설명이나 코드 블록 표시는 붙이지 마세요.

상황: 고객센터에 "어제 만료된 쿠폰이 오늘 아침에 사용됐다"는 문의가 3건 들어와서 확인했습니다. 이슈 번호는 #214 입니다.

```diff
diff --git a/src/coupons/coupon.service.ts b/src/coupons/coupon.service.ts
index 3f2a1c7..9be04d2 100644
--- a/src/coupons/coupon.service.ts
+++ b/src/coupons/coupon.service.ts
@@ -1,4 +1,5 @@
 import { Injectable } from '@nestjs/common';
+import { formatInTimeZone } from 'date-fns-tz';
 import { CouponRepository } from './coupon.repository';
 import { CouponExpiredError, CouponNotFoundError } from './coupon.errors';
 
@@ -41,8 +42,10 @@ export class CouponService {
     const coupon = await this.coupons.findByCode(code);
     if (!coupon) throw new CouponNotFoundError(code);
 
-    const today = new Date().toISOString().slice(0, 10);
-    if (coupon.expiresOn < today) {
+    // expiresOn 은 한국 시간 기준 날짜(YYYY-MM-DD)다. UTC 날짜와 비교하면
+    // 한국 시간 00:00~08:59 에는 전날 날짜가 나와서 만료된 쿠폰이 통과한다.
+    const todayInSeoul = formatInTimeZone(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
+    if (coupon.expiresOn < todayInSeoul) {
       throw new CouponExpiredError(code, coupon.expiresOn);
     }
 
diff --git a/test/coupons.integration.spec.ts b/test/coupons.integration.spec.ts
index 77c0d11..a41f6e3 100644
--- a/test/coupons.integration.spec.ts
+++ b/test/coupons.integration.spec.ts
@@ -88,4 +88,15 @@ describe('POST /coupons/redeem', () => {
     expect(res.status).toBe(201);
   });
+
+  it('한국 시간 오전 8시에 전날 만료된 쿠폰을 거절한다', async () => {
+    jest.useFakeTimers().setSystemTime(new Date('2026-11-18T23:00:00Z')); // KST 11-19 08:00
+    await seedCoupon({ code: 'WELCOME10', expiresOn: '2026-11-18' });
+
+    const res = await request(app.getHttpServer())
+      .post('/coupons/redeem')
+      .send({ code: 'WELCOME10' });
+
+    expect(res.status).toBe(410);
+  });
 });
```
`````

</details>

<table>
<tr><th width="33%">처음</th><th width="33%">이전 스킬</th><th width="33%">이후 스킬</th></tr>
<tr>
<td valign="top">
fix: 쿠폰 만료 판정 시 한국 시간 기준 날짜로 비교하도록 수정<br>
<br>
쿠폰의 expiresOn 은 한국 시간 기준 날짜(YYYY-MM-DD)인데, 만료 여부를<br>
UTC 날짜와 비교하고 있었다. 이 때문에 한국 시간 00:00~08:59 사이에는<br>
UTC 날짜가 전날로 계산되어, 전날 만료된 쿠폰이 사용 가능한 것으로<br>
판정되었다.<br>
<br>
date-fns-tz 의 formatInTimeZone 으로 Asia/Seoul 기준 오늘 날짜를 구해<br>
expiresOn 과 비교하도록 변경한다. 한국 시간 오전 8시에 전날 만료된<br>
쿠폰을 거절하는 통합 테스트도 추가했다.<br>
<br>
Closes #214<br>
</td>
<td valign="top">
쿠폰 만료 판정 시 한국 시간 기준 날짜를 사용하도록 수정<br>
<br>
만료일(expiresOn)은 한국 시간 기준 날짜인데, 기존에는 UTC 날짜와 비교하고 있었습니다. 그래서 한국 시간 00:00부터 08:59까지는 UTC 날짜가 전날로 계산되어, 전날 만료된 쿠폰이 사용 가능한 것으로 판정되었습니다.<br>
<br>
현재 시각을 date-fns-tz의 formatInTimeZone으로 Asia/Seoul 기준 날짜로 변환한 뒤 만료일과 비교하도록 변경했습니다. 또한 한국 시간 오전 8시에 전날 만료된 쿠폰의 사용을 거절하는지 확인하는 통합 테스트를 추가했습니다.<br>
<br>
Fixes #214<br>
</td>
<td valign="top">
fix: 쿠폰 만료일을 UTC 대신 한국 시간 기준 날짜와 비교<br>
<br>
쿠폰의 만료일(expiresOn)은 한국 시간 기준 날짜인데 UTC 날짜와 비교해서<br>
한국 시간 00:00부터 08:59까지는 전날 날짜와 비교되었고, 그 결과 만료된<br>
쿠폰이 사용되었다. 어제 만료된 쿠폰이 오늘 아침에 사용되었다는 문의가<br>
고객센터에 3건 접수되어 확인한 원인이다.<br>
<br>
오늘 날짜를 date-fns-tz 의 formatInTimeZone 으로 Asia/Seoul 기준으로<br>
계산하도록 수정했다. 한국 시간 오전 8시에 전날 만료된 쿠폰을 거절하는<br>
통합 테스트도 함께 추가했다.<br>
<br>
Closes: #214<br>
</td>
</tr>
</table>

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 처음 | 0.3 | 2.00 |
| 이전 스킬 | 2.0 | 2.33 |
| 이후 스킬 | 0.0 | 1.67 |

#### PR 본문: 매장별 예약 알림 시간 설정 기능의 PR

<details>
<summary>입력 보기</summary>

`````text
아래 상황 설명과 diff 요약을 보고 PR 제목과 본문을 한국어로 써 주세요. 첫 줄에 PR 제목만 쓰고, 한 줄을 비운 뒤 본문을 Markdown 으로 씁니다. 다른 설명이나 바깥을 감싸는 코드 블록 표시는 붙이지 마세요.

상황 설명:
- 미용실 예약 서비스입니다. 지금은 예약 알림 문자가 모든 매장에서 예약 24시간 전에 나갑니다.
- 매장 12곳이 "당일 예약이 많아서 24시간 전 알림은 의미가 없다. 2~3시간 전에 보내고 싶다"고 요청했습니다 (이슈 #87).
- 이 PR 로 매장 관리자가 설정 화면에서 알림 시간을 1~72시간 사이로 고를 수 있습니다. 기본값은 지금과 같은 24시간입니다.
- 문자 발신 번호를 코드에 박아 두었던 것을 환경 변수 SMS_SENDER_ID 로 뺐습니다. 이 값이 없으면 서버가 시작할 때 오류를 내고 멈춥니다.
- 스케줄러는 10분마다 돌면서 "지금부터 알림 시간 안에 시작하는 예약 가운데 아직 알림을 보내지 않은 것"을 찾아 보냅니다. 전에는 하루에 한 번 09:00 에 돌았습니다.
- 확인한 것: 통합 테스트 23개 통과(새로 쓴 것 6개 포함). 스테이징에서 알림 시간을 2시간으로 바꾼 매장에 예약을 넣고, 문자 발송 기록이 예약 2시간 전에 생기는 것을 봤습니다.
- 확인하지 못한 것: 스테이징은 문자 발송을 모의(mock)로 처리해서 실제 통신사 발송은 확인하지 못했습니다.

diff 요약:

```diff
diff --git a/prisma/migrations/20261121_add_reminder_hours_before/migration.sql
+ALTER TABLE "stores" ADD COLUMN "reminder_hours_before" INTEGER NOT NULL DEFAULT 24;
+ALTER TABLE "reservations" ADD COLUMN "reminder_sent_at" TIMESTAMPTZ;
+CREATE INDEX "reservations_reminder_idx" ON "reservations" ("starts_at") WHERE "reminder_sent_at" IS NULL;

diff --git a/src/config/env.ts
+  SMS_SENDER_ID: z.string().regex(/^\d{8,11}$/),

diff --git a/src/sms/sms.client.ts
-const SENDER = '0212345678';
+const SENDER = env.SMS_SENDER_ID;

diff --git a/src/reminders/reminder.scheduler.ts
-  @Cron('0 9 * * *')
-  async sendDailyReminders() {
-    const targets = await this.reservations.findStartingBetween(addHours(now(), 24), addHours(now(), 48));
+  @Cron('*/10 * * * *')
+  async sendDueReminders() {
+    const targets = await this.reservations.findDueForReminder(now());
     for (const r of targets) {
       await this.sms.send(r.customerPhone, buildReminderText(r));
+      await this.reservations.markReminderSent(r.id, now());
     }
   }

diff --git a/src/stores/dto/update-store-settings.dto.ts
+  @IsInt() @Min(1) @Max(72)
+  reminderHoursBefore?: number;

diff --git a/web/src/pages/store-settings/ReminderSection.tsx   (새 파일, 58줄)
diff --git a/test/reminders.integration.spec.ts                 (새 테스트 6개)
```
`````

</details>

<table>
<tr><th width="33%">처음</th><th width="33%">이전 스킬</th><th width="33%">이후 스킬</th></tr>
<tr>
<td valign="top">
예약 알림 시간을 매장별로 설정할 수 있게 변경 (1~72시간, 기본 24시간)<br>
<br>
## 배경<br>
<br>
지금은 모든 매장에서 예약 24시간 전에 알림 문자가 나갑니다. 당일 예약이 많은 매장 12곳이 "24시간 전 알림은 의미가 없고 2~3시간 전에 보내고 싶다"고 요청했습니다. (#87)<br>
<br>
## 변경 내용<br>
<br>
- **알림 시간 설정**: 매장 관리자가 설정 화면에서 알림 시간을 1~72시간 중에서 고를 수 있습니다. 기본값은 기존과 같은 24시간이라 설정을 바꾸지 않은 매장은 동작이 달라지지 않습니다.<br>
- **DB 마이그레이션**<br>
&nbsp;&nbsp;- `stores.reminder_hours_before` (INTEGER, NOT NULL, 기본 24)<br>
&nbsp;&nbsp;- `reservations.reminder_sent_at` (TIMESTAMPTZ, null 허용)<br>
&nbsp;&nbsp;- 미발송 예약 조회용 부분 인덱스<br>
- **스케줄러**: 하루 한 번 09:00 실행에서 10분마다 실행으로 바꿨습니다. "지금부터 알림 시간 안에 시작하는 예약 중 아직 알림을 보내지 않은 것"을 찾아 보내고, 발송 후 `reminder_sent_at`을 기록합니다.<br>
- **발신 번호 환경 변수화**: 코드에 박아 두었던 발신 번호를 `SMS_SENDER_ID`로 뺐습니다. 값은 숫자 8~11자리여야 합니다.<br>
- **입력 검증**: `reminderHoursBefore`는 서버에서도 정수 1~72로 검증합니다.<br>
<br>
## 배포 전 확인<br>
<br>
- **`SMS_SENDER_ID`를 먼저 설정해야 합니다.** 값이 없거나 형식이 맞지 않으면 서버가 시작할 때 오류를 내고 멈춥니다. 기존 코드에 있던 번호(`0212345678`)를 그대로 넣으면 발신 동작은 이전과 같습니다.<br>
- **배포 직후 중복 발송 가능성이 있습니다.** 마이그레이션이 기존 예약의 `reminder_sent_at`을 채우지 않아서, 이미 09:00 배치로 알림을 받은 예약(시작까지 24시간 이내)도 "미발송"으로 보여 한 번 더 나갈 수 있습니다. 배포 전에 기존 예약의 `reminder_sent_at`을 채우는 백필을 하거나, 그대로 둘지 결정이 필요합니다.<br>
<br>
## 테스트<br>
<br>
- 통합 테스트 23개 통과 (이번에 추가한 6개 포함)<br>
- 스테이징에서 알림 시간을 2시간으로 바꾼 매장에 예약을 넣고, 문자 발송 기록이 예약 2시간 전에 생기는 것을 확인했습니다.<br>
(뒷부분 생략. <a href="eval/results/2026-11-24/outputs/11-pr-feature-reminder-hours/baseline.1.md">전체 보기</a>)
</td>
<td valign="top">
매장별 예약 알림 시간 설정 기능 추가 (#87)<br>
<br>
## 변경 배경<br>
<br>
현재 예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송됩니다. 매장 12곳이 당일 예약이 많아 24시간 전 알림은 효과가 없다고 요청하여, 2~3시간 전에 보낼 수 있도록 개선했습니다. 이슈 #87을 해결하는 PR입니다.<br>
<br>
## 변경 내용<br>
<br>
- 매장 관리자가 설정 화면에서 알림 시간을 1~72시간 범위로 선택할 수 있습니다. 기본값은 기존과 같은 24시간이므로, 설정을 바꾸지 않은 매장의 동작은 달라지지 않습니다.<br>
- 알림 스케줄러의 실행 주기를 하루 한 번(09:00)에서 10분마다로 변경했습니다. 실행될 때마다 알림 시간 안에 시작하면서 아직 알림이 발송되지 않은 예약을 조회하여 문자를 보냅니다. 발송이 끝나면 해당 예약에 발송 시각을 기록하여 중복 발송을 방지합니다.<br>
- 문자 발신 번호를 코드에 직접 작성했던 방식에서 환경 변수 `SMS_SENDER_ID`로 분리했습니다. 이 값은 8~11자리 숫자여야 하며, 값이 없거나 형식이 맞지 않으면 서버가 시작할 때 오류를 출력하고 종료됩니다.<br>
<br>
## DB 마이그레이션<br>
<br>
- `stores.reminder_hours_before`: 정수 컬럼이며 기본값은 24입니다.<br>
- `reservations.reminder_sent_at`: 알림 발송 시각을 기록하는 컬럼입니다.<br>
- `reservations_reminder_idx`: 알림이 발송되지 않은 예약만 대상으로 `starts_at`에 생성한 부분 인덱스입니다. 10분마다 실행되는 조회의 부담을 줄이기 위해 추가했습니다.<br>
<br>
## 배포 전 확인 사항<br>
<br>
- 배포 전에 모든 환경에 `SMS_SENDER_ID`를 설정해야 합니다. 기존 코드에 작성되어 있던 발신 번호를 그대로 사용하려면 해당 번호를 값으로 입력하면 됩니다.<br>
- 마이그레이션에는 기존 예약의 `reminder_sent_at`을 채우는 작업이 포함되어 있지 않습니다. 따라서 기존 방식으로 이미 알림을 받은 예약 중 아직 시작하지 않은 건이 배포 직후 첫 실행에서 다시 발송될 가능성이 있습니다. 리뷰하실 때 이 부분의 처리 방침(배포 전 일괄 기록 등)을 함께 검토해 주시기 바랍니다.<br>
<br>
## 테스트<br>
<br>
확인한 내용은 다음과 같습니다.<br>
<br>
- 통합 테스트 23개가 모두 통과했습니다. 이번에 새로 작성한 6개가 포함되어 있습니다.<br>
(뒷부분 생략. <a href="eval/results/2026-11-24/outputs/11-pr-feature-reminder-hours/fluent-korean.1.md">전체 보기</a>)
</td>
<td valign="top">
feature: 매장별 예약 알림 시간을 설정하는 기능을 추가<br>
<br>
## 작업 배경<br>
<br>
예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송되었습니다. 당일 예약이 많은 매장 12곳이 24시간 전 알림은 의미가 없으니 2시간에서 3시간 전에 보내고 싶다고 요청해서 이 변경이 필요해졌습니다 (이슈 #87).<br>
<br>
## 변경 사항<br>
<br>
- **매장 관리자가 설정 화면에서 알림 시간을 고를 수 있습니다**: 예약 몇 시간 전에 알림을 보낼지 1시간에서 72시간 사이로 선택하며, 기본값은 기존과 같은 24시간입니다. 서버의 설정 DTO에서도 같은 범위를 검증합니다.<br>
- **알림 문자가 매장별 설정 시간에 맞춰 발송됩니다**: 스케줄러가 하루에 한 번 09:00 에 실행되던 방식에서 10분마다 실행되는 방식으로 바뀌었습니다. 지금부터 알림 시간 안에 시작하는 예약 가운데 아직 알림을 보내지 않은 예약을 찾아 발송하고, 발송한 시각을 기록해서 같은 예약에 다시 보내지 않습니다.<br>
- **문자 발신 번호를 환경 변수 `SMS_SENDER_ID` 로 받습니다**: 코드에 고정되어 있던 발신 번호를 환경 변수로 옮겼고, 숫자 8자리에서 11자리만 허용합니다. 이 값이 없으면 서버가 시작할 때 오류를 내고 멈춥니다.<br>
- **그 밖에**: 설정 화면에 알림 시간 선택 영역(`ReminderSection`)을 추가했고, 통합 테스트 6개를 새로 작성했습니다.<br>
<br>
## 배포 참고 사항<br>
<br>
- 배포하기 전에 모든 환경에 `SMS_SENDER_ID` 를 설정해야 합니다. 설정하지 않으면 서버가 시작되지 않습니다.<br>
- 마이그레이션이 `stores.reminder_hours_before` (기본값 24)와 `reservations.reminder_sent_at` 컬럼, 그리고 아직 알림을 보내지 않은 예약만 대상으로 하는 인덱스를 추가합니다.<br>
- 기존 예약은 `reminder_sent_at` 이 비어 있어서, 배포 직후 첫 실행에서 이전 방식으로 이미 알림을 받은 예약에도 문자가 한 번 더 나갈 수 있습니다.<br>
<br>
## 확인 사항<br>
<br>
- [x] 통합 테스트 23개 통과 (새로 작성한 6개 포함)<br>
- [x] 스테이징에서 알림 시간을 2시간으로 바꾼 매장에 예약을 넣고, 문자 발송 기록이 예약 2시간 전에 생기는 것을 직접 확인<br>
- [ ] 실제 통신사 발송: 스테이징은 문자 발송을 모의(mock)로 처리하므로 확인하지 못했습니다. 배포한 뒤에 확인해야 합니다.<br>
(뒷부분 생략. <a href="eval/results/2026-11-24/outputs/11-pr-feature-reminder-hours/ours.1.md">전체 보기</a>)
</td>
</tr>
</table>

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 처음 | 6.0 | 1.67 |
| 이전 스킬 | 4.7 | 2.17 |
| 이후 스킬 | 0.0 | 2.17 |

### 이후 스킬이 더 낮게 평가된 케이스

케이스마다 이후 스킬의 블라인드 순위 평균에서 다른 두 조건 가운데 더 좋은 순위 평균을 뺐을 때, 그 차이가 가장 큰 케이스는 `12-pr-fix-cart-quantity` 입니다(차이 1.67). 이 케이스도 첫 번째 생성 결과를 싣습니다.

#### PR 제목과 본문: 장바구니 수량을 빠르게 누르면 합계가 틀리는 버그 수정의 PR

<details>
<summary>입력 보기</summary>

`````text
아래 상황 설명과 diff 를 보고 PR 제목과 본문을 한국어로 써 주세요. 첫 줄에 PR 제목만 쓰고, 한 줄을 비운 뒤 본문을 Markdown 으로 씁니다. 다른 설명이나 바깥을 감싸는 코드 블록 표시는 붙이지 마세요.

상황 설명:
- 쇼핑몰 웹의 장바구니 화면입니다. 수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3인데 합계 금액은 2개 값으로 남는 일이 있다는 제보가 QA 에서 들어왔습니다 (이슈 #131).
- 원인: 버튼을 누를 때마다 PATCH /cart/items/:id 요청을 보내고 응답으로 받은 장바구니로 화면을 덮어씁니다. 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 오면, 늦게 온 예전 응답이 화면을 덮어썼습니다.
- 고친 방법: 수량을 바꿀 때마다 이전 요청을 AbortController 로 취소하고, 응답에 들어 있는 장바구니 version 이 화면이 가진 version 보다 낮으면 버립니다. 서버는 바꾸지 않았습니다 (version 필드는 원래 응답에 있었습니다).
- DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.
- 확인한 것: Playwright E2E 를 4개 새로 썼고 (응답 순서를 뒤집는 경우 포함) 전체 E2E 212개가 통과했습니다. 크롬에서 네트워크를 Slow 3G 로 낮추고 20번 눌러 봤는데 합계가 맞았습니다.
- 확인하지 못한 것: iOS 사파리. 테스트 기기가 없었습니다.

```diff
diff --git a/web/src/features/cart/useCartQuantity.ts b/web/src/features/cart/useCartQuantity.ts
index 4b1a9e0..e2d5c3f 100644
--- a/web/src/features/cart/useCartQuantity.ts
+++ b/web/src/features/cart/useCartQuantity.ts
@@ -8,13 +8,24 @@ import { patchCartItem } from './cart.api';
 export function useCartQuantity(itemId: string) {
   const { cart, setCart } = useCartStore();
+  const pending = useRef<AbortController | null>(null);
 
   const change = useCallback(
     async (quantity: number) => {
-      const next = await patchCartItem(itemId, { quantity });
-      setCart(next);
+      pending.current?.abort();
+      const controller = new AbortController();
+      pending.current = controller;
+
+      try {
+        const next = await patchCartItem(itemId, { quantity }, { signal: controller.signal });
+        // 늦게 도착한 예전 응답이 최신 상태를 덮어쓰지 않게 한다
+        setCart((current) => (next.version >= current.version ? next : current));
+      } catch (error) {
+        if (isAbortError(error)) return;
+        throw error;
+      }
     },
     [itemId, setCart],
   );
 
   return { quantity: cart.items[itemId]?.quantity ?? 0, change };
diff --git a/web/e2e/cart-quantity.spec.ts b/web/e2e/cart-quantity.spec.ts
new file mode 100644
--- /dev/null
+++ b/web/e2e/cart-quantity.spec.ts
@@ -0,0 +1,64 @@
+test('수량을 빠르게 두 번 올려도 합계가 맞다', ...);
+test('첫 번째 응답이 두 번째 응답보다 늦게 와도 합계가 맞다', ...);
+test('수량을 올렸다가 바로 내려도 합계가 맞다', ...);
+test('요청이 실패하면 수량을 이전 값으로 되돌리고 오류를 보여 준다', ...);
```
`````

</details>

<table>
<tr><th width="33%">처음</th><th width="33%">이전 스킬</th><th width="33%">이후 스킬</th></tr>
<tr>
<td valign="top">
장바구니 수량 연타 시 늦게 온 예전 응답이 화면을 덮어쓰는 문제 수정<br>
<br>
## 배경<br>
<br>
장바구니에서 수량 + 버튼을 빠르게 두 번 누르면, 화면 수량은 3인데 합계 금액은 2개 기준으로 남는 현상이 QA에서 제보되었습니다. (#131)<br>
<br>
## 원인<br>
<br>
버튼을 누를 때마다 `PATCH /cart/items/:id` 를 보내고, 응답으로 받은 장바구니로 화면 전체를 덮어쓰고 있었습니다. 첫 번째 요청의 응답이 두 번째 응답보다 늦게 도착하면, 늦게 온 예전 응답이 최신 상태를 덮어써서 수량과 합계가 어긋났습니다.<br>
<br>
## 변경 내용<br>
<br>
`useCartQuantity.ts` 에서 두 가지를 적용했습니다.<br>
<br>
- 수량을 바꿀 때마다 이전 요청을 `AbortController` 로 취소합니다. 취소로 발생한 에러는 무시하고, 그 외 에러는 기존처럼 그대로 던집니다.<br>
- 응답의 장바구니 `version` 이 화면이 가진 `version` 보다 낮으면 응답을 버립니다. 요청 취소가 늦어 응답이 이미 도착한 경우에도 예전 상태로 덮어쓰지 않도록 하는 안전장치입니다.<br>
<br>
서버 변경은 없습니다. `version` 필드는 원래 응답에 포함되어 있었습니다.<br>
<br>
## 테스트<br>
<br>
- Playwright E2E 4개를 새로 추가했습니다.<br>
&nbsp;&nbsp;- 수량을 빠르게 두 번 올려도 합계가 맞는지<br>
&nbsp;&nbsp;- 첫 번째 응답이 두 번째 응답보다 늦게 와도 합계가 맞는지 (응답 순서 뒤집기)<br>
&nbsp;&nbsp;- 수량을 올렸다가 바로 내려도 합계가 맞는지<br>
&nbsp;&nbsp;- 요청이 실패하면 수량을 이전 값으로 되돌리고 오류를 보여 주는지<br>
- 전체 E2E 212개가 통과했습니다.<br>
- 크롬에서 네트워크를 Slow 3G 로 낮추고 + 버튼을 20번 눌러 보았고, 합계가 맞았습니다.<br>
<br>
## 확인하지 못한 것<br>
<br>
- **iOS 사파리**: 테스트 기기가 없어 확인하지 못했습니다. 가능하면 iOS 기기를 가진 분이 연타 동작을 한 번 확인해 주세요.<br>
<br>
## 배포<br>
<br>
DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.<br>
</td>
<td valign="top">
장바구니 수량을 빠르게 두 번 누르면 합계가 어긋나는 문제를 수정합니다<br>
<br>
## 배경<br>
<br>
수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3으로 표시되는데, 합계 금액은 2개 기준 값으로 남는다는 제보가 QA에서 들어왔습니다.<br>
<br>
Closes #131<br>
<br>
## 원인<br>
<br>
버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고, 응답으로 받은 장바구니로 화면 상태를 덮어쓰고 있었습니다. 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면, 오래된 응답이 최신 상태를 덮어써서 수량과 합계가 서로 맞지 않게 되었습니다.<br>
<br>
## 변경 사항<br>
<br>
- 수량을 변경할 때마다 이전 요청을 `AbortController`로 취소합니다.<br>
- 응답에 포함된 장바구니 `version`이 화면이 가진 `version`보다 낮으면 그 응답을 버립니다.<br>
- 취소로 발생한 오류는 무시하고, 그 외의 오류는 기존처럼 다시 던집니다.<br>
- 서버는 변경하지 않았습니다. `version` 필드는 원래 응답에 포함되어 있었습니다.<br>
<br>
수정한 파일은 `web/src/features/cart/useCartQuantity.ts`입니다.<br>
<br>
## 테스트<br>
<br>
- Playwright E2E 테스트를 4개 새로 작성했습니다.<br>
&nbsp;&nbsp;- 수량을 빠르게 두 번 올려도 합계가 맞는지 확인합니다.<br>
&nbsp;&nbsp;- 첫 번째 응답이 두 번째 응답보다 늦게 도착해도 합계가 맞는지 확인합니다. 응답 순서를 뒤집는 경우입니다.<br>
&nbsp;&nbsp;- 수량을 올렸다가 바로 내려도 합계가 맞는지 확인합니다.<br>
&nbsp;&nbsp;- 요청이 실패하면 수량을 이전 값으로 되돌리고 오류를 보여 주는지 확인합니다.<br>
- 전체 E2E 212개가 모두 통과했습니다.<br>
- 크롬에서 네트워크를 Slow 3G로 낮추고 + 버튼을 20번 눌렀을 때 합계가 정확했습니다.<br>
<br>
## 확인하지 못한 사항<br>
<br>
- iOS 사파리에서는 동작을 확인하지 못했습니다. 테스트 기기가 없었습니다. 기기를 가지고 계신 분이 확인해 주시면 감사하겠습니다.<br>
<br>
## 배포 관련<br>
<br>
DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.<br>
</td>
<td valign="top">
fix: 수량을 빠르게 변경할 때 늦게 도착한 이전 응답이 장바구니를 덮어쓰지 않도록 수정<br>
<br>
## 작업 배경<br>
<br>
장바구니에서 수량 + 버튼을 빠르게 두 번 누르면 화면에는 수량이 3으로 표시되는데 합계 금액은 2개 기준으로 남는다는 제보가 QA 에서 접수되었습니다 (#131). 수량을 바꿀 때마다 PATCH /cart/items/:id 요청을 보내고 응답으로 받은 장바구니로 화면 전체를 덮어쓰는데, 첫 번째 요청의 응답이 두 번째 응답보다 늦게 도착하면 예전 응답이 최신 상태를 덮어쓰기 때문입니다.<br>
<br>
## 변경 사항<br>
<br>
- **수량을 연속으로 변경하면 이전 요청이 취소됩니다**: `useCartQuantity` 에서 수량을 바꿀 때마다 이전 요청을 AbortController 로 취소하고, 취소된 요청에서 발생한 오류는 무시합니다.<br>
- **늦게 도착한 예전 응답은 화면에 반영되지 않습니다**: 응답의 장바구니 `version` 이 화면이 가진 `version` 보다 낮으면 그 응답을 버립니다. 서버는 변경하지 않았고, `version` 은 기존 응답에 이미 포함되어 있던 필드입니다.<br>
- **그 밖에**: 수량을 연속으로 변경하는 경우와 요청이 실패하는 경우를 검증하는 Playwright E2E 4개를 `web/e2e/cart-quantity.spec.ts` 에 추가했습니다.<br>
<br>
## 확인 사항<br>
<br>
- [x] Playwright E2E 전체 212개 통과 (새로 추가한 4개 포함, 두 응답의 도착 순서를 뒤집는 경우 포함)<br>
- [x] 크롬에서 네트워크를 Slow 3G 로 낮추고 + 버튼을 20번 눌러서 합계가 수량과 일치하는 것을 직접 확인<br>
- [ ] iOS 사파리: 테스트 기기가 없어서 확인하지 못했습니다<br>
</td>
</tr>
</table>

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 처음 | 4.7 | 1.33 |
| 이전 스킬 | 4.0 | 1.67 |
| 이후 스킬 | 0.0 | 3.00 |

### 다시 실행하는 방법

Node.js 20 이상과 로그인된 Claude Code CLI 가 있으면 아래 명령으로 생성, 규칙 검사, 판정, 보고서 작성을 한 번에 실행합니다. 실행 방법과 조건을 격리하는 방법은 [eval/README.md](eval/README.md) 에 있습니다.

```sh
node eval/run.mjs
```

<!-- benchmark:end -->

## 출처

`natural-korean` 은 [snflkd/fluent-korean](https://github.com/snflkd/fluent-korean) 의 조항을 그대로 포함하고 그 위에 새 조항을 더한 통합본입니다. fluent-korean 의 라이선스 전문은 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 에 있습니다.

## 라이선스

[MIT](LICENSE)

# 나란히 보는 비교표 (2026-11-24)

생성 모델은 `claude-sonnet-5-5` 이고, 조건마다 케이스마다 3번씩 생성했습니다. 출력은 생성된 그대로 실었고 고치거나 줄이지 않았습니다. 커밋 메시지는 줄바꿈이 보이도록 코드 블록에 넣었습니다.

케이스마다 첫 번째 생성 결과를 펼쳐 두었고, 두 번째와 세 번째 생성 결과와 다른 비교에만 들어가는 조건의 출력은 접어 두었습니다. 표의 수치는 규칙 검사와 블라인드 판정의 케이스별 평균입니다.

| 표에 쓰는 이름 | 조건 | 시스템 프롬프트에 넣은 지침 |
| --- | --- | --- |
| 기본 | 기본 (지침 없음) | 없음 |
| fluent-korean | fluent-korean 원본 | fluent-korean |
| 우리 스킬 | 우리 스킬 (natural-korean + git-writing-korean) | natural-korean, git-writing-korean |
| im-not-ai | im-not-ai (quick-rules) | humanize-korean-quick-rules |
| 줄이기 전 | 우리 스킬, 분량을 줄이기 전 (bfbcb53) | natural-korean, git-writing-korean |
| 예시 2개 | 우리 스킬, natural-korean 의 예시를 조항당 2개로 줄인 실험용 사본 | natural-korean, git-writing-korean |

## 01-explain-build-error: CI 에서만 실패하는 빌드의 원인 설명

갈래: 설명 답변

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

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 기본 | 0.3 | 3.00 |
| fluent-korean | 0.0 | 1.83 |
| 우리 스킬 | 0.0 | 1.17 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

## 원인

**파일명의 대소문자 불일치**입니다.

- 실제 파일: `src/lib/DateFormat.ts` (대문자 D, F)
- import 경로: `@/lib/dateFormat` (소문자 d)

macOS의 기본 파일시스템(APFS/HFS+)은 **대소문자를 구분하지 않아서(case-insensitive)** `dateFormat`으로 써도 `DateFormat.ts`를 찾아 줍니다. 반면 GitHub Actions의 ubuntu-latest(ext4)는 **대소문자를 구분하므로(case-sensitive)** `dateFormat.ts`를 찾지 못하고 TS2307 오류가 납니다. paths 설정(`"@/*": ["./src/*"]`)은 정상이고 문제와 무관합니다.

## 해결 방법

방법은 두 가지이며, 보통 **1번(import 수정)** 이 가장 간단합니다.

### 1. import를 실제 파일명에 맞추기

```ts
import { formatDate } from '@/lib/DateFormat';
```

### 2. 파일명을 다른 파일들의 컨벤션에 맞게 소문자로 바꾸기

`currency.ts`, `http.ts`가 모두 camelCase/소문자 시작이므로 `dateFormat.ts`로 통일하는 편이 일관적입니다. 단, **git은 기본적으로 macOS에서 대소문자만 바꾼 rename을 감지하지 못하는 경우가 있으므로** 반드시 `git mv`를 사용하세요.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.ts
```

이미 `git mv`가 잘 안 먹히면 두 단계로 나눠서 하면 확실합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat_tmp.ts
git mv src/lib/dateFormat_tmp.ts src/lib/dateFormat.ts
```

이후 다른 곳에서 `DateFormat`으로 import하는 코드가 없는지도 확인해야 합니다.

```bash
grep -rn "lib/DateFormat" src
```

## 재발 방지

- **tsconfig.json**에 아래 옵션을 켜 두면 로컬(macOS)에서도 같은 오류를 바로 잡아 줍니다.
  ```json
  {
    "compilerOptions": {
      "forceConsistentCasingInFileNames": true
    }
  }
  ```
  (TS 5.x에서는 기본값이 `true`지만, 명시해 두면 확실합니다. 다만 이 옵션은 "같은 파일을 서로 다른 대소문자로 참조"하는 경우를 잡는 것이라, 실제 디스크 이름과 다른 경우까지 macOS에서 항상 잡아 주지는 못할 수 있습니다.)
- ESLint의 `import/no-unresolved` 규칙에 `caseSensitive: true`(기본값)를 유지하면 에디터/린트 단계에서 잡을 수 있습니다.
- 가능하면 CI를 로컬과 비슷하게 확인하려고 Docker(Linux) 환경에서 빌드해 보는 것도 방법입니다.

</td>
<td valign="top">

## 원인

파일 시스템의 대소문자 구분 방식이 macOS와 Linux에서 서로 다르기 때문에 발생한 오류입니다.

- 실제 파일 이름은 `src/lib/DateFormat.ts`이고, 코드에서는 `@/lib/dateFormat`으로 가져오고 있습니다. 두 이름은 첫 글자의 대소문자가 다릅니다.
- macOS의 기본 파일 시스템(APFS)은 대소문자를 구분하지 않으므로, 로컬에서는 두 이름을 같은 파일로 인식하여 빌드가 성공합니다.
- GitHub Actions의 ubuntu-latest는 대소문자를 구분하는 파일 시스템을 사용하므로, `dateFormat.ts`라는 파일을 찾지 못하고 TS2307 오류를 출력합니다.

## 해결 방법

### 방법 1: import 경로를 실제 파일 이름에 맞추기 (가장 간단함)

```ts
import { formatDate } from '@/lib/DateFormat';
```

`DateFormat`을 가져오는 다른 파일도 같은 오류가 발생할 수 있으므로, 프로젝트 전체에서 `dateFormat`으로 검색하여 함께 수정해야 합니다.

### 방법 2: 파일 이름을 다른 파일들의 관례에 맞추기

`currency.ts`, `http.ts`가 모두 소문자로 시작하므로, 파일 이름을 `dateFormat.ts`로 바꾸는 편이 일관성 측면에서 더 좋습니다. 다만 macOS에서 대소문자만 바꾸는 이름 변경은 Git이 변경 사항을 인식하지 못하는 경우가 있어서, 아래처럼 두 단계로 진행하는 방식이 안전합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

이후 `git ls-files src/lib`로 저장소에 기록된 이름이 `dateFormat.ts`인지 확인한 뒤 커밋하면 됩니다.

## 재발 방지

1. `tsconfig.json`의 `compilerOptions`에 `"forceConsistentCasingInFileNames": true`를 추가하면, 로컬에서도 대소문자가 다른 import를 오류로 처리합니다. 최신 TypeScript에서는 기본값이 `true`인 경우도 있으나, 명시해 두면 설정이 분명해집니다.
2. 가능하다면 CI뿐 아니라 로컬 검증 단계에서도 대소문자를 구분하는 환경(예: Docker의 Linux 컨테이너)을 사용하는 방법을 고려할 수 있습니다.
3. ESLint의 `import/no-unresolved` 규칙에 `caseSensitive` 옵션을 활성화하면 편집 단계에서 같은 문제를 미리 발견할 수 있습니다.

</td>
<td valign="top">

원인은 파일 이름과 import 경로의 대소문자가 서로 다르기 때문입니다. 실제 파일은 `src/lib/DateFormat.ts`인데 `BookingForm.tsx`에서는 `@/lib/dateFormat`으로 불러오고 있습니다. macOS의 기본 파일 시스템은 대소문자를 구분하지 않아서 로컬에서는 두 이름이 같은 파일로 해석되지만, ubuntu-latest는 대소문자를 구분하므로 `dateFormat.ts`를 찾지 못해 TS2307 오류가 발생합니다.

## 고치는 방법

같은 폴더의 `currency.ts`와 `http.ts`가 소문자로 시작하므로 파일 이름을 import에 맞추는 편이 일관됩니다. macOS에서는 대소문자만 바꾸는 이름 변경이 git에 반영되지 않는 경우가 있어서, 임시 이름을 거쳐 두 단계로 변경하는 것이 안전합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

파일 이름을 바꾸면 `DateFormat`으로 불러오는 다른 import가 로컬에서는 문제없이 동작하다가 CI에서 다시 실패할 수 있으므로, 아래 명령으로 남은 참조를 확인해서 함께 수정해야 합니다.

```bash
grep -rn "lib/DateFormat" src
```

파일 이름을 바꾸고 싶지 않다면 `BookingForm.tsx`의 import를 `@/lib/DateFormat`으로 수정해도 오류는 해결됩니다.

## 재발 방지

`tsconfig.json`의 `compilerOptions`에 `"forceConsistentCasingInFileNames": true`가 설정되어 있는지 확인하세요. 이 옵션은 디스크의 실제 파일 이름과 다른 대소문자로 불러오는 import를 대소문자를 구분하지 않는 환경에서도 오류로 보고합니다. 옵션이 켜져 있었다면 이번 문제는 로컬 빌드에서 먼저 발견되었을 것이므로, `false`로 지정되어 있거나 TypeScript 버전이 낮아서 기본값이 적용되지 않았을 가능성이 있습니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

## 원인

**파일 이름의 대소문자 불일치**입니다.

- 실제 파일: `src/lib/DateFormat.ts` (D, F 대문자)
- import 경로: `@/lib/dateFormat` (d, f 소문자)

macOS의 기본 파일시스템(APFS/HFS+)은 대소문자를 구분하지 않아서(case-insensitive) `dateFormat`으로 써도 `DateFormat.ts`를 찾아줍니다. 반면 GitHub Actions의 ubuntu-latest는 ext4 같은 대소문자 구분(case-sensitive) 파일시스템이라 `dateFormat.ts`를 찾지 못하고 TS2307이 발생합니다. paths 설정(`@/*` → `./src/*`)은 문제가 없습니다.

## 해결 방법

두 가지 중 하나를 택하면 됩니다. 프로젝트의 다른 파일(`currency.ts`, `http.ts`)이 모두 camelCase 소문자 시작이므로 **파일명을 바꾸는 쪽을 권장**합니다.

### 1) 파일명을 소문자로 맞추기 (권장)

macOS에서 대소문자만 바꾸는 이름 변경은 git이 인식하지 못하는 경우가 많으니 `git mv`를 사용하세요. 안 되면 임시 이름을 거치면 됩니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

그다음 저장소 전체에서 `DateFormat`을 import하는 곳이 있는지 확인해 같은 대소문자로 통일합니다.

```bash
git grep -n "lib/DateFormat"
```

### 2) import 경로를 실제 파일명에 맞추기

```ts
import { formatDate } from '@/lib/DateFormat';
```

다른 파일들도 `dateFormat`으로 import하고 있다면 전부 수정해야 합니다.

## 재발 방지

- **tsconfig.json**에 다음 옵션을 켜두면 로컬(macOS)에서도 같은 오류를 미리 잡아줍니다. (`strict` 사용 시 기본으로 켜지지는 않으므로 명시 필요)
  ```json
  { "compilerOptions": { "forceConsistentCasingInFileNames": true } }
  ```
- **git 설정 확인**: `git config core.ignorecase`가 `true`면 대소문자 변경을 추적하지 못하므로, 위처럼 `git mv`를 사용하세요.
- 가능하면 ESLint의 `import/no-unresolved` (`caseSensitive` 옵션)나 `eslint-plugin-import`로 검사를 추가하는 것도 좋습니다.

수정 후 `git ls-files src/lib`로 git에 실제 기록된 파일명이 의도한 대소문자인지 확인한 뒤 push하면 CI가 통과할 것입니다.

</td>
<td valign="top">

## 원인

파일 시스템의 대소문자 구분 방식이 macOS와 Linux에서 서로 다르기 때문입니다.

- 실제 파일명은 `src/lib/DateFormat.ts`이고, import 경로는 `@/lib/dateFormat`으로 작성되어 있습니다. 두 이름은 첫 글자의 대소문자가 다릅니다.
- macOS의 기본 파일 시스템(APFS)은 대소문자를 구분하지 않으므로, 로컬에서는 두 이름을 같은 파일로 인식해서 빌드가 성공합니다.
- GitHub Actions의 `ubuntu-latest`는 대소문자를 구분하는 파일 시스템을 사용합니다. 따라서 `dateFormat.ts`를 찾지 못하고 TS2307 오류가 발생합니다.

`paths` 설정(`"@/*": ["./src/*"]`)은 정상이며, 이 오류와는 관련이 없습니다.

## 해결 방법

두 가지 중 하나를 선택하면 됩니다.

### 방법 1: import 경로를 실제 파일명에 맞추기 (가장 간단한 방법)

```ts
import { formatDate } from '@/lib/DateFormat';
```

프로젝트 전체에서 같은 경로를 참조하는 곳이 더 있을 수 있으므로 함께 검색해서 수정해야 합니다.

```bash
grep -rn "lib/dateFormat" src
```

### 방법 2: 파일명을 소문자로 바꾸기

`src/lib`의 다른 파일(`currency.ts`, `http.ts`)이 모두 소문자 시작이므로, 이름 규칙을 통일하려면 이 방법이 더 일관됩니다. 다만 macOS에서는 대소문자만 바꾸는 이름 변경이 Git에 제대로 반영되지 않는 경우가 많기 때문에, 반드시 `git mv`를 사용해야 합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.ts
```

이 명령이 인식되지 않으면 임시 이름을 거쳐서 변경합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

이후 `DateFormat`으로 import하던 다른 파일이 있다면 모두 소문자 경로로 수정해야 합니다.

## 확인 사항과 재발 방지

1. 이미 Git에 어떤 이름으로 기록되어 있는지 확인합니다. CI는 Git에 기록된 이름을 기준으로 체크아웃하기 때문입니다.
   ```bash
   git ls-files src/lib
   ```
2. `tsconfig.json`의 `compilerOptions`에 다음 옵션을 추가하면, 대소문자가 어긋난 import를 macOS 로컬에서도 오류로 검출할 수 있습니다.
   ```json
   "forceConsistentCasingInFileNames": true
   ```
   TypeScript 최신 버전에서는 기본값이 `true`이지만, 명시해 두면 설정 의도가 분명해집니다.
3. ESLint의 `import/no-unresolved` 규칙에 `caseSensitive` 옵션을 켜 두면(기본값은 켜짐) 커밋하기 전에 같은 문제를 확인할 수 있습니다.

</td>
<td valign="top">

원인은 import 경로와 실제 파일 이름의 대소문자가 달라서입니다. 코드는 `@/lib/dateFormat`을 불러오지만 파일은 `src/lib/DateFormat.ts`입니다. macOS의 기본 파일 시스템은 대소문자를 구분하지 않아 두 이름을 같은 파일로 처리하므로 로컬 빌드는 통과합니다. ubuntu-latest는 대소문자를 구분하기 때문에 `dateFormat.ts`라는 파일이 없다고 판단하고 TS2307 오류를 냅니다.

## 해결 방법

두 가지 중 하나를 선택하면 됩니다.

1. import 경로를 실제 파일 이름에 맞춥니다.
   ```ts
   import { formatDate } from '@/lib/DateFormat';
   ```
2. 파일 이름을 import 경로에 맞춥니다. 같은 폴더의 `currency.ts`와 `http.ts`가 모두 camelCase이므로 이 방법이 프로젝트 관례에 더 가깝습니다. 다만 macOS에서는 git이 대소문자만 바뀐 이름 변경을 인식하지 못할 수 있어서 임시 이름을 거쳐야 합니다.
   ```bash
   git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
   git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
   ```

어느 쪽을 선택하든 `DateFormat`을 불러오는 다른 파일이 있을 수 있으므로 `grep -ri "lib/dateformat" src`로 모든 import의 대소문자를 함께 확인하세요.

## 재발 방지

- `tsconfig.json`에 `"forceConsistentCasingInFileNames": true`를 지정하면 같은 파일을 서로 다른 대소문자로 참조하는 경우를 막을 수 있습니다. TypeScript 5.0 이상에서는 기본값이 true입니다. 다만 이 옵션은 디스크의 실제 파일 이름과 import의 불일치를 macOS에서 항상 잡아 주지는 않습니다.
- 로컬에서 같은 문제를 미리 확인하려면 ESLint의 `import/no-unresolved` 규칙에 `caseSensitive` 옵션을 켜거나, 푸시하기 전에 Linux 컨테이너나 WSL에서 `pnpm build`를 실행하면 됩니다.

</td>
</tr>
</table>

</details>

<details>
<summary>3번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

## 원인

**파일 이름의 대소문자 불일치**입니다.

- 실제 파일: `src/lib/DateFormat.ts` (대문자 D, F)
- import 경로: `@/lib/dateFormat` (소문자 d, 대문자 F)

macOS의 기본 파일시스템(APFS/HFS+)은 대소문자를 구분하지 않기 때문에(case-insensitive) `dateFormat`으로 써도 `DateFormat.ts`를 찾아줍니다. 반면 GitHub Actions의 ubuntu-latest는 ext4 등 대소문자를 구분하는(case-sensitive) 파일시스템이라 `dateFormat.ts`가 없다고 판단해 TS2307이 발생합니다. paths 설정(`"@/*": ["./src/*"]`)은 정상이며 문제와 무관합니다.

## 해결 방법

두 가지 중 하나를 선택하면 됩니다. 프로젝트의 다른 파일들(`currency.ts`, `http.ts`)이 camelCase이므로 **파일명을 바꾸는 쪽을 권장**합니다.

### 방법 1: 파일명을 소문자 시작으로 변경 (권장)

주의할 점은, macOS에서 단순히 `mv`나 탐색기로 이름을 바꾸면 git이 대소문자 변경을 인식하지 못할 수 있다는 것입니다. 반드시 `git mv`를 사용하세요.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.ts
```

그래도 반영이 안 되면 임시 이름을 거치세요.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

### 방법 2: import 경로를 실제 파일명에 맞추기

```ts
import { formatDate } from '@/lib/DateFormat';
```

다른 파일에서도 `dateFormat`으로 import한 곳이 있을 수 있으니 함께 검색해 보세요.

```bash
grep -rniE "lib/dateformat" src
```

## 재발 방지

1. **git이 실제로 어떤 이름으로 추적하는지 확인**하세요. 로컬에서 이름을 바꿨는데도 CI가 계속 실패한다면 원격 저장소에는 옛 이름이 남아 있는 경우입니다.
   ```bash
   git ls-files src/lib
   ```
2. **tsconfig에 `forceConsistentCasingInFileNames: true`** 를 켜 두면 로컬에서도 대소문자가 다른 import를 오류로 잡아줍니다. (`strict` 계열 프리셋을 쓰면 이미 켜져 있을 수 있습니다.)
   ```json
   {
     "compilerOptions": {
       "forceConsistentCasingInFileNames": true
     }
   }
   ```
3. ESLint의 `import/no-unresolved` (`caseSensitive` 옵션 기본 true) 규칙을 사용하면 린트 단계에서도 걸러낼 수 있습니다.

</td>
<td valign="top">

## 원인

파일 이름과 import 경로의 대소문자가 서로 다르기 때문에 발생하는 오류입니다.

- 실제 파일 이름은 `src/lib/DateFormat.ts` 입니다. D가 대문자입니다.
- import 경로는 `@/lib/dateFormat` 입니다. d가 소문자입니다.

macOS의 기본 파일 시스템은 대소문자를 구분하지 않기 때문에, 로컬에서는 두 이름이 같은 파일로 인식되어 빌드가 성공합니다. 반면 ubuntu-latest의 파일 시스템은 대소문자를 구분하므로, `dateFormat` 이라는 파일을 찾지 못하고 TS2307 오류가 발생합니다. `paths` 설정 자체에는 문제가 없습니다.

## 해결 방법

`src/lib` 의 다른 파일(`currency.ts`, `http.ts`)이 모두 소문자로 시작하므로, 파일 이름을 `dateFormat.ts` 로 변경하는 방법을 권장합니다.

macOS에서 대소문자만 바꾸는 이름 변경은 git이 인식하지 못하는 경우가 있으므로, 임시 이름을 거쳐서 두 번에 나누어 변경합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

그 다음 프로젝트 전체에서 `DateFormat` 으로 import하는 곳이 남아 있는지 확인합니다.

```bash
grep -rn "lib/DateFormat" src
```

파일 이름을 바꾸지 않고 import 경로를 `@/lib/DateFormat` 으로 수정해도 오류는 해결됩니다. 다만 이 경우에는 파일 이름 규칙이 일관되지 않은 상태가 그대로 유지됩니다.

## 재발 방지

`tsconfig.json` 의 `compilerOptions` 에 아래 옵션을 추가하면, 로컬(macOS)에서도 대소문자가 다른 import를 오류로 처리하므로 CI에서 실패하기 전에 미리 발견할 수 있습니다.

```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

이 옵션은 TypeScript 5.0 이후에는 기본값이 `true` 이지만, 명시해 두면 설정 의도가 분명하게 드러납니다. 또한 로컬 git 저장소에서 `git ls-files src/lib` 를 실행하면 git이 실제로 추적 중인 파일 이름의 대소문자를 확인할 수 있습니다.

</td>
<td valign="top">

## 원인

import 경로에 적힌 파일 이름과 실제 파일 이름의 대소문자가 다릅니다.

- 코드: `@/lib/dateFormat`
- 실제 파일: `src/lib/DateFormat.ts`

macOS의 기본 파일 시스템은 대소문자를 구분하지 않아서 로컬에서는 두 이름이 같은 파일로 인식되어 빌드가 통과합니다. GitHub Actions의 ubuntu-latest는 대소문자를 구분하므로 `dateFormat` 이라는 파일을 찾지 못하고 TS2307 오류를 냅니다.

## 해결 방법

`src/lib` 의 다른 파일(`currency.ts`, `http.ts`)이 모두 소문자로 시작하니 파일 이름을 `dateFormat.ts` 로 변경하는 편이 일관됩니다. macOS에서는 git이 대소문자만 바꾼 이름 변경을 인식하지 못하는 경우가 있으므로 임시 이름을 거쳐서 변경합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

이름을 변경한 뒤에는 `DateFormat` 으로 import하는 다른 파일이 남아 있지 않은지 확인합니다.

```bash
grep -rn "lib/DateFormat" src
```

파일 이름은 그대로 두고 싶다면 `BookingForm.tsx` 의 import를 `'@/lib/DateFormat'` 으로 수정해도 됩니다.

## 재발 방지

`tsconfig.json` 의 `compilerOptions` 에 아래 옵션을 추가하면 로컬에서도 대소문자가 어긋난 import가 오류로 표시되어, CI에 올리기 전에 같은 문제를 발견할 수 있습니다. TypeScript 5 이상에서는 기본값이 `true` 이지만, 명시해 두면 설정이 바뀌어도 동작이 유지됩니다.

```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

</td>
</tr>
</table>

</details>

<details>
<summary>다른 비교에 들어가는 조건의 출력 (예시 2개)</summary>

1번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

## 원인

import 경로의 파일 이름과 실제 파일 이름의 대소문자가 서로 다릅니다.

- 코드의 import: `@/lib/dateFormat` (소문자 `d`)
- 실제 파일: `src/lib/DateFormat.ts` (대문자 `D`)

macOS의 기본 파일 시스템은 대소문자를 구분하지 않아서 두 이름을 같은 파일로 취급하므로 로컬에서는 빌드가 통과합니다. ubuntu-latest의 파일 시스템은 대소문자를 구분해서 `dateFormat.ts`라는 파일을 찾지 못하고 TS2307 오류를 냅니다. paths 설정(`"@/*": ["./src/*"]`)은 정상이며 이 문제와 관련이 없습니다.

## 해결 방법

import 쪽과 파일 쪽 중 하나를 다른 쪽에 맞추면 됩니다. `currency.ts`와 `http.ts`가 소문자로 시작하므로 파일 이름을 소문자로 바꾸는 쪽이 일관됩니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.ts
```

대소문자만 바꾼 이름 변경은 macOS에서 git이 변경으로 인식하지 못하는 경우가 있습니다. 그럴 때는 임시 이름을 거쳐서 두 번에 나눠 바꿉니다.

```bash
git mv src/lib/DateFormat.ts src/lib/tmp_dateFormat.ts
git mv src/lib/tmp_dateFormat.ts src/lib/dateFormat.ts
```

이름을 바꾼 뒤에는 아래 항목도 확인합니다.

1. `DateFormat`으로 import하는 다른 파일이 있는지 검색합니다. 이름을 바꾸면 그 파일들이 로컬에서도 실패합니다.
   ```bash
   grep -rniE "lib/dateformat" src
   ```
2. 원격 저장소에 기록된 이름이 실제로 바뀌었는지 확인합니다. 출력이 `src/lib/dateFormat.ts`여야 합니다.
   ```bash
   git ls-files src/lib
   ```
3. `tsconfig.json`에 `"forceConsistentCasingInFileNames": true`를 설정합니다. 이 옵션을 켜면 macOS에서 `pnpm build`를 실행할 때도 같은 대소문자 오류가 발생하므로 CI에 올리기 전에 문제를 발견할 수 있습니다. TypeScript 5.x 이후에는 기본값이 `true`이지만, 명시하면 설정 의도가 분명해집니다.

</td>
</tr>
</table>

2번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

원인은 파일 이름과 import 경로의 대소문자가 서로 달라서입니다. 실제 파일은 `src/lib/DateFormat.ts` 인데 import 는 `@/lib/dateFormat` 으로 작성되어 있습니다.

macOS 의 기본 파일 시스템은 대소문자를 구분하지 않아서 `dateFormat` 으로 써도 `DateFormat.ts` 를 찾아 줍니다. 반면 ubuntu-latest 의 파일 시스템은 대소문자를 구분하므로 `dateFormat.ts` 가 없다고 판단하고 TS2307 오류를 냅니다. paths 설정(`"@/*": ["./src/*"]`)은 정상이니 수정할 필요가 없습니다.

## 고치는 방법

파일 이름을 import 에 맞춰 `dateFormat.ts` 로 변경합니다. `src/lib` 의 나머지 파일(`currency.ts`, `http.ts`)이 camelCase 이므로 이 방향이 기존 관례와도 맞습니다. macOS 에서는 대소문자만 바꾸는 이름 변경을 git 이 인식하지 못할 수 있으므로 임시 이름을 거쳐서 두 단계로 변경합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

변경한 뒤에는 `git ls-files src/lib` 로 git 이 추적하는 이름이 `dateFormat.ts` 인지 확인합니다. 로컬 폴더에서는 이름이 바뀌어 보여도 git 에는 예전 이름이 남아 있는 경우가 있고, CI 는 git 에 기록된 이름으로 체크아웃하기 때문입니다.

또 다른 파일에서 `@/lib/DateFormat` 처럼 대문자로 import 한 곳이 있으면 같은 오류가 납니다. 아래 명령으로 대소문자가 섞인 import 를 모두 찾아서 `@/lib/dateFormat` 으로 통일하세요.

```bash
grep -rniE "lib/dateformat" src
```

## 재발 방지

`tsconfig.json` 의 `compilerOptions` 에 `"forceConsistentCasingInFileNames": true` 를 추가하면 대소문자가 다른 import 를 macOS 로컬에서도 오류로 보고합니다. TypeScript 5 이상에서는 기본값이 `true` 이지만, 이 옵션은 같은 파일을 서로 다른 대소문자로 참조할 때를 검사하므로 이 경우처럼 실제 파일 이름과 import 가 다른 상황은 macOS 에서 통과할 수 있습니다. 그래서 로컬에서 미리 잡으려면 위의 `grep` 확인이나 ESLint 의 `import/no-unresolved` 에 `caseSensitive` 옵션(기본값 `true`)을 켜 두는 방법이 더 확실합니다.

</td>
</tr>
</table>

3번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

원인은 파일 이름과 import 경로의 대소문자가 서로 달라서 생긴 문제입니다. 실제 파일은 `src/lib/DateFormat.ts`인데 `BookingForm.tsx`에서는 `@/lib/dateFormat`으로 불러오고 있습니다. macOS의 기본 파일 시스템은 대소문자를 구분하지 않아서 로컬에서는 두 이름이 같은 파일로 해석되지만, ubuntu-latest의 파일 시스템은 대소문자를 구분하므로 `dateFormat`이라는 파일을 찾지 못해 TS2307 오류가 발생합니다. `tsconfig.json`의 paths 설정(`"@/*": ["./src/*"]`)에는 문제가 없습니다.

## 고치는 방법

프로젝트의 다른 파일(`currency.ts`, `http.ts`)이 소문자로 시작하므로 파일 이름을 `dateFormat.ts`로 바꾸는 쪽을 권장합니다.

macOS에서는 대소문자만 다른 이름으로 한 번에 바꾸면 git이 변경을 인식하지 못할 수 있어서, 임시 이름을 거쳐서 두 단계로 바꿉니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

그다음 `DateFormat`으로 불러오는 곳이 더 남아 있지 않은지 확인합니다.

```bash
grep -rn "lib/DateFormat" src
```

이름을 바꾸는 대신 import 경로를 `@/lib/DateFormat`으로 수정해도 CI는 통과합니다. 다만 이 경우 같은 폴더의 다른 파일과 이름 규칙이 달라집니다.

## 재발 방지

`tsconfig.json`의 `compilerOptions`에 `"forceConsistentCasingInFileNames": true`를 추가하면 로컬 macOS에서도 대소문자가 다른 import를 오류로 표시하므로, CI에서 실패하기 전에 발견할 수 있습니다. TypeScript 5.x 이후 버전에서는 이 옵션이 기본값으로 켜져 있지만, 설정 파일에 명시해 두면 버전이 바뀌어도 동작이 유지됩니다. 이미 켜져 있는데도 로컬에서 오류가 나지 않았다면 git 인덱스에 남은 이름과 디스크의 이름이 다른 상태일 수 있으므로, `git ls-files src/lib`로 git이 기록한 파일 이름도 확인해 보세요.

</td>
</tr>
</table>

</details>

## 02-explain-locking: 낙관적 잠금과 비관적 잠금 가운데 고르기

갈래: 설명 답변

<details>
<summary>입력 보기</summary>

`````text
재고 차감 API 에서 주문이 동시에 들어오면 재고가 음수가 되는 문제가 있습니다. 낙관적 잠금과 비관적 잠금 가운데 어느 쪽을 써야 할지 모르겠습니다. 두 방식의 차이를 설명하고, 인기 상품에 주문이 몰리는 쇼핑몰에는 어느 쪽이 맞는지 알려 주세요. DB 는 PostgreSQL 이고 ORM 은 Prisma 입니다.
`````

</details>

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 기본 | 0.0 | 2.50 |
| fluent-korean | 0.7 | 2.33 |
| 우리 스킬 | 0.0 | 1.17 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

## 결론부터

인기 상품에 주문이 몰리는 환경에서는 **비관적 잠금 쪽이 맞습니다.** 다만 재고 차감처럼 단순한 경우에는 `SELECT ... FOR UPDATE`보다 **조건부 원자적 UPDATE 한 문장**이 더 간단하고 빠릅니다. 이 방식은 사실상 짧은 비관적 잠금처럼 동작합니다.

## 두 방식의 차이

| | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 가정 | 충돌은 드물다 | 충돌이 자주 난다 |
| 방식 | 잠금 없이 읽고, 쓸 때 `version`이 바뀌었는지 확인 | 읽을 때 행 잠금(`FOR UPDATE`)을 걸고 다른 트랜잭션을 대기시킴 |
| 충돌 시 | 업데이트 실패, 애플리케이션이 재시도 | 먼저 온 트랜잭션이 끝날 때까지 대기 후 순차 처리 |
| 장점 | 잠금 대기가 없고 읽기가 가볍다 | 충돌해도 실패 없이 순서대로 처리된다 |
| 단점 | 경합이 심하면 재시도가 폭증하고 대부분 실패한다 | 잠금을 오래 쥐면 대기열이 쌓이고 데드락 위험이 있다 |

## 인기 상품에는 왜 비관적 잠금인가

같은 행에 수백 건이 동시에 몰리면 낙관적 잠금에서는 한 번에 한 건만 성공하고 나머지는 모두 실패 후 재시도합니다. 재시도가 다시 충돌하면서 DB 부하와 응답 지연만 커집니다. 반면 비관적 잠금은 줄을 세워 하나씩 처리하므로 처리량이 예측 가능합니다.

## 추천 구현: 조건부 원자적 UPDATE

읽고, 검사하고, 쓰는 과정을 한 문장으로 합치면 경쟁 구간이 사라집니다. PostgreSQL은 UPDATE 중에 행 잠금을 잡기 때문에 동시 요청이 자동으로 직렬화됩니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new Error('재고 부족');
}
```

실행되는 SQL은 `UPDATE ... SET stock = stock - $1 WHERE id = $2 AND stock >= $1`입니다. 영향받은 행이 0이면 재고가 부족한 것입니다.

주의할 점은 `findUnique`로 재고를 읽어 코드에서 `if (stock >= qty)`로 검사한 뒤 `update`하는 패턴입니다. 이 패턴은 읽기와 쓰기 사이에 다른 요청이 끼어들기 때문에 음수 재고의 원인이 됩니다.

## 주문 생성과 함께 처리해야 할 때

재고 차감과 주문 생성이 한 트랜잭션이어야 하면 `$transaction` 안에서 처리하세요.

```ts
await prisma.$transaction(async (tx) => {
  const r = await tx.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
  if (r.count === 0) throw new Error('재고 부족');

  await tx.order.create({ data: { /* ... */ } });
});
```

재고 외의 다른 값도 읽고 판단해야 한다면 Prisma가 `FOR UPDATE`를 지원하지 않으므로 raw 쿼리를 쓰세요.

```ts
await prisma.$transaction(async (tx) => {
  const [p] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE`;
  if (p.stock < quantity) throw new Error('재고 부족');
  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

## 추가 권장 사항

- **안전망 제약**: `ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);` 애플리케이션 로직에 버그가 있어도 음수 재고는 DB가 막아 줍니다.
- **트랜잭션을 짧게**: 잠금을 잡은 상태에서 결제 API 같은 외부 호출을 하지 마세요. 대기열이 막힙니다. 재고 차감 후 결제하고, 실패하면 재고를 복구하는 방식이 일반적입니다.
- **데드락 방지**: 여러 상품을 한 주문에서 차감한다면 항상 상품 ID 순서로 잠금을 잡으세요.
- **초대형 트래픽(특가, 한정 수량)**: 단일 행에 초당 수천 건이 몰리면 DB 행 잠금도 병목이 됩니다. 이때는 Redis의 `DECR`로 선점하고 DB에 비동기 반영하거나, 재고를 여러 행으로 쪼개는 방식을 고려하세요.

## 요약

- 경합이 낮은 일반 상품은 낙관적 잠금도 괜찮습니다.
- 인기 상품에 주문이 몰린다면 조건부 `UPDATE`(또는 `FOR UPDATE`)로 DB가 직렬화하게 하세요.
- 여기에 `CHECK (stock >= 0)` 제약을 더하면 안전합니다.

</td>
<td valign="top">

## 두 방식의 차이

**낙관적 잠금**은 충돌이 드물다고 가정하고 잠금 없이 작업을 진행합니다. 갱신하는 시점에 다른 트랜잭션이 먼저 데이터를 변경했는지 확인하며, 변경되었다면 갱신을 실패시키고 재시도합니다. 보통 `version` 컬럼을 두고 `WHERE id = ? AND version = ?` 조건으로 갱신합니다.

**비관적 잠금**은 충돌이 자주 발생한다고 가정하고 읽는 시점에 행을 잠급니다. PostgreSQL에서는 `SELECT ... FOR UPDATE`를 사용하며, 같은 행에 접근하는 다른 트랜잭션은 첫 트랜잭션이 끝날 때까지 대기합니다.

| 구분 | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 충돌 처리 | 실패 후 재시도 | 대기 후 순차 처리 |
| 충돌이 적을 때 | 유리함 | 불필요한 잠금 비용이 발생함 |
| 충돌이 잦을 때 | 재시도가 폭증하여 불리함 | 안정적으로 동작함 |
| 구현 복잡도 | 재시도 로직이 필요함 | 트랜잭션 관리가 필요함 |

## 인기 상품에는 어느 쪽이 맞는가

인기 상품에는 **비관적 방식이 맞습니다.** 같은 행에 동시 요청이 집중되면 낙관적 잠금에서는 요청 하나만 성공하고 나머지가 모두 실패하여 재시도하게 됩니다. 이 과정에서 DB 부하가 오히려 커지고, 재시도 한도를 넘긴 주문은 재고가 남아 있는데도 실패할 수 있습니다.

다만 실무에서 가장 권장하는 방식은 `SELECT ... FOR UPDATE`가 아니라 **조건부 원자적 UPDATE**입니다. 행 잠금은 `UPDATE` 실행 중에 DB가 자동으로 획득하므로 비관적 방식의 장점을 그대로 얻으면서, 조회와 갱신을 한 번에 처리하여 잠금 유지 시간이 최소화됩니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new Error('재고가 부족합니다.');
}
```

이 코드는 다음 SQL로 실행됩니다.

```sql
UPDATE "Product" SET stock = stock - $1
WHERE id = $2 AND stock >= $1;
```

`stock >= quantity` 조건이 갱신과 동시에 평가되므로 재고가 음수가 될 수 없습니다. 영향받은 행이 0개라면 재고 부족으로 판단하면 됩니다. 주문 생성과 재고 차감을 하나의 원자적 작업으로 묶어야 한다면 `prisma.$transaction` 안에서 실행하십시오.

## 명시적으로 잠금이 필요한 경우

차감 전에 재고 외의 다른 값을 읽고 복잡한 판단을 해야 한다면 `FOR UPDATE`가 필요합니다. Prisma는 이를 지원하지 않으므로 raw query를 사용해야 합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE`;
  if (row.stock < quantity) throw new Error('재고가 부족합니다.');
  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

이때는 트랜잭션 안에서 외부 API 호출 같은 느린 작업을 하지 않아야 합니다. 잠금 유지 시간이 길어지면 대기 요청이 쌓이기 때문입니다.

## 추가로 권장하는 사항

- **CHECK 제약 추가**: `CHECK (stock >= 0)`을 걸면 코드에 실수가 있어도 DB가 음수 재고를 거부합니다. Prisma 스키마는 CHECK 제약을 표현하지 못하므로 마이그레이션 SQL을 직접 수정하여 추가해야 합니다.
- **격리 수준 유지**: 위 방식은 기본 격리 수준인 `READ COMMITTED`에서 정확하게 동작하므로, `SERIALIZABLE`로 올릴 필요가 없습니다.
- **단일 행의 처리량 한계 인지**: 한 상품 행에 대한 갱신은 순차적으로 처리됩니다. 초당 수천 건 이상이 같은 상품에 몰리는 선착순 판매라면, Redis에서 `DECR`로 재고를 먼저 차감하고 DB에는 비동기로 반영하거나, 대기열을 도입하는 구조를 검토해야 합니다.

## 결론

일반적인 쇼핑몰의 인기 상품에는 낙관적 잠금보다 **조건부 원자적 UPDATE**(사실상 짧게 유지되는 비관적 잠금)를 사용하시기 바랍니다. 구현이 가장 간단하고 충돌이 많은 상황에서도 안정적이며, CHECK 제약과 함께 쓰면 음수 재고를 이중으로 방지할 수 있습니다.

</td>
<td valign="top">

인기 상품에 주문이 몰리는 경우에는 낙관적 잠금보다 비관적 잠금이 맞습니다. 다만 재고 차감에는 두 방식보다 조건부 UPDATE 한 문장이 더 적합하므로, 그 방법을 먼저 권합니다.

## 두 방식의 차이

| | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 잠금 시점 | 읽을 때는 잠그지 않고 쓸 때 충돌을 검사합니다 | 읽는 시점에 행을 잠급니다 |
| 충돌 처리 | UPDATE가 0건 갱신되면 애플리케이션이 다시 읽고 재시도합니다 | 다른 트랜잭션이 잠금이 풀릴 때까지 기다립니다 |
| 유리한 상황 | 같은 행을 동시에 수정하는 일이 드물 때 | 같은 행에 수정이 자주 몰릴 때 |
| 비용 | 충돌이 잦으면 재시도로 DB 왕복이 늘어납니다 | 트랜잭션이 길면 대기열이 길어지고 커넥션을 오래 점유합니다 |

낙관적 잠금은 `version` 컬럼을 두고 `UPDATE ... WHERE id = ? AND version = ?`로 갱신합니다. 같은 상품에 요청 100개가 동시에 들어오면 한 번에 하나만 성공하고 나머지는 모두 재시도해야 하며, 재시도하는 요청끼리 다시 충돌하므로 DB 왕복이 요청 수에 비례해서 늘어납니다. 재시도 횟수에 상한을 두면 재고가 남아 있는데도 실패하는 주문이 생깁니다.

비관적 잠금은 `SELECT ... FOR UPDATE`로 행을 잠그기 때문에 재시도 없이 요청이 순서대로 처리됩니다. 인기 상품처럼 충돌이 확실히 일어나는 행에서는 이 방식이 낭비하는 작업이 더 적습니다.

## 권장: 조건부 원자적 UPDATE

재고 차감은 "현재 재고가 충분하면 차감한다"는 조건 하나로 표현할 수 있으므로 읽기와 쓰기를 나눌 필요가 없습니다. PostgreSQL은 UPDATE 실행 중 행 잠금을 얻고, 다른 트랜잭션이 먼저 갱신했다면 대기한 뒤 갱신된 값으로 WHERE 조건을 다시 평가합니다. 그래서 별도의 `FOR UPDATE`나 `version` 컬럼 없이도 재고가 음수가 되지 않습니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new OutOfStockError(productId);
}
```

`update`가 아니라 `updateMany`를 쓰는 이유는 조건에 맞는 행이 없을 때 예외 대신 `count: 0`을 받기 위해서입니다. 이 방식은 기본 격리 수준인 READ COMMITTED에서 동작하며, REPEATABLE READ 이상으로 올리면 직렬화 실패가 발생해서 재시도가 필요해집니다.

## 비관적 잠금이 필요한 경우

재고 확인 뒤에 쿠폰 검증처럼 애플리케이션 로직이 끼어들어서 조건을 SQL 한 문장으로 표현할 수 없다면 `FOR UPDATE`를 사용합니다. Prisma는 이 구문을 지원하지 않으므로 interactive transaction 안에서 raw query로 실행합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;

  if (!row || row.stock < quantity) {
    throw new OutOfStockError(productId);
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

이 방식을 사용할 때에는 다음 사항을 지켜야 합니다.

- 잠금을 보유하는 시간이 곧 대기 시간이므로 결제 API 호출 같은 외부 통신은 트랜잭션 밖에서 처리합니다.
- 한 주문에 여러 상품이 있으면 상품 id 순서대로 잠금을 걸어야 교착 상태를 피할 수 있습니다.
- `$transaction`의 `timeout`과 `maxWait`를 명시해서 대기가 길어질 때 커넥션 풀이 고갈되지 않게 합니다.

## 안전장치로 CHECK 제약 추가

코드에서 조건을 빠뜨리는 경우를 대비해서 DB에도 제약을 걸어 두면 재고가 음수가 되는 상황을 막을 수 있습니다. Prisma schema는 CHECK 제약을 표현하지 못하므로 마이그레이션 SQL을 직접 작성합니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT product_stock_non_negative CHECK (stock >= 0);
```

한 상품에서 초당 수천 건 이상이 들어오면 단일 행 잠금 자체가 한계가 될 수 있습니다. 그때에는 Redis의 원자적 카운터로 재고를 먼저 선점하고 DB에 비동기로 반영하는 구조를 검토해야 하는데, 현재 규모를 알려 주시면 그 단계가 필요한지 함께 판단해 드리겠습니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

# 재고 차감 동시성: 낙관적 잠금 vs 비관적 잠금

## 두 방식의 차이

| | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 전제 | 충돌은 드물다 | 충돌이 자주 난다 |
| 동작 | 잠그지 않고 읽은 뒤, 쓸 때 `version`이 그대로인지 확인 | 읽는 시점에 행을 잠가 다른 트랜잭션을 대기시킴 |
| 충돌 시 | 업데이트가 0건이 되어 **재시도** 필요 | 앞 트랜잭션이 끝날 때까지 **대기** |
| 비용 | 충돌이 많으면 재시도 폭증 | 락 대기와 데드락 위험, 커넥션 점유 |
| PostgreSQL | `version` 컬럼 + 조건부 `UPDATE` | `SELECT ... FOR UPDATE` |

## 인기 상품 쇼핑몰에는 비관적 쪽이 맞습니다

같은 행에 요청이 몰리면 낙관적 잠금은 거의 매번 충돌합니다. 100명이 동시에 주문하면 1명만 성공하고 99명이 재시도하며, 재시도해도 다시 충돌합니다. DB 부하만 늘고 처리량은 오히려 떨어집니다. 비관적 잠금은 순서대로 처리하므로 결과가 예측 가능합니다.

다만 이 경우에는 **둘 다 쓰지 않고, 조건부 원자적 UPDATE 한 줄로 푸는 방법**이 가장 낫습니다. 아래에서 설명합니다.

## 권장안: 원자적 조건부 UPDATE (Prisma)

PostgreSQL은 `UPDATE` 시점에 행 락을 자동으로 잡습니다. 그래서 "재고가 충분할 때만 차감"을 한 문장으로 쓰면 읽기와 쓰기 사이의 틈이 없습니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: qty } },
  data: { stock: { decrement: qty } },
});

if (result.count === 0) {
  throw new Error("재고 부족");
}
```

생성되는 SQL은 `UPDATE ... SET stock = stock - $1 WHERE id = $2 AND stock >= $1`입니다. 락 유지 시간이 이 문장 하나로 끝나서 가장 짧고, 재시도 로직도 필요 없습니다.

안전장치로 DB 제약도 추가해 두세요. 코드에 버그가 있어도 음수는 막아 줍니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

## 비관적 잠금이 꼭 필요할 때

재고 확인 후 다른 로직(쿠폰, 포인트, 여러 테이블 갱신 등)이 같은 트랜잭션에서 이어져야 한다면 `FOR UPDATE`를 씁니다. Prisma는 이 문법을 지원하지 않으므로 raw 쿼리를 사용합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  if (!row || row.stock < qty) throw new Error("재고 부족");

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: qty } },
  });
  // 주문 생성 등 후속 처리
});
```

주의할 점은 다음과 같습니다.
- 트랜잭션을 짧게 유지하세요. 락을 잡은 채 외부 API(결제 등)를 호출하면 대기열이 쌓입니다.
- 여러 상품을 한 주문에서 차감한다면 **상품 ID 오름차순**으로 처리하세요. 락 순서가 일정해야 데드락이 생기지 않습니다.

## 낙관적 잠금은 언제 쓰나

충돌이 드문 데이터에 적합합니다. 예를 들어 관리자가 상품 정보를 수정하는 경우입니다. 인기 상품의 재고 차감에는 맞지 않습니다.

## 그래도 부족하다면

한 행에 초당 수천 건이 몰리면 어떤 락 방식이든 그 행이 병목이 됩니다. 그때는 다음을 검토하세요.
- Redis `DECR`로 선차감한 뒤 DB에 비동기로 반영
- 주문을 큐에 넣어 순차 처리
- 재고를 여러 행(샤드)으로 나눠 분산

## 결론

1. 기본은 **조건부 원자적 UPDATE + CHECK 제약**입니다.
2. 재고 확인 뒤 복잡한 로직이 이어진다면 **`FOR UPDATE`(비관적)**를 씁니다.
3. 인기 상품에는 낙관적 잠금을 피하세요.

</td>
<td valign="top">

## 문제가 발생하는 원인

재고를 읽어서 애플리케이션에서 검사한 뒤 다시 쓰는 방식이라면, 두 요청이 동시에 같은 재고 값을 읽을 수 있습니다. 재고가 1개 남은 상태에서 두 요청이 모두 "재고가 충분하다"고 판단하고 차감하면 재고가 음수가 됩니다. 두 방식은 이 읽기와 쓰기 사이의 간격을 처리하는 방법이 서로 다릅니다.

## 두 방식의 차이

**비관적 잠금**은 충돌이 발생할 것이라고 가정하고, 읽는 시점에 행을 잠급니다. 다른 트랜잭션은 잠금이 해제될 때까지 대기하므로, 충돌 자체가 발생하지 않습니다. PostgreSQL에서는 `SELECT ... FOR UPDATE`로 구현합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [item] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE`;
  if (item.stock < qty) throw new Error('재고 부족');
  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: qty } },
  });
});
```

**낙관적 잠금**은 충돌이 드물 것이라고 가정하고, 잠금 없이 진행합니다. 대신 `version` 컬럼을 두고, 쓰는 시점에 읽었을 때의 버전과 일치하는지 확인합니다. 일치하지 않으면 다른 요청이 먼저 수정한 것이므로 실패 처리하고 재시도합니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, version: current.version, stock: { gte: qty } },
  data: { stock: { decrement: qty }, version: { increment: 1 } },
});
if (result.count === 0) {
  // 충돌이 발생했으므로 다시 읽고 재시도해야 함
}
```

| 구분 | 비관적 잠금 | 낙관적 잠금 |
|---|---|---|
| 충돌 처리 | 대기시킴 | 실패 후 재시도 |
| 충돌이 잦을 때 | 처리량은 낮아지지만 결과는 안정적임 | 재시도가 폭증하여 오히려 비효율적임 |
| 충돌이 드물 때 | 불필요한 잠금 비용이 발생함 | 가장 효율적임 |
| 주의할 점 | 트랜잭션을 길게 유지하면 대기가 길어지고 데드락 위험이 커짐 | 재시도 로직과 version 컬럼이 필요함 |

## 인기 상품에는 어느 쪽이 맞는가

**낙관적 잠금은 적합하지 않습니다.** 같은 행에 요청이 집중되면 대부분의 요청이 버전 충돌로 실패하고 재시도하게 됩니다. 재시도가 다시 충돌을 일으키므로 DB 부하가 늘어나고, 일부 요청은 끝내 성공하지 못할 수도 있습니다.

**비관적 잠금이 더 적합합니다.** 요청이 행 단위로 순서대로 처리되어 결과가 예측 가능합니다. 다만 잠금을 잡은 채로 외부 결제 API 호출 같은 느린 작업을 하면 안 됩니다. 잠금 구간은 재고 차감 한 번으로 짧게 유지해야 합니다.

## 가장 권장하는 방식: 조건부 원자적 UPDATE

사실 이 문제는 두 방식을 모두 쓰지 않고도 해결할 수 있습니다. 검사와 차감을 하나의 SQL 문으로 합치면, PostgreSQL이 해당 행에 잠금을 걸고 조건을 다시 평가하므로 음수가 발생하지 않습니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: qty } },
  data: { stock: { decrement: qty } },
});
if (result.count === 0) throw new Error('재고 부족');
```

이 방식은 별도의 SELECT가 없고, 잠금 유지 시간이 UPDATE 한 문장으로 한정되며, 재시도 로직도 필요하지 않습니다. 인기 상품처럼 경합이 심한 상황에서도 가장 단순하고 빠르게 동작합니다.

## 추가로 권장하는 안전장치

- DB에 `CHECK (stock >= 0)` 제약을 추가하면, 코드에 실수가 있더라도 음수 재고가 저장되지 않습니다. Prisma 스키마에서는 직접 지원하지 않으므로 마이그레이션 SQL에 직접 작성해야 합니다.
- 주문 한 건에 여러 상품이 포함된다면, 상품 ID 순서대로 차감하도록 고정해야 데드락을 방지할 수 있습니다.
- 초당 수천 건 이상의 요청이 한 상품에 집중되는 수준이라면, Redis의 원자적 연산(`DECRBY`)으로 먼저 재고를 선점하고 DB에는 비동기로 반영하는 구조를 검토할 수 있습니다. 일반적인 쇼핑몰이라면 위의 조건부 UPDATE만으로 충분한 경우가 대부분입니다.

## 결론

인기 상품이 많은 쇼핑몰이라면 낙관적 잠금보다는 비관적 잠금이 적합합니다. 그러나 단순히 재고를 차감하는 용도라면, 조건부 원자적 UPDATE와 `CHECK` 제약을 함께 사용하는 방식을 가장 먼저 권장합니다. 재고 차감 외에 다른 검증 로직이 같은 트랜잭션 안에서 필요할 때에만 `FOR UPDATE`를 사용하시면 됩니다.

</td>
<td valign="top">

## 재고가 음수가 되는 원인

재고를 조회한 뒤 애플리케이션에서 `stock >= quantity`를 확인하고 나중에 차감하면, 두 요청이 같은 재고 값을 읽고 둘 다 검증을 통과할 수 있습니다. PostgreSQL의 기본 격리 수준인 READ COMMITTED에서는 이런 경쟁 상태를 막아 주지 않습니다. 두 방식은 이 경쟁을 막는 시점이 서로 다릅니다.

## 두 방식의 차이

| | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 전제 | 충돌이 드물다 | 충돌이 잦다 |
| 동작 | 잠그지 않고 읽은 뒤 `version`이 그대로일 때만 갱신 | 읽는 시점에 행을 잠가 다른 트랜잭션을 대기시킴 |
| 충돌 시 | 갱신된 행이 0건이므로 애플리케이션이 재시도 | 먼저 잠근 트랜잭션이 끝날 때까지 대기 |
| 비용 | 충돌이 많으면 재시도가 늘어 DB 부하가 커짐 | 트랜잭션이 길면 대기 시간이 늘고 교착 상태 위험이 생김 |

Prisma에는 낙관적 잠금 기능이 내장되어 있지 않아서 `version` 컬럼을 직접 만들고 `updateMany`로 조건을 걸어야 합니다.

```ts
// 낙관적 잠금: 읽은 version과 같을 때만 갱신
const result = await prisma.inventory.updateMany({
  where: { productId, version: current.version, stock: { gte: quantity } },
  data: { stock: { decrement: quantity }, version: { increment: 1 } },
});
if (result.count === 0) {
  // 다른 요청이 먼저 갱신했거나 재고가 부족한 상태이므로 다시 조회해서 재시도
}
```

비관적 잠금은 인터랙티브 트랜잭션 안에서 `SELECT ... FOR UPDATE`를 사용해야 하며, Prisma 클라이언트의 기본 메서드로는 표현할 수 없어서 `$queryRaw`가 필요합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM inventory WHERE product_id = ${productId} FOR UPDATE`;
  if (!row || row.stock < quantity) throw new SoldOutError();

  await tx.inventory.update({
    where: { productId },
    data: { stock: { decrement: quantity } },
  });
});
```

## 인기 상품에는 어느 쪽이 맞는가

인기 상품에는 낙관적 잠금이 맞지 않습니다. 같은 행에 요청이 몰리면 한 번에 한 요청만 성공하고 나머지는 모두 실패해서 재시도하므로, 재시도 요청이 다시 서로 충돌하면서 DB 부하가 요청 수보다 빠르게 늘어납니다.

비관적 잠금은 요청을 한 줄로 세워 순서대로 처리하므로 몰리는 상황에서도 동작이 예측 가능합니다. 다만 잠금을 잡은 채로 결제 API 호출 같은 외부 작업을 하면 대기열이 길어지므로, 트랜잭션 안에서는 재고 확인과 차감만 수행해야 합니다.

## 더 간단한 방법: 조건부 원자적 UPDATE

재고 차감만 필요하다면 잠금 방식을 고르지 않고 검증과 차감을 SQL 한 문장으로 합치는 편이 가장 간단합니다. PostgreSQL이 UPDATE 중에 행 잠금을 자동으로 잡으므로, 조건 검사와 차감이 한 번에 이루어집니다.

```ts
const result = await prisma.inventory.updateMany({
  where: { productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});
if (result.count === 0) throw new SoldOutError(); // 품절 또는 재고 부족
```

이 방식은 별도의 `version` 컬럼이 필요 없고 트랜잭션도 짧게 유지됩니다. 재고 확인 후 쿠폰 검증처럼 읽은 값에 따라 분기하는 로직이 길게 이어질 때에만 `FOR UPDATE`를 사용하면 됩니다.

## 함께 적용할 사항

- **CHECK 제약**: `ALTER TABLE inventory ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);`를 추가하면 애플리케이션 코드에 버그가 있어도 DB가 음수 재고를 거부합니다.
- **단일 행 병목**: 한 상품에 초당 수천 건 이상 몰리는 수준이라면 행 잠금 대기가 병목이 됩니다. 이때는 Redis에서 `DECR`로 재고를 먼저 차감하고 DB에 비동기로 반영하는 구조나, 재고를 여러 행으로 나누는 방식을 검토해야 합니다. 일반적인 쇼핑몰 규모에서는 위의 조건부 UPDATE로 충분한 경우가 많습니다.

</td>
</tr>
</table>

</details>

<details>
<summary>3번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

## 결론

인기 상품에 주문이 몰리는 경우라면 **비관적 잠금 쪽이 맞습니다**. 다만 이 문제는 두 방식 모두 아니고, **조건부 원자적 UPDATE 한 줄**로 가장 간단하게 풀립니다. 이 방식은 DB가 행 잠금을 짧게 잡아 주기 때문에 사실상 가장 가벼운 비관적 잠금입니다.

## 두 방식의 차이

| | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 가정 | 충돌은 드물다 | 충돌이 잦다 |
| 방식 | 잠금 없이 읽고, 쓸 때 `version`이 그대로인지 확인 | 읽는 시점에 `SELECT ... FOR UPDATE`로 행을 잠금 |
| 충돌 시 | 업데이트가 0건이 되어 **재시도** 필요 | 다른 트랜잭션이 **대기** |
| 장점 | 잠금 대기가 없고, 충돌이 드물면 처리량이 높음 | 충돌이 많아도 결과가 안정적이고 재시도 로직이 불필요 |
| 단점 | 경합이 심하면 재시도가 폭증하고 실패율이 올라감 | 트랜잭션이 길면 대기열이 쌓이고 데드락 위험이 있음 |

## 인기 상품에 낙관적 잠금이 안 맞는 이유

같은 행에 100명이 동시에 접근하면 한 명만 성공하고 99명은 재시도합니다. 재시도에서도 같은 일이 반복되므로 DB 부하는 커지는데 처리량은 오히려 떨어집니다. 사용자에게는 불필요한 실패 응답이 나가기도 합니다.

## 권장: 조건부 원자적 UPDATE

읽고 계산하고 쓰는 과정을 SQL 한 문장으로 합치면 경쟁 상태가 사라집니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new Error('재고가 부족합니다');
}
```

생성되는 SQL은 다음과 같습니다.

```sql
UPDATE "Product" SET stock = stock - $1 WHERE id = $2 AND stock >= $1;
```

- PostgreSQL이 UPDATE 중에 행 잠금을 잡으므로 동시 요청은 순서대로 처리됩니다.
- 대기 후에는 최신 값으로 `stock >= quantity`를 다시 평가하므로 음수가 될 수 없습니다.
- 재시도 로직이 필요 없고 왕복도 1회뿐입니다.

여기서 `findUnique`로 재고를 읽은 뒤 `update`하는 방식은 쓰면 안 됩니다. 지금 문제가 바로 그 패턴에서 생깁니다.

## 안전장치로 CHECK 제약 추가

애플리케이션 버그가 있어도 DB가 음수를 막아 주도록 합니다. Prisma 스키마는 CHECK를 직접 지원하지 않으므로 마이그레이션 SQL에 추가합니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

## 재고 외에 검증이나 다른 테이블 작업도 함께 해야 한다면

재고 확인 후 주문 생성 등 여러 단계를 한 트랜잭션에서 처리해야 한다면 `SELECT FOR UPDATE`를 씁니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  if (!row || row.stock < quantity) throw new Error('재고가 부족합니다');

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
  await tx.order.create({ data: { /* ... */ } });
});
```

주의할 점은 다음과 같습니다.
- 트랜잭션 안에서 **결제 API 같은 외부 호출을 하지 마세요.** 잠금을 오래 쥐면 같은 상품의 모든 주문이 줄을 섭니다.
- 여러 상품을 잠글 때는 **항상 id 오름차순**으로 잠가 데드락을 피하세요.

## 그래도 트래픽이 감당이 안 될 때

단일 행에 초당 수천 건 이상이 몰리는 선착순 판매 같은 경우입니다. 이때는 행 하나가 병목이 되므로 구조를 바꿔야 합니다.
- Redis의 `DECR`로 재고를 선차감하고, DB에는 큐로 비동기 반영
- 재고를 여러 행(샤드)으로 쪼개 경합 분산
- 주문 접수를 큐에 넣어 순차 처리

대부분의 쇼핑몰은 조건부 UPDATE와 CHECK 제약만으로 충분합니다. 이것부터 적용하고 부하 테스트로 한계를 확인한 뒤 다음 단계를 고려하시길 권합니다.

</td>
<td valign="top">

## 문제의 원인

PostgreSQL의 기본 격리 수준은 READ COMMITTED입니다. 재고를 조회한 뒤 애플리케이션에서 계산하고 다시 저장하는 구조라면, 두 요청이 같은 재고 값을 동시에 읽은 상태에서 각자 차감하게 됩니다. 그 결과 재고가 음수가 됩니다. 이 문제는 "조회 후 갱신"이라는 두 단계를 하나의 원자적 연산으로 합쳐야 해결됩니다.

## 두 방식의 차이

| 구분 | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 전제 | 충돌이 드물다고 가정합니다. | 충돌이 자주 발생한다고 가정합니다. |
| 동작 | 잠금 없이 읽고, 갱신 시점에 `version` 값이 바뀌었는지 확인합니다. | 읽는 시점에 `SELECT ... FOR UPDATE`로 행을 잠그고, 트랜잭션이 끝날 때까지 다른 요청을 대기시킵니다. |
| 충돌 시 | 갱신이 실패하므로 재시도해야 합니다. | 대기한 뒤 순서대로 처리됩니다. |
| 장점 | 잠금 대기가 없고, 충돌이 적으면 처리량이 높습니다. | 구현이 단순하고, 재시도 로직이 필요하지 않습니다. |
| 단점 | 충돌이 많으면 실패와 재시도가 급증하여 오히려 성능이 떨어집니다. | 트랜잭션이 길어지면 대기 시간이 늘어나고, 교착 상태 위험이 생깁니다. |

## 인기 상품에는 어느 쪽이 맞는가

**비관적 잠금 계열이 적합합니다.** 인기 상품에는 같은 행에 요청이 집중되므로 충돌 확률이 매우 높습니다. 낙관적 잠금을 쓰면 대부분의 요청이 버전 불일치로 실패하고, 재시도가 다시 부하를 만들어 처리량이 크게 떨어집니다.

다만 실무에서 가장 권장하는 방식은 둘 중 어느 쪽도 아닌 **조건부 원자적 UPDATE**입니다. 조회 없이 갱신 문장 하나로 검사와 차감을 동시에 수행하며, 행 잠금은 해당 문장이 실행되는 짧은 시간에만 유지됩니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new Error('재고가 부족합니다');
}
```

PostgreSQL에서는 이 문장이 `UPDATE ... SET stock = stock - $1 WHERE id = $2 AND stock >= $1`로 실행됩니다. 동시 요청은 행 잠금 때문에 순서대로 처리되고, 재고가 부족해진 시점부터는 `count`가 0으로 반환됩니다.

## Prisma에서의 구현 방법

**1. 조건부 원자적 UPDATE (권장)**

위의 코드를 그대로 사용하면 됩니다. 주문 생성과 재고 차감을 한 번에 묶어야 한다면 `prisma.$transaction` 안에서 실행하십시오.

**2. 비관적 잠금 (조회한 재고 값으로 다른 로직을 수행해야 할 때)**

Prisma는 `FOR UPDATE`를 기본 API로 지원하지 않으므로 `$queryRaw`를 사용해야 합니다.

```ts
await prisma.$transaction(async (tx) => {
  const rows = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  if (rows.length === 0 || rows[0].stock < quantity) {
    throw new Error('재고가 부족합니다');
  }
  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

**3. 낙관적 잠금 (충돌이 드문 일반 상품용)**

모델에 `version Int @default(0)` 필드를 추가한 뒤 사용합니다.

```ts
const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
if (product.stock < quantity) throw new Error('재고가 부족합니다');

const result = await prisma.product.updateMany({
  where: { id: productId, version: product.version },
  data: { stock: { decrement: quantity }, version: { increment: 1 } },
});
if (result.count === 0) {
  // 다른 요청이 먼저 갱신했으므로 처음부터 재시도해야 합니다.
}
```

## 추가로 권장하는 사항

- **DB 제약 조건 추가**: 애플리케이션 로직에 결함이 있더라도 음수 재고를 차단하도록, 마이그레이션에 `ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);`를 직접 추가하는 것이 좋습니다.
- **트랜잭션을 짧게 유지**: 비관적 잠금을 쓴다면 잠금을 보유한 상태에서 결제 API 호출 같은 외부 통신을 수행하지 마십시오. 대기 시간이 급격히 늘어납니다.
- **초대형 트래픽 대응**: 한정 수량 특가처럼 단일 행에 초당 수천 건이 몰리는 경우에는 DB 행 하나가 처리 한계가 됩니다. 이때는 Redis에서 재고를 선차감하고 DB에는 비동기로 반영하거나, 재고를 여러 행으로 분할하는 구조를 검토해야 합니다.

## 결론

인기 상품 중심의 쇼핑몰이라면 **조건부 원자적 UPDATE를 기본으로 사용하고**, 재고 값을 읽고 추가 판단이 필요한 경우에만 `FOR UPDATE` 기반 비관적 잠금을 쓰는 것이 적합합니다. 낙관적 잠금은 충돌이 드문 데이터에 한정해서 사용하십시오.

</td>
<td valign="top">

## 두 방식의 차이

**낙관적 잠금**은 행을 읽을 때 `version` 컬럼 값을 함께 읽고, 수정할 때 그 값이 바뀌지 않았을 때만 반영하는 방식입니다. 읽는 동안 DB 잠금을 유지하지 않으므로 충돌이 드물면 대기 시간이 거의 없습니다. 하지만 충돌이 발생하면 `WHERE version = ?` 조건에 맞는 행이 없어서 수정 건수가 0이 되고, 애플리케이션이 다시 읽어서 재시도해야 합니다.

**비관적 잠금**은 읽는 시점에 `SELECT ... FOR UPDATE`로 행을 잠그고, 트랜잭션이 끝날 때까지 다른 트랜잭션이 그 행을 수정하지 못하게 하는 방식입니다. 충돌이 발생해도 뒤에 온 요청이 대기하다가 순서대로 처리되므로 재시도 코드가 필요 없습니다. 대신 잠금을 오래 잡고 있으면 대기열이 길어집니다.

## 인기 상품에는 비관적 잠금이 맞습니다

같은 행에 요청이 몰리면 낙관적 잠금에서는 한 번에 한 요청만 성공하고 나머지는 모두 실패해서 재시도합니다. 동시 요청이 100건이면 재시도가 연쇄적으로 발생하고, 재시도 횟수 상한을 넘은 주문은 재고가 남아 있는데도 실패 처리됩니다. 충돌이 항상 발생하는 환경에서는 이 방식이 DB 부하만 늘립니다. 비관적 잠금은 대기 후 순서대로 처리하므로 재고가 남아 있는 한 주문이 성공합니다.

## 잠금 코드를 직접 작성하지 않는 방법이 가장 간단합니다

재고 차감은 조건부 `UPDATE` 한 문장으로 처리할 수 있습니다. PostgreSQL은 `UPDATE`가 행을 수정하는 동안 그 행에 잠금을 걸기 때문에 별도의 `FOR UPDATE`가 필요 없습니다. 조건에 `stock >= 수량`을 넣으면 음수가 되는 경우에는 수정 건수가 0이 됩니다. Prisma에서는 `updateMany`로 작성합니다.

```ts
await prisma.$transaction(async (tx) => {
  const result = await tx.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });

  if (result.count === 0) {
    throw new OutOfStockError(productId);
  }

  await tx.order.create({ data: { productId, quantity, userId } });
});
```

이 코드는 `UPDATE ... SET stock = stock - $1 WHERE id = $2 AND stock >= $1`로 실행됩니다. 읽은 값을 애플리케이션에서 계산해서 쓰는 방식이 아니므로 동시 요청이 겹쳐도 재고가 음수가 되지 않습니다. `updateMany`의 `count`는 `update`와 달리 조건에 맞는 행이 없어도 예외를 던지지 않고 0을 반환하기 때문에 재고 부족을 직접 판별할 수 있습니다.

`FOR UPDATE`가 필요한 경우는 재고를 읽어서 다른 로직(예: 묶음 상품 가격 계산)에 사용한 뒤에 수정해야 할 때입니다. Prisma의 조회 API는 `FOR UPDATE`를 지원하지 않으므로 트랜잭션 안에서 `$queryRaw`를 사용합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  if (!row || row.stock < quantity) throw new OutOfStockError(productId);

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

## 함께 적용할 사항

- **CHECK 제약**: `ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);`을 추가하면 애플리케이션 코드에 오류가 있어도 DB가 음수 재고를 거부합니다.
- **트랜잭션 길이**: 행 잠금은 커밋될 때까지 유지되므로 트랜잭션 안에서 결제 API 호출이나 외부 HTTP 요청을 하지 않아야 합니다. 이런 호출이 포함되면 같은 상품의 모든 주문이 그 시간만큼 대기합니다.
- **처리량 한계**: 한 행에 대한 수정은 직렬로 처리되므로 초당 수천 건을 넘는 특가 상황에서는 이 방식도 병목이 됩니다. 그때는 Redis에서 재고를 먼저 차감하고 DB에는 비동기로 반영하는 구조나, 재고를 여러 행으로 나누는 방식을 검토해야 합니다.

</td>
</tr>
</table>

</details>

<details>
<summary>다른 비교에 들어가는 조건의 출력 (예시 2개)</summary>

1번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

결론부터 말씀드리면 인기 상품에 주문이 몰리는 쇼핑몰에서는 낙관적 잠금이 맞지 않습니다. 비관적 잠금을 쓰거나, 그보다 간단하게 조건부 UPDATE 한 문장으로 차감하는 방식이 적합합니다.

## 두 방식의 차이

| | 비관적 잠금 | 낙관적 잠금 |
|---|---|---|
| 전제 | 충돌이 자주 일어난다고 가정함 | 충돌이 드물다고 가정함 |
| 방법 | 읽을 때 `SELECT ... FOR UPDATE` 로 행을 잠금 | 잠그지 않고 읽은 뒤 `version` 컬럼으로 충돌을 감지함 |
| 충돌 시 | 나중 요청이 앞선 트랜잭션이 끝날 때까지 대기함 | 수정된 행이 0개이므로 다시 읽어서 재시도함 |
| 부담 | 잠금을 오래 쥘수록 대기열이 길어짐 | 충돌이 잦을수록 재시도가 늘어남 |

낙관적 잠금은 `UPDATE ... WHERE id = ? AND version = ?` 의 결과로 충돌 여부를 판단합니다. 대기가 없어서 충돌이 드문 데이터에는 빠르지만, 같은 행에 요청이 몰리면 대부분의 요청이 실패하고 재시도합니다.

## 인기 상품에서의 선택

100명이 같은 상품을 동시에 주문하면 낙관적 잠금에서는 같은 `version` 을 읽은 100개 요청 중 1개만 성공합니다. 나머지 99개가 재시도해도 같은 일이 반복되므로 DB 요청이 크게 늘어나고 일부 주문은 재시도 한도를 넘겨 실패합니다.

비관적 잠금은 요청이 순서대로 처리되어 결과가 정확합니다. 다만 트랜잭션 안에서 결제 API 호출처럼 느린 작업을 하면 그동안 같은 상품의 모든 주문이 대기하므로, 재고 차감 트랜잭션은 짧게 유지해야 합니다.

재고 차감은 읽고 계산한 뒤 쓰는 과정이 없어도 되므로, 조건부 UPDATE 로 한 번에 처리하는 방식을 권합니다. PostgreSQL 은 UPDATE 가 실행되는 동안 해당 행에 잠금을 잡고, 대기하던 요청은 앞선 요청이 커밋된 뒤의 최신 값으로 조건을 다시 평가합니다. 그래서 재고가 모자라면 조건에 맞는 행이 없어서 수정이 일어나지 않습니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new OutOfStockError();
}
```

`count` 가 0이면 재고 부족이므로 품절로 응답하면 됩니다. 재시도 코드도 필요하지 않습니다.

여기에 안전장치로 DB 제약을 추가하면 다른 코드 경로에서 실수가 생겨도 재고가 음수가 되지 않습니다. Prisma 스키마는 CHECK 제약을 표현하지 못하므로 마이그레이션 SQL 에 직접 작성해야 합니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

## 비관적 잠금이 필요한 경우

재고를 읽은 값에 따라 분기해야 하거나 여러 테이블을 함께 수정해야 한다면 `FOR UPDATE` 를 사용합니다. Prisma 는 이 구문을 기본 API 로 제공하지 않으므로 인터랙티브 트랜잭션 안에서 `$queryRaw` 를 사용합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  if (!row || row.stock < quantity) throw new OutOfStockError();

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

한 주문에서 여러 상품을 잠글 때는 상품 id 오름차순으로 잠가야 서로 반대 순서로 잠그다가 생기는 데드락을 피할 수 있습니다.

## 그 밖에 주의할 점

- 결제 승인 같은 외부 호출은 재고 차감 트랜잭션 밖에서 수행하고, 결제에 실패하면 재고를 복구하는 보상 로직을 둡니다.
- 한 행에 초당 수천 건이 몰리는 수준이라면 행 잠금 자체가 병목이 됩니다. 이때는 Redis 에서 먼저 재고를 차감하거나 주문을 큐로 직렬화하는 구조를 검토해야 합니다.

현재 차감 로직에서 재고 확인과 차감이 별도 쿼리로 나뉘어 있다면 그 부분이 음수 재고의 직접적인 원인일 가능성이 높습니다. 코드를 보여주시면 위 방식으로 어떻게 바꿀지 구체적으로 알려드리겠습니다.

</td>
</tr>
</table>

2번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

## 두 방식의 차이

**비관적 잠금**은 충돌이 일어난다고 가정하고 먼저 행을 잠급니다. PostgreSQL에서는 `SELECT ... FOR UPDATE`로 재고 행을 읽는 순간 잠금을 걸기 때문에, 같은 행을 읽으려는 다른 트랜잭션은 앞선 트랜잭션이 끝날 때까지 대기합니다. 충돌이 발생하지 않으므로 재시도 로직이 필요하지 않지만, 잠금을 오래 쥐고 있으면 대기 시간이 길어집니다.

**낙관적 잠금**은 충돌이 드물다고 가정하고 잠금 없이 진행합니다. 행에 `version` 컬럼을 두고 `UPDATE ... WHERE id = ? AND version = ?`로 갱신하며, 그 사이에 다른 트랜잭션이 먼저 수정했다면 갱신된 행이 0건이므로 충돌을 감지합니다. 충돌이 감지되면 처음부터 다시 읽고 시도해야 합니다.

| 구분 | 비관적 잠금 | 낙관적 잠금 |
|------|-------------|-------------|
| 충돌 처리 | 대기시킴 | 실패시킨 뒤 재시도 |
| 충돌이 드문 경우 | 잠금 비용이 불필요하게 듦 | 추가 비용이 거의 없음 |
| 충돌이 잦은 경우 | 대기열이 생겨도 모든 요청이 결국 성공 | 한 번에 한 건만 성공하고 나머지는 재시도하므로 낭비가 커짐 |
| Prisma 지원 | 원시 SQL 필요 | `version` 컬럼과 `updateMany`로 구현 가능 |

## 인기 상품에는 비관적 잠금 쪽이 맞습니다

같은 행에 요청이 몰리면 낙관적 잠금에서는 동시에 읽은 N개의 요청 가운데 1개만 성공하고 N-1개는 재시도합니다. 재시도한 요청끼리 또 충돌하므로 DB 부하는 늘어나는데 처리량은 늘지 않고, 재시도 횟수 제한에 걸린 주문은 재고가 남아 있어도 실패합니다.

다만 이 문제에는 두 방식보다 더 적합한 방법이 있습니다. 재고 확인과 차감을 하나의 조건부 `UPDATE`로 처리하면 읽기와 쓰기 사이의 틈이 없어지므로, 별도의 `FOR UPDATE`나 `version` 컬럼이 필요하지 않습니다. PostgreSQL은 이 `UPDATE`를 실행하는 동안에만 행 잠금을 잡기 때문에 비관적 잠금의 장점(재시도 없음)을 얻으면서 잠금 시간은 가장 짧게 유지됩니다.

### Prisma 구현

Prisma의 `updateMany`는 조건과 감소를 한 SQL 문으로 보내므로 원시 SQL 없이도 구현할 수 있습니다.

```ts
const { count } = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (count === 0) {
  throw new Error('재고가 부족합니다');
}
```

이 코드는 `UPDATE "Product" SET stock = stock - $1 WHERE id = $2 AND stock >= $1`로 실행됩니다. 먼저 도착한 요청이 행 잠금을 잡으면 나머지는 잠깐 대기했다가, 갱신된 재고 값으로 `WHERE` 조건을 다시 평가합니다(READ COMMITTED 기본 격리 수준 기준). 그래서 재고가 모자란 요청은 `count`가 0이 되어 자연스럽게 실패합니다.

주의할 점은 `update`에 `decrement`만 쓰면 원자적이기는 해도 하한을 검사하지 않아 재고가 음수가 된다는 것입니다. 반드시 `where`에 `stock: { gte: quantity }` 조건을 함께 넣어야 합니다.

### 안전장치와 주의 사항

- DB에 `CHECK (stock >= 0)` 제약을 추가하면 코드에 실수가 있어도 음수 재고가 저장되지 않습니다. Prisma 스키마에서는 지원하지 않으므로 마이그레이션 SQL에 직접 작성해야 합니다.
- 재고 차감과 주문 생성은 `prisma.$transaction`으로 묶되, 결제 API 호출 같은 외부 통신은 트랜잭션 밖에서 처리해야 합니다. 트랜잭션 안에서 외부 호출을 기다리면 행 잠금이 그 시간만큼 유지되어 인기 상품의 처리량이 크게 떨어집니다.
- 한 주문에 여러 상품이 있다면 상품 ID 순서로 차감해야 합니다. 트랜잭션마다 잠그는 순서가 다르면 데드락이 발생할 수 있습니다.

### 재고 확인 후 다른 로직이 필요한 경우

재고를 읽은 뒤 애플리케이션에서 복잡한 판단을 해야 해서 조건부 `UPDATE`로 표현할 수 없다면, 비관적 잠금을 선택하는 것이 맞습니다. Prisma는 `FOR UPDATE`를 지원하지 않으므로 원시 쿼리를 사용합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [product] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  if (product.stock < quantity) throw new Error('재고가 부족합니다');

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

낙관적 잠금은 상품 정보 편집처럼 여러 사용자가 같은 행을 동시에 수정할 가능성이 낮은 곳에 적합하므로, 재고 차감에는 쓰지 않는 편이 좋습니다.

</td>
</tr>
</table>

3번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

인기 상품에 주문이 몰리는 쇼핑몰에는 비관적 잠금이 맞습니다. 재고 차감만 처리한다면 잠금 없이 조건부 UPDATE 한 문장으로 처리하는 방식이 더 적합합니다.

## 두 방식의 차이

**낙관적 잠금**은 충돌이 드물다고 가정하고 잠금 없이 읽은 뒤, 쓸 때 `version` 값이 바뀌지 않았는지 확인합니다. 그 사이에 다른 요청이 먼저 쓰면 갱신된 행이 0개이므로 처음부터 다시 시도해야 합니다.

```ts
const result = await prisma.product.updateMany({
  where: { id, version: current.version },
  data: { stock: current.stock - qty, version: { increment: 1 } },
});
if (result.count === 0) {
  // 다른 요청이 먼저 갱신했으므로 다시 읽고 재시도
}
```

**비관적 잠금**은 읽는 시점에 행 잠금을 걸어서 다른 요청이 그 행을 읽거나 쓰지 못하게 대기시킵니다. Prisma 는 `FOR UPDATE` 를 지원하지 않아서 `$queryRaw` 를 사용해야 합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${id} FOR UPDATE`;
  if (row.stock < qty) throw new Error('OUT_OF_STOCK');
  await tx.product.update({
    where: { id },
    data: { stock: { decrement: qty } },
  });
});
```

## 인기 상품에는 비관적 잠금이 맞는 이유

같은 행에 요청 100개가 동시에 들어오면 낙관적 잠금에서는 1개만 성공하고 99개가 재시도합니다. 재시도한 요청끼리 다시 충돌하므로 DB 왕복 횟수가 크게 늘고, 재시도 한도를 넘긴 요청은 재고가 남아 있어도 실패합니다. 비관적 잠금에서는 요청이 줄을 서서 순서대로 처리되므로 재시도가 없고 재고가 남아 있는 만큼 모두 성공합니다.

비관적 잠금을 쓸 때는 다음 세 가지를 지켜야 합니다.

- 잠금을 잡은 채로 외부 결제 API 를 호출하지 않습니다. 트랜잭션 안에는 재고 확인과 차감만 둡니다.
- Prisma 의 interactive transaction 은 커넥션을 점유하고 기본 타임아웃이 5초이므로, 대기하는 요청이 많으면 커넥션 풀이 고갈될 수 있습니다.
- 한 주문에 여러 상품이 있으면 상품 `id` 오름차순으로 잠금을 잡아야 데드락을 피할 수 있습니다.

## 조건부 UPDATE 로 처리하는 방식

재고 차감은 "남은 재고가 충분하면 줄인다"는 단일 조건이므로 읽기와 쓰기를 나눌 필요가 없습니다.

```ts
const { count } = await prisma.product.updateMany({
  where: { id, stock: { gte: qty } },
  data: { stock: { decrement: qty } },
});
if (count === 0) throw new Error('OUT_OF_STOCK');
```

PostgreSQL 의 기본 격리 수준인 READ COMMITTED 에서는 UPDATE 가 행 잠금을 잡고, 대기하던 UPDATE 는 잠금이 풀린 뒤 최신 값으로 `WHERE` 조건을 다시 평가합니다. 따라서 재고가 부족해진 시점부터는 조건에 맞지 않아 0행이 갱신되므로 음수가 되지 않습니다. 이 방식은 DB 왕복이 한 번이고 잠금 보유 시간이 한 문장의 실행 시간으로 줄어듭니다.

여기에 안전장치로 DB 제약을 추가하면 코드에 오류가 있어도 음수 재고가 저장되지 않습니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

주문 생성과 재고 차감은 같은 `$transaction` 에 묶어야 합니다. 그래야 주문 저장이 실패했을 때 차감한 재고도 함께 롤백됩니다.

## 추가로 확인할 사항

한정 수량 특가처럼 한 행에 초당 수천 건이 몰리는 상황이라면 행 잠금 대기 자체가 병목이 됩니다. 이때는 Redis 에서 재고를 먼저 차감하고 DB 에는 비동기로 반영하는 구조를 검토해야 합니다. 일반적인 인기 상품 수준의 동시성이라면 조건부 UPDATE 로 충분합니다.

</td>
</tr>
</table>

</details>

## 03-report-work: 느린 회원 목록 화면을 고친 작업의 결과 보고

갈래: 작업 결과 보고

<details>
<summary>입력 보기</summary>

`````text
당신은 코딩 에이전트이고, 사용자가 맡긴 작업을 방금 끝냈습니다. 아래 작업 기록을 바탕으로 사용자에게 보낼 작업 결과 보고를 써 주세요.

사용자의 요청: "관리자 회원 목록 화면이 너무 느려요. 원인을 찾아서 고쳐 주세요."

작업 기록:
- GET /admin/members 응답 시간 측정: 회원 2만 명 기준 평균 4.2초
- 원인 1: 회원마다 최근 주문을 따로 조회 (N+1). 한 페이지가 50명이라 쿼리 51번
- 원인 2: members.created_at 에 인덱스 없음. 정렬할 때 전체 스캔
- 조치 1: MemberRepository.findPage 가 최근 주문을 JOIN LATERAL 쿼리 한 번으로 가져오게 변경
- 조치 2: 마이그레이션 20261120_add_members_created_at_idx 추가 (CREATE INDEX CONCURRENTLY)
- 다시 측정: 평균 4.2초 → 0.31초 (같은 데이터, 10회 평균)
- 테스트: members.integration.spec.ts 12개 통과. 전체 통합 테스트는 148개 중 147개 통과
- 실패 1개: coupons.integration.spec.ts 의 "만료 쿠폰 정리" 케이스. 이번 변경 전의 main 에서도 실패함 (시간대 문제로 보임). 건드리지 않음
- 하지 않은 것: 회원 검색(이름 LIKE 검색)은 여전히 1.8초. 요청 범위 밖이라 그대로 둠
- 마이그레이션은 스테이징에만 적용함. 운영 DB 적용은 사용자가 결정해야 함
`````

</details>

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 기본 | 0.0 | 2.00 |
| fluent-korean | 0.0 | 2.00 |
| 우리 스킬 | 0.0 | 2.00 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

관리자 회원 목록(GET /admin/members)이 빨라졌습니다. 회원 2만 명 기준 평균 응답 시간이 4.2초에서 0.31초로 줄었습니다(같은 데이터, 10회 평균).

**원인은 두 가지였습니다**
1. 회원마다 최근 주문을 따로 조회하는 N+1 문제였습니다. 한 페이지에 50명이면 쿼리가 51번 나갔습니다.
2. `members.created_at`에 인덱스가 없어서, 정렬할 때마다 테이블 전체를 스캔했습니다.

**고친 내용**
- `MemberRepository.findPage`가 최근 주문을 `JOIN LATERAL` 쿼리 한 번으로 가져오도록 바꿨습니다.
- 마이그레이션 `20261120_add_members_created_at_idx`를 추가했습니다(`CREATE INDEX CONCURRENTLY`).

**테스트 결과**
- `members.integration.spec.ts` 12개는 모두 통과했습니다.
- 전체 통합 테스트는 148개 중 147개가 통과했습니다. 실패한 1개는 `coupons.integration.spec.ts`의 "만료 쿠폰 정리"입니다. 이번 변경 전의 main에서도 똑같이 실패하므로, 제 변경과는 무관합니다. 시간대 문제로 보이며 손대지 않았습니다.

**확인이 필요한 부분**
- 마이그레이션은 스테이징에만 적용했습니다. 운영 DB에 적용할지는 직접 결정해 주세요. 인덱스가 없으면 쿼리만 바뀐 상태라 정렬 속도 개선 효과가 줄어듭니다.
- 회원 이름 `LIKE` 검색은 여전히 1.8초 걸립니다. 요청하신 범위 밖이라 그대로 두었습니다. 필요하시면 이어서 살펴보겠습니다.

</td>
<td valign="top">

관리자 회원 목록 화면이 느린 원인을 찾아 수정했습니다. 회원 2만 명 기준으로 GET /admin/members 의 평균 응답 시간이 4.2초에서 0.31초로 줄었습니다. 같은 데이터로 10회 측정한 평균값입니다.

## 원인
1. 회원마다 최근 주문을 따로 조회하는 N+1 문제가 있었습니다. 한 페이지가 50명이라서 쿼리가 51번 실행되었습니다.
2. members.created_at 컬럼에 인덱스가 없어서, 정렬할 때마다 전체 스캔이 발생했습니다.

## 조치
1. MemberRepository.findPage 가 최근 주문을 JOIN LATERAL 쿼리 한 번으로 가져오도록 변경했습니다.
2. 마이그레이션 20261120_add_members_created_at_idx 를 추가했습니다. CREATE INDEX CONCURRENTLY 로 인덱스를 생성합니다.

## 테스트 결과
- members.integration.spec.ts 의 12개 테스트는 모두 통과했습니다.
- 전체 통합 테스트는 148개 중 147개가 통과했습니다.
- 실패한 1개는 coupons.integration.spec.ts 의 "만료 쿠폰 정리" 케이스입니다. 이번 변경 이전의 main 에서도 똑같이 실패하며, 시간대 문제로 추정됩니다. 이번 작업과 관련이 없으므로 수정하지 않았습니다.

## 결정이 필요한 사항
- **운영 DB 적용**: 마이그레이션은 스테이징에만 적용했습니다. 운영 DB에 적용할 시점은 직접 결정해 주셔야 하며, 적용하기 전까지 운영 환경에서는 인덱스 효과가 반영되지 않습니다.
- **회원 이름 검색**: LIKE 검색은 여전히 1.8초가 걸립니다. 요청하신 범위를 벗어난다고 판단해서 수정하지 않았습니다. 개선이 필요하시면 별도 작업으로 진행하겠습니다.

</td>
<td valign="top">

관리자 회원 목록 화면이 느렸던 원인을 찾아 수정했습니다. 회원 2만 명 기준으로 GET /admin/members 의 평균 응답 시간이 4.2초에서 0.31초로 줄었습니다(같은 데이터로 10회 측정한 평균입니다).

## 원인

- 회원마다 최근 주문을 따로 조회하고 있었습니다. 한 페이지가 50명이라 쿼리가 51번 실행되었습니다.
- members.created_at 에 인덱스가 없어서 정렬할 때마다 테이블 전체를 스캔했습니다.

## 조치

- MemberRepository.findPage 가 JOIN LATERAL 을 사용한 쿼리 한 번으로 최근 주문을 가져오도록 변경했습니다.
- 마이그레이션 20261120_add_members_created_at_idx 를 추가했습니다. 이 마이그레이션은 CREATE INDEX CONCURRENTLY 로 인덱스를 생성합니다.

## 테스트

members.integration.spec.ts 의 12개 테스트는 모두 통과했습니다. 전체 통합 테스트는 148개 중 147개가 통과했고, coupons.integration.spec.ts 의 "만료 쿠폰 정리" 케이스 1개가 실패했습니다. 이 케이스는 이번 변경 전의 main 에서도 실패하며 시간대 문제로 보여서 건드리지 않았습니다.

## 확인이 필요한 사항

- 마이그레이션은 스테이징에만 적용했으므로 운영 DB 에 적용할지 결정해 주세요.
- 회원 이름 LIKE 검색은 여전히 1.8초가 걸립니다. 요청 범위를 벗어나서 그대로 두었으며, 필요하시면 이어서 원인을 살펴보겠습니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

관리자 회원 목록 화면(`GET /admin/members`)이 빨라졌습니다. 회원 2만 명 기준 평균 응답 시간이 **4.2초에서 0.31초**로 줄었습니다. 같은 데이터로 10회 측정한 평균입니다.

**원인은 두 가지였습니다**
1. **N+1 쿼리**: 회원마다 최근 주문을 따로 조회해서, 한 페이지(50명)를 보여 주는 데 쿼리가 51번 나갔습니다.
2. **인덱스 없음**: `members.created_at`에 인덱스가 없어서 정렬할 때마다 테이블 전체를 스캔했습니다.

**고친 내용**
- `MemberRepository.findPage`가 최근 주문을 `JOIN LATERAL`로 한 번에 가져오도록 바꿨습니다.
- 마이그레이션 `20261120_add_members_created_at_idx`를 추가했습니다. `CREATE INDEX CONCURRENTLY`를 써서 적용 중에도 테이블이 잠기지 않습니다.

**테스트 결과**
- `members.integration.spec.ts` 12개는 모두 통과했습니다.
- 전체 통합 테스트는 148개 중 147개가 통과했습니다.
- 실패한 1개는 `coupons.integration.spec.ts`의 "만료 쿠폰 정리"입니다. 이번 변경 전의 main에서도 똑같이 실패했고, 시간대 문제로 보여서 건드리지 않았습니다.

**결정이 필요한 부분**
- **운영 DB 적용**: 마이그레이션은 스테이징에만 적용했습니다. 운영에는 아직 적용하지 않았으니 적용 시점을 정해 주세요. 인덱스 없이 코드만 배포하면 N+1은 해결되지만 정렬 속도 개선은 일부만 얻습니다.
- **회원 검색**: 이름 `LIKE` 검색은 여전히 1.8초 걸립니다. 요청 범위 밖이라 그대로 두었습니다. 이것도 개선을 원하시면 따로 진행하겠습니다.

</td>
<td valign="top">

관리자 회원 목록 화면의 응답 시간을 평균 4.2초에서 0.31초로 단축했습니다. 회원 2만 명의 동일한 데이터로 10회 측정한 평균값입니다.

## 원인
- 회원마다 최근 주문을 따로 조회하는 N+1 문제가 있었습니다. 한 페이지에 50명이 표시되므로 쿼리가 51번 실행되고 있었습니다.
- members.created_at 컬럼에 인덱스가 없어서, 정렬할 때마다 테이블 전체를 스캔했습니다.

## 조치
- MemberRepository.findPage 가 JOIN LATERAL 쿼리 한 번으로 최근 주문을 함께 조회하도록 변경했습니다.
- 마이그레이션 20261120_add_members_created_at_idx 를 추가했습니다. CREATE INDEX CONCURRENTLY 를 사용하므로 인덱스를 생성하는 동안에도 테이블에 쓰기 작업이 가능합니다.

## 테스트
- members.integration.spec.ts 의 12개 테스트는 모두 통과했습니다.
- 전체 통합 테스트는 148개 중 147개가 통과했습니다.
- 실패한 1개는 coupons.integration.spec.ts 의 "만료 쿠폰 정리" 케이스입니다. 이번 변경 이전의 main 에서도 똑같이 실패하며, 시간대 문제로 추정됩니다. 이 케이스는 수정하지 않았습니다.

## 결정이 필요한 사항
- 마이그레이션은 스테이징에만 적용했습니다. 운영 DB 에 적용할지, 그리고 언제 적용할지는 직접 결정해 주셔야 합니다.

## 변경하지 않은 부분
- 회원 이름 LIKE 검색은 여전히 1.8초가 걸립니다. 요청하신 범위를 벗어나므로 그대로 두었습니다. 이 검색도 개선하길 원하시면 별도 작업으로 진행하겠습니다.

</td>
<td valign="top">

관리자 회원 목록 화면(GET /admin/members)의 응답 시간을 평균 4.2초에서 0.31초로 줄였습니다. 회원 2만 명의 같은 데이터로 10회 측정한 평균값입니다.

## 원인

- 회원마다 최근 주문을 따로 조회하는 N+1 문제가 있었습니다. 한 페이지에 50명이 표시되므로 쿼리가 51번 실행되었습니다.
- members.created_at 에 인덱스가 없어서 정렬할 때마다 테이블 전체를 스캔했습니다.

## 변경 내용

- MemberRepository.findPage 가 JOIN LATERAL 쿼리 한 번으로 최근 주문을 함께 가져오도록 변경했습니다.
- 마이그레이션 20261120_add_members_created_at_idx 를 추가했습니다. CREATE INDEX CONCURRENTLY 를 사용하므로 인덱스를 만드는 동안에도 테이블에 쓰기가 가능합니다.

## 테스트 결과

members.integration.spec.ts 의 12개는 모두 통과했고, 전체 통합 테스트는 148개 중 147개가 통과했습니다. 실패한 1개는 coupons.integration.spec.ts 의 "만료 쿠폰 정리" 케이스입니다. 이번 변경 전의 main 에서도 같은 케이스가 실패했고 시간대 문제로 보여서 수정하지 않았습니다.

## 결정이 필요한 사항

마이그레이션은 스테이징 DB에만 적용했습니다. 운영 DB에 적용할지와 적용할 시점은 직접 결정해 주세요. 운영에 적용하기 전에는 인덱스가 없으므로 쿼리 수가 줄어든 효과만 반영됩니다.

## 남은 문제

회원 이름 LIKE 검색은 여전히 1.8초가 걸립니다. 요청하신 범위를 벗어나서 변경하지 않았으며, 원하시면 이어서 원인을 살펴보겠습니다.

</td>
</tr>
</table>

</details>

<details>
<summary>3번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

관리자 회원 목록(`GET /admin/members`)이 빨라졌습니다. 회원 2만 명 기준 평균 응답 시간이 **4.2초에서 0.31초**로 줄었습니다. 같은 데이터로 10회 측정한 평균입니다.

**원인은 두 가지였습니다**
1. 회원마다 최근 주문을 따로 조회하고 있었습니다(N+1). 한 페이지가 50명이라 쿼리가 51번 나갔습니다.
2. `members.created_at`에 인덱스가 없어서, 정렬할 때마다 테이블 전체를 스캔했습니다.

**고친 내용**
1. `MemberRepository.findPage`가 최근 주문을 `JOIN LATERAL` 쿼리 한 번으로 가져오게 바꿨습니다.
2. 마이그레이션 `20261120_add_members_created_at_idx`를 추가했습니다. `CREATE INDEX CONCURRENTLY`로 만들기 때문에 적용 중에도 테이블 쓰기가 막히지 않습니다.

**테스트 결과**
- `members.integration.spec.ts` 12개가 모두 통과했습니다.
- 전체 통합 테스트는 148개 중 147개가 통과했습니다.
- 실패한 1개는 `coupons.integration.spec.ts`의 "만료 쿠폰 정리"입니다. 이번 변경 전의 main에서도 똑같이 실패하므로 제 변경과는 무관합니다. 시간대 문제로 보이며 건드리지 않았습니다.

**결정이 필요한 부분**
- 마이그레이션은 **스테이징에만 적용**했습니다. 운영 DB에 적용할지는 직접 판단해 주세요. 운영에 적용하기 전에는 인덱스 효과를 확인할 수 없으니, 코드만 먼저 배포하면 N+1 개선분만 반영됩니다.

**그대로 둔 부분**
- 회원 이름 `LIKE` 검색은 여전히 약 1.8초 걸립니다. 요청 범위 밖이라 손대지 않았습니다. 이것도 개선이 필요하시면 따로 작업하겠습니다.

</td>
<td valign="top">

관리자 회원 목록 화면이 느린 원인을 찾아 수정했습니다. 회원 2만 명 기준으로 `GET /admin/members`의 평균 응답 시간이 4.2초에서 0.31초로 줄었습니다. 같은 데이터로 10회 측정한 평균입니다.

**원인**
1. 회원마다 최근 주문을 따로 조회하는 N+1 문제가 있었습니다. 한 페이지에 50명이 표시되므로 쿼리가 51번 실행되었습니다.
2. `members.created_at` 컬럼에 인덱스가 없어서, 정렬할 때마다 테이블 전체를 스캔했습니다.

**조치**
1. `MemberRepository.findPage`가 `JOIN LATERAL` 쿼리 한 번으로 최근 주문을 함께 가져오도록 변경했습니다.
2. 마이그레이션 `20261120_add_members_created_at_idx`를 추가했습니다. `CREATE INDEX CONCURRENTLY`를 사용하므로 인덱스를 생성하는 동안에도 테이블에 쓰기 작업을 할 수 있습니다.

**테스트 결과**
- `members.integration.spec.ts`의 12개 케이스가 모두 통과했습니다.
- 전체 통합 테스트는 148개 중 147개가 통과했습니다.
- 실패한 1개는 `coupons.integration.spec.ts`의 "만료 쿠폰 정리" 케이스입니다. 이번 변경 이전의 main에서도 똑같이 실패했고, 시간대 문제로 추정됩니다. 이번 작업과 관련이 없어서 수정하지 않았습니다.

**결정이 필요한 사항**
마이그레이션은 스테이징에만 적용했습니다. 운영 DB에 적용할지는 직접 결정해 주셔야 합니다.

**수정하지 않은 부분**
회원 검색(이름 LIKE 검색)은 여전히 1.8초가 걸립니다. 요청하신 범위 밖이라 그대로 두었습니다. 원하시면 이 부분도 별도로 개선하겠습니다.

</td>
<td valign="top">

관리자 회원 목록 화면(GET /admin/members)의 응답 시간을 회원 2만 명 기준 평균 4.2초에서 0.31초로 줄였습니다. 같은 데이터로 10회 측정한 평균입니다.

원인은 두 가지였습니다.

- 회원마다 최근 주문을 따로 조회하고 있었습니다(N+1). 한 페이지가 50명이라 요청 한 번에 쿼리가 51번 실행되었습니다.
- members.created_at 에 인덱스가 없어서 정렬할 때마다 테이블 전체를 스캔했습니다.

조치는 다음과 같습니다.

- MemberRepository.findPage 가 JOIN LATERAL 쿼리 한 번으로 최근 주문을 함께 가져오도록 변경했습니다.
- 마이그레이션 20261120_add_members_created_at_idx 를 추가했습니다. 인덱스는 CREATE INDEX CONCURRENTLY 로 생성합니다.

테스트에서는 members.integration.spec.ts 12개가 모두 통과했고, 전체 통합 테스트는 148개 중 147개가 통과했습니다. 실패한 1개는 coupons.integration.spec.ts 의 "만료 쿠폰 정리" 케이스입니다. 이번 변경 전의 main 에서도 같은 케이스가 실패해서 시간대 문제로 보고 건드리지 않았습니다.

결정이 필요한 사항이 하나 있습니다. 마이그레이션은 스테이징 DB에만 적용했으므로, 운영 DB에 적용할 시점은 직접 정해 주세요. 운영에 적용하기 전에는 쿼리 변경만으로 N+1은 해소되지만 정렬 속도는 인덱스가 있는 스테이징 수준으로 나오지 않습니다.

회원 이름 LIKE 검색은 여전히 1.8초가 걸립니다. 요청하신 범위 밖이라 변경하지 않았고, 필요하시면 별도 작업으로 원인을 확인하겠습니다.

</td>
</tr>
</table>

</details>

<details>
<summary>다른 비교에 들어가는 조건의 출력 (예시 2개)</summary>

1번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

관리자 회원 목록이 느린 원인 두 가지를 찾아 수정했고, 회원 2만 명 기준으로 GET /admin/members 평균 응답 시간이 4.2초에서 0.31초로 줄었습니다. 같은 데이터로 10회 측정한 평균입니다.

**원인**
- 회원마다 최근 주문을 따로 조회하고 있어서(N+1) 한 페이지에 50명을 표시하면 쿼리가 51번 실행되었습니다.
- members.created_at 컬럼에 인덱스가 없어서 정렬할 때마다 테이블 전체를 스캔했습니다.

**변경 내용**
- MemberRepository.findPage 가 최근 주문을 JOIN LATERAL 쿼리 한 번으로 가져오도록 변경했습니다.
- 마이그레이션 20261120_add_members_created_at_idx 를 추가했고, 이 마이그레이션은 CREATE INDEX CONCURRENTLY 로 인덱스를 생성합니다.

**테스트 결과**
members.integration.spec.ts 12개는 모두 통과했고, 전체 통합 테스트는 148개 중 147개가 통과했습니다. 실패한 1개는 coupons.integration.spec.ts 의 "만료 쿠폰 정리" 케이스인데, 이번 변경 전의 main 에서도 똑같이 실패해서 건드리지 않았습니다. 원인은 시간대 문제로 보입니다.

**결정이 필요한 사항**
마이그레이션은 스테이징에만 적용했고 운영 DB 에는 적용하지 않았습니다. 운영 DB 에 적용할 시점은 직접 결정해 주세요.

**남은 문제**
회원 이름 LIKE 검색은 여전히 1.8초가 걸립니다. 요청하신 범위를 벗어나서 그대로 두었습니다.

</td>
</tr>
</table>

2번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

관리자 회원 목록 화면이 느린 원인을 찾아 수정했고, 회원 2만 명 기준으로 GET /admin/members 의 평균 응답 시간이 4.2초에서 0.31초로 줄었습니다. 같은 데이터로 10회 측정한 평균값입니다.

## 원인

- 회원마다 최근 주문을 따로 조회하고 있었습니다(N+1). 한 페이지에 회원이 50명이라 쿼리가 51번 실행되었습니다.
- members.created_at 에 인덱스가 없어서 정렬할 때마다 테이블 전체를 스캔했습니다.

## 수정 내용

- MemberRepository.findPage 가 최근 주문을 JOIN LATERAL 쿼리 한 번으로 가져오도록 변경했습니다.
- 마이그레이션 20261120_add_members_created_at_idx 를 추가했습니다. CREATE INDEX CONCURRENTLY 로 인덱스를 생성합니다.

## 테스트 결과

members.integration.spec.ts 의 12개 케이스는 모두 통과했습니다. 전체 통합 테스트는 148개 중 147개가 통과했고, 실패한 1개는 coupons.integration.spec.ts 의 "만료 쿠폰 정리" 케이스입니다. 이 케이스는 이번 변경 전의 main 에서도 실패했으며 시간대 문제로 보이지만 원인을 확인하지는 않았고, 이번 작업과 관련이 없어서 수정하지 않았습니다.

## 결정이 필요한 사항

마이그레이션은 스테이징에만 적용했고 운영 DB에는 적용하지 않았습니다. 운영 적용 시점은 직접 결정해 주세요.

## 하지 않은 작업

회원 검색(이름 LIKE 검색)은 여전히 1.8초가 걸립니다. 요청하신 범위 밖이라 그대로 두었고, 필요하시면 이어서 원인을 살펴보겠습니다.

</td>
</tr>
</table>

3번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

관리자 회원 목록이 느린 원인 두 가지를 찾아 수정했고, 응답 시간이 평균 4.2초에서 0.31초로 줄었습니다. 같은 데이터(회원 2만 명)로 10회 측정한 평균입니다.

## 원인

- 회원마다 최근 주문을 따로 조회하고 있어서, 한 페이지(50명)를 표시할 때 쿼리가 51번 실행되었습니다.
- `members.created_at` 에 인덱스가 없어서 정렬할 때마다 테이블 전체를 스캔했습니다.

## 수정 내용

- `MemberRepository.findPage` 가 최근 주문을 `JOIN LATERAL` 쿼리 한 번으로 함께 가져오도록 변경했습니다.
- 마이그레이션 `20261120_add_members_created_at_idx` 를 추가했습니다. 이 마이그레이션은 `CREATE INDEX CONCURRENTLY` 로 인덱스를 생성합니다.

## 테스트 결과

`members.integration.spec.ts` 12개는 모두 통과했습니다. 전체 통합 테스트는 148개 중 147개가 통과했고, 실패한 1개는 `coupons.integration.spec.ts` 의 "만료 쿠폰 정리" 케이스입니다. 이 케이스는 이번 변경 이전 main 에서도 실패했고 시간대 문제로 보여서 수정하지 않았습니다.

## 결정이 필요한 사항

마이그레이션은 스테이징에만 적용했으므로 운영 DB 에 적용할지 결정해 주세요. 코드만 배포하고 마이그레이션을 적용하지 않으면 정렬은 계속 전체 스캔으로 처리됩니다.

## 수정하지 않은 부분

회원 검색(이름 `LIKE` 검색)은 여전히 1.8초가 걸립니다. 요청 범위 밖이라 그대로 두었으며, 필요하시면 이어서 확인하겠습니다.

</td>
</tr>
</table>

</details>

## 04-ui-payment-error: 카드사 점검 시간에 결제가 거절됐을 때의 오류 팝업

갈래: 화면 문구

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

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 기본 | 0.0 | 2.33 |
| fluent-korean | 0.0 | 1.67 |
| 우리 스킬 | 0.0 | 2.00 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

**1. 제목**
지금은 카드 결제가 어려워요

**2. 본문**
카드사 점검 시간(매일 23:50~00:10)이라 결제가 진행되지 않았어요. 장바구니와 배송지 정보는 그대로 저장되어 있어요. 다른 카드나 계좌이체로는 지금 바로 결제할 수 있어요.

**3. 버튼**
- 다른 결제 수단 선택
- 닫기

</td>
<td valign="top">

## 1. 팝업 제목
카드사 점검으로 결제하지 못했어요

## 2. 팝업 본문
지금은 카드사 점검 시간(매일 23:50~00:10)이라 결제가 거절되었어요. 장바구니와 입력하신 배송지는 그대로 저장되어 있으니 다시 입력하지 않으셔도 돼요. 다른 카드나 계좌이체를 선택하시면 지금 바로 결제하실 수 있어요.

## 3. 버튼 문구
- 결제 수단을 고르는 버튼: **다른 결제 수단 선택**
- 팝업을 닫는 버튼: **닫기**

점검이 끝난 뒤 같은 카드로 다시 결제하려는 사용자도 있을 수 있어서, 본문에 점검 시간을 명시했어요. 버튼 문구를 더 짧게 줄이고 싶으시면 "다른 수단으로 결제"로 바꾸셔도 의미가 유지돼요.

</td>
<td valign="top">

**1. 제목**
카드사 점검 때문에 결제하지 못했어요

**2. 본문**
매일 23:50부터 00:10까지는 카드사가 점검 중이라 결제가 거절돼요. 장바구니와 입력한 배송지는 그대로 남아 있고, 다른 카드나 계좌이체로는 지금 바로 결제할 수 있어요.

**3. 버튼**
- 다른 결제 수단 고르기
- 닫기

버튼 글자는 화면에서 흔히 쓰는 짧은 명사구로 맞췄습니다. 본문에는 점검 시간대를 구체적으로 적어서, 사용자가 00:10 이후에 같은 카드로 다시 시도할 수 있다는 점도 알 수 있게 했습니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

**1. 제목**
지금은 카드 결제가 어려워요

**2. 본문**
카드사 점검 시간(매일 23:50~00:10)이라 결제가 거절됐어요. 장바구니와 배송지는 그대로 있으니 걱정하지 마세요. 다른 카드나 계좌이체로는 지금 바로 결제할 수 있어요.

**3. 버튼**
- 다른 결제 수단 선택
- 닫기

</td>
<td valign="top">

**1. 팝업 제목**
카드사 점검으로 결제하지 못했어요

**2. 팝업 본문**
매일 23:50부터 00:10까지는 카드사 점검 시간이라 결제가 거절돼요. 장바구니와 입력하신 배송지는 그대로 저장되어 있어요. 다른 카드나 계좌이체를 선택하시면 지금 바로 결제하실 수 있어요.

**3. 버튼 문구**
- 다른 결제 수단 선택 (기본 버튼)
- 닫기

본문에서 점검 시간을 구체적으로 알려 드리면 사용자가 나중에 다시 시도할 시점도 판단할 수 있어요. 장바구니와 배송지가 유지된다는 안내를 넣어서 입력한 정보가 사라질까 하는 걱정을 줄였어요.

</td>
<td valign="top">

**1. 제목**

카드사 점검으로 결제하지 못했어요

**2. 본문**

지금은 카드사 점검 시간(매일 23:50~00:10)이라 결제가 거절됐어요. 장바구니와 배송지는 그대로 남아 있으니 다른 카드나 계좌이체로 바로 결제할 수 있어요.

**3. 버튼**

- 다른 결제 수단을 고르는 버튼: 다른 결제 수단 선택
- 팝업을 닫는 버튼: 닫기

본문에는 점검 시간대를 함께 적어서, 사용자가 같은 카드로 다시 결제할 수 있는 시점도 알 수 있게 했어요.

</td>
</tr>
</table>

</details>

<details>
<summary>3번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

**1. 제목**
카드사 점검으로 결제하지 못했어요

**2. 본문**
매일 23:50부터 00:10까지는 카드사 점검 시간이라 카드 결제가 어려워요. 장바구니와 배송지는 그대로 저장되어 있어요. 다른 카드나 계좌이체로는 지금 바로 결제할 수 있어요.

**3. 버튼**
- 다른 결제 수단 고르기
- 닫기

</td>
<td valign="top">

**1. 팝업 제목**
카드사 점검으로 결제하지 못했어요

**2. 팝업 본문**
매일 23:50부터 00:10까지는 카드사가 점검을 진행하기 때문에 결제가 거절돼요. 장바구니에 담은 상품과 입력하신 배송지는 그대로 저장되어 있어요. 다른 카드나 계좌이체로는 지금 바로 결제하실 수 있어요.

**3. 버튼 문구**
- 다른 결제 수단을 고르는 버튼: 다른 결제 수단 선택
- 팝업을 닫는 버튼: 닫기

</td>
<td valign="top">

**1. 팝업 제목**

카드사 점검 때문에 결제하지 못했어요

**2. 팝업 본문**

매일 23:50부터 00:10까지는 카드사가 점검 중이라 이 카드로 결제할 수 없어요. 장바구니와 입력한 배송지는 그대로 남아 있고, 다른 카드나 계좌이체로는 지금 바로 결제할 수 있어요.

**3. 버튼 글자**

- 다른 결제 수단을 고르는 버튼: 다른 결제 수단 선택
- 팝업을 닫는 버튼: 닫기

본문에서 점검 시간대를 먼저 알려 드리면 사용자가 카드 문제인지 앱 문제인지 헷갈리지 않고, 장바구니와 배송지가 남아 있다는 안내를 같은 문장에 넣어서 다시 입력해야 하는지 걱정하지 않도록 했어요.

</td>
</tr>
</table>

</details>

<details>
<summary>다른 비교에 들어가는 조건의 출력 (예시 2개)</summary>

1번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

**1. 제목**

카드사 점검 때문에 결제하지 못했어요

**2. 본문**

지금은 카드사 점검 시간(매일 23:50~00:10)이라 결제가 거절됐어요. 장바구니와 입력하신 배송지는 그대로 남아 있어서, 다른 카드나 계좌이체로는 지금 바로 결제할 수 있어요.

**3. 버튼**

- 다른 결제 수단을 고르는 버튼: **다른 결제 수단 선택**
- 팝업을 닫는 버튼: **닫기**

본문은 점검 시간을 먼저 알려서 결제가 거절된 이유를 설명하고, 이어서 장바구니와 배송지가 유지된다는 점과 지금 가능한 결제 수단을 한 문장으로 안내했어요. 점검이 끝난 뒤 같은 카드로 다시 결제하라는 안내를 넣으려면 "00:10 이후에는 원래 카드로도 결제할 수 있어요."를 본문 끝에 한 문장으로 덧붙이면 돼요.

</td>
</tr>
</table>

2번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

**1. 제목**
카드 결제가 거절됐어요

**2. 본문**
카드사 점검 시간(매일 23:50~00:10)이라 결제가 거절됐지만 장바구니와 입력한 배송지는 그대로 남아 있어요. 다른 카드나 계좌이체로는 지금 바로 결제할 수 있어요.

**3. 버튼**
- 다른 결제 수단을 고르는 버튼: 다른 결제 수단 선택
- 팝업을 닫는 버튼: 닫기

점검이 끝나는 00:10 이후에 같은 카드로 다시 결제할 수 있다는 안내를 넣고 싶다면, 본문 끝에 "00:10 이후에는 같은 카드로 다시 결제할 수 있어요."를 추가하면 됩니다.

</td>
</tr>
</table>

3번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

**1. 제목**

카드사 점검으로 결제가 거절됐어요

**2. 본문**

지금은 카드사 점검 시간(매일 23:50~00:10)이라 결제가 거절됐어요. 장바구니와 입력한 배송지는 그대로 남아 있으니, 다른 카드나 계좌이체로는 지금 바로 결제할 수 있어요.

**3. 버튼**

- 다른 결제 수단을 고르는 버튼: 다른 결제 수단 선택
- 팝업을 닫는 버튼: 닫기

본문의 두 문장은 원인과 해결 방법으로 나눴어요. 두 번째 문장은 장바구니가 유지된다는 사실과 다른 수단으로 결제할 수 있다는 안내를 연결어미 '-으니'로 이어서, 두 내용의 관계가 드러나게 했어요.

</td>
</tr>
</table>

</details>

## 05-ui-auto-category: 가계부 앱의 자동 분류 기능 안내문

갈래: 화면 문구

<details>
<summary>입력 보기</summary>

`````text
가계부 앱에 '자동 분류' 기능을 새로 넣었습니다. 설정 화면의 토글 아래에 넣을 설명 문구와, 기능을 처음 켰을 때 한 번 보여 줄 안내문을 써 주세요. 이 앱의 화면 문구는 합니다체를 씁니다.

기능 내용:
- 카드 결제 문자를 읽어서 지출 항목(식비, 교통, 구독 등)을 자동으로 정합니다
- 분류가 틀리면 사용자가 직접 고칠 수 있고, 고친 내용은 같은 가게의 다음 결제부터 반영됩니다
- 문자 내용은 기기 안에서만 처리하고 서버로 보내지 않습니다
- 문자 읽기 권한이 필요합니다. 권한을 주지 않으면 기능이 꺼집니다

필요한 문구:
1. 토글 아래에 넣을 설명 (한두 문장)
2. 처음 켰을 때 보여 줄 안내문 (서너 문장)
`````

</details>

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 기본 | 0.0 | 2.33 |
| fluent-korean | 0.0 | 2.67 |
| 우리 스킬 | 0.0 | 1.00 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

**1. 토글 아래 설명**

카드 결제 문자를 읽어 지출 항목을 자동으로 분류합니다. 문자 내용은 기기 안에서만 처리되며 서버로 전송되지 않습니다.

**2. 처음 켰을 때 안내문**

자동 분류가 켜졌습니다. 이제 카드 결제 문자를 읽어 식비, 교통, 구독 등 지출 항목을 자동으로 정합니다. 분류가 맞지 않으면 직접 고칠 수 있으며, 고친 내용은 같은 가게의 다음 결제부터 반영됩니다. 문자 내용은 기기 안에서만 처리하고 서버로 보내지 않습니다. 이 기능을 쓰려면 문자 읽기 권한이 필요하며, 권한을 허용하지 않으면 자동 분류는 꺼집니다.

---

참고로, 안내문 첫 문장이 "켜졌습니다"로 시작하는데, 권한 허용 전에 이 안내문이 먼저 뜨는 흐름이라면 "자동 분류를 켭니다."처럼 바꾸는 편이 자연스럽습니다.

</td>
<td valign="top">

**1. 토글 아래 설명**

카드 결제 문자를 읽어서 지출 항목을 자동으로 분류합니다. 문자 내용은 기기 안에서만 처리하며, 서버로 전송하지 않습니다.

**2. 처음 켰을 때 안내문**

자동 분류 기능이 켜졌습니다. 이제 카드 결제 문자가 도착하면 식비, 교통, 구독 같은 지출 항목이 자동으로 정해집니다. 분류가 잘못되었다면 직접 수정할 수 있으며, 수정한 내용은 같은 가게에서 이루어지는 다음 결제부터 반영됩니다. 이 기능을 사용하려면 문자 읽기 권한이 필요하고, 권한을 허용하지 않으면 자동 분류가 꺼집니다.

---

참고로 설명 문구에는 권한 관련 내용을 넣지 않았습니다. 권한 안내는 처음 켰을 때의 안내문이나 권한 요청 창에서 전달하는 편이 화면이 간결해지기 때문입니다. 설정 화면에도 권한 내용을 함께 넣어야 한다면 말씀해 주세요.

</td>
<td valign="top">

**1. 토글 아래 설명**

카드 결제 문자를 읽어서 지출 항목을 자동으로 분류합니다. 문자 내용은 기기 안에서만 처리되며 서버로 전송되지 않습니다.

**2. 처음 켰을 때 안내문**

이제 카드 결제 문자를 읽어서 식비, 교통, 구독 같은 지출 항목을 자동으로 정합니다. 분류가 맞지 않으면 직접 고칠 수 있고, 고친 내용은 같은 가게에서 다음에 결제할 때부터 반영됩니다. 문자 내용은 기기 안에서만 처리되므로 서버로 전송되지 않습니다. 이 기능을 사용하려면 문자 읽기 권한이 필요하며, 권한을 허용하지 않으면 자동 분류가 꺼집니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

**1. 토글 아래 설명**

카드 결제 문자를 읽어 지출 항목을 자동으로 분류합니다. 문자 내용은 기기 안에서만 처리되며 서버로 전송되지 않습니다.

**2. 처음 켰을 때 안내문**

자동 분류를 켰습니다. 이제 카드 결제 문자가 오면 식비, 교통, 구독 등 지출 항목이 자동으로 정해집니다. 분류가 맞지 않으면 직접 고쳐 주세요. 고친 내용은 같은 가게의 다음 결제부터 반영됩니다. 문자 내용은 기기 안에서만 처리하며, 문자 읽기 권한을 허용하지 않으면 이 기능은 꺼집니다.

---

참고로, 권한 거부 시 기능이 꺼진다는 내용은 권한 요청 팝업 직전 화면이나 팝업 거부 후 토스트에 넣어도 좋습니다. 안내문이 너무 길면 마지막 문장만 그쪽으로 옮기셔도 됩니다.

</td>
<td valign="top">

**1. 토글 아래 설명**

카드 결제 문자를 읽어서 지출 항목을 자동으로 분류합니다. 문자 내용은 기기 안에서만 처리하며, 서버로 전송하지 않습니다.

**2. 처음 켰을 때 안내문**

자동 분류 기능이 켜졌습니다. 이제 카드 결제 문자를 읽어서 식비, 교통, 구독 같은 지출 항목을 자동으로 정해 드립니다. 분류가 잘못되었다면 직접 수정하실 수 있으며, 수정한 내용은 같은 가게에서 이루어지는 다음 결제부터 반영됩니다. 이 기능을 사용하려면 문자 읽기 권한이 필요하고, 권한을 허용하지 않으면 자동 분류가 꺼집니다. 문자 내용은 기기 안에서만 처리되므로 안심하고 사용하셔도 됩니다.

참고로, 두 문구 모두 합니다체로 통일했습니다. 안내문에서는 권한 거부 시 기능이 꺼진다는 점을 명시했으므로, 필요하다면 권한 요청 팝업 직전에 보여 주는 문구로도 활용하실 수 있습니다.

</td>
<td valign="top">

**1. 토글 아래 설명**

카드 결제 문자를 읽어서 지출 항목을 자동으로 분류합니다. 문자 내용은 기기 안에서만 처리하며 서버로 전송되지 않습니다.

**2. 처음 켰을 때 안내문**

자동 분류를 켰습니다. 카드 결제 문자가 도착하면 식비, 교통, 구독 같은 지출 항목이 자동으로 정해집니다. 분류가 잘못되었다면 직접 고칠 수 있고, 고친 내용은 같은 가게에서 다음에 결제할 때부터 반영됩니다. 문자 내용은 기기 안에서만 처리하며, 문자 읽기 권한을 허용하지 않으면 이 기능은 꺼진 상태로 유지됩니다.

</td>
</tr>
</table>

</details>

<details>
<summary>3번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

**1. 토글 아래 설명**

카드 결제 문자를 읽어 지출 항목을 자동으로 분류합니다. 문자 내용은 기기 안에서만 처리되며 서버로 전송되지 않습니다.

**2. 처음 켰을 때 안내문**

제목: 자동 분류를 시작합니다

카드 결제 문자를 읽어 식비, 교통, 구독 등 지출 항목을 자동으로 정해 드립니다. 분류가 맞지 않으면 직접 고칠 수 있으며, 고친 내용은 같은 가게의 다음 결제부터 반영됩니다. 문자 내용은 기기 안에서만 처리되고 서버로 보내지 않습니다. 이 기능을 쓰려면 문자 읽기 권한이 필요하며, 권한을 허용하지 않으면 자동 분류가 꺼집니다.

버튼 문구가 필요하시면 "권한 허용하고 시작" / "나중에" 정도를 쓸 수 있습니다.

</td>
<td valign="top">

**1. 토글 아래 설명**

카드 결제 문자를 읽어서 지출 항목을 자동으로 분류합니다. 문자 내용은 기기 안에서만 처리하며 서버로 전송하지 않습니다.

**2. 처음 켰을 때 안내문**

자동 분류 기능이 켜졌습니다. 이제 카드 결제 문자를 읽어서 식비, 교통, 구독 등 지출 항목을 자동으로 정해 드립니다. 분류가 올바르지 않으면 직접 수정할 수 있으며, 수정한 내용은 같은 가게에서 이루어지는 다음 결제부터 반영됩니다. 문자 내용은 기기 안에서만 처리되고 서버로 전송되지 않습니다. 이 기능을 사용하려면 문자 읽기 권한이 필요하며, 권한을 허용하지 않으면 자동 분류가 꺼집니다.

안내문이 서너 문장이라는 요청에 맞추면서 권한 안내까지 담느라 마지막 문장이 길어졌습니다. 권한 안내는 권한 요청 팝업에서 별도로 보여 준다면 안내문에서 빼고 네 문장으로 줄여도 됩니다.

</td>
<td valign="top">

**1. 토글 아래 설명**

카드 결제 문자를 읽어서 지출 항목을 자동으로 정합니다. 문자 내용은 기기 안에서만 처리하며 서버로 보내지 않습니다.

**2. 처음 켰을 때 안내문**

카드 결제 문자를 읽어서 식비, 교통, 구독 같은 지출 항목을 자동으로 정합니다. 분류가 틀리면 직접 고칠 수 있고, 고친 내용은 같은 가게의 다음 결제부터 반영됩니다. 문자 내용은 기기 안에서만 처리하며 서버로 보내지 않습니다. 이 기능을 사용하려면 문자 읽기 권한이 필요하고, 권한을 허용하지 않으면 자동 분류가 꺼집니다.

</td>
</tr>
</table>

</details>

<details>
<summary>다른 비교에 들어가는 조건의 출력 (예시 2개)</summary>

1번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

**1. 토글 아래 설명**

카드 결제 문자를 읽어서 지출 항목을 자동으로 분류합니다. 문자 내용은 기기 안에서만 처리하며 서버로 전송되지 않습니다.

**2. 처음 켰을 때 안내문**

이제 카드 결제 문자를 읽어서 식비, 교통, 구독 같은 지출 항목을 자동으로 정합니다. 분류가 틀렸다면 직접 고칠 수 있고, 고친 내용은 같은 가게에서 다음에 결제할 때부터 반영됩니다. 문자 내용은 기기 안에서만 처리하며 서버로 전송하지 않습니다. 이 기능을 사용하려면 문자 읽기 권한이 필요하고, 권한을 허용하지 않으면 자동 분류가 꺼집니다.

참고로 권한 요구 사항은 토글 설명에서는 뺐습니다. 권한 요청 창이 따로 뜨는 흐름이라면 설명 문구에 중복해서 넣지 않는 편이 낫기 때문입니다. 설명에도 필요하다면 "문자 읽기 권한이 필요합니다."를 한 문장 덧붙이면 됩니다.

</td>
</tr>
</table>

2번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

**1. 토글 아래 설명**

> 카드 결제 문자를 읽어서 지출 항목을 자동으로 분류합니다. 문자 내용은 기기 안에서만 처리되며 서버로 전송되지 않습니다.

**2. 처음 켰을 때 안내문**

> 자동 분류가 켜져서 앞으로 카드 결제 문자를 받으면 식비, 교통, 구독 같은 지출 항목이 자동으로 지정됩니다. 분류가 틀렸다면 직접 고칠 수 있고, 고친 내용은 같은 가게의 다음 결제부터 반영됩니다. 문자 내용은 기기 안에서만 처리하며 서버로 보내지 않습니다.

권한 부분은 위 문구에 넣지 않았습니다. 권한 요청 화면이 따로 있다면 거기에 "자동 분류를 사용하려면 문자 읽기 권한이 필요합니다. 권한을 허용하지 않으면 이 기능은 꺼진 상태로 유지됩니다."를 넣으면 됩니다. 토글 설명에 권한 안내까지 함께 넣어야 한다면 첫 문장을 "문자 읽기 권한을 허용하면 카드 결제 문자를 읽어서 지출 항목을 자동으로 분류합니다."로 바꿀 수 있습니다.

</td>
</tr>
</table>

3번째 생성

<table>
<tr><th width="100%">예시 2개</th></tr>
<tr>
<td valign="top">

**1. 토글 아래 설명**

카드 결제 문자를 읽어 지출 항목을 자동으로 분류합니다. 문자 내용은 기기 안에서만 처리하며 서버로 전송되지 않습니다.

**2. 처음 켰을 때 안내문**

이제 카드 결제 문자가 도착하면 식비, 교통, 구독 같은 지출 항목이 자동으로 정해집니다. 분류가 틀렸다면 직접 고칠 수 있고, 고친 내용은 같은 가게에서 결제할 때부터 적용됩니다. 문자 내용은 기기 안에서만 처리하며 서버로 보내지 않습니다. 이 기능을 사용하려면 문자 읽기 권한이 필요하고, 권한을 허용하지 않으면 자동 분류가 꺼집니다.

</td>
</tr>
</table>

</details>

## 06-rewrite-tech-retro: 캐시 도입 회고 단락 고쳐 쓰기

갈래: AI 문체 고쳐 쓰기

<details>
<summary>입력 보기</summary>

`````text
아래 단락은 제가 혼자 진행한 작업을 사내 기술 블로그에 올리려고 쓴 초안인데, AI 가 쓴 티가 난다는 말을 들었습니다. 내용과 수치는 그대로 두고 자연스러운 한국어로 고쳐 써 주세요. 고친 글만 출력해 주세요.

<원문>
캐시는 단순히 속도를 높이는 도구가 아니라, 서비스의 안정성을 책임지는 핵심적인 구성 요소입니다. 우리는 지난 분기에, 상품 상세 API 앞에 Redis 캐시를 도입했고, 그 결과, 평균 응답 시간이 480ms에서 95ms로 줄었으며, DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 하지만 캐시를 도입하는 순간, 데이터 정합성이라는 새로운 과제가 시작됩니다. 우리는 가격이 바뀌었는데도, 캐시에 남은 예전 가격이, 최대 10분 동안 노출되는 문제를 겪었습니다. 이를 해결하기 위해, 우리는 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 즉시 삭제하는, 효율적이고 체계적인 무효화 전략을 도입했습니다. 캐시 운영은 단순한 기술 선택을 넘어, 팀의 운영 역량을 보여주는 지표입니다. 정리하면, 캐시는 빠르지만, 그만큼 신중한 관리가 필요합니다.
</원문>
`````

</details>

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 기본 | 0.0 | 1.50 |
| fluent-korean | 0.0 | 1.83 |
| 우리 스킬 | 0.0 | 2.67 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 평균 응답 시간은 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 두면 데이터 정합성 문제가 따라옵니다. 실제로 가격이 바뀌었는데도 캐시에 남은 예전 가격이 최대 10분 동안 노출되는 문제가 있었습니다. 그래서 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 바로 삭제하도록 바꿨습니다. 캐시는 빠르지만, 그만큼 신중하게 관리해야 합니다.

</td>
<td valign="top">

캐시는 응답 속도를 높이는 데 그치지 않고, 서비스가 안정적으로 운영되도록 돕는 역할도 합니다. 저는 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 그 결과 평균 응답 시간이 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 낮아졌습니다. 그러나 캐시를 도입하면 원본 데이터와 캐시 데이터의 정합성을 유지해야 하는 새로운 문제가 생깁니다. 실제로 상품 가격이 변경된 뒤에도 캐시에 남아 있던 이전 가격이 최대 10분 동안 사용자에게 노출되는 문제가 발생했습니다. 이를 해결하기 위해 가격 변경 이벤트를 수신하면 해당 상품의 캐시 키를 즉시 삭제하도록 무효화 방식을 적용했습니다. 캐시를 얼마나 잘 운영하는지는 팀의 운영 역량을 가늠하는 기준이 되기도 합니다. 캐시는 응답을 빠르게 해 주지만, 그만큼 신중하게 관리해야 합니다.

</td>
<td valign="top">

저는 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 그 결과 평균 응답 시간이 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 도입하고 나니 데이터 정합성 문제가 생겼습니다. 가격이 바뀌었는데도 캐시에 남은 예전 가격이 최대 10분 동안 노출되었습니다. 이를 해결하려고 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 즉시 삭제하도록 했습니다. 캐시는 빠르지만 데이터 정합성을 유지하려면 무효화 방식까지 함께 설계해야 합니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

지난 분기에 상품 상세 API 앞단에 Redis 캐시를 도입했습니다. 평균 응답 시간은 480ms에서 95ms로 줄었고, DB CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 쓰기 시작하면 데이터 정합성 문제가 따라옵니다. 실제로 가격이 바뀌었는데도 캐시에 남아 있던 예전 가격이 최대 10분간 노출되는 일이 있었습니다. 그래서 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 바로 삭제하도록 바꿨습니다. 캐시는 응답을 빠르게 해 주지만, 그만큼 무효화 같은 관리에도 신경을 써야 합니다.

</td>
<td valign="top">

지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 그 결과 평균 응답 시간이 480ms에서 95ms로 줄어들었고, DB의 CPU 사용률도 71%에서 38%로 낮아졌습니다. 다만 캐시를 도입하면 원본 데이터와 캐시의 내용을 일치시켜야 하는 데이터 정합성 문제가 새로 생깁니다. 실제로 상품 가격이 변경된 뒤에도 캐시에 남아 있던 이전 가격이 최대 10분 동안 노출되는 문제가 발생했습니다. 이를 해결하려고 가격 변경 이벤트를 수신하면 해당 상품의 캐시 키를 즉시 삭제하는 무효화 방식을 적용했습니다. 캐시는 응답 속도를 크게 개선해 주지만, 오래된 데이터가 노출되지 않도록 계속 관리해야 합니다.

</td>
<td valign="top">

지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 그 결과 평균 응답 시간이 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 도입하고 나니 데이터 정합성 문제가 생겼습니다. 상품 가격이 바뀌었는데도 캐시에 남은 예전 가격이 최대 10분 동안 노출된 것입니다. 이 문제를 해결하려고 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 바로 삭제하도록 무효화 방식을 바꿨습니다. 캐시를 쓰면 응답은 빨라지지만 원본 데이터와 어긋나지 않도록 관리하는 작업이 함께 필요했습니다.

</td>
</tr>
</table>

</details>

<details>
<summary>3번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

지난 분기에 상품 상세 API 앞에 Redis 캐시를 붙였습니다. 평균 응답 시간은 480ms에서 95ms로 줄었고, DB CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 쓰기 시작하니 데이터 정합성 문제가 따라왔습니다. 가격이 바뀌었는데도 캐시에 남아 있던 예전 가격이 최대 10분 동안 그대로 노출된 것입니다. 이를 해결하려고 가격 변경 이벤트가 들어오면 해당 상품의 캐시 키를 바로 삭제하도록 바꿨습니다. 캐시는 빠른 만큼 관리에도 신경을 써야 합니다.

</td>
<td valign="top">

캐시는 응답 속도를 높이는 데 그치지 않고 서비스의 안정성에도 크게 기여합니다. 저는 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 그 결과 평균 응답 시간이 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 낮아졌습니다. 다만 캐시를 도입하면 데이터 정합성이라는 새로운 문제가 생깁니다. 실제로 가격이 변경된 뒤에도 캐시에 남아 있던 이전 가격이 최대 10분 동안 노출되는 문제가 발생했습니다. 이를 해결하기 위해 가격 변경 이벤트를 수신하면 해당 상품의 캐시 키를 즉시 삭제하도록 무효화 전략을 적용했습니다. 캐시를 어떻게 운영하는지는 팀의 운영 역량을 가늠하는 기준이 되기도 합니다. 캐시는 성능을 크게 개선해 주지만, 그만큼 신중하게 관리해야 합니다.

</td>
<td valign="top">

저는 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 그 결과 평균 응답 시간이 480ms에서 95ms로 줄었고 DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 도입하고 나니 데이터 정합성 문제가 생겼습니다. 가격이 바뀌었는데도 캐시에 남은 예전 가격이 최대 10분 동안 노출되었습니다. 이를 해결하려고 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 바로 삭제하도록 무효화 방식을 바꿨습니다. 캐시는 응답 속도를 크게 높여 주지만 이런 정합성 문제가 생길 수 있으므로 무효화 방식까지 함께 설계해야 합니다.

</td>
</tr>
</table>

</details>

<details>
<summary>다른 비교에 들어가는 조건의 출력 (im-not-ai, 예시 2개)</summary>

1번째 생성

<table>
<tr><th width="50%">im-not-ai</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

캐시는 속도를 높이는 데서 그치지 않고 서비스 안정성도 함께 떠받칩니다. 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했더니 평균 응답 시간이 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 두면 데이터 정합성 문제가 따라옵니다. 가격이 바뀌었는데도 캐시에 남은 예전 가격이 최대 10분 동안 노출되는 일이 있었습니다. 그래서 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 바로 삭제하도록 무효화 방식을 바꿨습니다. 캐시는 빠른 만큼 관리에도 신경을 써야 합니다.

</td>
<td valign="top">

지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했더니 평균 응답 시간이 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 도입하면서 데이터 정합성 문제가 생겼습니다. 상품 가격이 바뀌었는데도 캐시에 남은 예전 가격이 최대 10분 동안 노출된 것입니다. 이 문제는 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 즉시 삭제하도록 바꿔서 해결했습니다. 캐시를 쓰면 응답은 빨라지지만 캐시에 남은 값이 원본과 달라지지 않도록 관리해야 합니다.

</td>
</tr>
</table>

2번째 생성

<table>
<tr><th width="50%">im-not-ai</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

캐시는 서비스가 느려지지 않게 해 주는 도구이면서 동시에 안정성을 받치는 구성 요소입니다. 우리는 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 평균 응답 시간은 480ms에서 95ms로 줄었고 DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 두자 데이터 정합성 문제가 생겼습니다. 가격이 바뀌었는데도 캐시에 남은 예전 가격이 최대 10분 동안 노출된 것입니다. 그래서 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 바로 삭제하도록 무효화 방식을 바꿨습니다. 캐시는 빠른 대신 관리에 신경을 써야 합니다.

</td>
<td valign="top">

지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했더니 평균 응답 시간이 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 도입하면서 데이터 정합성 문제가 생겼습니다. 상품 가격이 바뀌어도 캐시에 남은 예전 가격이 최대 10분 동안 노출된 것입니다. 이 문제를 해결하려고 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 즉시 삭제하도록 무효화 로직을 추가했습니다. 캐시는 응답 속도를 높여 주지만 원본 데이터와 어긋날 수 있으므로, 도입한 뒤에도 무효화 시점을 계속 관리해야 합니다.

</td>
</tr>
</table>

3번째 생성

<table>
<tr><th width="50%">im-not-ai</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

캐시는 속도만 높이는 도구가 아닙니다. 서비스 안정성에도 큰 몫을 합니다. 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했더니 평균 응답 시간이 480ms에서 95ms로 줄었고 DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 쓰기 시작하면 데이터 정합성 문제가 따라옵니다. 가격이 바뀌었는데도 캐시에 남은 예전 가격이 최대 10분 동안 노출된 적이 있습니다. 그래서 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 바로 삭제하도록 무효화 방식을 바꿨습니다. 캐시 운영 방식에는 팀의 운영 역량이 드러납니다. 캐시는 빠른 만큼 신중하게 관리해야 합니다.

</td>
<td valign="top">

지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했더니 평균 응답 시간이 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 도입하자 데이터 정합성 문제가 생겼습니다. 가격이 바뀌었는데도 캐시에 남은 예전 가격이 최대 10분 동안 노출되었기 때문입니다. 이를 해결하려고 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 즉시 삭제하도록 무효화 방식을 바꿨습니다. 캐시는 응답 속도를 크게 줄여 주지만 데이터가 오래 남아 있을 수 있으므로, 무효화 시점을 함께 관리해야 합니다.

</td>
</tr>
</table>

</details>

## 07-rewrite-running-essay: 아침 달리기 경험담 고쳐 쓰기

갈래: AI 문체 고쳐 쓰기

<details>
<summary>입력 보기</summary>

`````text
아래는 제가 개인 블로그에 올리려고 쓴 글인데, AI 가 쓴 것 같다는 말을 들었습니다. 제 경험을 쓴 글이니 내용은 바꾸지 말고 문장만 자연스럽게 고쳐 주세요. 고친 글만 출력해 주세요.

<원문>
아침 달리기는 단순히 운동이 아니라, 하루를 설계하는 의식입니다. 저는 석 달 전부터, 매일 아침 6시에 일어나, 집 앞 하천을 따라 3km를 달리기 시작했습니다. 처음 2주는, 일어나는 것 자체가 힘들었고, 무릎도 아팠지만, 3주째부터는, 몸이 먼저 깨어났습니다. 운동화 끈을 묶는 순간, 하루의 모든 것이 달라집니다. 우리는 꾸준함을 통해, 지속가능하고 건강한 삶을 실천할 수 있습니다. 달리기를 시작한 뒤로, 저는 점심 이후에 졸리는 일이 줄었고, 밤 11시 전에 잠들게 되었으며, 체중도 4kg 빠졌습니다. 달리기는 체력을 넘어, 삶의 태도를 바꾸는 혁신적인 습관입니다. 결론적으로, 아침 달리기는 저에게 꼭 필요한 시간입니다.
</원문>
`````

</details>

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 기본 | 0.0 | 2.33 |
| fluent-korean | 1.7 | 1.00 |
| 우리 스킬 | 0.0 | 2.67 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

저는 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km씩 달리고 있습니다. 처음 2주는 일어나는 것부터 힘들었고 무릎도 아팠습니다. 그런데 3주째부터는 알람이 울리기 전에 몸이 먼저 깨어나기 시작했습니다. 운동화 끈을 묶을 때쯤이면 하루가 어떻게 흘러갈지 대강 그려집니다.

달리기를 시작한 뒤로 점심 이후에 졸리는 일이 줄었고, 밤 11시 전에는 잠들게 되었습니다. 체중도 4kg 빠졌습니다. 달리기는 체력만이 아니라 하루를 대하는 태도까지 바꿔 놓았습니다. 저에게 아침 달리기는 이제 꼭 필요한 시간입니다.

</td>
<td valign="top">

저에게 아침 달리기는 단순한 운동이 아니라 하루를 준비하는 시간입니다. 저는 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km를 달리고 있습니다. 처음 2주 동안은 일어나는 것 자체가 힘들었고 무릎도 아팠습니다. 하지만 3주째부터는 몸이 먼저 잠에서 깨기 시작했습니다. 운동화 끈을 묶을 때마다 오늘 하루가 달라질 것 같은 기분이 듭니다. 꾸준히 달리다 보면 건강한 생활을 오래 이어 갈 수 있다고 생각합니다.

달리기를 시작한 뒤로 점심 이후에 졸리는 일이 줄었습니다. 밤 11시 전에는 잠들게 되었고, 체중도 4kg 줄었습니다. 달리기는 체력뿐 아니라 생활을 대하는 태도까지 바꿔 주었습니다. 이제 저에게 아침 달리기는 꼭 필요한 시간입니다.

</td>
<td valign="top">

저는 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km씩 달리고 있습니다. 처음 2주는 일어나는 것도 힘들고 무릎도 아팠지만 3주째부터는 알람이 울리기 전에 눈이 떠졌습니다. 운동화 끈을 묶고 나가면 그날 하루를 더 활기차게 보낼 수 있었습니다. 꾸준히 달리니 점심 이후에 졸리는 일이 줄었고 밤 11시 전에 잠들게 되었으며 체중도 4kg 빠졌습니다. 아침 달리기는 저에게 꼭 필요한 시간입니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km씩 달리고 있습니다. 처음 2주는 일어나는 것부터 힘들었고 무릎도 아팠습니다. 그런데 3주째부터는 알람이 울리기 전에 눈이 떠졌습니다. 운동화 끈을 묶을 때면 이제 오늘도 달리겠구나 싶어 마음이 편해집니다.

달리기를 시작하고 나서 점심 먹고 졸린 일이 줄었고, 밤 11시 전에는 잠드는 날이 많아졌습니다. 체중도 4kg 빠졌습니다. 몸이 가벼워진 것도 좋지만, 하루를 시작하는 기분이 달라진 게 더 큽니다. 아침 달리기는 저에게 꼭 필요한 시간이 되었습니다.

</td>
<td valign="top">

아침 달리기는 저에게 단순한 운동이 아니라 하루를 시작하는 방식입니다. 저는 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km를 달리고 있습니다. 처음 2주 동안은 일어나는 것부터 힘들었고 무릎도 아팠습니다. 하지만 3주째부터는 몸이 먼저 깨어나기 시작했습니다.

지금은 운동화 끈을 묶는 순간부터 하루가 달라진다고 느낍니다. 꾸준히 달리다 보니 생활에도 변화가 생겼습니다. 점심 이후에 졸리는 일이 줄었고, 밤 11시 전에 잠들게 되었으며, 체중도 4kg 빠졌습니다. 달리기는 체력뿐 아니라 삶을 대하는 태도까지 바꿔 주었습니다. 그래서 저에게 아침 달리기는 꼭 필요한 시간입니다.

</td>
<td valign="top">

저는 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km를 달리고 있습니다. 처음 2주는 일어나는 것도 힘들고 무릎도 아팠지만, 3주째부터는 알람보다 먼저 눈이 떠졌습니다. 운동화 끈을 묶고 나가면 그날 하루를 시작하는 마음이 한결 가벼워졌습니다. 꾸준히 달리다 보니 점심 이후에 졸리는 일이 줄었고 밤 11시 전에 잠들게 되었으며 체중도 4kg 빠졌습니다. 저에게 아침 달리기는 하루 중 가장 기다려지는 시간입니다.

</td>
</tr>
</table>

</details>

<details>
<summary>3번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km를 달리고 있습니다. 처음 2주는 일어나는 것부터 힘들었고 무릎도 아팠습니다. 그런데 3주째부터는 알람보다 몸이 먼저 깨어났습니다. 운동화 끈을 묶을 때면 오늘 하루도 괜찮겠다는 생각이 듭니다.

달리기를 시작하고 나서 점심 이후에 졸린 일이 줄었고, 밤 11시 전에는 잠들게 되었습니다. 체중도 4kg 빠졌습니다. 체력만 좋아진 게 아니라 하루를 대하는 태도도 조금 달라졌습니다. 그래서 아침 달리기는 저에게 꼭 필요한 시간이 되었습니다.

</td>
<td valign="top">

아침 달리기는 저에게 단순한 운동이 아니라 하루를 시작하는 방식을 정해 주는 습관입니다. 저는 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km를 달리고 있습니다. 처음 2주 동안은 일어나는 것 자체가 힘들었고 무릎도 아팠습니다. 하지만 3주째부터는 몸이 먼저 일어날 준비를 하기 시작했습니다. 운동화 끈을 묶는 순간부터 하루가 다르게 느껴집니다. 꾸준히 달리다 보니 건강한 생활을 계속 이어갈 수 있다는 자신감도 생겼습니다. 달리기를 시작한 뒤로 점심 식사 이후에 졸리는 일이 줄었고, 밤 11시 전에 잠들게 되었으며, 체중도 4kg 줄었습니다. 달리기는 체력뿐 아니라 생활을 대하는 태도까지 바꿔 주었습니다. 그래서 아침 달리기는 저에게 꼭 필요한 시간이 되었습니다.

</td>
<td valign="top">

저는 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km를 달리고 있습니다. 처음 2주는 일어나는 것도 힘들고 무릎도 아팠지만, 3주째부터는 알람이 울리기 전에 눈이 떠졌습니다. 운동화 끈을 묶고 나가면 그날 하루를 계획대로 보내기가 한결 수월했습니다. 달리기를 시작한 뒤로 점심 이후에 졸리는 일이 줄었고, 밤 11시 전에 잠들게 되었으며, 체중도 4kg 빠졌습니다. 아침 달리기는 저에게 꼭 필요한 시간입니다.

</td>
</tr>
</table>

</details>

<details>
<summary>다른 비교에 들어가는 조건의 출력 (im-not-ai, 예시 2개)</summary>

1번째 생성

<table>
<tr><th width="50%">im-not-ai</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

아침 달리기는 운동 이상입니다. 하루를 시작하는 저만의 의식 같은 것이죠. 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km를 달리고 있습니다. 처음 2주는 일어나는 것 자체가 힘들었고 무릎도 아팠습니다. 그런데 3주째부터는 몸이 먼저 깨어났습니다. 운동화 끈을 묶으면 하루가 다르게 시작됩니다. 꾸준히 하다 보니 생활도 달라졌습니다. 점심 이후에 졸리는 일이 줄었고, 밤 11시 전에 잠들게 되었고, 체중도 4kg 빠졌습니다. 체력만 좋아진 게 아니라 삶을 대하는 태도도 조금 달라졌습니다. 아침 달리기는 이제 저에게 꼭 필요한 시간입니다.

</td>
<td valign="top">

저는 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km씩 달리고 있습니다. 처음 2주 동안은 일어나기도 힘들고 무릎도 아팠지만, 3주째부터는 알람이 울리기 전에 몸이 먼저 깨어났습니다. 운동화 끈을 묶고 나가면 하루를 시작하는 기분이 들어서, 이제는 달리기를 거르면 오히려 어색합니다.

달리기를 시작한 뒤로 점심 이후에 졸리는 일이 줄었고 밤 11시 전에 잠들게 되었으며 체중도 4kg 빠졌습니다. 그래서 저에게 아침 달리기는 꼭 필요한 시간입니다.

</td>
</tr>
</table>

2번째 생성

<table>
<tr><th width="50%">im-not-ai</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

아침 달리기는 운동이기 전에 하루를 시작하는 저만의 의식입니다. 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km를 달리고 있습니다. 처음 2주는 일어나는 것부터 힘들었고 무릎도 아팠습니다. 그래도 3주째부터는 몸이 먼저 깨어났습니다. 운동화 끈을 묶으면 그날 하루가 달라지는 느낌이 듭니다. 달리기를 시작한 뒤로 점심 이후에 졸리는 일이 줄었고, 밤 11시 전에 잠들게 되었으며, 체중도 4kg 빠졌습니다. 체력만 좋아진 게 아니라 생활을 대하는 태도도 달라졌습니다. 저에게 아침 달리기는 꼭 필요한 시간입니다.

</td>
<td valign="top">

저는 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km를 달리고 있습니다. 처음 2주 동안은 일어나는 것 자체가 힘들고 무릎도 아팠지만, 3주째부터는 알람이 울리기 전에 몸이 먼저 깨어나기 시작했습니다. 운동화 끈을 묶고 집을 나서면 하루를 시작하는 기분이 달라집니다. 꾸준히 달리다 보니 생활도 눈에 띄게 달라졌습니다. 점심 이후에 졸리는 일이 줄었고 밤 11시 전에 잠들게 되었으며 체중도 4kg 빠졌습니다. 이제 아침 달리기는 저에게 꼭 필요한 시간이 되었습니다.

</td>
</tr>
</table>

3번째 생성

<table>
<tr><th width="50%">im-not-ai</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

아침 달리기는 운동 그 이상입니다. 저한테는 하루를 설계하는 의식에 가깝습니다. 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km를 달리기 시작했습니다. 처음 2주는 일어나는 것 자체가 힘들었고 무릎도 아팠지만 3주째부터는 몸이 먼저 깨어났습니다. 운동화 끈을 묶는 순간 하루가 달라집니다. 꾸준히 하면 건강한 삶을 오래 이어 갈 수 있습니다. 달리기를 시작한 뒤로 점심 이후에 졸리는 일이 줄었고 밤 11시 전에 잠들게 되었으며 체중도 4kg 빠졌습니다. 체력만 좋아진 것이 아니라 삶을 대하는 태도도 달라졌습니다. 아침 달리기는 저에게 꼭 필요한 시간입니다.

</td>
<td valign="top">

저는 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km를 달리고 있습니다. 처음 2주는 일어나는 것 자체가 힘들었고 무릎도 아팠지만, 3주째부터는 알람이 울리기 전에 몸이 먼저 깨어났습니다. 운동화 끈을 묶고 나가면 그날 하루를 계획대로 보내기가 한결 수월해집니다. 달리기를 시작한 뒤로 점심 이후에 졸리는 일이 줄었고 밤 11시 전에 잠들게 되었으며 체중도 4kg 빠졌습니다. 이제 아침 달리기는 저에게 꼭 필요한 시간입니다.

</td>
</tr>
</table>

</details>

## 08-merge-short-sentences: 택배 예약 도움말의 끊어 쓴 문장 합치기

갈래: 끊어 쓴 문장 합치기

<details>
<summary>입력 보기</summary>

`````text
아래는 택배 예약 화면에 넣을 도움말 초안입니다. 문장이 너무 짧게 끊겨 있어서 읽기 불편합니다. 내용은 그대로 두고 문장을 자연스럽게 이어서 다시 써 주세요. 해요체는 유지하고, 고친 글만 출력해 주세요.

<원문>
예약은 오후 3시에 마감돼요. 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님은 방문 전에 전화를 드려요. 전화를 못 받으면 문 앞에서 수거해요. 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 가져와요. 직접 출력하지 않아도 돼요. 상자 무게는 20kg까지 가능해요. 20kg이 넘으면 수거하지 않아요. 예약은 수거 전까지 취소할 수 있어요. 취소 수수료는 없어요. 수거가 끝나면 취소할 수 없어요. 그때는 반송을 신청해야 해요. 반송비는 3,500원이에요.
</원문>
`````

</details>

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 기본 | 0.0 | 1.83 |
| fluent-korean | 0.0 | 2.00 |
| 우리 스킬 | 0.0 | 2.17 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

예약은 오후 3시에 마감되며, 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님은 방문 전에 전화를 드리고, 전화를 받지 못하면 문 앞에서 수거해요. 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 가져오니 직접 출력하지 않아도 돼요. 상자 무게는 20kg까지 가능하고, 20kg이 넘으면 수거하지 않아요. 예약은 수거 전까지 수수료 없이 취소할 수 있지만, 수거가 끝나면 취소할 수 없어요. 그때는 반송을 신청해야 하며, 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되므로, 3시 이후에 예약하시면 다음 날 수거해요. 수거 기사님이 방문하기 전에 전화를 드리는데, 전화를 받지 못하시면 문 앞에서 상자를 수거해요. 그러니 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 직접 가져오시기 때문에 따로 출력하지 않으셔도 돼요.

상자 무게는 20kg까지 가능하며, 20kg이 넘으면 수거하지 않아요. 예약은 수거 전까지 수수료 없이 취소할 수 있지만, 수거가 끝난 뒤에는 취소할 수 없어요. 이 경우에는 반송을 신청해 주셔야 하고, 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되고 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님이 방문하기 전에 전화를 드리지만 전화를 못 받으면 문 앞에서 수거하니, 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 가져오므로 직접 출력하지 않아도 돼요.

상자 무게는 20kg까지 가능하고, 20kg이 넘으면 수거하지 않아요. 예약은 수거 전까지 취소 수수료 없이 취소할 수 있지만 수거가 끝나면 취소할 수 없어서 반송을 신청해야 하고, 이때 반송비는 3,500원이에요.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

예약은 오후 3시에 마감되며, 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님이 방문 전에 전화를 드리는데, 전화를 받지 못하면 문 앞에서 수거하니 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 가져오므로 직접 출력하지 않아도 돼요. 상자 무게는 20kg까지 가능하고, 20kg이 넘으면 수거하지 않아요. 예약은 수거 전까지 수수료 없이 취소할 수 있지만, 수거가 끝난 뒤에는 취소할 수 없어서 이때는 반송을 신청해야 하고, 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되기 때문에, 3시 이후에 예약하시면 다음 날 수거해요. 수거 기사님이 방문하기 전에 전화를 드리는데, 전화를 받지 못하시면 문 앞에 놓인 상자를 수거해요. 그러므로 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 직접 가져오기 때문에 따로 출력하지 않으셔도 돼요.

상자 무게는 20kg까지 가능하며, 20kg이 넘으면 수거하지 않아요. 예약은 수거 전까지 수수료 없이 취소할 수 있지만, 수거가 끝난 뒤에는 취소할 수 없어요. 이때는 반송을 신청해야 하며, 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되고, 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님이 방문 전에 전화를 드리지만 전화를 못 받으면 문 앞에서 수거하니, 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 가져오므로 직접 출력하지 않아도 돼요.

상자 무게는 20kg까지 가능하고, 20kg이 넘으면 수거하지 않아요. 예약은 수거 전까지 수수료 없이 취소할 수 있지만, 수거가 끝나면 취소할 수 없어서 반송을 신청해야 하고 반송비는 3,500원이에요.

</td>
</tr>
</table>

</details>

<details>
<summary>3번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

예약은 오후 3시에 마감되며, 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님이 방문 전에 전화를 드리는데, 전화를 받지 못하면 문 앞에서 수거하니 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 가져오므로 직접 출력하지 않아도 돼요. 상자 무게는 20kg까지 가능하고, 20kg이 넘으면 수거하지 않아요. 예약은 수거 전까지 수수료 없이 취소할 수 있지만, 수거가 끝난 뒤에는 취소할 수 없어서 그때는 반송을 신청해야 하고 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되므로 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님은 방문하기 전에 전화를 드리는데, 전화를 받지 못하면 문 앞에서 상자를 수거해요. 그러니 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 직접 가져오기 때문에 따로 출력하지 않아도 돼요.

상자 무게는 20kg까지 가능하며, 20kg을 넘으면 수거하지 않아요. 예약은 수거 전까지 취소할 수 있고 취소 수수료도 없지만, 수거가 끝난 뒤에는 취소할 수 없어요. 그런 경우에는 반송을 신청해야 하며, 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되고 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님은 방문 전에 전화를 드리지만 전화를 받지 못하시면 문 앞에서 수거해요. 상자는 문 앞에 미리 내놓아 주세요.

운송장은 기사님이 가져오니 직접 출력하지 않아도 돼요. 상자 무게는 20kg까지 가능하며 20kg이 넘으면 수거하지 않아요.

예약은 수거 전까지 수수료 없이 취소할 수 있지만 수거가 끝나면 취소할 수 없어서 반송을 신청해야 해요. 반송비는 3,500원이에요.

</td>
</tr>
</table>

</details>

<details>
<summary>다른 비교에 들어가는 조건의 출력 (im-not-ai, 예시 2개)</summary>

1번째 생성

<table>
<tr><th width="50%">im-not-ai</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

예약은 오후 3시에 마감되고, 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님이 방문 전에 전화를 드리는데, 전화를 못 받으면 문 앞에서 수거해요. 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 가져오니까 직접 출력하지 않아도 돼요.

상자 무게는 20kg까지 가능하고, 20kg이 넘으면 수거하지 않아요. 예약은 수거 전까지 취소할 수 있고 취소 수수료도 없어요. 다만 수거가 끝나면 취소할 수 없어서, 그때는 반송을 신청해야 해요. 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되고 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님은 방문 전에 전화를 드리지만 전화를 못 받으면 문 앞에서 수거하니, 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 가져오므로 직접 출력하지 않아도 돼요.

상자 무게는 20kg까지 가능하고 20kg이 넘으면 수거하지 않아요. 예약은 수거 전까지 취소할 수 있고 취소 수수료는 없지만, 수거가 끝나면 취소할 수 없어서 반송을 신청해야 하고 반송비는 3,500원이에요.

</td>
</tr>
</table>

2번째 생성

<table>
<tr><th width="50%">im-not-ai</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

예약은 오후 3시에 마감돼요. 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님은 방문 전에 전화를 드리는데, 전화를 못 받으면 문 앞에서 수거해요. 그러니 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 가져오니까 직접 출력하지 않아도 돼요.

상자 무게는 20kg까지 가능하고, 20kg이 넘으면 수거하지 않아요. 예약은 수거 전까지 취소할 수 있고 취소 수수료는 없어요. 하지만 수거가 끝나면 취소할 수 없어서, 그때는 반송을 신청해야 해요. 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되고 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님은 방문 전에 전화를 드리지만 전화를 못 받으면 문 앞에서 수거하니, 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 가져오기 때문에 직접 출력하지 않아도 돼요.

상자 무게는 20kg까지 가능하고 20kg이 넘으면 수거하지 않아요. 예약은 수거 전까지 수수료 없이 취소할 수 있지만 수거가 끝나면 취소할 수 없어서, 그때는 반송을 신청해야 하고 반송비는 3,500원이에요.

</td>
</tr>
</table>

3번째 생성

<table>
<tr><th width="50%">im-not-ai</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

예약은 오후 3시에 마감되고, 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님은 방문 전에 전화를 드리는데, 전화를 못 받으면 문 앞에서 수거해요. 그러니 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 가져오니 직접 출력하지 않아도 돼요.

상자 무게는 20kg까지 가능하고, 20kg이 넘으면 수거하지 않아요. 예약은 수거 전까지 취소할 수 있으며 취소 수수료는 없어요. 다만 수거가 끝나면 취소할 수 없어서, 그때는 반송을 신청해야 해요. 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되고 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님이 방문 전에 전화를 드리는데, 전화를 받지 못하면 문 앞에서 수거해요. 그래서 상자는 문 앞에 미리 내놓아 주세요.

운송장은 기사님이 가져오므로 직접 출력하지 않아도 돼요. 상자 무게는 20kg까지 가능하고, 20kg이 넘으면 수거하지 않아요.

예약은 수거 전까지 수수료 없이 취소할 수 있지만, 수거가 끝나면 취소할 수 없어서 그때는 반송을 신청해야 해요. 반송비는 3,500원이에요.

</td>
</tr>
</table>

</details>

## 09-commit-fix-coupon-timezone: 만료된 쿠폰이 사용되던 시간대 버그 수정의 커밋 메시지

갈래: 커밋 메시지

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

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 기본 | 0.3 | 2.00 |
| fluent-korean | 2.0 | 2.33 |
| 우리 스킬 | 0.0 | 1.67 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

````text
fix: 쿠폰 만료 판정 시 한국 시간 기준 날짜로 비교하도록 수정

쿠폰의 expiresOn 은 한국 시간 기준 날짜(YYYY-MM-DD)인데, 만료 여부를
UTC 날짜와 비교하고 있었다. 이 때문에 한국 시간 00:00~08:59 사이에는
UTC 날짜가 전날로 계산되어, 전날 만료된 쿠폰이 사용 가능한 것으로
판정되었다.

date-fns-tz 의 formatInTimeZone 으로 Asia/Seoul 기준 오늘 날짜를 구해
expiresOn 과 비교하도록 변경한다. 한국 시간 오전 8시에 전날 만료된
쿠폰을 거절하는 통합 테스트도 추가했다.

Closes #214
````

</td>
<td valign="top">

````text
쿠폰 만료 판정 시 한국 시간 기준 날짜를 사용하도록 수정

만료일(expiresOn)은 한국 시간 기준 날짜인데, 기존에는 UTC 날짜와 비교하고 있었습니다. 그래서 한국 시간 00:00부터 08:59까지는 UTC 날짜가 전날로 계산되어, 전날 만료된 쿠폰이 사용 가능한 것으로 판정되었습니다.

현재 시각을 date-fns-tz의 formatInTimeZone으로 Asia/Seoul 기준 날짜로 변환한 뒤 만료일과 비교하도록 변경했습니다. 또한 한국 시간 오전 8시에 전날 만료된 쿠폰의 사용을 거절하는지 확인하는 통합 테스트를 추가했습니다.

Fixes #214
````

</td>
<td valign="top">

````text
fix: 쿠폰 만료일을 UTC 대신 한국 시간 기준 날짜와 비교

쿠폰의 만료일(expiresOn)은 한국 시간 기준 날짜인데 UTC 날짜와 비교해서
한국 시간 00:00부터 08:59까지는 전날 날짜와 비교되었고, 그 결과 만료된
쿠폰이 사용되었다. 어제 만료된 쿠폰이 오늘 아침에 사용되었다는 문의가
고객센터에 3건 접수되어 확인한 원인이다.

오늘 날짜를 date-fns-tz 의 formatInTimeZone 으로 Asia/Seoul 기준으로
계산하도록 수정했다. 한국 시간 오전 8시에 전날 만료된 쿠폰을 거절하는
통합 테스트도 함께 추가했다.

Closes: #214
````

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

````text
fix(coupon): 쿠폰 만료 판정을 한국 시간 기준으로 수정

쿠폰 만료일(expiresOn)은 한국 시간 기준 날짜인데, 현재 날짜를
UTC로 계산해 비교하고 있었다. 그 결과 한국 시간 00:00~08:59 사이에는
UTC 날짜가 하루 전으로 나와 전날 만료된 쿠폰이 사용 가능하게 처리되었다.

date-fns-tz의 formatInTimeZone으로 Asia/Seoul 기준 오늘 날짜를
구해 비교하도록 변경한다.

KST 08:00에 전날 만료된 쿠폰의 사용이 거절되는지 확인하는
통합 테스트를 추가한다.

Closes #214
````

</td>
<td valign="top">

````text
쿠폰 만료 판정 시 한국 시간 기준 날짜로 비교하도록 수정 (#214)

기존에는 쿠폰의 만료일(expiresOn)을 UTC 기준 오늘 날짜와 비교했습니다. 하지만 expiresOn은 한국 시간 기준 날짜로 저장되기 때문에, 한국 시간 00:00부터 08:59까지는 UTC 날짜가 전날로 계산되어 전날 만료된 쿠폰이 사용 가능한 것으로 판정되었습니다.

이 커밋에서는 date-fns-tz의 formatInTimeZone으로 Asia/Seoul 기준 오늘 날짜를 계산한 뒤 만료일과 비교하도록 변경했습니다. 또한 한국 시간 오전 8시에 전날 만료된 쿠폰의 사용을 요청하면 410 응답으로 거절되는지 확인하는 통합 테스트를 추가했습니다.
````

</td>
<td valign="top">

````text
fix: 쿠폰 만료 여부를 한국 시간 기준 날짜로 비교

쿠폰 만료일(expiresOn)은 한국 시간 기준 날짜인데 UTC 날짜와 비교해서
한국 시간 00:00부터 08:59까지는 전날 날짜로 판정되었고, 그 결과 어제
만료된 쿠폰이 사용되어 고객센터에 같은 내용의 문의가 3건 접수되었다.
현재 날짜를 Asia/Seoul 시간대로 변환해서 만료일과 비교하도록 수정했고,
한국 시간 오전 8시에 전날 만료된 쿠폰을 거절하는 통합 테스트를 추가했다.

Closes: #214
````

</td>
</tr>
</table>

</details>

<details>
<summary>3번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

````text
fix: 쿠폰 만료 판정을 한국 시간 기준으로 수정

쿠폰 사용 시 만료일(expiresOn)을 UTC 기준 오늘 날짜와 비교하고 있었습니다.
expiresOn 은 한국 시간 기준 날짜이므로, 한국 시간 00:00~08:59 에는
UTC 날짜가 전날로 계산되어 전날 만료된 쿠폰이 사용 가능한 것으로
판정되었습니다.

date-fns-tz 의 formatInTimeZone 으로 Asia/Seoul 기준 오늘 날짜를
구해 비교하도록 변경하고, 한국 시간 오전 8시에 전날 만료된 쿠폰이
거절되는지 확인하는 통합 테스트를 추가했습니다.

Closes #214
````

</td>
<td valign="top">

````text
쿠폰 만료 판정 시 한국 시간 기준 날짜로 비교하도록 수정 (#214)

쿠폰 만료 여부를 판정할 때 UTC 기준 날짜와 비교하고 있었기 때문에, 한국 시간 00:00부터 08:59 사이에는 전날 날짜가 기준으로 사용되었습니다. 그 결과 전날 만료된 쿠폰이 오전 시간대에 사용되는 문제가 발생했습니다.

expiresOn 값은 한국 시간 기준 날짜(YYYY-MM-DD)이므로, date-fns-tz의 formatInTimeZone으로 Asia/Seoul 기준 오늘 날짜를 계산하여 비교하도록 변경했습니다.

한국 시간 오전 8시에 전날 만료된 쿠폰의 사용이 거절되는지 확인하는 통합 테스트도 추가했습니다.

Closes #214
````

</td>
<td valign="top">

````text
fix: 쿠폰 만료일을 한국 시간 기준 날짜와 비교

고객센터에 전날 만료된 쿠폰이 다음 날 아침에 사용되었다는 문의가 3건
접수되었다. 쿠폰의 만료일(expiresOn)은 한국 시간 기준 날짜인데 UTC
날짜와 비교하고 있어서, 한국 시간 00:00부터 08:59까지는 전날 날짜가
나와 만료된 쿠폰이 통과했다.

date-fns-tz 의 formatInTimeZone 으로 Asia/Seoul 기준 오늘 날짜를 구해
만료일과 비교하도록 수정했다. 한국 시간 오전 8시에 전날 만료된 쿠폰을
거절하는지 확인하는 통합 테스트도 추가했다.

Closes: #214
````

</td>
</tr>
</table>

</details>

<details>
<summary>다른 비교에 들어가는 조건의 출력 (줄이기 전, 예시 2개)</summary>

1번째 생성

<table>
<tr><th width="50%">줄이기 전</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

````text
fix: 쿠폰 만료 여부를 한국 시간 기준 날짜로 비교

고객센터에 어제 만료된 쿠폰이 오늘 아침에 사용되었다는 문의가
3건 접수되어 확인했다. 쿠폰의 만료일(expiresOn)은 한국 시간 기준
날짜인데 UTC 날짜와 비교하고 있어서, 한국 시간 00시부터 08시 59분
사이에는 전날 날짜가 기준이 되어 만료된 쿠폰이 통과했다.

만료 여부를 비교할 때 date-fns-tz 의 formatInTimeZone 으로
Asia/Seoul 기준의 오늘 날짜를 구하도록 수정했다. 한국 시간 오전
8시에 전날 만료된 쿠폰의 사용을 거절하는 통합 테스트도 추가했다.

Closes: #214
````

</td>
<td valign="top">

````text
fix: 쿠폰 만료 여부를 한국 시간 기준 날짜로 비교

고객센터에 어제 만료된 쿠폰이 오늘 아침에 사용되었다는 문의가 3건 접수되어
확인했다. expiresOn 은 한국 시간 기준 날짜인데 UTC 날짜와 비교하고 있어서
한국 시간 00:00부터 08:59까지는 전날 날짜가 기준이 되었고, 그 결과 만료된
쿠폰이 검증을 통과했다.

현재 시각을 Asia/Seoul 기준 날짜로 변환한 값과 expiresOn 을 비교하도록
수정했다. 한국 시간 오전 8시에 전날 만료된 쿠폰을 410 으로 거절하는 통합
테스트도 추가했다.

Closes: #214
````

</td>
</tr>
</table>

2번째 생성

<table>
<tr><th width="50%">줄이기 전</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

````text
fix: 쿠폰 만료 여부를 한국 시간 기준 날짜로 비교

고객센터에 어제 만료된 쿠폰이 오늘 아침에 사용되었다는 문의가 3건
접수되었다. 만료일(expiresOn)은 한국 시간 기준 날짜인데 오늘 날짜를
UTC로 계산해서 비교했기 때문에, 한국 시간 00:00부터 08:59까지는 전날
날짜와 비교되어 만료된 쿠폰이 통과했다.

오늘 날짜를 Asia/Seoul 기준으로 계산하도록 수정하고, 한국 시간
오전 8시에 전날 만료된 쿠폰이 410으로 거절되는지 확인하는 통합
테스트를 추가했다.

Closes: #214
````

</td>
<td valign="top">

````text
fix: 쿠폰 만료 여부를 한국 시간 기준 날짜로 비교

expiresOn 은 한국 시간 기준 날짜인데 오늘 날짜는 UTC 로 계산해서 한국 시간
00:00부터 08:59까지는 전날 만료된 쿠폰이 만료되지 않은 것으로 판정되었다.
고객센터에 어제 만료된 쿠폰이 오늘 아침에 사용되었다는 문의가 3건 접수되어
확인했다. 오늘 날짜를 Asia/Seoul 기준으로 계산하도록 수정했고 한국 시간
오전 8시에 전날 만료된 쿠폰을 거절하는 통합 테스트를 추가했다.

Closes: #214
````

</td>
</tr>
</table>

3번째 생성

<table>
<tr><th width="50%">줄이기 전</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

````text
fix: 쿠폰 만료 여부를 한국 시간 기준 날짜로 비교

고객센터에 어제 만료된 쿠폰이 오늘 아침에 사용되었다는 문의가 3건
접수되어 확인했다. 만료 여부를 UTC 날짜와 비교하고 있었는데
expiresOn 은 한국 시간 기준 날짜라서, 한국 시간 00:00부터 08:59까지는
전날 날짜와 비교되어 만료된 쿠폰이 통과했다.

date-fns-tz 의 formatInTimeZone 으로 Asia/Seoul 기준 오늘 날짜를 구해서
expiresOn 과 비교하도록 수정했다. 한국 시간 오전 8시에 전날 만료된
쿠폰을 사용하면 410 을 반환하는지 확인하는 통합 테스트도 추가했다.

Closes: #214
````

</td>
<td valign="top">

````text
fix: 쿠폰 만료 여부를 한국 시간 기준 날짜로 판단

어제 만료된 쿠폰이 오늘 아침에 사용되었다는 문의가 3건 접수되었다.
만료일(expiresOn)은 한국 시간 기준 날짜인데 UTC 날짜와 비교하고 있어서,
한국 시간 0시부터 오전 9시 전까지는 전날 날짜가 나와 만료된 쿠폰이
통과했다.

date-fns-tz 의 formatInTimeZone 으로 Asia/Seoul 기준 오늘 날짜를 구해서
만료일과 비교하도록 수정했고, 한국 시간 오전 8시에 전날 만료된 쿠폰을
거절하는 통합 테스트를 추가했다.

Closes: #214
````

</td>
</tr>
</table>

</details>

## 10-commit-feature-order-export: 주문 목록 CSV 내보내기 기능 추가의 커밋 메시지

갈래: 커밋 메시지

<details>
<summary>입력 보기</summary>

`````text
아래 diff 를 보고 커밋 메시지를 한국어로 써 주세요. 커밋 메시지만 출력하고, 다른 설명이나 코드 블록 표시는 붙이지 마세요.

```diff
diff --git a/src/orders/orders.controller.ts b/src/orders/orders.controller.ts
index 5d1e0aa..c93b7f4 100644
--- a/src/orders/orders.controller.ts
+++ b/src/orders/orders.controller.ts
@@ -27,4 +27,19 @@ export class OrdersController {
   list(@Query() query: ListOrdersDto) {
     return this.orders.list(query);
   }
+
+  @Get('export')
+  @Roles('admin', 'manager')
+  @Header('Content-Type', 'text/csv; charset=utf-8')
+  async export(@Query() query: ExportOrdersDto, @Res() res: Response) {
+    const count = await this.orders.count(query);
+    if (count > EXPORT_ROW_LIMIT) {
+      throw new BadRequestException(
+        `한 번에 내보낼 수 있는 주문은 ${EXPORT_ROW_LIMIT}건까지입니다. 기간을 줄여 주세요.`,
+      );
+    }
+    res.setHeader('Content-Disposition', `attachment; filename="orders-${query.from}-${query.to}.csv"`);
+    res.write('﻿'); // 엑셀에서 한글이 깨지지 않도록 BOM 을 붙인다
+    await this.orders.streamCsv(query, res);
+  }
 }
diff --git a/src/orders/orders.constants.ts b/src/orders/orders.constants.ts
index 1b0c2de..8a7714e 100644
--- a/src/orders/orders.constants.ts
+++ b/src/orders/orders.constants.ts
@@ -1,2 +1,5 @@
 export const DEFAULT_PAGE_SIZE = 20;
 export const MAX_PAGE_SIZE = 100;
+
+/** CSV 내보내기 한 번에 허용하는 최대 주문 수 */
+export const EXPORT_ROW_LIMIT = 10_000;
diff --git a/src/orders/orders.service.ts b/src/orders/orders.service.ts
index 9e44b02..d07a5c1 100644
--- a/src/orders/orders.service.ts
+++ b/src/orders/orders.service.ts
@@ -52,4 +52,22 @@ export class OrdersService {
     return { items, total, page: query.page };
   }
+
+  count(query: ExportOrdersDto): Promise<number> {
+    return this.repo.countBetween(query.from, query.to, query.status);
+  }
+
+  /** 주문을 500건씩 읽어서 CSV 행으로 쓴다. 전체를 메모리에 올리지 않는다. */
+  async streamCsv(query: ExportOrdersDto, out: Writable): Promise<void> {
+    out.write('주문번호,주문일시,주문자,상태,결제금액\n');
+    for await (const batch of this.repo.iterateBetween(query.from, query.to, query.status, 500)) {
+      for (const o of batch) {
+        out.write(
+          [o.orderNo, o.orderedAt.toISOString(), csvEscape(o.customerName), o.status, o.paidAmount].join(',') + '\n',
+        );
+      }
+    }
+    out.end();
+  }
 }
diff --git a/test/orders-export.integration.spec.ts b/test/orders-export.integration.spec.ts
new file mode 100644
index 0000000..2c6d9f1
--- /dev/null
+++ b/test/orders-export.integration.spec.ts
@@ -0,0 +1,31 @@
+describe('GET /orders/export', () => {
+  it('기간 안의 주문을 CSV 로 응답한다', async () => {
+    await seedOrders(3, { from: '2026-11-01', to: '2026-11-03' });
+    const res = await request(app.getHttpServer())
+      .get('/orders/export?from=2026-11-01&to=2026-11-30')
+      .set(asAdmin());
+    expect(res.status).toBe(200);
+    expect(res.text.split('\n').filter(Boolean)).toHaveLength(4); // 머리글 1 + 주문 3
+  });
+
+  it('1만 건이 넘으면 400 으로 응답한다', async () => {
+    await seedOrders(10_001, { from: '2026-10-01', to: '2026-10-31' });
+    const res = await request(app.getHttpServer())
+      .get('/orders/export?from=2026-10-01&to=2026-10-31')
+      .set(asAdmin());
+    expect(res.status).toBe(400);
+  });
+
+  it('일반 직원(staff)은 403 을 받는다', async () => {
+    const res = await request(app.getHttpServer())
+      .get('/orders/export?from=2026-11-01&to=2026-11-30')
+      .set(asStaff());
+    expect(res.status).toBe(403);
+  });
+});
```
`````

</details>

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 기본 | 2.3 | 1.17 |
| fluent-korean | 2.7 | 2.17 |
| 우리 스킬 | 0.0 | 2.67 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

````text
주문 목록 CSV 내보내기 API 추가

관리자와 매니저가 기간·상태별 주문을 CSV 파일로 내려받을 수 있도록
GET /orders/export 엔드포인트를 추가한다.

- 조회 건수가 10,000건을 넘으면 400으로 응답해 기간을 줄이도록 안내한다
- 주문을 500건씩 읽어 스트리밍으로 쓰므로 전체를 메모리에 올리지 않는다
- 엑셀에서 한글이 깨지지 않도록 응답 앞에 BOM을 붙인다
- admin, manager 역할만 접근할 수 있다
- 정상 응답, 건수 초과, 권한 없음 케이스에 대한 통합 테스트를 추가한다
````

</td>
<td valign="top">

````text
주문 CSV 내보내기 API 추가

관리자와 매니저가 기간별 주문을 CSV 파일로 내려받을 수 있도록 GET /orders/export 엔드포인트를 추가한다.

- admin, manager 역할만 호출할 수 있고, 일반 직원은 403으로 응답한다.
- 조회 대상이 EXPORT_ROW_LIMIT(10,000건)을 초과하면 400으로 응답하며, 기간을 줄이도록 안내한다.
- 주문을 500건씩 나누어 읽고 응답 스트림에 바로 쓰기 때문에 전체 데이터를 메모리에 올리지 않는다.
- 엑셀에서 한글이 깨지지 않도록 응답 앞부분에 BOM을 붙인다.
- 정상 응답, 건수 초과, 권한 없음 케이스에 대한 통합 테스트를 추가한다.
````

</td>
<td valign="top">

````text
feature: 주문을 CSV 파일로 내보내는 API를 추가

기간별 주문을 엑셀에서 확인할 수 있도록 GET /orders/export 를 추가했다.
admin 과 manager 역할만 호출할 수 있고 staff 는 403 을 받는다.

조회 기간의 주문이 10,000건(EXPORT_ROW_LIMIT)을 넘으면 400 을 반환해서
기간을 줄이도록 안내한다. 주문은 500건씩 읽어서 CSV 행으로 바로 쓰기
때문에 전체를 메모리에 올리지 않는다. 엑셀에서 한글이 깨지지 않도록
응답 앞에 BOM 을 붙였다.

통합 테스트에서 정상 응답과 건수 초과 시의 400 응답, staff 의 403 응답을
확인한다.
````

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

````text
주문 내역 CSV 내보내기 API 추가

GET /orders/export 엔드포인트를 추가해 기간과 상태로 조회한 주문을
CSV 파일로 내려받을 수 있게 했다. admin, manager 역할만 사용할 수 있다.

- 주문을 500건씩 나눠 읽어 응답 스트림에 바로 쓰므로 전체 데이터를
  메모리에 올리지 않는다
- 엑셀에서 한글이 깨지지 않도록 응답 앞에 BOM 을 붙인다
- 한 번에 내보낼 수 있는 주문 수를 EXPORT_ROW_LIMIT(10,000건)으로
  제한하고, 초과하면 400 과 함께 기간을 줄이라는 안내를 반환한다
- 통합 테스트 추가: 정상 내보내기, 1만 건 초과 시 400, staff 권한 403
````

</td>
<td valign="top">

````text
주문 CSV 내보내기 API 추가

GET /orders/export 엔드포인트를 추가하여 기간과 상태로 조회한 주문을 CSV 파일로 내려받을 수 있게 했습니다.

- admin, manager 역할만 호출할 수 있고, 그 외 역할은 403 응답을 받습니다.
- 조회 대상이 EXPORT_ROW_LIMIT(10,000건)을 초과하면 기간을 줄이도록 안내하는 400 응답을 반환합니다.
- 주문을 500건씩 읽어서 CSV 행으로 기록하므로 전체 데이터를 메모리에 올리지 않습니다.
- 엑셀에서 한글이 깨지지 않도록 응답 맨 앞에 BOM을 붙였습니다.
- 통합 테스트로 정상 응답, 건수 초과, 권한 없음 시나리오를 검증합니다.
````

</td>
<td valign="top">

````text
feature: 기간별 주문을 CSV 로 내려받는 GET /orders/export 를 추가

관리자와 매니저가 기간을 지정해서 주문을 CSV 파일로 내려받을 수 있게 했다. 일반 직원(staff)은 403 을 받는다. 응답 앞에 BOM 을 붙여서 엑셀에서 한글이 깨지지 않게 했다.

주문을 500건씩 읽어서 바로 응답에 쓰므로 전체를 메모리에 올리지 않는다. 조건에 맞는 주문이 10,000건(EXPORT_ROW_LIMIT)을 넘으면 기간을 줄이라는 안내와 함께 400 을 반환한다.

통합 테스트에서 정상 응답, 1만 건 초과 시 400, staff 의 403 을 확인했다.
````

</td>
</tr>
</table>

</details>

<details>
<summary>3번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

````text
주문 목록 CSV 내보내기 API 추가

GET /orders/export 엔드포인트를 추가해 기간과 상태로 조회한 주문을
CSV 파일로 내려받을 수 있게 한다. admin, manager 권한만 사용할 수 있다.

- 주문을 500건씩 나누어 읽으며 바로 응답 스트림에 쓰므로 전체
  데이터를 메모리에 올리지 않는다.
- 엑셀에서 한글이 깨지지 않도록 응답 앞에 BOM 을 붙인다.
- 한 번에 내보낼 수 있는 주문은 EXPORT_ROW_LIMIT(10,000건)까지이며,
  초과하면 400 으로 응답하고 기간을 줄이도록 안내한다.
- 기간 내 주문, 건수 초과, staff 권한 거부에 대한 통합 테스트를
  추가한다.
````

</td>
<td valign="top">

````text
주문 목록 CSV 내보내기 API 추가

GET /orders/export 엔드포인트를 추가했습니다. admin 및 manager 역할만 호출할 수 있으며, 조회 기간(from, to)과 상태(status)로 대상 주문을 지정합니다.

- 대상 주문이 EXPORT_ROW_LIMIT(10,000건)을 초과하면 400 오류로 응답하고 기간을 줄이도록 안내합니다.
- 주문을 500건씩 읽어 스트리밍 방식으로 응답하므로 전체 주문을 메모리에 올리지 않습니다.
- 엑셀에서 한글이 깨지지 않도록 응답 앞에 UTF-8 BOM을 붙입니다.
- OrdersService에 count와 streamCsv를 추가했습니다.
- 통합 테스트에서 정상 응답, 건수 초과 시 400, 일반 직원의 403 응답을 검증합니다.
````

</td>
<td valign="top">

````text
feature: 기간별 주문을 CSV 파일로 내보내는 API 를 추가

주문을 기간과 상태로 조회해서 CSV 파일로 내려받을 수 있도록
GET /orders/export 를 추가했다. admin 과 manager 역할만 호출할 수 있고
staff 는 403 을 받는다.

내보낼 주문이 10,000건(EXPORT_ROW_LIMIT)을 넘으면 400 으로 응답해서
기간을 줄이도록 안내한다. 주문은 500건씩 읽어서 응답에 바로 쓰므로 전체를
메모리에 올리지 않으며, 엑셀에서 한글이 깨지지 않도록 BOM 을 앞에 붙였다.
````

</td>
</tr>
</table>

</details>

<details>
<summary>다른 비교에 들어가는 조건의 출력 (줄이기 전, 예시 2개)</summary>

1번째 생성

<table>
<tr><th width="50%">줄이기 전</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

````text
feature: 관리자와 매니저가 주문을 CSV 로 내보내는 API 를 추가

주문 내역을 파일로 내려받을 방법이 없어서 admin 과 manager 권한으로
GET /orders/export 를 호출하면 기간 안의 주문을 CSV 로 내려받을 수
있게 했다.

조회 대상이 10,000건(EXPORT_ROW_LIMIT)을 넘으면 400 을 반환해서 기간을
줄이도록 안내하고, 주문을 500건씩 읽어서 응답에 바로 쓰기 때문에 전체
주문을 메모리에 올리지 않는다. 엑셀에서 한글이 깨지지 않도록 응답
맨 앞에 BOM 을 붙였다. 통합 테스트로 정상 응답과 1만 건 초과 시의 400,
staff 권한의 403 을 확인한다.
````

</td>
<td valign="top">

````text
feature: 기간별 주문을 CSV 파일로 내보내는 API 를 추가

주문 목록 API 는 페이지 크기가 최대 100건이라 기간 단위로 주문을 한 번에
내려받을 수 없었다. 기간과 상태로 조회한 주문을 CSV 로 응답하는
GET /orders/export 를 추가했다.

admin 과 manager 역할만 호출할 수 있고 staff 는 403 을 받는다. 조회 결과가
10,000건을 넘으면 400 을 반환해서 기간을 줄이도록 안내한다. 주문은 500건씩
읽어서 응답에 바로 쓰므로 전체를 메모리에 올리지 않는다. 엑셀에서 한글이
깨지지 않도록 응답 맨 앞에 BOM 을 붙였다.
````

</td>
</tr>
</table>

2번째 생성

<table>
<tr><th width="50%">줄이기 전</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

````text
feature: 주문을 CSV 파일로 내보내는 API를 추가

관리자 화면에서 기간별 주문을 파일로 내려받을 수 있도록 GET /orders/export
엔드포인트를 추가했다. admin 과 manager 역할만 호출할 수 있고 일반 직원
(staff)이 호출하면 403 을 반환한다.

주문을 500건씩 읽어서 응답에 바로 쓰므로 전체 주문을 메모리에 올리지
않는다. 조건에 맞는 주문이 10,000건(EXPORT_ROW_LIMIT)을 넘으면 400 을
반환하고 기간을 줄이라는 안내 문구를 표시한다. 엑셀에서 한글이 깨지지
않도록 응답 맨 앞에 BOM 을 붙인다.

기간 안의 주문 응답, 1만 건 초과 시 400, staff 의 403 을 확인하는
통합 테스트도 함께 추가했다.
````

</td>
<td valign="top">

````text
feature: 관리자와 매니저가 기간별 주문을 CSV 로 내려받는 API 를 추가

주문 목록 API 는 페이지 단위로만 조회할 수 있어서 기간 전체의 주문을 파일로
받을 수 없었다. GET /orders/export 를 추가해서 admin 과 manager 역할이 기간
안의 주문을 CSV 로 내려받을 수 있게 했다. staff 역할의 요청은 403 으로 거절된다.

한 번에 내보낼 수 있는 주문은 10,000건까지로 제한했고, 이를 넘으면 기간을
줄이라는 안내와 함께 400 을 반환한다. 주문은 500건씩 읽어서 바로 응답에 쓰므로
전체를 메모리에 올리지 않으며, 엑셀에서 한글이 깨지지 않도록 응답 맨 앞에
BOM 을 붙였다.
````

</td>
</tr>
</table>

3번째 생성

<table>
<tr><th width="50%">줄이기 전</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

````text
feature: 주문을 CSV 파일로 내보내는 API를 추가

관리자와 매니저가 기간을 지정해서 주문을 CSV 파일로 내려받을 수 있도록
GET /orders/export 엔드포인트를 추가했다. staff 권한으로 요청하면 403 을
반환한다.

주문을 500건씩 읽어서 응답 스트림에 바로 쓰므로 전체 주문을 메모리에
올리지 않는다. 한 번에 내보낼 수 있는 주문은 10,000건까지이고, 이를
초과하면 기간을 줄이라는 안내와 함께 400 을 반환한다. 엑셀에서 한글이
깨지지 않도록 응답 맨 앞에 BOM 을 붙였다. 기간 내 조회, 건수 초과, 권한
부족의 세 경우는 통합 테스트로 확인한다.
````

</td>
<td valign="top">

````text
feature: 기간별 주문을 CSV 파일로 내보내는 API 를 추가

admin 권한이나 manager 권한을 가진 사용자가 기간을 지정해서 주문 내역을 CSV 로 내려받을 수 있도록 GET /orders/export 를 추가했다. 응답 앞에 BOM 을 붙여서 엑셀에서 한글이 깨지지 않게 했다.

한 번에 내보낼 수 있는 주문은 10,000건까지로 제한했고 이를 넘으면 기간을 줄이라는 안내와 함께 400 을 반환한다. 주문은 500건씩 나누어 읽어서 응답에 바로 쓰기 때문에 전체를 메모리에 올리지 않는다. 일반 직원(staff)은 403 을 받는다.
````

</td>
</tr>
</table>

</details>

## 11-pr-feature-reminder-hours: 매장별 예약 알림 시간 설정 기능의 PR

갈래: PR 제목과 본문

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

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 기본 | 6.0 | 1.67 |
| fluent-korean | 4.7 | 2.17 |
| 우리 스킬 | 0.0 | 2.17 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

예약 알림 시간을 매장별로 설정할 수 있게 변경 (1~72시간, 기본 24시간)

## 배경

지금은 모든 매장에서 예약 24시간 전에 알림 문자가 나갑니다. 당일 예약이 많은 매장 12곳이 "24시간 전 알림은 의미가 없고 2~3시간 전에 보내고 싶다"고 요청했습니다. (#87)

## 변경 내용

- **알림 시간 설정**: 매장 관리자가 설정 화면에서 알림 시간을 1~72시간 중에서 고를 수 있습니다. 기본값은 기존과 같은 24시간이라 설정을 바꾸지 않은 매장은 동작이 달라지지 않습니다.
- **DB 마이그레이션**
  - `stores.reminder_hours_before` (INTEGER, NOT NULL, 기본 24)
  - `reservations.reminder_sent_at` (TIMESTAMPTZ, null 허용)
  - 미발송 예약 조회용 부분 인덱스
- **스케줄러**: 하루 한 번 09:00 실행에서 10분마다 실행으로 바꿨습니다. "지금부터 알림 시간 안에 시작하는 예약 중 아직 알림을 보내지 않은 것"을 찾아 보내고, 발송 후 `reminder_sent_at`을 기록합니다.
- **발신 번호 환경 변수화**: 코드에 박아 두었던 발신 번호를 `SMS_SENDER_ID`로 뺐습니다. 값은 숫자 8~11자리여야 합니다.
- **입력 검증**: `reminderHoursBefore`는 서버에서도 정수 1~72로 검증합니다.

## 배포 전 확인

- **`SMS_SENDER_ID`를 먼저 설정해야 합니다.** 값이 없거나 형식이 맞지 않으면 서버가 시작할 때 오류를 내고 멈춥니다. 기존 코드에 있던 번호(`0212345678`)를 그대로 넣으면 발신 동작은 이전과 같습니다.
- **배포 직후 중복 발송 가능성이 있습니다.** 마이그레이션이 기존 예약의 `reminder_sent_at`을 채우지 않아서, 이미 09:00 배치로 알림을 받은 예약(시작까지 24시간 이내)도 "미발송"으로 보여 한 번 더 나갈 수 있습니다. 배포 전에 기존 예약의 `reminder_sent_at`을 채우는 백필을 하거나, 그대로 둘지 결정이 필요합니다.

## 테스트

- 통합 테스트 23개 통과 (이번에 추가한 6개 포함)
- 스테이징에서 알림 시간을 2시간으로 바꾼 매장에 예약을 넣고, 문자 발송 기록이 예약 2시간 전에 생기는 것을 확인했습니다.
- **확인하지 못한 것**: 스테이징은 문자 발송을 모의(mock)로 처리하기 때문에 실제 통신사 발송은 확인하지 못했습니다. 배포 후 실제 문자가 수신되는지 한 번 확인해야 합니다.

</td>
<td valign="top">

매장별 예약 알림 시간 설정 기능 추가 (#87)

## 변경 배경

현재 예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송됩니다. 매장 12곳이 당일 예약이 많아 24시간 전 알림은 효과가 없다고 요청하여, 2~3시간 전에 보낼 수 있도록 개선했습니다. 이슈 #87을 해결하는 PR입니다.

## 변경 내용

- 매장 관리자가 설정 화면에서 알림 시간을 1~72시간 범위로 선택할 수 있습니다. 기본값은 기존과 같은 24시간이므로, 설정을 바꾸지 않은 매장의 동작은 달라지지 않습니다.
- 알림 스케줄러의 실행 주기를 하루 한 번(09:00)에서 10분마다로 변경했습니다. 실행될 때마다 알림 시간 안에 시작하면서 아직 알림이 발송되지 않은 예약을 조회하여 문자를 보냅니다. 발송이 끝나면 해당 예약에 발송 시각을 기록하여 중복 발송을 방지합니다.
- 문자 발신 번호를 코드에 직접 작성했던 방식에서 환경 변수 `SMS_SENDER_ID`로 분리했습니다. 이 값은 8~11자리 숫자여야 하며, 값이 없거나 형식이 맞지 않으면 서버가 시작할 때 오류를 출력하고 종료됩니다.

## DB 마이그레이션

- `stores.reminder_hours_before`: 정수 컬럼이며 기본값은 24입니다.
- `reservations.reminder_sent_at`: 알림 발송 시각을 기록하는 컬럼입니다.
- `reservations_reminder_idx`: 알림이 발송되지 않은 예약만 대상으로 `starts_at`에 생성한 부분 인덱스입니다. 10분마다 실행되는 조회의 부담을 줄이기 위해 추가했습니다.

## 배포 전 확인 사항

- 배포 전에 모든 환경에 `SMS_SENDER_ID`를 설정해야 합니다. 기존 코드에 작성되어 있던 발신 번호를 그대로 사용하려면 해당 번호를 값으로 입력하면 됩니다.
- 마이그레이션에는 기존 예약의 `reminder_sent_at`을 채우는 작업이 포함되어 있지 않습니다. 따라서 기존 방식으로 이미 알림을 받은 예약 중 아직 시작하지 않은 건이 배포 직후 첫 실행에서 다시 발송될 가능성이 있습니다. 리뷰하실 때 이 부분의 처리 방침(배포 전 일괄 기록 등)을 함께 검토해 주시기 바랍니다.

## 테스트

확인한 내용은 다음과 같습니다.

- 통합 테스트 23개가 모두 통과했습니다. 이번에 새로 작성한 6개가 포함되어 있습니다.
- 스테이징에서 알림 시간을 2시간으로 변경한 매장에 예약을 등록했고, 문자 발송 기록이 예약 2시간 전에 생성되는 것을 확인했습니다.

확인하지 못한 내용은 다음과 같습니다.

- 스테이징은 문자 발송을 모의(mock)로 처리하기 때문에, 실제 통신사를 통한 발송은 확인하지 못했습니다. 배포 후 실제 발송 여부를 별도로 확인해야 합니다.

## 주요 변경 파일

- `prisma/migrations/20261121_add_reminder_hours_before/migration.sql`
- `src/config/env.ts`
- `src/sms/sms.client.ts`
- `src/reminders/reminder.scheduler.ts`
- `src/stores/dto/update-store-settings.dto.ts`
- `web/src/pages/store-settings/ReminderSection.tsx` (신규)
- `test/reminders.integration.spec.ts`

</td>
<td valign="top">

feature: 매장별 예약 알림 시간을 설정하는 기능을 추가

## 작업 배경

예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송되었습니다. 당일 예약이 많은 매장 12곳이 24시간 전 알림은 의미가 없으니 2시간에서 3시간 전에 보내고 싶다고 요청해서 이 변경이 필요해졌습니다 (이슈 #87).

## 변경 사항

- **매장 관리자가 설정 화면에서 알림 시간을 고를 수 있습니다**: 예약 몇 시간 전에 알림을 보낼지 1시간에서 72시간 사이로 선택하며, 기본값은 기존과 같은 24시간입니다. 서버의 설정 DTO에서도 같은 범위를 검증합니다.
- **알림 문자가 매장별 설정 시간에 맞춰 발송됩니다**: 스케줄러가 하루에 한 번 09:00 에 실행되던 방식에서 10분마다 실행되는 방식으로 바뀌었습니다. 지금부터 알림 시간 안에 시작하는 예약 가운데 아직 알림을 보내지 않은 예약을 찾아 발송하고, 발송한 시각을 기록해서 같은 예약에 다시 보내지 않습니다.
- **문자 발신 번호를 환경 변수 `SMS_SENDER_ID` 로 받습니다**: 코드에 고정되어 있던 발신 번호를 환경 변수로 옮겼고, 숫자 8자리에서 11자리만 허용합니다. 이 값이 없으면 서버가 시작할 때 오류를 내고 멈춥니다.
- **그 밖에**: 설정 화면에 알림 시간 선택 영역(`ReminderSection`)을 추가했고, 통합 테스트 6개를 새로 작성했습니다.

## 배포 참고 사항

- 배포하기 전에 모든 환경에 `SMS_SENDER_ID` 를 설정해야 합니다. 설정하지 않으면 서버가 시작되지 않습니다.
- 마이그레이션이 `stores.reminder_hours_before` (기본값 24)와 `reservations.reminder_sent_at` 컬럼, 그리고 아직 알림을 보내지 않은 예약만 대상으로 하는 인덱스를 추가합니다.
- 기존 예약은 `reminder_sent_at` 이 비어 있어서, 배포 직후 첫 실행에서 이전 방식으로 이미 알림을 받은 예약에도 문자가 한 번 더 나갈 수 있습니다.

## 확인 사항

- [x] 통합 테스트 23개 통과 (새로 작성한 6개 포함)
- [x] 스테이징에서 알림 시간을 2시간으로 바꾼 매장에 예약을 넣고, 문자 발송 기록이 예약 2시간 전에 생기는 것을 직접 확인
- [ ] 실제 통신사 발송: 스테이징은 문자 발송을 모의(mock)로 처리하므로 확인하지 못했습니다. 배포한 뒤에 확인해야 합니다.
- [ ] 기존 예약에 대한 중복 발송: 위 배포 참고 사항의 동작은 코드만 보고 판단했고 직접 실행해 보지 않았습니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

예약 알림 시간을 매장별로 설정할 수 있도록 변경 (#87)

## 배경

지금은 모든 매장에서 예약 24시간 전에 알림 문자가 나갑니다. 매장 12곳이 당일 예약이 많아 24시간 전 알림은 의미가 없으니 2~3시간 전에 보내고 싶다고 요청했습니다 (#87).

## 변경 내용

- 매장 관리자가 설정 화면에서 알림 시간을 1~72시간 사이로 고를 수 있습니다. 기본값은 기존과 같은 24시간입니다.
  - `stores.reminder_hours_before` 컬럼을 추가했습니다 (`NOT NULL DEFAULT 24`).
  - 설정 DTO에서 `@Min(1) @Max(72)`로 범위를 검증합니다.
  - 설정 화면은 `ReminderSection.tsx`(새 파일)입니다.
- 알림 스케줄러를 바꿨습니다.
  - 기존에는 매일 09:00에 한 번 돌면서 24~48시간 뒤 시작하는 예약을 찾았습니다.
  - 이제 10분마다 돌면서 "지금부터 매장의 알림 시간 안에 시작하는 예약 중 아직 알림을 보내지 않은 것"을 찾아 보냅니다.
  - 발송 여부는 `reservations.reminder_sent_at`에 기록하고, 미발송 예약 조회용 부분 인덱스를 추가했습니다.
- 문자 발신 번호를 코드에 박아 둔 값에서 환경 변수 `SMS_SENDER_ID`로 옮겼습니다. 숫자 8~11자리만 허용합니다.

## 배포 전 확인 사항

- **`SMS_SENDER_ID`를 반드시 먼저 설정해야 합니다.** 값이 없거나 형식이 맞지 않으면 서버가 시작할 때 오류를 내고 멈춥니다. 기존 코드에 있던 번호를 각 환경에 등록해 주세요.
- **마이그레이션 시 기존 예약의 `reminder_sent_at`은 모두 NULL입니다.** 이 PR에는 기존 예약에 대한 백필이 없습니다. 배포 직후 첫 실행에서, 이미 예전 방식으로 알림을 받은 예약 중 24시간 안에 시작하는 것에 알림이 한 번 더 나갈 수 있습니다. 배포 전에 이미 알림을 보낸 예약을 백필할지 검토가 필요합니다.

## 확인한 것

- 통합 테스트 23개 통과 (새로 쓴 6개 포함)
- 스테이징에서 알림 시간을 2시간으로 바꾼 매장에 예약을 넣고, 문자 발송 기록이 예약 2시간 전에 생기는 것을 확인했습니다.

## 확인하지 못한 것

- 스테이징은 문자 발송을 mock으로 처리해서 실제 통신사를 통한 발송은 확인하지 못했습니다. 새 `SMS_SENDER_ID` 값으로 실제 문자가 나가는지는 운영 배포 후 확인이 필요합니다.

</td>
<td valign="top">

매장별로 예약 알림 시간을 설정할 수 있도록 변경

## 배경

현재 예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송됩니다. 당일 예약이 많은 매장 12곳이 "24시간 전 알림은 의미가 없고 2~3시간 전에 보내고 싶다"고 요청했습니다. 관련 이슈는 #87입니다.

## 변경 사항

- 매장 관리자가 설정 화면에서 알림 시간을 1~72시간 사이로 선택할 수 있습니다. 기본값은 기존과 같은 24시간이므로, 설정을 바꾸지 않은 매장의 동작은 달라지지 않습니다.
- 스케줄러가 하루에 한 번 09:00에 실행되던 방식에서 10분마다 실행되는 방식으로 바뀌었습니다. 실행될 때마다 지금부터 알림 시간 안에 시작하는 예약 중 알림을 보내지 않은 예약을 찾아 발송합니다.
- 발송을 마친 예약에는 `reminder_sent_at`을 기록해서, 같은 예약에 알림이 반복해서 나가지 않도록 했습니다.
- 코드에 고정되어 있던 문자 발신 번호를 환경 변수 `SMS_SENDER_ID`로 분리했습니다. 이 값이 없거나 숫자 8~11자리 형식이 아니면 서버가 시작할 때 오류를 내고 종료됩니다.

## DB 마이그레이션

- `stores.reminder_hours_before` 컬럼을 추가했습니다. 기본값은 24이고 NOT NULL입니다.
- `reservations.reminder_sent_at` 컬럼을 추가했습니다.
- 알림을 아직 보내지 않은 예약만 대상으로 하는 부분 인덱스 `reservations_reminder_idx`를 추가했습니다.

## 배포 전 확인할 사항

- 배포하기 전에 모든 환경에 `SMS_SENDER_ID`를 설정해야 합니다. 기존 코드에 있던 발신 번호는 `0212345678`이므로, 같은 번호를 유지하려면 이 값을 그대로 넣으면 됩니다.
- 마이그레이션이 기존 예약의 `reminder_sent_at`을 채우지 않습니다. 이전 스케줄러가 이미 알림을 보낸 예약도 값이 비어 있으므로, 배포 직후 이런 예약에 알림이 한 번 더 나갈 수 있습니다. 이 가능성은 diff에 포함되지 않은 `findDueForReminder`의 조회 조건에 달려 있어서, 리뷰할 때 함께 확인해 주시면 좋겠습니다. 필요하다면 배포 전에 기존 예약에 대해 값을 채우는 작업을 추가하겠습니다.

## 테스트

확인한 내용은 다음과 같습니다.

- 통합 테스트 23개가 모두 통과했습니다. 이번 PR에서 새로 작성한 테스트 6개가 포함되어 있습니다.
- 스테이징에서 알림 시간을 2시간으로 바꾼 매장에 예약을 등록했고, 예약 2시간 전에 문자 발송 기록이 생성되는 것을 확인했습니다.

확인하지 못한 내용은 다음과 같습니다.

- 스테이징은 문자 발송을 모의(mock)로 처리하기 때문에, 실제 통신사를 통한 발송은 확인하지 못했습니다. 운영에 배포한 직후에 실제 문자가 수신되는지 확인해야 합니다.

## 주요 변경 파일

- `prisma/migrations/20261121_add_reminder_hours_before/migration.sql`
- `src/config/env.ts`
- `src/sms/sms.client.ts`
- `src/reminders/reminder.scheduler.ts`
- `src/stores/dto/update-store-settings.dto.ts`
- `web/src/pages/store-settings/ReminderSection.tsx` (새 파일)
- `test/reminders.integration.spec.ts`

</td>
<td valign="top">

feature: 매장 관리자가 예약 알림 시간을 설정하는 기능을 추가

## 작업 배경

예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송되었는데, 당일 예약이 많은 매장 12곳이 24시간 전 알림은 의미가 없으니 2~3시간 전에 보낼 수 있게 해 달라고 요청했습니다. 요청 내용은 #87 에 있습니다.

## 변경 사항

- **매장 관리자가 설정 화면에서 알림 시간을 1~72시간 사이로 선택할 수 있습니다**: 기본값은 기존과 같은 24시간이며, 서버는 1~72 범위를 벗어난 값을 허용하지 않습니다.
- **예약 알림이 매장별 설정 시간에 맞춰 발송됩니다**: 스케줄러가 매일 09:00 에 한 번 실행되던 방식에서 10분마다 실행되는 방식으로 바뀌었고, 지금부터 알림 시간 안에 시작하는 예약 가운데 아직 알림을 보내지 않은 예약을 찾아 발송합니다. 발송하면 그 시각을 예약에 기록하므로 이미 알림을 보낸 예약은 다음 실행에서 제외됩니다.
- **문자 발신 번호를 환경 변수 `SMS_SENDER_ID` 에서 읽습니다**: 코드에 직접 적어 두었던 번호를 제거했고, 값은 숫자 8~11자리여야 합니다.

## 배포 참고 사항

- 배포하기 전에 환경 변수 `SMS_SENDER_ID` 를 설정해야 합니다. 값이 없거나 형식이 맞지 않으면 서버가 시작할 때 오류를 내고 멈춥니다. 기존 발신 번호를 그대로 사용하려면 코드에 있던 번호를 같은 값으로 설정하면 됩니다.
- 마이그레이션이 `stores.reminder_hours_before`(기본값 24)와 `reservations.reminder_sent_at` 컬럼, 그리고 아직 알림을 보내지 않은 예약을 조회하는 인덱스를 추가합니다.
- 기존 예약은 `reminder_sent_at` 이 비어 있으므로, 이전 방식으로 이미 알림을 받은 예약 가운데 시작까지 24시간이 남지 않은 건에는 배포 직후 첫 실행에서 알림이 한 번 더 발송될 수 있습니다.

## 확인 사항

- [x] 통합 테스트 23개 통과(새로 작성한 6개 포함)
- [x] 스테이징에서 알림 시간을 2시간으로 변경한 매장에 예약을 만들고, 문자 발송 기록이 예약 2시간 전에 생기는 것을 직접 확인
- [ ] 실제 통신사 발송: 스테이징은 문자 발송을 모의(mock)로 처리하므로 확인하지 못했습니다. 배포한 뒤 확인이 필요합니다

</td>
</tr>
</table>

</details>

<details>
<summary>3번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

매장별 예약 알림 시간을 1~72시간으로 설정할 수 있도록 변경

## 배경

매장 12곳에서 "당일 예약이 많아 24시간 전 알림은 의미가 없고, 2~3시간 전에 보내고 싶다"는 요청이 있었습니다 (#87). 지금은 모든 매장이 예약 24시간 전에 알림 문자를 보냅니다.

## 변경 내용

- 매장 관리자가 설정 화면에서 알림 시간을 1~72시간 사이로 고를 수 있습니다. 기본값은 기존과 같은 24시간입니다.
- `stores.reminder_hours_before` 컬럼과 `reservations.reminder_sent_at` 컬럼을 추가했습니다. 미발송 예약 조회용 부분 인덱스도 함께 만들었습니다.
- 스케줄러를 하루 한 번(09:00)에서 10분마다 실행하도록 바꿨습니다. 실행할 때마다 "지금부터 해당 매장의 알림 시간 안에 시작하는 예약 중 아직 알림을 보내지 않은 것"을 찾아 보내고, 발송 후 `reminder_sent_at`을 기록합니다.
- 문자 발신 번호를 코드에 고정해 두었던 것을 환경 변수 `SMS_SENDER_ID`로 옮겼습니다.

## 배포 전 확인 사항

- **`SMS_SENDER_ID` 환경 변수를 먼저 설정해야 합니다.** 값이 없거나 숫자 8~11자리 형식이 아니면 서버가 시작할 때 오류를 내고 멈춥니다. 기존 발신 번호는 코드에 있던 값이므로, 운영 환경에도 같은 번호를 넣어 주세요.
- 마이그레이션이 포함되어 있습니다. 기존 매장은 모두 기본값 24시간으로 채워집니다.

## 테스트

- 통합 테스트 23개 통과 (새로 작성한 6개 포함)
- 스테이징에서 알림 시간을 2시간으로 바꾼 매장에 예약을 넣고, 예약 2시간 전에 문자 발송 기록이 생기는 것을 확인했습니다.
- **확인하지 못한 것:** 스테이징은 문자 발송을 모의(mock)로 처리하기 때문에 실제 통신사를 통한 발송은 확인하지 못했습니다. 배포 후 실제 문자가 도착하는지 한 번 봐 주세요.

## 리뷰어가 볼 만한 부분

- 스케줄러가 문자를 보낸 뒤에 `markReminderSent`를 호출하므로, 발송 직후 프로세스가 죽으면 다음 실행에서 같은 문자가 한 번 더 나갈 수 있습니다. 발송 전에 표시하면 반대로 누락될 수 있어 지금은 중복 쪽을 택했는데, 이 선택이 괜찮은지 의견 부탁드립니다.
- 스케줄러가 10분마다 돌기 때문에 알림은 설정한 시각보다 최대 10분 늦게 나갈 수 있습니다.

</td>
<td valign="top">

매장별 예약 알림 시간 설정 기능 추가 (#87)

## 배경

매장 12곳이 "당일 예약이 많아서 24시간 전 알림은 의미가 없으니 2~3시간 전에 보내고 싶다"고 요청했습니다 (#87). 지금은 모든 매장에서 예약 24시간 전에 알림 문자가 발송됩니다. 이 PR은 매장 관리자가 알림 시간을 직접 설정할 수 있도록 변경합니다.

## 변경 내용

- 매장 설정 화면에서 알림 시간을 1~72시간 사이로 선택할 수 있습니다. 기본값은 기존과 같은 24시간이므로, 설정을 바꾸지 않은 매장의 동작은 달라지지 않습니다.
- `stores.reminder_hours_before` 컬럼과 `reservations.reminder_sent_at` 컬럼을 추가하는 마이그레이션이 포함되어 있습니다. 알림을 아직 보내지 않은 예약을 빠르게 조회할 수 있도록 부분 인덱스도 함께 생성합니다.
- 스케줄러의 실행 주기를 하루 한 번(09:00)에서 10분 간격으로 변경했습니다. 실행될 때마다 각 매장의 알림 시간 안에 시작하고 아직 알림을 보내지 않은 예약을 조회해 문자를 발송하며, 발송 직후 `reminder_sent_at`을 기록합니다.
- 문자 발신 번호를 환경 변수 `SMS_SENDER_ID`로 분리했습니다. 기존에는 코드에 고정되어 있었습니다.
- 알림 시간 입력값은 서버에서 1 이상 72 이하의 정수인지 검증합니다.

## 배포 시 주의 사항

- 모든 환경에 `SMS_SENDER_ID`를 설정해야 합니다. 값이 없거나 숫자 8~11자리 형식이 아니면 서버가 시작 단계에서 오류를 내고 종료됩니다. 기존 코드에 있던 발신 번호는 `0212345678`이므로, 같은 번호를 계속 사용하려면 이 값을 그대로 설정하면 됩니다.
- 마이그레이션 직후에는 기존 예약의 `reminder_sent_at`이 모두 비어 있습니다. 이전 방식으로 이미 알림을 받은 예약이 배포 직후 한 번 더 발송될 가능성이 있으므로, 배포 전에 기존 예약의 처리 방식을 확인해 주시기 바랍니다.
- 문자 발송 후 `reminder_sent_at`을 기록하기까지 별도의 트랜잭션이 없습니다. 기록에 실패하면 다음 실행 시 같은 예약에 문자가 다시 발송될 수 있습니다.

## 테스트

확인한 내용:

- 통합 테스트 23개가 모두 통과했습니다. 이번에 새로 작성한 테스트 6개가 포함되어 있습니다.
- 스테이징에서 알림 시간을 2시간으로 변경한 매장에 예약을 등록했고, 문자 발송 기록이 예약 2시간 전에 생성되는 것을 확인했습니다.

확인하지 못한 내용:

- 스테이징은 문자 발송을 모의(mock)로 처리하기 때문에, 실제 통신사를 통한 발송은 확인하지 못했습니다. 운영 배포 후 알림 시간을 변경한 매장에서 실제 수신 여부를 확인해야 합니다.

</td>
<td valign="top">

feature: 매장 관리자가 예약 알림 문자의 발송 시간을 설정할 수 있게 함

## 작업 배경

예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송되는데, 당일 예약이 많은 매장 12곳이 24시간 전 알림은 의미가 없으니 2시간에서 3시간 전에 보내 달라고 요청했습니다 (#87).

## 변경 사항

- **매장 관리자가 알림 시간을 1시간에서 72시간 사이로 설정할 수 있습니다**: 매장 설정 화면에 알림 시간 항목을 추가했습니다. 기본값은 기존과 같은 24시간이라서 설정하지 않은 매장은 동작이 달라지지 않습니다.
- **알림 문자가 매장별로 설정한 시간에 맞춰 발송됩니다**: 스케줄러를 하루 한 번 09:00 에 실행하던 방식에서 10분마다 실행하는 방식으로 변경했습니다. 실행할 때마다 지금부터 매장의 알림 시간 안에 시작하는 예약 가운데 아직 알림을 보내지 않은 예약을 찾아 발송하며, 발송한 예약에는 발송 시각을 기록해서 같은 예약에 다시 발송하지 않습니다.
- **문자 발신 번호를 환경 변수 `SMS_SENDER_ID` 에서 읽습니다**: 코드에 고정되어 있던 발신 번호를 환경 변수로 옮겼습니다. 값이 없거나 8자리에서 11자리 사이의 숫자가 아니면 서버가 시작할 때 오류가 발생하며 종료됩니다.

## 배포 참고 사항

- 배포하기 전에 모든 환경에 `SMS_SENDER_ID` 를 설정해야 합니다. 기존에 코드에 고정되어 있던 발신 번호는 `0212345678` 입니다.
- 마이그레이션에서 `stores.reminder_hours_before` 열(기본값 24)과 `reservations.reminder_sent_at` 열, 아직 알림을 보내지 않은 예약을 조회하는 인덱스를 추가합니다. 기존 예약의 `reminder_sent_at` 은 비어 있는 상태로 추가됩니다.

## 확인 사항

- [x] 통합 테스트 23개 통과 (새로 작성한 6개 포함)
- [x] 스테이징에서 알림 시간을 2시간으로 변경한 매장에 예약을 넣고, 문자 발송 기록이 예약 2시간 전에 생기는 것을 확인
- [ ] 실제 통신사 발송: 스테이징은 문자 발송을 모의(mock)로 처리하므로 확인하지 못했습니다
- [ ] 배포한 뒤에 확인할 항목: 배포 전에 이미 알림을 받은 예약은 `reminder_sent_at` 이 비어 있으므로, 첫 스케줄러 실행에서 같은 예약에 알림이 다시 발송되지 않는지 확인해야 합니다

</td>
</tr>
</table>

</details>

<details>
<summary>다른 비교에 들어가는 조건의 출력 (줄이기 전, 예시 2개)</summary>

1번째 생성

<table>
<tr><th width="50%">줄이기 전</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

feature: 매장 관리자가 예약 알림 문자의 발송 시점을 설정할 수 있게 함

## 작업 배경

매장 12곳이 당일 예약이 많아서 24시간 전에 보내는 알림은 의미가 없으니 예약 2~3시간 전에 보내고 싶다고 요청했습니다(#87). 지금은 모든 매장에 예약 24시간 전 알림이 일괄 발송되고, 매장별로 시간을 바꿀 방법이 없습니다.

## 변경 사항

- **매장 관리자가 설정 화면에서 알림 시간을 1시간부터 72시간 사이로 고를 수 있습니다**: 설정 화면에 알림 시간 섹션을 추가했고, 서버는 1 이상 72 이하의 정수만 허용합니다. 기본값은 기존과 같은 24시간이라서 설정을 바꾸지 않은 매장은 동작이 달라지지 않습니다.
- **스케줄러가 10분마다 발송 대상을 확인합니다**: 기존에는 매일 09:00 에 한 번, 24시간에서 48시간 뒤에 시작하는 예약에 발송했습니다. 이제는 10분마다 지금부터 매장별 알림 시간 안에 시작하면서 아직 알림을 보내지 않은 예약을 찾아 발송하고, 발송한 뒤에는 예약에 발송 시각을 기록합니다. 실행 주기가 10분이라서 설정한 시간보다 최대 10분 늦게 발송될 수 있습니다.
- **문자 발신 번호를 환경 변수 SMS_SENDER_ID 에서 읽습니다**: 소스 코드에 고정해 두었던 번호를 제거했습니다. 값은 8자리에서 11자리 사이의 숫자여야 하며, 값이 없거나 형식이 맞지 않으면 서버가 시작할 때 오류를 내고 종료됩니다.
- 그 밖에: 알림을 보내지 않은 예약을 시작 시각으로 조회하는 부분 인덱스를 추가했습니다.

## 배포 참고 사항

- 배포하기 전에 모든 환경에 `SMS_SENDER_ID` 를 설정해야 합니다. 설정하지 않으면 서버가 시작되지 않습니다.
- 마이그레이션 `20261121_add_reminder_hours_before` 가 `stores.reminder_hours_before`(기본값 24)와 `reservations.reminder_sent_at`(값이 없어도 됨) 컬럼을 추가하므로, 기존 매장은 모두 24시간으로 설정됩니다.
- 이 마이그레이션은 기존 예약의 `reminder_sent_at` 을 채우지 않습니다. 이전 방식으로 이미 알림을 받은 예약 가운데 아직 시작하지 않은 예약에는, 배포 직후 스케줄러가 처음 실행될 때 문자가 한 번 더 발송될 수 있습니다.

## 확인 사항

- [x] 통합 테스트 23개가 통과했습니다(새로 작성한 6개 포함).
- [x] 스테이징에서 알림 시간을 2시간으로 바꾼 매장에 예약을 추가했고, 문자 발송 기록이 예약 2시간 전에 생기는 것을 확인했습니다.
- [ ] 실제 통신사 발송: 스테이징은 문자 발송을 모의(mock)로 처리하므로 확인하지 못했습니다.
- [ ] 배포 직후 기존 예약에 문자가 중복 발송되는지 여부: 확인하지 못했으며 배포한 뒤에 확인해야 합니다.

</td>
<td valign="top">

feature: 매장 관리자가 예약 알림 발송 시간을 설정할 수 있게 함

## 작업 배경

예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송되고 있었습니다. 당일 예약이 많은 매장 12곳이 24시간 전 알림은 의미가 없으니 2시간에서 3시간 전에 보내게 해 달라고 요청해서 이 변경이 필요해졌습니다. (#87)

## 변경 사항

- **매장 관리자가 설정 화면에서 알림 시간을 고를 수 있습니다**: 설정 화면에 알림 시간 항목을 추가했고, 1시간에서 72시간 사이의 값을 선택할 수 있습니다. 서버의 설정 DTO 도 같은 범위를 검증하며, 기본값은 기존과 같은 24시간이라 설정하지 않은 매장은 발송 시점이 달라지지 않습니다.
- **알림 스케줄러가 10분마다 실행됩니다**: 기존에는 매일 09:00 에 한 번 실행하며 24시간에서 48시간 뒤에 시작하는 예약에 발송했습니다. 이제는 10분마다 실행하면서 매장별 알림 시간 안에 시작하고 아직 알림을 보내지 않은 예약을 찾아 발송하고, 발송한 시각은 예약의 `reminder_sent_at` 에 기록합니다.
- **문자 발신 번호를 환경 변수 `SMS_SENDER_ID` 에서 읽습니다**: 코드에 고정되어 있던 발신 번호를 환경 변수로 옮겼고, 값은 8자리에서 11자리 사이의 숫자여야 합니다.

## 배포 참고 사항

- 마이그레이션 `20261121_add_reminder_hours_before` 를 적용해야 합니다. `stores.reminder_hours_before`(기본값 24)와 `reservations.reminder_sent_at` 컬럼, 아직 알림을 보내지 않은 예약을 조회하기 위한 인덱스가 추가됩니다.
- 배포하기 전에 모든 환경에 `SMS_SENDER_ID` 를 설정해야 합니다. 값이 없거나 형식이 맞지 않으면 서버가 시작할 때 오류를 내고 종료됩니다. 기존과 같은 발신 번호를 사용하려면 코드에 있던 `0212345678` 을 설정합니다.
- 기존 예약은 `reminder_sent_at` 이 비어 있으므로, 배포 전에 이미 알림을 받은 예약 가운데 알림 시간 안에 시작하는 예약은 중복해서 발송될 수 있습니다.

## 확인 사항

- [x] 통합 테스트 23개 통과 (새로 작성한 6개 포함)
- [x] 스테이징에서 알림 시간을 2시간으로 바꾼 매장에 예약을 넣고, 문자 발송 기록이 예약 2시간 전에 생기는 것을 직접 확인
- [ ] 실제 통신사 발송: 스테이징은 문자 발송을 모의(mock)로 처리하므로 확인하지 못했습니다

</td>
</tr>
</table>

2번째 생성

<table>
<tr><th width="50%">줄이기 전</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

feature: 매장 관리자가 예약 알림 시간을 1~72시간으로 설정하게 함

## 작업 배경

예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송되고, 스케줄러가 매일 09:00 에 한 번 실행되어 알림 시간을 매장별로 바꿀 수 없었습니다. 당일 예약이 많은 매장 12곳이 24시간 전 알림은 의미가 없으니 2~3시간 전에 보내 달라고 요청했습니다 (#87).

## 변경 사항

- **매장 관리자가 설정 화면에서 예약 알림 시간을 고를 수 있습니다**: 알림 시간을 1시간부터 72시간까지 선택하는 `ReminderSection` 을 매장 설정 화면에 추가했고, 설정 API(`update-store-settings.dto.ts`)는 `reminderHoursBefore` 값이 1~72 범위의 정수일 때에만 받습니다. 기본값은 기존과 같은 24시간입니다.
- **알림 문자가 매장별 알림 시간에 맞춰 발송됩니다**: 스케줄러를 하루 한 번 09:00 실행에서 10분마다 실행으로 변경했고, 지금부터 매장의 알림 시간 안에 시작하면서 아직 알림을 보내지 않은 예약을 찾아 발송합니다. 발송한 예약에는 `reminder_sent_at` 을 기록해서 같은 예약에 문자가 다시 발송되지 않게 했습니다.
- **문자 발신 번호를 환경 변수 `SMS_SENDER_ID` 에서 읽습니다**: 코드에 직접 작성했던 발신 번호를 환경 변수로 분리했고, 값이 8~11자리 숫자가 아니거나 없으면 서버가 시작할 때 오류를 내고 종료됩니다.
- **알림 발송 대상을 빠르게 조회할 수 있도록 DB 를 변경합니다**: `stores.reminder_hours_before`(기본값 24)와 `reservations.reminder_sent_at` 컬럼을 추가했고, 알림을 보내지 않은 예약만 대상으로 `starts_at` 부분 인덱스를 생성했습니다.
- 그 밖에: 통합 테스트 6개를 새로 작성했습니다.

## 배포 참고 사항

- 마이그레이션 `20261121_add_reminder_hours_before` 를 적용해야 합니다.
- 배포하기 전에 모든 환경에 `SMS_SENDER_ID` 를 설정해야 합니다. 기존에 코드에 작성되어 있던 발신 번호는 `0212345678` 이며 새 검증 규칙(8~11자리 숫자)을 통과합니다.
- 마이그레이션은 기존 예약의 `reminder_sent_at` 을 채우지 않으므로, 이전 방식으로 이미 알림을 받은 예약이 배포 직후 첫 실행에서 대상에 포함되어 문자가 다시 발송될 수 있습니다. 배포 전에 이 부분을 확인해야 합니다.
- 알림 시간 안에 이미 들어온 예약은 다음 스케줄러 실행(최대 10분 뒤)에 알림이 발송됩니다.

## 확인 사항

- [x] 통합 테스트 23개 통과 (새로 작성한 6개 포함)
- [x] 스테이징에서 알림 시간을 2시간으로 변경한 매장에 예약을 등록해서 문자 발송 기록이 예약 2시간 전에 생성되는 것을 확인
- [ ] 실제 통신사를 통한 문자 발송: 스테이징은 문자 발송을 모의(mock)로 처리하므로 확인하지 못했습니다. 운영에 배포한 뒤에 확인해야 합니다.
- [ ] 기존 예약에 알림이 중복 발송되는지 여부: 배포 참고 사항의 세 번째 항목에 해당하며 직접 확인하지 못했습니다.

</td>
<td valign="top">

feature: 매장 관리자가 예약 알림 시간을 1~72시간 사이로 설정할 수 있게 함

## 작업 배경

예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송되는데, 당일 예약이 많은 매장 12곳이 24시간 전 알림은 의미가 없으니 2~3시간 전에 보내고 싶다고 요청했습니다. 요청 내용은 #87 에 정리되어 있습니다.

## 변경 사항

- **매장 관리자가 설정 화면에서 알림 시간을 1~72시간 사이로 고를 수 있습니다**: 매장 설정 화면에 알림 시간 항목을 추가했고, 설정하지 않은 매장은 기존과 같이 24시간 전에 알림을 받습니다. API 에서도 1 미만이거나 72 초과인 값은 검증 단계에서 거부합니다.
- **알림 스케줄러가 10분마다 실행됩니다**: 기존에는 하루에 한 번 09:00 에 실행되었지만, 이제는 지금부터 각 매장의 알림 시간 안에 시작하는 예약 가운데 아직 알림을 보내지 않은 예약을 찾아 문자를 발송합니다. 발송한 예약에는 발송 시각을 기록해서 같은 예약에 문자가 다시 나가지 않게 합니다.
- **문자 발신 번호를 환경 변수 `SMS_SENDER_ID` 에서 읽습니다**: 코드에 고정되어 있던 발신 번호를 환경 변수로 옮겼고, 8~11자리 숫자가 아니면 서버가 시작할 때 검증 오류가 발생합니다.

## 배포 참고 사항

- 배포하기 전에 모든 환경에 `SMS_SENDER_ID` 를 설정해야 하며, 값이 없으면 서버가 시작할 때 오류를 내고 종료됩니다. 기존에 코드에 고정되어 있던 번호는 `0212345678` 입니다.
- 마이그레이션에서 `stores.reminder_hours_before`(기본값 24)와 `reservations.reminder_sent_at` 컬럼을 추가하고, 알림을 보내지 않은 예약을 조회하는 부분 인덱스를 생성합니다.
- 마이그레이션은 기존 예약의 `reminder_sent_at` 을 채우지 않으므로, 배포 직후 첫 실행에서 이미 기존 방식으로 알림을 받은 예약 중 앞으로 24시간 안에 시작하는 예약에 문자가 한 번 더 발송될 수 있습니다.

## 확인 사항

- [x] 통합 테스트 23개 통과(새로 작성한 6개 포함)
- [x] 스테이징에서 알림 시간을 2시간으로 변경한 매장에 예약을 추가하고, 예약 시작 2시간 전에 문자 발송 기록이 생성되는 것을 확인
- [ ] 실제 통신사를 통한 문자 발송: 스테이징은 문자 발송을 모의(mock)로 처리하기 때문에 확인하지 못했습니다

</td>
</tr>
</table>

3번째 생성

<table>
<tr><th width="50%">줄이기 전</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

feature: 매장 관리자가 예약 알림 시간을 1~72시간으로 설정할 수 있게 함

## 작업 배경

예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송되고 있었습니다. 매장 12곳이 당일 예약이 많아서 24시간 전 알림은 의미가 없으니 2~3시간 전에 보내고 싶다고 요청했습니다. (#87)

## 변경 사항

- **매장 관리자가 설정 화면에서 알림 시간을 1~72시간 사이로 선택할 수 있습니다**: `stores` 테이블에 `reminder_hours_before` 컬럼을 추가했고 기본값은 기존과 같은 24시간입니다. 설정 저장 API도 1 미만이거나 72를 초과하는 값을 같은 범위로 검증합니다.
- **알림 스케줄러가 10분마다 실행됩니다**: 하루에 한 번 09:00에 실행하던 방식에서 변경했습니다. 지금부터 매장별 알림 시간 안에 시작하는 예약 가운데 아직 알림을 보내지 않은 예약을 찾아 발송하고, 발송한 뒤에는 `reservations.reminder_sent_at`에 시각을 기록해서 같은 예약에 다시 발송하지 않습니다.
- **문자 발신 번호를 환경 변수 `SMS_SENDER_ID`에서 읽습니다**: 코드에 고정해 두었던 번호를 제거했습니다. 8~11자리 숫자가 아니거나 값이 없으면 서버가 시작할 때 오류를 내고 종료됩니다.
- 그 밖에: 설정 화면에 알림 시간 선택 영역(`ReminderSection`)을 추가했고, 통합 테스트 6개를 추가했습니다.

## 배포 참고 사항

- 배포하기 전에 모든 환경에 `SMS_SENDER_ID`를 설정해야 합니다. 기존에 코드에 고정되어 있던 번호는 `0212345678`이므로 같은 번호를 유지하려면 이 값을 설정합니다.
- 새 코드가 추가한 컬럼을 사용하므로 마이그레이션(`20261121_add_reminder_hours_before`)을 먼저 적용해야 합니다. 이 마이그레이션은 `stores.reminder_hours_before`(기본값 24)와 `reservations.reminder_sent_at`(NULL 허용) 컬럼을 추가하고, 알림을 보내지 않은 예약을 조회하는 부분 인덱스를 생성합니다.
- 마이그레이션은 기존 예약의 `reminder_sent_at`을 채우지 않으므로, 배포 전에 이미 알림을 받은 예약도 NULL 상태로 남습니다. 시작까지 24시간 이내로 남은 기존 예약에는 배포 직후 알림이 한 번 더 발송될 수 있습니다.

## 확인 사항

- [x] 통합 테스트 23개 통과 (새로 추가한 6개 포함)
- [x] 스테이징에서 알림 시간을 2시간으로 바꾼 매장에 예약을 넣고, 문자 발송 기록이 예약 2시간 전에 생기는 것을 확인
- [ ] 실제 통신사 발송: 스테이징은 문자 발송을 모의(mock)로 처리하므로 확인하지 못했습니다. 배포한 뒤에 확인합니다.
- [ ] 배포 직후 기존 예약에 알림이 중복 발송되는지 여부: 마이그레이션 적용 상태에서 확인하지 못했습니다. 배포한 뒤에 발송 기록으로 확인합니다.

</td>
<td valign="top">

feature: 매장별로 예약 알림 문자를 보낼 시간을 설정할 수 있게 함

## 작업 배경

예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송되었습니다. 그런데 당일 예약이 많은 매장 12곳에서 24시간 전 알림은 의미가 없으니 2~3시간 전에 보내고 싶다고 요청했습니다 (#87).

## 변경 사항

- **매장 관리자가 알림 시간을 설정할 수 있습니다**: 매장 설정 화면에서 예약 몇 시간 전에 알림을 보낼지 1시간에서 72시간 사이로 선택하며, 기본값은 기존과 같은 24시간입니다. 서버에서도 같은 범위를 검증합니다.
- **알림 문자가 매장별 알림 시간에 맞춰 발송됩니다**: 스케줄러가 매일 09:00 에 한 번 실행되던 방식에서 10분마다 실행되는 방식으로 바뀌었고, 지금부터 알림 시간 안에 시작하는 예약 가운데 아직 알림을 보내지 않은 예약을 찾아 문자를 보냅니다. 발송한 시각을 `reservations.reminder_sent_at` 에 기록하므로 같은 예약에는 알림이 다시 발송되지 않습니다.
- **문자 발신 번호를 환경 변수로 분리했습니다**: 코드에 고정되어 있던 발신 번호를 `SMS_SENDER_ID` 에서 읽습니다.

## 배포 참고 사항

- 배포하기 전에 모든 환경에 `SMS_SENDER_ID` 를 설정해야 합니다. 값이 없거나 8~11자리 숫자가 아니면 서버가 시작할 때 오류를 내고 멈춥니다.
- 마이그레이션이 `stores.reminder_hours_before`(기본값 24)와 `reservations.reminder_sent_at` 컬럼을 추가하고, 알림을 보내지 않은 예약을 조회하는 부분 인덱스를 생성합니다.
- 마이그레이션이 기존 예약의 `reminder_sent_at` 을 채우지 않으므로, 배포 전에 이전 방식으로 알림을 받은 예약도 알림 시간 안에 들어오면 문자가 한 번 더 발송될 수 있습니다.

## 확인 사항

- [x] 통합 테스트 23개 통과 (새로 작성한 6개 포함)
- [x] 스테이징에서 알림 시간을 2시간으로 바꾼 매장에 예약을 넣고, 문자 발송 기록이 예약 2시간 전에 생기는 것을 직접 확인
- [ ] 실제 통신사를 통한 문자 발송: 스테이징은 문자 발송을 모의(mock)로 처리하므로 확인하지 못했습니다

</td>
</tr>
</table>

</details>

## 12-pr-fix-cart-quantity: 장바구니 수량을 빠르게 누르면 합계가 틀리는 버그 수정의 PR

갈래: PR 제목과 본문

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

| 조건 | 규칙 위반 수 (3회 평균) | 블라인드 순위 평균 (1~3) |
| --- | --- | --- |
| 기본 | 4.7 | 1.33 |
| fluent-korean | 4.0 | 1.67 |
| 우리 스킬 | 0.0 | 3.00 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

장바구니 수량 연타 시 늦게 온 예전 응답이 화면을 덮어쓰는 문제 수정

## 배경

장바구니에서 수량 + 버튼을 빠르게 두 번 누르면, 화면 수량은 3인데 합계 금액은 2개 기준으로 남는 현상이 QA에서 제보되었습니다. (#131)

## 원인

버튼을 누를 때마다 `PATCH /cart/items/:id` 를 보내고, 응답으로 받은 장바구니로 화면 전체를 덮어쓰고 있었습니다. 첫 번째 요청의 응답이 두 번째 응답보다 늦게 도착하면, 늦게 온 예전 응답이 최신 상태를 덮어써서 수량과 합계가 어긋났습니다.

## 변경 내용

`useCartQuantity.ts` 에서 두 가지를 적용했습니다.

- 수량을 바꿀 때마다 이전 요청을 `AbortController` 로 취소합니다. 취소로 발생한 에러는 무시하고, 그 외 에러는 기존처럼 그대로 던집니다.
- 응답의 장바구니 `version` 이 화면이 가진 `version` 보다 낮으면 응답을 버립니다. 요청 취소가 늦어 응답이 이미 도착한 경우에도 예전 상태로 덮어쓰지 않도록 하는 안전장치입니다.

서버 변경은 없습니다. `version` 필드는 원래 응답에 포함되어 있었습니다.

## 테스트

- Playwright E2E 4개를 새로 추가했습니다.
  - 수량을 빠르게 두 번 올려도 합계가 맞는지
  - 첫 번째 응답이 두 번째 응답보다 늦게 와도 합계가 맞는지 (응답 순서 뒤집기)
  - 수량을 올렸다가 바로 내려도 합계가 맞는지
  - 요청이 실패하면 수량을 이전 값으로 되돌리고 오류를 보여 주는지
- 전체 E2E 212개가 통과했습니다.
- 크롬에서 네트워크를 Slow 3G 로 낮추고 + 버튼을 20번 눌러 보았고, 합계가 맞았습니다.

## 확인하지 못한 것

- **iOS 사파리**: 테스트 기기가 없어 확인하지 못했습니다. 가능하면 iOS 기기를 가진 분이 연타 동작을 한 번 확인해 주세요.

## 배포

DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.

</td>
<td valign="top">

장바구니 수량을 빠르게 두 번 누르면 합계가 어긋나는 문제를 수정합니다

## 배경

수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3으로 표시되는데, 합계 금액은 2개 기준 값으로 남는다는 제보가 QA에서 들어왔습니다.

Closes #131

## 원인

버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고, 응답으로 받은 장바구니로 화면 상태를 덮어쓰고 있었습니다. 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면, 오래된 응답이 최신 상태를 덮어써서 수량과 합계가 서로 맞지 않게 되었습니다.

## 변경 사항

- 수량을 변경할 때마다 이전 요청을 `AbortController`로 취소합니다.
- 응답에 포함된 장바구니 `version`이 화면이 가진 `version`보다 낮으면 그 응답을 버립니다.
- 취소로 발생한 오류는 무시하고, 그 외의 오류는 기존처럼 다시 던집니다.
- 서버는 변경하지 않았습니다. `version` 필드는 원래 응답에 포함되어 있었습니다.

수정한 파일은 `web/src/features/cart/useCartQuantity.ts`입니다.

## 테스트

- Playwright E2E 테스트를 4개 새로 작성했습니다.
  - 수량을 빠르게 두 번 올려도 합계가 맞는지 확인합니다.
  - 첫 번째 응답이 두 번째 응답보다 늦게 도착해도 합계가 맞는지 확인합니다. 응답 순서를 뒤집는 경우입니다.
  - 수량을 올렸다가 바로 내려도 합계가 맞는지 확인합니다.
  - 요청이 실패하면 수량을 이전 값으로 되돌리고 오류를 보여 주는지 확인합니다.
- 전체 E2E 212개가 모두 통과했습니다.
- 크롬에서 네트워크를 Slow 3G로 낮추고 + 버튼을 20번 눌렀을 때 합계가 정확했습니다.

## 확인하지 못한 사항

- iOS 사파리에서는 동작을 확인하지 못했습니다. 테스트 기기가 없었습니다. 기기를 가지고 계신 분이 확인해 주시면 감사하겠습니다.

## 배포 관련

DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.

</td>
<td valign="top">

fix: 수량을 빠르게 변경할 때 늦게 도착한 이전 응답이 장바구니를 덮어쓰지 않도록 수정

## 작업 배경

장바구니에서 수량 + 버튼을 빠르게 두 번 누르면 화면에는 수량이 3으로 표시되는데 합계 금액은 2개 기준으로 남는다는 제보가 QA 에서 접수되었습니다 (#131). 수량을 바꿀 때마다 PATCH /cart/items/:id 요청을 보내고 응답으로 받은 장바구니로 화면 전체를 덮어쓰는데, 첫 번째 요청의 응답이 두 번째 응답보다 늦게 도착하면 예전 응답이 최신 상태를 덮어쓰기 때문입니다.

## 변경 사항

- **수량을 연속으로 변경하면 이전 요청이 취소됩니다**: `useCartQuantity` 에서 수량을 바꿀 때마다 이전 요청을 AbortController 로 취소하고, 취소된 요청에서 발생한 오류는 무시합니다.
- **늦게 도착한 예전 응답은 화면에 반영되지 않습니다**: 응답의 장바구니 `version` 이 화면이 가진 `version` 보다 낮으면 그 응답을 버립니다. 서버는 변경하지 않았고, `version` 은 기존 응답에 이미 포함되어 있던 필드입니다.
- **그 밖에**: 수량을 연속으로 변경하는 경우와 요청이 실패하는 경우를 검증하는 Playwright E2E 4개를 `web/e2e/cart-quantity.spec.ts` 에 추가했습니다.

## 확인 사항

- [x] Playwright E2E 전체 212개 통과 (새로 추가한 4개 포함, 두 응답의 도착 순서를 뒤집는 경우 포함)
- [x] 크롬에서 네트워크를 Slow 3G 로 낮추고 + 버튼을 20번 눌러서 합계가 수량과 일치하는 것을 직접 확인
- [ ] iOS 사파리: 테스트 기기가 없어서 확인하지 못했습니다

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

장바구니 수량을 빠르게 바꿀 때 늦게 온 예전 응답이 화면을 덮어쓰는 문제 수정

## 배경

QA에서 수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3인데 합계 금액은 2개 기준으로 남는다는 제보가 있었습니다. (#131)

## 원인

버튼을 누를 때마다 `PATCH /cart/items/:id`를 보내고, 응답으로 받은 장바구니로 화면 상태를 통째로 덮어씁니다. 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면, 늦게 온 예전 응답이 최신 상태를 덮어썼습니다.

## 변경 내용

`useCartQuantity`에 두 가지 방어를 추가했습니다.

- 수량을 바꿀 때마다 진행 중이던 이전 요청을 `AbortController`로 취소합니다. 취소로 발생한 abort 오류는 무시하고, 그 외 오류는 그대로 던집니다.
- 응답의 장바구니 `version`이 현재 화면의 `version`보다 낮으면 응답을 버립니다. 같거나 높을 때만 반영합니다.

서버 변경은 없습니다. `version` 필드는 원래 응답에 포함되어 있었습니다.

## 확인한 것

- Playwright E2E 4개를 새로 추가했습니다. 응답 순서가 뒤바뀌는 경우도 포함합니다.
  - 수량을 빠르게 두 번 올려도 합계가 맞다
  - 첫 번째 응답이 두 번째 응답보다 늦게 와도 합계가 맞다
  - 수량을 올렸다가 바로 내려도 합계가 맞다
  - 요청이 실패하면 수량을 이전 값으로 되돌리고 오류를 보여 준다
- 전체 E2E 212개가 통과했습니다.
- 크롬에서 네트워크를 Slow 3G로 낮추고 + 버튼을 20번 눌렀을 때 합계가 맞았습니다.

## 확인하지 못한 것

- iOS 사파리: 테스트 기기가 없어 확인하지 못했습니다. 가능하신 분이 실기기에서 빠르게 연타해 보고 합계를 확인해 주시면 좋겠습니다.

## 배포 참고

DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.

</td>
<td valign="top">

장바구니 수량을 빠르게 변경할 때 합계 금액이 어긋나는 문제 수정 (#131)

## 배경

장바구니 화면에서 수량 + 버튼을 빠르게 두 번 누르면, 화면의 수량은 3으로 표시되지만 합계 금액은 2개 기준 값으로 남는 현상이 QA에서 제보되었습니다.

Closes #131

## 원인

수량 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고, 응답으로 받은 장바구니로 화면 상태를 덮어쓰고 있었습니다. 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면, 오래된 응답이 최신 상태를 덮어쓰면서 수량과 합계가 서로 맞지 않게 되었습니다.

## 변경 내용

`useCartQuantity`에 다음 두 가지 방어 장치를 추가했습니다.

- 수량을 변경할 때마다 아직 진행 중인 이전 요청을 `AbortController`로 취소합니다. 취소된 요청에서 발생하는 abort 오류는 무시하고, 그 외의 오류는 기존처럼 다시 던집니다.
- 응답에 포함된 장바구니 `version`이 화면이 가진 `version`보다 낮으면 응답을 버립니다. 요청을 취소하더라도 이미 서버에 도달한 요청의 응답이 늦게 올 수 있기 때문에, 취소와 별도로 `version` 비교를 함께 적용했습니다.

서버는 수정하지 않았습니다. `version` 필드는 원래 응답에 포함되어 있었습니다.

## 테스트

- Playwright E2E 테스트 4개를 `web/e2e/cart-quantity.spec.ts`에 추가했습니다.
  - 수량을 빠르게 두 번 올려도 합계가 맞습니다.
  - 첫 번째 응답이 두 번째 응답보다 늦게 와도 합계가 맞습니다. (응답 순서를 뒤집는 경우)
  - 수량을 올렸다가 바로 내려도 합계가 맞습니다.
  - 요청이 실패하면 수량을 이전 값으로 되돌리고 오류를 보여 줍니다.
- 전체 E2E 212개가 모두 통과했습니다.
- 크롬에서 네트워크를 Slow 3G로 낮추고 + 버튼을 20번 눌러 보았고, 합계가 올바르게 표시되었습니다.

## 확인하지 못한 내용

- iOS 사파리에서는 확인하지 못했습니다. 테스트 기기가 없었기 때문에, 기기를 보유하신 분이 `AbortController` 취소 동작과 빠른 연속 탭 상황을 확인해 주시면 감사하겠습니다.

## 배포 관련

DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.

</td>
<td valign="top">

fix: 장바구니 수량을 빠르게 변경할 때 늦게 도착한 이전 응답이 화면을 덮어쓰지 않도록 수정

## 작업 배경

QA 에서 수량 + 버튼을 빠르게 두 번 누르면 화면에는 수량이 3으로 표시되는데 합계 금액은 2개 기준으로 남는다는 제보가 들어왔습니다 (#131). 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고 응답으로 받은 장바구니로 화면을 덮어쓰는데, 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면 예전 응답이 최신 상태를 덮어썼습니다.

## 변경 사항

- **수량을 변경하면 이전에 보낸 요청이 취소됩니다**: `useCartQuantity` 에서 요청마다 `AbortController` 를 만들고, 새 요청을 보내기 전에 진행 중인 요청을 취소합니다. 취소된 요청에서 발생한 오류는 무시합니다.
- **화면보다 오래된 장바구니 응답은 반영하지 않습니다**: 응답의 장바구니 `version` 이 화면이 가진 `version` 보다 낮으면 응답을 버립니다. 서버는 변경하지 않았으며 `version` 필드는 기존 응답에 이미 포함되어 있었습니다.
- **Playwright E2E 4개를 추가했습니다**: 수량을 빠르게 두 번 올리는 경우, 응답 순서가 뒤바뀌는 경우, 수량을 올렸다가 바로 내리는 경우, 요청이 실패하는 경우를 확인합니다.

## 확인 사항

- [x] Playwright E2E 전체 212개 통과 (새로 추가한 4개 포함, 응답 순서를 뒤집는 경우 포함)
- [x] 크롬에서 네트워크를 Slow 3G 로 낮추고 + 버튼을 20번 눌러서 합계가 수량과 일치하는지 직접 확인
- [ ] iOS 사파리: 테스트 기기가 없어서 확인하지 못했습니다

</td>
</tr>
</table>

</details>

<details>
<summary>3번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

장바구니 수량 연타 시 늦게 온 이전 응답이 화면을 덮어쓰는 문제 수정

Closes #131

## 문제

수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3인데 합계 금액은 2개 값으로 남는 현상이 QA에서 제보되었습니다.

## 원인

버튼을 누를 때마다 `PATCH /cart/items/:id`를 보내고, 응답으로 받은 장바구니로 화면 상태를 통째로 덮어씁니다. 첫 번째 요청의 응답이 두 번째 응답보다 늦게 도착하면, 예전 상태가 최신 상태를 덮어쓰게 됩니다.

## 변경 내용

`useCartQuantity.ts`에서 두 가지를 적용했습니다.

- 수량을 바꿀 때마다 이전 요청을 `AbortController`로 취소합니다. 취소된 요청의 `AbortError`는 무시하고, 그 외 오류는 그대로 던집니다.
- 응답의 장바구니 `version`이 현재 화면의 `version`보다 낮으면 응답을 버립니다. 요청이 취소되기 전에 이미 도착한 응답도 이 검사로 걸러집니다.

서버는 변경하지 않았습니다. `version` 필드는 원래 응답에 포함되어 있었습니다.

## 테스트

- Playwright E2E 4개를 새로 추가했습니다 (`web/e2e/cart-quantity.spec.ts`).
  - 수량을 빠르게 두 번 올려도 합계가 맞다
  - 첫 번째 응답이 두 번째 응답보다 늦게 와도 합계가 맞다 (응답 순서 뒤집기)
  - 수량을 올렸다가 바로 내려도 합계가 맞다
  - 요청이 실패하면 수량을 이전 값으로 되돌리고 오류를 보여 준다
- 전체 E2E 212개가 통과했습니다.
- 크롬에서 네트워크를 Slow 3G로 낮추고 + 버튼을 20번 눌러 보았고, 합계가 맞았습니다.

## 확인하지 못한 것

- iOS 사파리에서는 확인하지 못했습니다. 테스트 기기가 없었습니다. 사파리 환경에서 확인해 주실 수 있는 분이 있으면 도움이 됩니다.

## 배포

DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.

</td>
<td valign="top">

장바구니 수량을 빠르게 바꿀 때 예전 응답이 화면을 덮어쓰는 문제 수정

## 배경

수량 + 버튼을 빠르게 두 번 누르면 화면에는 수량 3이 표시되지만, 합계 금액은 2개 기준으로 남는 현상이 있다고 QA에서 제보했습니다. (#131)

## 원인

수량 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고, 응답으로 받은 장바구니로 화면 상태를 교체하고 있었습니다. 첫 번째 요청에 대한 응답이 두 번째 요청에 대한 응답보다 늦게 도착하면, 늦게 온 예전 응답이 최신 상태를 덮어썼습니다. 그 결과 수량과 합계가 서로 맞지 않게 되었습니다.

## 변경 내용

`useCartQuantity`에서 다음 두 가지를 적용했습니다.

- 수량을 바꿀 때마다 이전 요청을 `AbortController`로 취소합니다. 취소된 요청에서 발생한 오류는 무시하고, 그 외 오류는 기존처럼 다시 던집니다.
- 응답에 포함된 장바구니 `version`이 화면이 가진 `version`보다 낮으면 응답을 버립니다. 요청을 취소하더라도 서버는 이미 처리했을 수 있고 응답이 먼저 도착할 수도 있으므로, 이 검사를 추가로 두었습니다.

서버는 변경하지 않았습니다. `version` 필드는 원래 응답에 포함되어 있었습니다.

## 배포 관련

DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.

## 테스트

- Playwright E2E를 4개 추가했습니다. 응답 순서가 뒤바뀌는 경우도 포함합니다.
  - 수량을 빠르게 두 번 올려도 합계가 맞다
  - 첫 번째 응답이 두 번째 응답보다 늦게 와도 합계가 맞다
  - 수량을 올렸다가 바로 내려도 합계가 맞다
  - 요청이 실패하면 수량을 이전 값으로 되돌리고 오류를 보여 준다
- 전체 E2E 212개가 모두 통과했습니다.
- 크롬에서 네트워크를 Slow 3G로 낮추고 + 버튼을 20번 눌렀을 때 합계가 정확하게 표시되는 것을 확인했습니다.

## 확인하지 못한 것

iOS 사파리에서는 확인하지 못했습니다. 테스트 기기가 없었습니다. iOS 기기를 사용할 수 있는 리뷰어께서 수량 버튼을 빠르게 눌러 보고 합계를 확인해 주시면 감사하겠습니다.

Closes #131

</td>
<td valign="top">

fix: 수량을 빠르게 변경할 때 늦게 도착한 예전 응답이 장바구니를 덮어쓰지 않게 함

## 작업 배경

장바구니 화면에서 수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3으로 표시되는데 합계 금액은 2개 값으로 남는다는 제보가 QA 에서 접수되었습니다 (#131). 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고 응답으로 받은 장바구니로 화면 전체를 덮어쓰는데, 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면 그 예전 응답이 최신 상태를 덮어썼기 때문입니다.

## 변경 사항

- **수량을 변경하면 이전에 보낸 요청이 취소됩니다**: `useCartQuantity` 에서 요청마다 `AbortController` 를 만들고, 새 요청을 보내기 전에 아직 끝나지 않은 이전 요청을 취소합니다. 취소된 요청에서 발생한 오류는 무시합니다.
- **화면이 가진 것보다 오래된 응답은 버립니다**: 응답에 포함된 장바구니 `version` 이 화면의 `version` 보다 낮으면 화면을 갱신하지 않습니다. 서버는 변경하지 않았고, `version` 필드는 기존 응답에 이미 포함되어 있었습니다.
- **수량 변경 E2E 테스트 4개를 추가했습니다**: 수량을 연속으로 올리는 경우, 응답 순서가 뒤집히는 경우, 수량을 올렸다가 바로 내리는 경우, 요청이 실패해서 수량을 이전 값으로 되돌리고 오류를 표시하는 경우를 확인합니다.

## 확인 사항

- [x] Playwright E2E 전체 212개 통과 (새로 추가한 4개 포함, 응답 순서를 뒤집는 경우 포함)
- [x] 크롬에서 네트워크를 Slow 3G 로 낮추고 + 버튼을 20번 눌러서 합계가 수량과 일치하는 것을 직접 확인
- [ ] iOS 사파리: 테스트 기기가 없어서 확인하지 못했습니다

</td>
</tr>
</table>

</details>

<details>
<summary>다른 비교에 들어가는 조건의 출력 (줄이기 전, 예시 2개)</summary>

1번째 생성

<table>
<tr><th width="50%">줄이기 전</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

fix: 수량을 빠르게 바꿀 때 늦게 도착한 이전 응답이 장바구니를 덮어쓰지 않게 함

## 작업 배경

QA 에서 장바구니의 수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3인데 합계 금액은 2개 기준으로 표시된다는 제보가 들어왔습니다 (#131). 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고 응답으로 받은 장바구니로 화면을 덮어쓰는데, 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면 예전 응답이 최신 상태를 덮어쓰는 것이 원인이었습니다.

## 변경 사항

- **수량을 바꾸면 아직 끝나지 않은 이전 요청이 취소됩니다**: `useCartQuantity` 가 요청마다 `AbortController` 를 만들고, 새 요청을 보내기 전에 진행 중이던 요청을 취소합니다. 취소로 발생한 오류는 무시하고 그 밖의 오류는 기존처럼 그대로 던집니다.
- **화면이 가진 version 보다 낮은 version 의 응답은 반영하지 않습니다**: 응답에 포함된 장바구니 version 이 현재 화면의 version 보다 낮으면 그 응답을 버립니다. 서버는 변경하지 않았고 version 필드는 기존 응답에 이미 포함되어 있었습니다.
- 그 밖에: `web/e2e/cart-quantity.spec.ts` 에 Playwright E2E 테스트 4개를 추가했습니다. 수량을 빠르게 두 번 올리는 경우, 첫 번째 응답이 두 번째 응답보다 늦게 도착하는 경우, 수량을 올렸다가 바로 내리는 경우, 요청이 실패해서 수량을 이전 값으로 되돌리고 오류를 표시하는 경우를 확인합니다.

## 확인 사항

- [x] Playwright E2E 전체 212개 통과 (새로 추가한 4개 포함)
- [x] 크롬에서 네트워크를 Slow 3G 로 낮추고 + 버튼을 20번 눌러서 합계 금액이 수량과 일치하는 것을 직접 확인했습니다
- [ ] iOS 사파리: 테스트 기기가 없어서 확인하지 못했습니다

</td>
<td valign="top">

fix: 장바구니 수량을 연속으로 변경할 때 이전 응답이 화면을 덮어쓰지 않게 함

## 작업 배경

수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3인데 합계 금액은 2개 값으로 남는다는 제보가 QA 에서 들어왔습니다 (#131). 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고 응답으로 받은 장바구니로 화면을 덮어쓰는데, 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면 그 예전 응답이 화면을 덮어썼기 때문입니다.

## 변경 사항

- **수량을 바꾸면 진행 중이던 이전 요청이 취소됩니다**: 수량을 바꿀 때마다 이전 `PATCH` 요청을 `AbortController` 로 취소하고, 취소로 발생한 오류는 무시합니다.
- **화면보다 낮은 version 의 응답은 반영하지 않습니다**: 응답에 들어 있는 장바구니 version 이 화면이 가진 version 보다 낮으면 그 응답을 버립니다. 서버는 변경하지 않았고, version 필드는 원래 응답에 있었습니다.

## 확인 사항

- [x] Playwright E2E 4개를 새로 작성했고(응답 순서를 뒤집는 경우 포함) 전체 E2E 212개가 통과했습니다
- [x] 크롬에서 네트워크를 Slow 3G 로 낮추고 + 버튼을 20번 눌러서 합계가 맞는 것을 직접 확인했습니다
- [ ] iOS 사파리: 테스트 기기가 없어서 확인하지 못했습니다

</td>
</tr>
</table>

2번째 생성

<table>
<tr><th width="50%">줄이기 전</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

fix: 장바구니 수량을 빠르게 바꿀 때 예전 응답이 화면을 덮어쓰지 않게 함

## 작업 배경

QA 에서 수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3인데 합계 금액은 2개 기준 값으로 남는다는 제보가 들어왔습니다 (#131). 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고 응답으로 받은 장바구니로 화면을 덮어쓰는데, 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면 예전 응답이 최신 상태를 덮어써서 생긴 문제였습니다.

## 변경 사항

- **수량을 바꾸면 아직 끝나지 않은 이전 요청을 취소합니다**: `useCartQuantity` 에서 수량을 바꿀 때마다 `AbortController` 를 새로 만들고 이전 요청을 취소합니다. 취소된 요청에서 발생한 오류는 무시하고, 그 밖의 오류는 기존처럼 그대로 던집니다.
- **화면이 가진 값보다 낮은 version 의 응답은 사용하지 않습니다**: 응답에 포함된 장바구니 version 이 현재 화면의 version 보다 낮으면 응답을 버리고 현재 상태를 유지합니다. version 필드는 기존 응답에 이미 포함되어 있으므로 서버는 변경하지 않았습니다.

## 확인 사항

- [x] Playwright E2E 테스트 4개를 새로 작성했고, 첫 번째 응답이 두 번째 응답보다 늦게 도착하는 경우도 포함했습니다
- [x] 전체 E2E 212개 통과
- [x] 크롬에서 네트워크를 Slow 3G 로 낮추고 + 버튼을 20번 눌렀을 때 합계 금액이 맞는 것을 직접 확인했습니다
- [ ] iOS 사파리: 테스트 기기가 없어서 확인하지 못했습니다

</td>
<td valign="top">

fix: 장바구니 수량을 빠르게 바꿀 때 이전 응답이 화면을 덮어쓰지 않게 함

## 작업 배경

수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3인데 합계 금액은 2개 값으로 남는다는 제보가 QA 에서 접수되었습니다 (#131). 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고 응답으로 받은 장바구니로 화면을 덮어쓰는데, 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면 예전 응답이 최신 상태를 덮어썼습니다.

## 변경 사항

- **수량을 바꾸면 진행 중이던 이전 요청이 취소됩니다**: 수량을 바꿀 때마다 이전 요청을 `AbortController` 로 취소하고, 취소로 발생한 오류는 무시합니다. 그 밖의 오류는 기존과 같이 그대로 던집니다.
- **늦게 도착한 예전 응답은 화면에 반영되지 않습니다**: 응답에 포함된 장바구니 `version` 이 화면이 가진 `version` 보다 낮으면 그 응답을 버립니다. `version` 필드는 원래 응답에 포함되어 있었으므로 서버는 변경하지 않았습니다.

## 확인 사항

- [x] Playwright E2E 전체 212개 통과 (새로 작성한 4개 포함, 응답 순서를 뒤집는 경우 포함)
- [x] 크롬에서 네트워크를 Slow 3G 로 낮추고 + 버튼을 20번 눌러 합계가 맞는 것을 직접 확인
- [ ] iOS 사파리: 테스트 기기가 없어서 확인하지 못했습니다

</td>
</tr>
</table>

3번째 생성

<table>
<tr><th width="50%">줄이기 전</th><th width="50%">예시 2개</th></tr>
<tr>
<td valign="top">

fix: 수량을 빠르게 바꿀 때 늦게 도착한 이전 응답이 장바구니를 덮어쓰지 않게 함

## 작업 배경

QA 에서 장바구니의 수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3인데 합계 금액은 2개 값으로 남는다는 제보가 들어왔습니다(#131). 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고 응답으로 받은 장바구니로 화면을 덮어쓰는데, 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면 예전 응답이 화면을 덮어쓰는 것이 원인이었습니다.

## 변경 사항

- **수량을 바꾸면 이전 요청을 취소합니다**: `useCartQuantity` 에서 수량을 바꿀 때마다 진행 중이던 이전 요청을 `AbortController` 로 취소합니다. 취소된 요청에서 발생한 오류는 무시하고, 그 밖의 오류는 기존처럼 그대로 던집니다.
- **화면보다 version 이 낮은 응답은 버립니다**: 응답에 포함된 장바구니 version 이 화면이 가진 version 보다 낮으면 화면을 갱신하지 않습니다. 서버는 변경하지 않았으며, version 필드는 기존 응답에 이미 포함되어 있었습니다.
- 그 밖에: 수량을 빠르게 두 번 올리는 경우, 응답 순서가 뒤집히는 경우, 수량을 올렸다가 바로 내리는 경우, 요청이 실패하는 경우를 검증하는 Playwright E2E 4개를 추가했습니다.

## 확인 사항

- [x] 새로 작성한 Playwright E2E 4개(응답 순서를 뒤집는 경우 포함) 통과, 전체 E2E 212개 통과
- [x] 크롬에서 네트워크를 Slow 3G 로 낮추고 + 버튼을 20번 눌러서 합계가 맞는지 확인
- [ ] iOS 사파리: 테스트 기기가 없어서 확인하지 못했습니다

</td>
<td valign="top">

fix: 수량을 연속으로 변경해도 늦게 도착한 이전 응답이 화면을 덮어쓰지 않게 함

## 작업 배경

장바구니 화면에서 수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3인데 합계 금액은 2개 기준 값으로 남는다는 제보가 QA 에서 들어왔습니다. 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고 응답으로 받은 장바구니로 화면을 덮어쓰는데, 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면 그 이전 응답이 최신 상태를 덮어써서 생긴 문제였습니다.

Closes #131

## 변경 사항

- **수량을 연속으로 변경하면 이전 요청이 취소됩니다**: 수량을 바꿀 때마다 `AbortController` 로 아직 진행 중인 이전 요청을 취소하고, 취소로 발생한 오류는 무시합니다.
- **화면보다 오래된 응답은 반영되지 않습니다**: 응답에 들어 있는 장바구니 `version` 이 화면이 가진 `version` 보다 낮으면 그 응답을 버립니다. 서버는 변경하지 않았고 `version` 필드는 기존 응답에 이미 포함되어 있었습니다.

## 확인 사항

- [x] Playwright E2E 4개를 새로 작성했고(응답 순서를 뒤집는 경우 포함) 전체 E2E 212개가 통과했습니다
- [x] 크롬에서 네트워크를 Slow 3G 로 낮추고 + 버튼을 20번 눌러서 합계가 맞는 것을 직접 확인했습니다
- [ ] iOS 사파리: 테스트 기기가 없어서 확인하지 못했습니다

</td>
</tr>
</table>

</details>

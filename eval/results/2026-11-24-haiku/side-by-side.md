# 나란히 보는 비교표 (2026-11-24-haiku)

생성 모델은 `claude-haiku-5-5` 이고, 조건마다 케이스마다 3번씩 생성했습니다. 출력은 생성된 그대로 실었고 고치거나 줄이지 않았습니다. 커밋 메시지는 줄바꿈이 보이도록 코드 블록에 넣었습니다.

케이스마다 첫 번째 생성 결과를 펼쳐 두었고, 두 번째와 세 번째 생성 결과와 다른 비교에만 들어가는 조건의 출력은 접어 두었습니다. 표의 수치는 규칙 검사와 블라인드 판정의 케이스별 평균입니다.

| 표에 쓰는 이름 | 조건 | 시스템 프롬프트에 넣은 지침 |
| --- | --- | --- |
| 기본 | 기본 (지침 없음) | 없음 |
| fluent-korean | fluent-korean 원본 | fluent-korean |
| 우리 스킬 | 우리 스킬 (natural-korean + git-writing-korean) | natural-korean, git-writing-korean |

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
| 기본 | 0.0 | 2.83 |
| fluent-korean | 0.0 | 1.67 |
| 우리 스킬 | 0.0 | 1.50 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

## 원인: 파일 이름의 대소문자 불일치

실제 파일은 `src/lib/DateFormat.ts`(대문자 D)인데, import는 `@/lib/dateFormat`(소문자 d)로 되어 있습니다.

- **macOS**(APFS 기본 설정)와 **Windows**는 파일 시스템이 대소문자를 구분하지 않아서 `dateFormat`으로 찾아도 `DateFormat.ts`가 매칭됩니다. 그래서 로컬에서는 빌드가 됩니다.
- **Linux**(GitHub Actions의 `ubuntu-latest`)는 대소문자를 구분하므로 `dateFormat.ts`라는 파일이 없어서 TS2307 오류가 납니다.

## 해결 방법

**방법 1: 파일 이름을 import 경로와 맞추기 (권장)**

대소문자만 바꾸는 rename은 대소문자를 구분하지 않는 파일 시스템에서 일반 `mv`로는 잘 반영되지 않으므로 git으로 두 단계에 나눠 진행합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
git commit -m "fix: dateFormat 파일명 대소문자 통일"
```

**방법 2: import 쪽을 실제 파일명에 맞추기**

파일 이름을 그대로 두고 import를 고칩니다.

```ts
import { formatDate } from '@/lib/DateFormat';
```

이 경우 다른 곳에서도 `dateFormat`으로 import하는 코드가 있으면 같이 고쳐야 합니다.

## 재발 방지

- 프로젝트 전체에서 `DateFormat`/`dateFormat` 같은 불일치가 더 있는지 찾아보세요.
  ```bash
  grep -rn "lib/dateFormat\|lib/DateFormat" src
  ```
- `tsconfig.json`의 `compilerOptions`에 `"forceConsistentCasingInFileNames": true`를 추가하면, 로컬(macOS)에서도 이런 불일치를 바로 오류로 잡아줍니다.
- 가능하면 CI를 로컬과 같은 환경에서 검증할 수 있도록, 이슈가 생기기 쉬운 `pnpm build`를 PR 단계에서 Linux 러너로도 돌려 보세요.

</td>
<td valign="top">

## 원인

파일 시스템의 대소문자 구분 여부가 다르기 때문입니다.

- 실제 파일은 `src/lib/DateFormat.ts`(D가 대문자)입니다.
- 코드는 `@/lib/dateFormat`(d가 소문자)으로 import합니다.
- macOS의 기본 파일 시스템(APFS)은 대소문자를 구분하지 않으므로 `dateFormat`으로 요청해도 `DateFormat.ts`가 찾아집니다. 그래서 로컬 빌드는 성공합니다.
- GitHub Actions의 `ubuntu-latest`는 ext4 파일 시스템을 쓰며 대소문자를 구분합니다. 따라서 `dateFormat.ts`라는 파일을 찾지 못하고 TS2307 오류가 발생합니다.

## 해결 방법

프로젝트의 다른 파일(`currency.ts`, `http.ts`)이 모두 소문자 camelCase이므로, 파일명을 import 경로와 맞추는 것이 일관성에 맞습니다.

macOS에서는 대소문자만 바꾸는 rename이 git에 반영되지 않는 경우가 있으므로, 임시 이름을 거쳐 두 단계로 변경하는 것이 안전합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

그다음 `DateFormat`을 경로로 참조하는 곳이 더 있는지 확인합니다.

```bash
grep -rn "DateFormat" src
```

## 재발 방지

`tsconfig.json`의 `compilerOptions`에 다음 옵션을 추가하면 TypeScript가 import 경로와 실제 파일명의 대소문자 불일치를 로컬에서도 오류로 알려 줍니다. 이 설정이 있었다면 macOS에서 이미 실패했을 것입니다.

```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

변경 후 `pnpm build`를 로컬에서 한 번 실행해 확인한 뒤 커밋하면 CI에서도 통과합니다.

</td>
<td valign="top">

## 원인

파일 이름과 import 경로의 대소문자가 다릅니다.

- 실제 파일: `src/lib/DateFormat.ts` (D가 대문자)
- import 경로: `'@/lib/dateFormat'` (d가 소문자)

macOS 기본 파일 시스템(APFS)과 Windows(NTFS)는 대소문자를 구분하지 않아서 로컬 `pnpm build`가 통과합니다. 반면 `ubuntu-latest`의 Linux 파일 시스템(ext4)은 대소문자를 구분하므로 `dateFormat.ts`라는 파일을 찾지 못하고 TS2307 오류가 납니다.

다른 파일(`currency.ts`, `http.ts`)이 모두 소문자 camelCase이므로, 파일 이름을 `dateFormat.ts`로 맞추는 쪽이 프로젝트 관례에 맞습니다.

## 수정 방법

### 1. 파일 이름을 소문자로 바꿉니다

Git이 대소문자만 다른 이름 변경을 무시하는 경우가 있어서 `git mv`를 두 번 실행합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/tmp-dateformat.ts
git mv src/lib/tmp-dateformat.ts src/lib/dateFormat.ts
```

Windows PowerShell에서도 같은 명령을 사용할 수 있습니다.

### 2. 다른 import 경로도 확인합니다

`DateFormat`으로 import한 곳이 남아 있으면 같은 오류가 다시 발생합니다.

```bash
grep -rn "DateFormat" src/
```

### 3. 같은 문제를 로컬에서 잡도록 설정합니다

`tsconfig.json`의 `compilerOptions`에 다음 옵션을 추가하면, macOS에서도 대소문자 불일치를 `pnpm build` 단계에서 바로 확인할 수 있습니다.

```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

### 4. 커밋 제목 예시

```
fix: dateFormat 모듈의 파일 이름을 import 경로와 대소문자까지 일치시킴
```

## 확인 방법

수정한 뒤 로컬에서 `pnpm build`를 실행하고, CI에서도 같은 빌드가 통과하는지 확인합니다. 로컬에서 결과를 완전히 재현하려면 Linux 컨테이너나 WSL에서 `pnpm build`를 실행해 보는 것도 좋습니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

## 원인: 파일 이름 대소문자 불일치

실제 파일은 `src/lib/DateFormat.ts`(대문자 D)인데, import는 `'@/lib/dateFormat'`(소문자 d)로 되어 있습니다.

- **macOS(기본 APFS)와 Windows(NTFS)** 는 파일 시스템이 대소문자를 구분하지 않아서 `dateFormat`으로 찾아도 `DateFormat.ts`가 매칭됩니다. 그래서 로컬에서는 빌드가 됩니다.
- **Linux(ubuntu-latest, ext4)** 는 대소문자를 구분하므로 `dateFormat.ts`라는 파일이 없다고 판단해 `TS2307` 오류가 납니다.

## 해결 방법

**방법 1: 파일 이름을 import와 맞추기 (권장)**

Windows에서는 탐색기나 일반 `mv`로 이름만 바꾸면 Git이 변경을 인식하지 못할 수 있으니 `git mv`를 사용하세요. 두 단계로 나눠야 합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/tmp-dateformat.ts
git mv src/lib/tmp-dateformat.ts src/lib/dateFormat.ts
git commit -m "fix: rename DateFormat.ts to dateFormat.ts for case-sensitive FS"
```

**방법 2: import 경로를 실제 파일 이름에 맞추기**

`BookingForm.tsx`의 import를 수정합니다.

```ts
import { formatDate } from '@/lib/DateFormat';
```

프로젝트 안에서 `dateFormat`을 import하는 곳이 더 있다면 모두 같은 이름으로 통일하세요.

## 재발 방지

1. **`tsconfig.json`에 `forceConsistentCasingInFileNames`를 켭니다.** 로컬에서도 대소문자 불일치를 바로 잡아낼 수 있습니다.
   ```json
   {
     "compilerOptions": {
       "forceConsistentCasingInFileNames": true
     }
   }
   ```
2. **로컬에서 Linux와 같은 조건으로 확인하고 싶다면** Docker나 WSL의 Linux 환경에서 `pnpm build`를 한 번 돌려 보세요.
3. Git이 이름 변경을 놓친 적이 있는지 확인하려면 `git ls-files src/lib`로 저장소에 기록된 실제 파일명을 확인할 수 있습니다. CI에서 사용하는 것은 이 기록된 이름입니다.

방법 1로 파일명을 소문자로 통일하는 것을 권장합니다. 프로젝트의 다른 파일(`currency.ts`, `http.ts`)도 소문자이므로 일관성도 맞습니다.

</td>
<td valign="top">

## 원인

파일 이름의 대소문자가 일치하지 않습니다. 코드는 `@/lib/dateFormat`으로 import하지만, 실제 파일은 `src/lib/DateFormat.ts`입니다.

- **macOS(APFS 기본 설정)와 Windows(NTFS)** 는 파일 이름의 대소문자를 구분하지 않으므로 `dateFormat`과 `DateFormat`을 같은 파일로 인식합니다. 그래서 로컬 빌드는 성공합니다.
- **Linux(ubuntu-latest의 ext4)** 는 대소문자를 구분하므로 `dateFormat.ts`를 찾지 못하고 빌드가 실패합니다.

TypeScript 컴파일러도 로컬 파일 시스템의 대소문자 규칙을 따르기 때문에 macOS에서는 이 문제가 드러나지 않습니다.

## 해결 방법

`src/lib`의 다른 파일들(`currency.ts`, `http.ts`)이 모두 소문자로 시작하는 camelCase이므로, 파일 이름을 소문자로 맞추는 것이 일관성 측면에서 좋습니다.

macOS에서는 대소문자만 바꾸는 `mv`가 무시될 수 있으므로, 임시 이름을 거쳐 두 번 옮깁니다.

```bash
git mv src/lib/DateFormat.ts src/lib/tmp-dateFormat.ts
git mv src/lib/tmp-dateFormat.ts src/lib/dateFormat.ts
```

그다음 프로젝트 전체에서 `DateFormat` 경로를 참조하는 곳이 없는지 확인합니다.

```bash
grep -rn "DateFormat'" src/ || true
grep -rn "lib/DateFormat" src/ || true
```

참조가 있다면 모두 `@/lib/dateFormat`으로 고칩니다. 이후 `pnpm build`로 확인하고 커밋합니다.

## 재발 방지

`tsconfig.json`의 `compilerOptions`에 다음 옵션을 추가하면, 로컬에서도 대소문자가 맞지 않는 import를 바로 잡아낼 수 있습니다.

```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

이 옵션은 TypeScript 차원에서 대소문자 불일치를 검사하므로, macOS나 Windows에서도 오류로 표시됩니다.

</td>
<td valign="top">

## 원인

파일 이름과 import 경로의 **대소문자가 다릅니다.**

- 실제 파일: `src/lib/DateFormat.ts`
- import 경로: `'@/lib/dateFormat'`

macOS의 기본 파일 시스템(APFS)은 대소문자를 구분하지 않아서 `dateFormat`으로 찾아도 `DateFormat.ts`가 매칭되므로 로컬 빌드가 성공합니다. 반면 `ubuntu-latest`의 파일 시스템은 대소문자를 구분하므로 `dateFormat.ts`를 찾지 못하고 TS2307 오류가 발생합니다.

## 수정 방법

**권장: 파일 이름을 소문자로 바꿉니다.** 같은 폴더의 `currency.ts`, `http.ts`가 모두 소문자이므로 이쪽이 일관됩니다.

macOS에서는 대소문자만 바꾸는 rename을 Git이 인식하지 못하는 경우가 있으므로, 임시 이름을 거쳐 두 번 옮깁니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateformat-tmp.ts
git mv src/lib/dateformat-tmp.ts src/lib/dateFormat.ts
```

그다음 `DateFormat`을 가리키는 다른 import가 있는지 확인합니다.

```bash
grep -rni "lib/dateformat" src
```

이 명령은 대소문자를 무시하고 찾으므로, 다른 파일에서 `DateFormat`으로 import한 곳도 함께 나옵니다. 그런 곳이 있다면 모두 `@/lib/dateFormat`으로 맞춥니다.

**대안:** 파일 이름은 그대로 두고 import를 `'@/lib/DateFormat'`으로 바꿀 수 있습니다. 이 경우 다른 파일의 `dateFormat` import도 모두 같은 이름으로 맞춰야 합니다.

## 재발 방지

`tsconfig.json`의 `compilerOptions`에 다음 옵션을 추가하면 TypeScript가 대소문자가 일치하지 않는 파일 참조를 로컬에서도 경고합니다.

```json
"forceConsistentCasingInFileNames": true
```

이 옵션이 있으면 macOS에서도 같은 문제를 빌드 단계에서 잡을 수 있습니다.

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

## 원인: 파일명 대소문자 불일치

실제 파일명은 `src/lib/DateFormat.ts`(대문자 D, F)인데, import 경로는 `'@/lib/dateFormat'`(소문자 d, f)입니다.

- **macOS**(APFS 기본 설정)와 **Windows**(NTFS)의 파일시스템은 대소문자를 구분하지 않으므로 로컬에서는 `dateFormat`이 `DateFormat.ts`로 찾아집니다.
- **GitHub Actions의 ubuntu-latest**(ext4)는 대소문자를 구분하므로 `dateFormat.ts`라는 파일이 없다고 판단해 빌드가 실패합니다.

## 해결 방법

가장 간단한 방법은 파일명을 import 경로와 맞추는 것입니다. macOS에서 대소문자만 바꾸면 Git이 변경을 감지하지 못하는 경우가 있으므로 `git mv`를 두 단계로 실행하세요.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.ts.tmp
git mv src/lib/dateFormat.ts.tmp src/lib/dateFormat.ts
git commit -m "fix: rename DateFormat.ts to dateFormat.ts for case-sensitive filesystems"
git push
```

또는 반대로 import 쪽을 `'@/lib/DateFormat'`으로 고쳐도 됩니다. 어느 쪽이든 **파일명과 import 경로의 대소문자가 정확히 같으면** 됩니다.

## 함께 확인하면 좋은 것

- 다른 import도 같은 문제가 없는지 확인하세요. `currency`, `http`는 소문자라 현재는 문제가 없어 보입니다. 프로젝트 전체를 검색하면 됩니다.
  ```bash
  grep -rn "from '@/lib/" src | sort
  ```
- 로컬에서도 잡히도록 `tsconfig.json`에 `"forceConsistentCasingInFileNames": true`를 설정해 두면, 이런 불일치를 macOS/Windows에서도 바로 에러로 확인할 수 있습니다.
- 파일명 규칙(예: 유틸 파일은 전부 camelCase)을 팀에서 통일해 두면 재발을 줄일 수 있습니다.

</td>
<td valign="top">

## 원인: 파일 이름의 대소문자 차이

import 경로는 `@/lib/dateFormat`(소문자 `d`)인데, 실제 파일은 `src/lib/DateFormat.ts`(대문자 `D`)입니다.

- **macOS**(기본 APFS)는 파일 시스템이 대소문자를 구분하지 않으므로 `dateFormat`과 `DateFormat`을 같은 파일로 취급합니다. 그래서 로컬 빌드는 성공합니다.
- **Ubuntu**(ext4)는 대소문자를 구분하므로 `dateFormat.ts` 파일을 찾지 못해 `TS2307` 오류가 발생합니다.

`forceConsistentCasingInFileNames`는 같은 파일을 서로 다른 대소문자로 참조하는 경우만 잡아내므로, 이번 상황은 탐지하지 못합니다.

## 해결 방법

파일 이름을 import 경로와 맞추는 것이 가장 간단합니다. 같은 폴더의 `currency.ts`, `http.ts`처럼 소문자 camelCase 규칙에도 맞습니다.

macOS에서 대소문자만 바꾸는 `git mv`는 Git이 변경을 놓치는 경우가 있으므로, 임시 이름을 거쳐 두 번에 나눠 옮깁니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
git commit -m "fix: rename DateFormat.ts to dateFormat.ts"
git push
```

파일 이름을 그대로 두고 import를 `@/lib/DateFormat`으로 고치는 방법도 있지만, 다른 파일의 import와 규칙이 달라지므로 권장하지 않습니다.

## 재발 방지

프로젝트에서 `DateFormat`을 import하는 곳이 더 있는지 확인하고, 있다면 함께 수정합니다.

```bash
grep -rn "lib/DateFormat\|lib/dateFormat" src
```

Linux 환경에서 빌드를 미리 검증하고 싶다면 Docker로 `ubuntu` 이미지에서 `pnpm build`를 실행하거나, 파일 이름 규칙을 검사하는 ESLint 플러그인(예: `eslint-plugin-check-file`)을 CI에 추가할 수 있습니다.

</td>
<td valign="top">

## 원인

파일 이름의 대소문자가 import 경로와 다릅니다. 실제 파일은 `DateFormat.ts`(대문자 D, F)인데 import 는 `@/lib/dateFormat`(소문자 d, f)입니다.

- **macOS** 기본 파일시스템(APFS)은 대소문자를 구분하지 않아서 `dateFormat`으로 찾아도 `DateFormat.ts`가 열립니다. 그래서 로컬에서는 빌드가 됩니다.
- **Ubuntu** 의 ext4 파일시스템은 대소문자를 구분하므로 `dateFormat.ts` 파일을 찾지 못하고 TS2307 오류가 납니다.

## 해결 방법

가장 좋은 방법은 파일 이름을 import 와 같은 소문자로 바꾸는 것입니다. `currency.ts`, `http.ts`도 소문자이므로 `src/lib` 안의 이름 규칙도 맞아집니다.

Git 은 대소문자만 바뀐 이름 변경을 macOS나 Windows에서 무시하는 경우가 있으므로, 임시 이름을 거쳐서 변경합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/tmp-dateformat.ts
git mv src/lib/tmp-dateformat.ts src/lib/dateFormat.ts
```

변경 후 Git 이 인식하는 이름을 확인합니다.

```bash
git ls-files src/lib
```

출력에 `src/lib/dateFormat.ts`가 보이면 됩니다. 다른 곳에서 `DateFormat` 경로로 import 하는 코드가 있는지도 찾아봅니다.

```bash
git grep -n "lib/DateFormat"
```

## 재발 방지

로컬에서도 이 문제를 잡으려면 `tsconfig.json`의 `compilerOptions`에 다음 옵션을 명시합니다.

```json
"forceConsistentCasingInFileNames": true
```

이 옵션을 켜면 import 경로와 실제 파일 이름의 대소문자가 다를 때 macOS에서도 `pnpm build`가 실패하므로, 실패가 CI에서 처음 드러나는 일을 막을 수 있습니다.

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
| 기본 | 1.3 | 1.83 |
| fluent-korean | 1.3 | 1.83 |
| 우리 스킬 | 0.0 | 2.33 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

## 결론

인기 상품에 주문이 몰리는 쇼핑몰이라면 **낙관적 잠금보다 비관적 잠금이 맞습니다.** 다만 Prisma에서는 잠금을 직접 걸기보다 **조건부 원자적 UPDATE**(`WHERE stock >= 수량`)를 쓰는 것이 가장 간단하고 안전합니다. 이 방식은 사실상 비관적 잠금과 같은 보장을 한 문장으로 얻습니다.

## 두 방식의 차이

| 구분 | 비관적 잠금 (Pessimistic) | 낙관적 잠금 (Optimistic) |
|---|---|---|
| 기본 전제 | 충돌이 자주 난다고 보고 미리 잠금 | 충돌이 드물다고 보고 커밋 시점에 검사 |
| 구현 | `SELECT ... FOR UPDATE` | `version` 컬럼 비교 후 `UPDATE`, 실패 시 재시도 |
| 충돌 시 동작 | 다른 트랜잭션이 대기 | 실패 후 재시도 |
| 인기 상품(고경합) | 대기열처럼 순서대로 처리되어 안정적 | 재시도가 폭주해 실패율과 DB 부하가 급증 |
| 주의점 | 잠금 보유 시간이 길면 처리량 저하, 데드락 가능 | 재시도 로직 필요, 경합이 높으면 비효율 |

낙관적 잠금은 상품 리뷰 수정처럼 충돌이 드문 작업에 적합합니다. 재고처럼 같은 행에 요청이 몰리는 곳에서는 대부분의 요청이 재시도를 반복하게 됩니다.

## 권장 방식: 조건부 원자적 UPDATE + CHECK 제약

PostgreSQL은 `UPDATE` 한 문장을 실행할 때 행 잠금을 자동으로 걸고, 조건을 확인한 뒤 값을 바꿉니다. 그래서 "읽고 → 검사하고 → 쓰는" 과정을 따로 하면 경쟁 상태가 생기지만, 조건을 `WHERE`에 넣으면 이 문제가 사라집니다.

```ts
// 재고 차감
const result = await prisma.product.updateMany({
  where: {
    id: productId,
    stock: { gte: quantity }, // 재고가 충분할 때만 차감
  },
  data: {
    stock: { decrement: quantity },
  },
});

if (result.count === 0) {
  throw new Error('재고 부족');
}
```

`decrement`만 쓰고 `where` 조건을 빼면 음수가 그대로 들어갑니다. 조건이 핵심입니다.

DB 레벨에서도 한 번 더 막아 두는 것을 권장합니다. 마이그레이션 파일에 다음을 추가하세요.

```sql
ALTER TABLE "Product"
  ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

애플리케이션 코드에 버그가 있어도 DB가 음수 재고를 거부합니다.

## 비관적 잠금을 써야 하는 경우

차감 전후로 복잡한 계산이나 여러 테이블 조작이 필요하면 행을 잠그고 트랜잭션을 여는 방식이 편합니다. Prisma에서는 `$queryRaw`로 `FOR UPDATE`를 씁니다.

```ts
await prisma.$transaction(async (tx) => {
  const [product] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;

  if (!product || product.stock < quantity) {
    throw new Error('재고 부족');
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });

  await tx.order.create({
    data: { productId, quantity /* ... */ },
  });
});
```

이 방식은 트랜잭션을 짧게 유지해야 합니다. 트랜잭션 안에서 외부 API(결제 등)를 호출하면 잠금이 그만큼 오래 유지되어 인기 상품의 처리량이 크게 떨어집니다.

## 추가로 고려할 점

- **주문 생성과 재고 차감은 같은 트랜잭션에 넣으세요.** 한쪽만 성공하는 상황을 막습니다.
- **트래픽이 매우 크다면** (타임세일 등) DB 행 잠금만으로는 한계가 옵니다. 주문을 큐(예: Redis, SQS)에 쌓아 순차 처리하거나, Redis의 원자적 `DECRBY`로 먼저 재고를 예약한 뒤 DB에 반영하는 구조를 검토하세요.
- **재시도를 허용한다면** 주문 요청에 멱등성 키를 붙여 같은 주문이 두 번 차감되지 않도록 하세요.

정리하면, 지금 상황에서는 **조건부 원자적 UPDATE + CHECK 제약**으로 시작하고, 차감 로직이 복잡해지면 `FOR UPDATE` 기반 비관적 잠금을 쓰는 것이 현실적인 선택입니다.

</td>
<td valign="top">

## 결론

인기 상품처럼 동시 주문이 몰리는 상황에는 **조건부 UPDATE(원자적 차감)**나 **비관적 잠금**이 맞습니다. 낙관적 잠금은 충돌이 드문 상황에 적합하므로, 충돌이 잦은 인기 상품에서는 재시도가 많아져 오히려 비효율적입니다.

## 두 방식의 차이

**낙관적 잠금(Optimistic Locking)**은 잠그지 않고 진행한 뒤, 저장할 때 충돌을 검사합니다. 보통 `version` 컬럼을 두고, 읽은 버전과 현재 버전이 같을 때만 갱신합니다. 갱신된 행이 0건이면 다른 트랜잭션이 먼저 바꾼 것이므로 재시도합니다.

- 장점: 잠금을 오래 잡지 않아 대기가 없습니다.
- 단점: 충돌이 잦으면 재시도가 폭증하고, 일부 요청은 계속 실패합니다.

**비관적 잠금(Pessimistic Locking)**은 읽는 시점에 행을 잠가 다른 트랜잭션이 기다리게 합니다. PostgreSQL에서는 `SELECT ... FOR UPDATE`로 구현합니다.

- 장점: 충돌이 많아도 재시도 없이 순서대로 처리됩니다.
- 단점: 같은 상품에 대기가 쌓여 처리량이 떨어지고, 트랜잭션이 길면 데드락 위험이 커집니다.

## 인기 상품에 권장하는 방식

가장 단순하고 안전한 방법은 차감과 검증을 **한 번의 UPDATE**로 처리하는 것입니다. PostgreSQL은 UPDATE 시점에 행 잠금을 잡고 WHERE 조건을 최신 값으로 다시 평가하므로, 재고가 음수가 되지 않습니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new Error("재고가 부족합니다.");
}
```

비관적 잠금이 필요한 경우, 즉 재고 확인 뒤에 다른 복잡한 로직이 이어질 때는 인터랙티브 트랜잭션으로 구현할 수 있습니다.

```ts
await prisma.$transaction(async (tx) => {
  const [product] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE`;

  if (product.stock < quantity) {
    throw new Error("재고가 부족합니다.");
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

## 함께 적용하면 좋은 안전장치

- **DB 제약 조건**: `ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);`을 추가하면, 애플리케이션 로직에 버그가 있어도 음수 재고가 저장되지 않습니다.
- **주문 생성과 차감의 원자성**: 주문 기록과 재고 차감을 같은 트랜잭션에 묶어야 합니다. 그래야 한쪽만 성공하는 상황을 막을 수 있습니다.
- **잠금 대기 범위 축소**: 같은 상품의 트랜잭션은 짧게 유지하고, 외부 API 호출은 트랜잭션 밖으로 빼는 것이 좋습니다.

인기 상품의 초고빈도 트래픽이 DB 행 잠금에서 병목이 된다면, 그때는 Redis 등으로 재고를 먼저 차감하는 구조를 검토하는 것이 다음 단계입니다.

</td>
<td valign="top">

인기 상품에 주문이 몰리는 쇼핑몰이라면 **조건부 원자적 UPDATE**를 쓰는 것이 가장 적합합니다. 낙관적 잠금과 비관적 잠금 중 하나를 고르는 것보다 간단하고, 두 방식의 장점을 함께 얻을 수 있습니다.

## 두 방식의 차이

**낙관적 잠금**은 행에 `version` 컬럼을 두고, 갱신할 때 읽었던 버전이 그대로인지 확인합니다. 충돌이 없다고 가정하고 실행하며, 갱신된 행이 0건이면 충돌로 보고 다시 읽은 뒤 재시도합니다. 잠금을 오래 잡지 않지만, 경쟁이 심하면 재시도가 연쇄적으로 늘어납니다.

**비관적 잠금**은 `SELECT ... FOR UPDATE`로 행을 먼저 잠그고, 트랜잭션이 끝날 때까지 다른 트랜잭션이 기다리게 합니다. 충돌을 확실하게 막지만, 잠금을 잡고 있는 시간만큼 다른 주문이 대기합니다.

## 인기 상품에 맞는 이유

인기 상품은 같은 행에 요청이 몰리므로 낙관적 잠금에서는 대부분의 요청이 충돌하고 재시도를 반복합니다. 재고가 한두 개 남은 시점에는 재시도 자체가 부하가 되어 응답이 느려집니다. 비관적 잠금은 충돌을 막기는 하지만 대기열이 길어지고, 트랜잭션 안에 다른 작업이 섞이면 잠금 시간도 늘어납니다.

조건부 UPDATE는 재고 확인과 차감을 한 문장으로 처리합니다. PostgreSQL은 행을 갱신하는 동안 그 행을 잠그므로 대기는 한 문장의 실행 시간만큼만 발생합니다. 재고가 부족하면 갱신 행 수가 0이 되어 바로 실패를 알 수 있습니다.

## Prisma 코드 예시

```typescript
// 재고가 요청 수량 이상일 때만 차감합니다.
const result = await prisma.product.updateMany({
  where: {
    id: productId,
    stock: { gte: quantity },
  },
  data: {
    stock: { decrement: quantity },
  },
});

if (result.count === 0) {
  throw new OutOfStockError(productId);
}
```

`decrement`만 쓰면 `where` 조건이 없어서 재고가 음수가 될 수 있으므로, 조건을 반드시 함께 써야 합니다.

## 주의할 점

- **재고가 음수가 되지 않도록 DB 제약을 함께 둡니다.** 애플리케이션 코드에 버그가 생겨도 DB가 막을 수 있습니다. Prisma 마이그레이션 파일에 아래 SQL을 추가합니다.

  ```sql
  ALTER TABLE "Product" ADD CONSTRAINT "stock_non_negative" CHECK (stock >= 0);
  ```

- **여러 상품을 한 주문에서 차감할 때는 행을 항상 같은 순서(예: id 오름차순)로 갱신합니다.** 순서가 다르면 트랜잭션끼리 교착 상태가 생길 수 있습니다.
- **주문 생성과 재고 차감을 한 트랜잭션에 묶습니다.** 주문 기록은 저장되었는데 재고 차감이 실패하는 상황을 막을 수 있습니다. 이때도 차감 문장은 위와 같은 조건부 형태를 유지합니다.
- **비관적 잠금이 꼭 필요한 경우**는 차감 전에 여러 조건을 읽고 계산해야 할 때입니다. 이때는 `$transaction` 안에서 `tx.$queryRaw`로 `FOR UPDATE`를 실행하고, 트랜잭션을 짧게 유지합니다. Prisma의 대화형 트랜잭션 기본 제한 시간은 5초이므로, 외부 API 호출은 트랜잭션 밖으로 빼는 것이 좋습니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

## 결론

**인기 상품처럼 동시 주문이 몰리는 경우에는 낙관적 잠금보다 비관적 잠금이 맞습니다.** 다만 `SELECT ... FOR UPDATE`를 따로 쓰기보다 **조건부 원자적 UPDATE**(`WHERE stock >= qty`)로 처리하는 방법이 가장 단순하고 안전합니다. 이 방식도 실제로는 행 잠금을 한 문장 동안만 잡는 비관적 방식에 가깝습니다.

## 두 방식의 차이

| 구분 | 비관적 잠금 (Pessimistic) | 낙관적 잠금 (Optimistic) |
|---|---|---|
| 충돌 가정 | 충돌이 자주 일어난다고 가정 | 충돌이 드물다고 가정 |
| 동작 | 읽을 때 행을 잠가서(`FOR UPDATE`) 다른 트랜잭션이 기다리게 함 | 잠그지 않고 읽고, 쓸 때 버전이 같은지 확인 |
| 충돌 시 | 대기 (락 해제까지) | 실패 후 재시도 |
| 장점 | 재시도가 없고 결과가 예측 가능 | 락 대기가 없어 충돌이 적을 때 빠름 |
| 단점 | 트랜잭션이 길면 대기열이 길어짐, 데드락 가능 | 인기 상품에서 재시도가 폭주함 |

### 인기 상품에서 낙관적 잠금이 어려운 이유

1,000명이 같은 상품을 동시에 주문하면 한 명만 성공하고 나머지 999명은 버전 충돌로 실패합니다. 재시도를 하면 다시 충돌이 나서 재시도 폭풍이 발생하고, 재시도 한도를 넘긴 주문은 실패합니다. 충돌이 잦은 상황에서는 낙관적 잠금이 맞지 않습니다.

## Prisma 구현 예시

### 권장: 조건부 원자적 UPDATE

재고 확인과 차감을 한 SQL 문으로 처리하므로 별도 잠금이 필요 없습니다.

```ts
async function placeOrder(productId: number, qty: number, userId: number) {
  return prisma.$transaction(async (tx) => {
    // stock >= qty 인 경우에만 차감됨 (DB가 행 잠금을 보장)
    const res = await tx.product.updateMany({
      where: { id: productId, stock: { gte: qty } },
      data: { stock: { decrement: qty } },
    });

    if (res.count === 0) {
      throw new Error('OUT_OF_STOCK');
    }

    return tx.order.create({
      data: { productId, userId, quantity: qty },
    });
  });
}
```

`count === 0`이면 재고가 부족하거나 상품이 없는 경우이므로 트랜잭션을 롤백합니다.

### 안전장치: DB 제약조건

애플리케이션 로직에 버그가 있어도 음수가 저장되지 않도록 마이그레이션에 추가합니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

### 비관적 잠금 (여러 단계 로직이 필요할 때)

재고 조회 후 애플리케이션에서 복잡한 판단을 해야 할 때 씁니다.

```ts
await prisma.$transaction(async (tx) => {
  const [p] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  if (!p || p.stock < qty) throw new Error('OUT_OF_STOCK');

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: qty } },
  });
  await tx.order.create({ data: { productId, userId, quantity: qty } });
});
```

이 방식은 트랜잭션 안에서 결제 API 같은 외부 호출을 하면 안 됩니다. 락을 쥔 채 외부 응답을 기다리게 되어 대기가 길어집니다.

## 실무 권장 사항

1. **재고 차감은 조건부 UPDATE로** 처리합니다. 가장 단순하고 틀릴 여지가 적습니다.
2. **트랜잭션은 짧게** 유지합니다. 결제, 외부 API 호출은 트랜잭션 밖에서 처리합니다.
3. **여러 상품을 한 번에 차감하면** 항상 같은 순서(예: id 오름차순)로 갱신해서 데드락을 막습니다.
4. **CHECK 제약조건**을 함께 걸어 최후의 방어선을 둡니다.
5. **초대형 선착순 이벤트**라면 DB 한 행에 트래픽이 몰리는 것 자체가 병목이 됩니다. 이 경우 Redis의 원자적 `DECR`로 선착순을 먼저 거르고, 통과한 주문만 DB에 반영하는 구조를 고려하세요.

정리하면, 인기 상품에는 **조건부 원자적 UPDATE(사실상 짧은 비관적 잠금)**를 쓰고, 낙관적 잠금은 충돌이 드문 일반 상품 수정 같은 곳에 쓰는 것이 적절합니다.

</td>
<td valign="top">

## 결론

인기 상품에 주문이 몰리는 쇼핑몰에는 **비관적 잠금 방식**이 적합합니다. 다만 Prisma에서는 `SELECT ... FOR UPDATE`를 직접 쓰는 것보다 **조건부 원자적 UPDATE**로 같은 효과를 얻는 편이 간단하고 안전합니다. 이 방식은 행 잠금을 UPDATE 한 번 안에서 처리하므로, 엄밀히 말하면 비관적 잠금의 한 형태입니다.

## 두 방식의 차이

**낙관적 잠금**은 잠금을 걸지 않고, 행에 `version` 같은 필드를 두어 충돌을 나중에 감지합니다. 재고를 읽은 뒤 `version`이 같은 경우에만 갱신하고, 실패하면 다시 시도합니다. 충돌이 드문 상황에서는 효율적입니다. 그러나 인기 상품처럼 동시 요청이 많으면 대부분의 요청이 실패하고 재시도가 연쇄적으로 발생해서 오히려 DB 부하가 커집니다.

**비관적 잠금**은 행을 읽는 시점에 잠금을 걸어 다른 트랜잭션이 기다리게 합니다. 충돌을 미리 막으므로 재시도가 필요 없습니다. 대신 잠금을 오래 쥐고 있으면 대기가 길어지므로, 트랜잭션을 짧게 유지해야 합니다.

| 구분 | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 충돌 처리 | 나중에 감지하고 재시도 | 미리 막고 대기 |
| 충돌이 잦을 때 | 재시도가 쌓여 비효율적 | 대기 시간이 늘지만 정합성 유지 |
| 구현 난이도 | 재시도 로직이 필요함 | 상대적으로 단순함 |

## Prisma 구현 방법

### 1. 조건부 원자적 UPDATE (권장)

재고가 충분한 경우에만 차감하도록 WHERE 조건에 포함합니다. PostgreSQL은 UPDATE 시 행을 잠그고, 대기 후에도 조건을 다시 평가하므로 음수가 되지 않습니다.

```ts
const result = await prisma.product.updateMany({
  where: {
    id: productId,
    stock: { gte: quantity },
  },
  data: {
    stock: { decrement: quantity },
  },
});

if (result.count === 0) {
  throw new Error('재고가 부족합니다.');
}
```

`result.count`가 0이면 차감된 행이 없다는 뜻이므로, 재고 부족으로 처리합니다.

### 2. 명시적 비관적 잠금

주문 처리 중에 재고를 읽고 검증한 뒤 다른 로직과 함께 처리해야 한다면, 트랜잭션 안에서 `FOR UPDATE`를 사용합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [product] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;

  if (!product || product.stock < quantity) {
    throw new Error('재고가 부족합니다.');
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });

  // 주문 생성 등 같은 트랜잭션에서 처리할 작업을 이어서 수행합니다.
});
```

트랜잭션 안에서 외부 API 호출처럼 시간이 오래 걸리는 작업은 넣지 않는 것이 좋습니다. 잠금 시간이 늘어나 대기가 길어집니다.

### 3. 최후의 안전장치

애플리케이션 로직과 별개로 DB 수준에서 음수를 막아 두는 것이 좋습니다. Prisma 스키마로는 CHECK 제약을 표현할 수 없으므로 마이그레이션 SQL에 직접 추가합니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

## 추가로 고려할 점

- **트랜잭션 범위**: 재고 차감과 주문 생성을 같은 트랜잭션에 묶어야 한쪽만 성공하는 상황을 막을 수 있습니다.
- **결제 흐름**: 결제 완료 시점에 차감하면 결제 실패나 이탈로 재고가 묶이는 문제가 생깁니다. 주문 접수 시점에 임시 점유를 하고, 결제 실패 시 복구하는 구조도 함께 검토해 보세요.
- **초고트래픽**: 한 상품에 초당 수천 건 이상이 몰리면 DB 행 하나가 병목이 됩니다. 이때는 Redis의 원자적 카운터로 먼저 차감하고 DB에 비동기로 반영하는 방식이나, 대기열을 두는 방식을 고려할 수 있습니다.

우선은 1번 방식으로 구현하고 CHECK 제약을 함께 추가하는 것을 권합니다. 그 뒤 부하 테스트로 병목을 확인하면서 구조를 키워 가시면 됩니다.

</td>
<td valign="top">

## 두 방식의 차이

**비관적 잠금**은 재고 행을 읽는 시점에 잠가서 다른 트랜잭션이 끝날 때까지 기다리게 합니다. PostgreSQL 에서는 `SELECT ... FOR UPDATE` 로 구현합니다. 충돌이 자주 일어난다고 가정하고 미리 막는 방식입니다.

**낙관적 잠금**은 잠그지 않고 읽은 뒤, `version` 컬럼이 읽을 때와 같은지 확인하면서 갱신합니다. 다른 요청이 먼저 바꿨다면 갱신된 행이 0건이므로 다시 읽고 재시도합니다. 충돌이 드물다고 가정하는 방식입니다.

현재 문제는 대부분 "재고를 읽고, 애플리케이션에서 계산한 뒤, 다시 쓰는" 순서에서 생깁니다. 두 요청이 같은 재고 값을 읽으면 둘 다 차감에 성공해서 재고가 음수가 됩니다.

## 인기 상품에는 어느 쪽이 맞는가

인기 상품은 같은 행에 요청이 몰리므로 충돌이 자주 일어납니다. 이 상황에서 낙관적 잠금은 충돌마다 실패하고 재시도하므로, 요청이 많을수록 재시도가 늘어나고 재시도 한도를 넘긴 주문이 실패합니다. 따라서 이런 상품에는 비관적 잠금이 더 적합합니다.

다만 이 문제에서는 잠금을 직접 잡기보다 **조건을 포함한 단일 UPDATE 문**을 쓰는 편이 가장 단순합니다. 재고 확인과 차감이 한 문장으로 실행되므로 요청끼리 엇갈릴 여지가 없습니다. PostgreSQL 은 대기하던 UPDATE 가 잠금을 얻은 뒤 WHERE 조건을 최신 행으로 다시 평가하므로, 재고가 부족한 요청은 0건으로 끝납니다.

## Prisma 구현 예시

조건부 UPDATE 는 Prisma 의 `updateMany` 로 작성합니다. `update` 는 `where` 에 고유 키만 받으므로 재고 조건을 걸 수 없습니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new Error('재고가 부족합니다.');
}
```

DB 에도 마지막 안전장치를 두는 것이 좋습니다. 애플리케이션 코드에 버그가 생겨도 음수 재고가 저장되지 않습니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

여러 상품을 한 주문에서 함께 차감해야 한다면 비관적 잠금이 필요할 수 있습니다. 이때는 트랜잭션 안에서 `FOR UPDATE` 로 행을 잠그고 차감하며, 여러 행을 잠글 때는 `id` 순서로 정렬해야 교착 상태를 피할 수 있습니다.

```ts
await prisma.$transaction(async (tx) => {
  const [product] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE`;

  if (product.stock < quantity) {
    throw new Error('재고가 부족합니다.');
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

단일 상품 주문이라면 앞의 `updateMany` 방식으로 충분하고, 코드도 더 짧습니다.

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

## 원인: 읽기 후 쓰기(read-then-write) 경쟁

재고가 음수가 되는 전형적인 원인은 아래와 같은 코드입니다.

```ts
const product = await prisma.product.findUnique({ where: { id } });
if (product.stock >= qty) {
  await prisma.product.update({
    where: { id },
    data: { stock: product.stock - qty },
  });
}
```

두 요청이 동시에 `stock = 1`을 읽으면 둘 다 검사를 통과하고, 둘 다 쓰기를 수행해 결과적으로 재고가 -1이 될 수 있습니다. 이 문제는 잠금 방식을 고르기 전에 **검사와 차감을 하나의 원자적 연산으로 묶어야** 해결됩니다.

## 두 방식의 차이

| 구분 | 비관적 잠금 (Pessimistic) | 낙관적 잠금 (Optimistic) |
|---|---|---|
| 기본 가정 | 충돌이 자주 일어난다 | 충돌이 드물다 |
| 방법 | 읽을 때 행을 잠근다 (`SELECT ... FOR UPDATE`) | 잠그지 않고 `version` 컬럼으로 변경 여부를 확인한다 |
| 충돌 시 | 다른 트랜잭션이 대기한다 | 업데이트 실패 후 재시도한다 |
| 장점 | 충돌이 많아도 재시도가 없고 결과가 확실하다 | 잠금 대기가 없어 충돌이 적을 때 처리량이 높다 |
| 단점 | 잠금 대기가 길어지고 데드락 가능성이 있다 | 인기 상품에서는 재시도가 폭증해 실패가 많아진다 |

## 인기 상품 쇼핑몰에는 비관적 계열이 맞습니다

낙관적 잠금은 충돌이 드물 때 유리합니다. 인기 상품에 주문이 몰리면 동시에 같은 행을 수정하려는 요청이 많아지고, 대부분이 실패 후 재시도하게 됩니다. 재시도가 다시 충돌을 부르는 악순환이 생기고, 사용자는 "재고 부족"이라는 오류를 자주 보게 됩니다.

다만 **명시적인 `FOR UPDATE`보다는 조건부 원자 UPDATE**를 쓰는 것을 권장합니다. 이 방식도 UPDATE 과정에서 행 잠금을 잡기 때문에 비관적 잠금과 같은 효과를 내면서, 잠금을 짧게 유지하고 코드도 단순합니다.

```ts
// 재고가 충분할 때만 차감. 영향받은 행 수로 성공 여부를 판단한다.
const result = await prisma.product.updateMany({
  where: {
    id: productId,
    stock: { gte: qty },   // 검사와 차감이 한 SQL 문장에서 함께 일어난다
  },
  data: {
    stock: { decrement: qty },
  },
});

if (result.count === 0) {
  throw new Error('재고 부족');
}
```

생성되는 SQL은 `UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $3` 형태입니다. PostgreSQL은 행 잠금을 기다린 뒤 WHERE 조건을 다시 평가하므로 Read Committed 격리 수준에서도 안전합니다.

## 추가로 적용할 것

**1. DB 레벨 안전장치**
애플리케이션 코드에 버그가 생겨도 음수 재고가 저장되지 않도록 CHECK 제약을 추가합니다. Prisma 마이그레이션 파일에 직접 작성하면 됩니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

**2. 여러 상품을 한 주문에 담는 경우**
트랜잭션 안에서 상품 ID를 정렬한 순서대로 차감해야 데드락을 줄일 수 있습니다. 하나라도 실패하면 예외를 던져 전체를 롤백합니다.

```ts
await prisma.$transaction(async (tx) => {
  const sorted = [...items].sort((a, b) => a.productId.localeCompare(b.productId));
  for (const item of sorted) {
    const r = await tx.product.updateMany({
      where: { id: item.productId, stock: { gte: item.qty } },
      data: { stock: { decrement: item.qty } },
    });
    if (r.count === 0) throw new Error(`재고 부족: ${item.productId}`);
  }
  // 주문 생성 로직 ...
});
```

**3. 트랜잭션은 짧게 유지**
외부 API 호출이나 결제 처리를 트랜잭션 안에 넣으면 잠금 시간이 길어집니다. 재고 차감만 트랜잭션으로 묶고, 결제는 그 뒤에 처리하거나 재고를 "예약" 상태로 두었다가 결제 완료 시 확정하는 방식을 검토하세요.

**4. 트래픽이 매우 많다면**
아주 짧은 시간에 수천 건이 몰리는 한정 판매라면 DB 행 잠금 자체가 병목이 됩니다. 이때는 Redis의 원자 연산으로 재고를 먼저 차감하거나 대기열을 두는 구조를 고려하세요.

## 정리

- 음수 재고의 원인은 읽기와 쓰기가 분리된 코드입니다.
- 인기 상품에는 낙관적 잠금보다 **조건부 원자 UPDATE(비관적 계열)** 가 적합합니다.
- Prisma에서는 `updateMany`에 `stock: { gte: qty }` 조건과 `decrement`를 함께 쓰고, `count`로 성공 여부를 확인하세요.
- CHECK 제약으로 DB에서도 음수를 막아 두면 더 안전합니다.

</td>
<td valign="top">

## 결론

인기 상품처럼 같은 행에 주문이 몰리는 경우에는 **비관적 잠금 방식**이 맞습니다. 다만 Prisma에서는 `SELECT ... FOR UPDATE`를 직접 쓰기보다 **조건을 포함한 단일 UPDATE문**으로 처리하는 편이 간단하고 안전합니다. 이 방식은 DB가 행 잠금을 잡은 상태에서 재고 확인과 차감을 한 번에 수행합니다.

## 두 방식의 차이

**낙관적 잠금**은 행을 잠그지 않고, `version` 같은 컬럼으로 충돌 여부를 나중에 확인합니다. 읽은 값과 저장하려는 시점의 버전이 다르면 실패시키고 재시도합니다. 충돌이 드문 환경에서는 잠금 대기가 없어 효율적입니다.

**비관적 잠금**은 행을 읽는 시점에 잠금을 걸어 다른 트랜잭션이 그 행을 수정하지 못하게 막습니다. 다른 요청은 잠금이 풀릴 때까지 기다립니다.

## 인기 상품에 비관적 잠금이 맞는 이유

낙관적 잠금은 충돌이 잦을수록 실패가 늘어납니다. 주문 100건이 동시에 들어오면 한 건만 성공하고 나머지는 재시도를 반복하며, 재시도 횟수가 많아지면 결국 실패로 처리됩니다. 재고가 남아 있는데도 주문이 실패하는 상황이 생기기 쉽습니다.

비관적 잠금은 요청을 순서대로 처리하므로 충돌 자체는 해소됩니다. 트랜잭션이 짧다면 대기 시간도 감당할 만합니다.

## Prisma 구현 예시

### 1. 조건부 원자적 UPDATE (권장)

재고가 요청 수량 이상일 때만 차감합니다. 조건과 차감이 한 문장에서 이루어지므로 읽고 나서 쓰는 사이의 간격이 생기지 않습니다.

```ts
async function decreaseStock(productId: number, quantity: number) {
  const { count } = await prisma.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });

  if (count === 0) {
    throw new Error('재고가 부족합니다.');
  }
}
```

### 2. 여러 상품을 한 주문에 담는 경우

교차 잠금으로 인한 데드락을 막으려면 상품 ID 순서로 차감하고, 주문 생성도 같은 트랜잭션에 묶어야 합니다.

```ts
await prisma.$transaction(async (tx) => {
  const sorted = [...items].sort((a, b) => a.productId - b.productId);

  for (const item of sorted) {
    const { count } = await tx.product.updateMany({
      where: { id: item.productId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (count === 0) {
      throw new Error(`상품 ${item.productId}의 재고가 부족합니다.`);
    }
  }

  await tx.order.create({ data: { /* 주문 정보 */ } });
});
```

### 3. 안전장치: DB 제약 조건

애플리케이션 로직에 버그가 생겨도 음수 재고가 저장되지 않도록 마이그레이션에 CHECK 제약을 추가합니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

### 4. 참고: 재고 계산이 복잡한 경우

할인 규칙처럼 차감 전에 여러 값을 계산해야 한다면 행 잠금을 직접 잡을 수 있습니다.

```ts
await prisma.$transaction(async (tx) => {
  const [product] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;

  if (product.stock < quantity) {
    throw new Error('재고가 부족합니다.');
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

## 참고 사항

- 트랜잭션은 짧게 유지하세요. 외부 API 호출을 트랜잭션 안에 넣으면 잠금 시간이 길어져 병목이 됩니다.
- 낙관적 잠금은 상품 수정처럼 충돌이 드문 작업에 적합합니다. 재고 차감에는 맞지 않습니다.
- 기본 격리 수준인 READ COMMITTED에서도 위 방식들은 음수 재고를 막습니다. 별도로 SERIALIZABLE을 설정할 필요는 없습니다.

</td>
<td valign="top">

## 문제의 원인

재고 차감은 보통 "재고를 읽는다, 값을 계산한다, 다시 쓴다"의 세 단계로 진행됩니다. 두 요청이 같은 재고 값을 동시에 읽으면 둘 다 재고가 충분하다고 판단하고 차감하므로 재고가 음수가 됩니다. PostgreSQL의 기본 격리 수준인 READ COMMITTED에서는 읽기와 쓰기 사이의 간격을 DB가 자동으로 막지 않습니다.

## 두 방식의 차이

- **비관적 잠금**: 재고 행을 읽을 때 잠금을 걸어 다른 트랜잭션이 기다리게 합니다. PostgreSQL에서는 `SELECT ... FOR UPDATE`로 구현합니다. 충돌을 미리 막지만, 잠금을 잡고 있는 동안 같은 상품에 대한 다른 요청은 모두 대기합니다.
- **낙관적 잠금**: 잠금을 걸지 않고 버전 번호나 재고 값을 조건으로 넣어 갱신합니다. 갱신된 행이 0건이면 다른 요청이 먼저 값을 바꾼 것이므로 실패로 처리하고 재시도합니다. 충돌이 드문 경우에는 대기 없이 빠르게 동작하지만, 충돌이 잦으면 재시도가 계속 쌓입니다.

## 인기 상품에는 어느 쪽이 맞는지

인기 상품은 같은 행에 요청이 집중되므로 충돌이 자주 발생합니다. 이 상황에서 낙관적 잠금은 대부분의 요청이 재시도를 반복하게 만들어 처리량이 크게 떨어집니다. 비관적 잠금은 정확성은 보장하지만, 같은 상품의 요청이 한 줄로 기다리게 됩니다.

이 경우에는 두 방식보다 **조건을 붙인 단일 UPDATE**를 권장합니다. 재고 검사와 차감을 한 문장에서 처리하므로 PostgreSQL이 행 잠금을 잡은 상태에서 조건을 확인하고, 별도의 읽기나 재시도가 필요 없습니다.

```sql
UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1;
```

Prisma에서는 `updateMany`로 같은 동작을 구현합니다.

```ts
await prisma.$transaction(async (tx) => {
  const result = await tx.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
  if (result.count === 0) {
    throw new OutOfStockError(productId);
  }

  await tx.order.create({
    data: { productId, quantity, userId },
  });
});
```

이 코드에는 다음 사항이 함께 필요합니다.

1. **주문 생성과 재고 차감을 같은 트랜잭션에 둡니다.** 주문 저장이 실패하면 차감된 재고도 함께 되돌아갑니다.
2. **DB 제약을 마지막 안전장치로 추가합니다.** 애플리케이션 코드에 누락이 생겨도 음수 재고를 막을 수 있습니다.
   ```sql
   ALTER TABLE products ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
   ```
3. **여러 상품을 한 주문에서 차감할 때는 상품 id 순서로 갱신합니다.** 순서가 서로 달라지면 두 트랜잭션이 서로의 잠금을 기다리는 데드락이 생길 수 있습니다.

## 다른 방식이 맞는 경우

- 차감 여부를 정하려면 재고 말고도 여러 테이블을 읽어야 한다면 `SELECT ... FOR UPDATE`로 행을 먼저 잠그는 비관적 잠금이 적합합니다.
- 충돌이 드문 데이터, 예를 들어 사용자 프로필 수정처럼 동시에 같은 행을 바꿀 일이 거의 없는 경우에는 버전 컬럼을 사용하는 낙관적 잠금이 적합합니다.

인기 상품의 재고 차감은 조건부 UPDATE로 처리하고, 주문 생성과 같은 트랜잭션에 묶는 구성을 먼저 적용해 보세요. 특정 상품에 초당 요청이 수백 건 이상 몰린다면 같은 행의 잠금 대기 자체가 병목이 되므로, 그때는 Redis 같은 별도 재고 저장소로 예약을 분리하는 구조를 검토해야 합니다.

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
| 기본 | 0.0 | 2.83 |
| fluent-korean | 0.0 | 2.17 |
| 우리 스킬 | 0.0 | 1.00 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

## 관리자 회원 목록 성능 개선 결과

`GET /admin/members`의 평균 응답 시간이 **4.2초에서 0.31초로** 줄었습니다. 회원 2만 명 데이터로 10회 측정한 평균이며, 측정 조건은 동일합니다.

### 원인
1. **N+1 쿼리:** 회원마다 최근 주문을 따로 조회하고 있었습니다. 한 페이지가 50명이면 쿼리가 51번 나갔습니다.
2. **인덱스 누락:** `members.created_at`에 인덱스가 없어서 정렬할 때 전체 테이블을 스캔했습니다.

### 변경 사항
- **`MemberRepository.findPage`**: 최근 주문을 `JOIN LATERAL` 쿼리 한 번으로 가져오도록 바꿨습니다.
- **마이그레이션 `20261120_add_members_created_at_idx`**: `members.created_at` 인덱스를 `CREATE INDEX CONCURRENTLY`로 추가했습니다.

### 테스트 결과
- `members.integration.spec.ts`: 12개 전부 통과
- 전체 통합 테스트: 148개 중 147개 통과
- 실패한 1개는 `coupons.integration.spec.ts`의 "만료 쿠폰 정리" 케이스입니다. 이번 변경 전 main 브랜치에서도 같은 테스트가 실패했고, 시간대 문제로 보입니다. 이번 작업과는 무관하므로 건드리지 않았습니다.

### 아직 남은 문제
- **회원 검색(이름 LIKE 검색)은 여전히 1.8초**가 걸립니다. 요청 범위가 목록 화면이라 이번에는 손대지 않았습니다. 느린 검색도 불편하다면 별도로 작업할 수 있습니다. 보통은 트라이그램(`pg_trgm`) 인덱스로 해결합니다.

### 확인이 필요한 사항
- **운영 DB 마이그레이션은 아직 적용하지 않았습니다.** 현재 스테이징에만 적용되어 있습니다. 운영 적용 여부와 시점은 직접 결정해 주세요.
- 운영에 적용할 때 `CREATE INDEX CONCURRENTLY`는 쓰기를 막지 않는 대신 시간이 더 걸립니다. 중간에 실패하면 `INVALID` 상태의 인덱스가 남을 수 있으니, 적용 후 `pg_index`에서 `indisvalid`를 확인해 주세요.

</td>
<td valign="top">

## 작업 결과 보고

관리자 회원 목록 화면이 느린 원인을 찾아 수정했습니다. 같은 데이터로 `GET /admin/members`를 측정했을 때 평균 응답 시간은 4.2초에서 0.31초로 줄었습니다.

### 원인

1. **N+1 쿼리**: 회원마다 최근 주문을 따로 조회했습니다. 한 페이지에 회원이 50명 표시되므로 쿼리가 51번 실행되었습니다.
2. **인덱스 부재**: `members.created_at`에 인덱스가 없어서 정렬할 때 전체 테이블을 스캔했습니다.

### 조치

1. `MemberRepository.findPage`가 최근 주문을 `JOIN LATERAL` 쿼리 한 번으로 함께 가져오도록 바꿨습니다.
2. 마이그레이션 `20261120_add_members_created_at_idx`를 추가했습니다. 이 마이그레이션은 `CREATE INDEX CONCURRENTLY`를 사용하므로 인덱스를 만드는 동안에도 테이블에 대한 쓰기가 계속 가능합니다.

### 검증

- 회원 2만 명 기준으로 10회 측정한 평균 응답 시간은 4.2초에서 0.31초로 줄었습니다.
- `members.integration.spec.ts`의 테스트 12개가 모두 통과했습니다.
- 전체 통합 테스트 148개 중 147개가 통과했습니다. 실패한 1개는 `coupons.integration.spec.ts`의 "만료 쿠폰 정리" 케이스입니다. 이 케이스는 이번 변경 이전의 main 브랜치에서도 실패하므로 이번 작업과는 무관해 보입니다. 시간대 문제로 추정되며, 이번 작업에서는 수정하지 않았습니다.

### 다루지 않은 부분

- 회원 검색(이름 LIKE 검색)은 여전히 1.8초가 걸립니다. 요청 범위를 벗어나 그대로 두었습니다. 필요하시면 별도로 진행하겠습니다.

### 결정이 필요한 사항

- 마이그레이션은 스테이징 DB에만 적용했습니다. 운영 DB에 적용할지는 사용자께서 결정해 주셔야 합니다.

</td>
<td valign="top">

## 결과

관리자 회원 목록(`GET /admin/members`)의 응답 시간이 회원 2만 명 기준 평균 4.2초에서 0.31초로 줄었습니다. 같은 데이터로 10회 측정한 평균입니다.

## 원인과 조치

- **회원마다 최근 주문을 따로 조회하던 문제**: 한 페이지에 회원이 50명이라 쿼리가 51번 실행되고 있었습니다. `MemberRepository.findPage`가 최근 주문을 `JOIN LATERAL` 쿼리 한 번으로 가져오도록 변경했습니다.
- **`members.created_at`에 인덱스가 없던 문제**: 정렬할 때마다 전체 회원을 훑고 있었습니다. 마이그레이션 `20261120_add_members_created_at_idx`를 추가해 인덱스를 만들었습니다. 생성 중에도 테이블 읽기와 쓰기가 막히지 않도록 `CREATE INDEX CONCURRENTLY`로 작성했습니다.

## 확인 결과

- `members.integration.spec.ts` 12개 통과
- 전체 통합 테스트 148개 중 147개 통과
- 실패한 1개는 `coupons.integration.spec.ts`의 "만료 쿠폰 정리" 케이스입니다. 이번 변경 전의 main에서도 실패했고, 시간대 문제로 보입니다. 이번 작업과 관련이 없어서 건드리지 않았습니다.

## 남은 일

- **운영 DB 마이그레이션**: 마이그레이션은 스테이징에만 적용했습니다. 운영 DB에 적용할지는 결정이 필요합니다.
- **회원 검색**: 이름 LIKE 검색은 아직 1.8초가 걸립니다. 요청 범위 밖이라 그대로 두었습니다. 검색 속도도 줄이려면 별도 작업으로 요청해 주시면 진행하겠습니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

## 관리자 회원 목록 성능 개선 완료

`GET /admin/members` 응답 시간을 **평균 4.2초에서 0.31초로** 줄였습니다. 회원 2만 명 기준으로 같은 데이터에서 10회 측정한 평균입니다.

### 원인

1. **N+1 쿼리**: 회원마다 최근 주문을 따로 조회했습니다. 한 페이지가 50명이라 페이지 하나에 쿼리가 51번 나갔습니다.
2. **인덱스 누락**: `members.created_at`에 인덱스가 없어서 정렬할 때 전체를 스캔했습니다.

### 변경 사항

- **`MemberRepository.findPage`**: 최근 주문을 `JOIN LATERAL` 쿼리 한 번으로 가져오도록 바꿨습니다. 쿼리가 51번에서 1번으로 줄었습니다.
- **마이그레이션 `20261120_add_members_created_at_idx`**: `members.created_at` 인덱스를 추가합니다. `CREATE INDEX CONCURRENTLY`를 써서 운영 중에도 테이블 쓰기를 막지 않습니다.

### 검증

- `members.integration.spec.ts`: 12개 전부 통과
- 전체 통합 테스트: 148개 중 147개 통과
- 실패한 1개는 `coupons.integration.spec.ts`의 "만료 쿠폰 정리" 케이스입니다. 이번 변경 전 main 브랜치에서도 같은 테스트가 실패했고, 시간대 문제로 보입니다. 이번 작업 범위가 아니어서 건드리지 않았습니다.

### 아직 남은 것

- **운영 DB 마이그레이션 적용 여부는 결정이 필요합니다.** 지금은 스테이징에만 적용했습니다. 운영에 적용하기 전에 인덱스 생성 시간과 부하를 확인하시길 권합니다.
- **회원 검색(이름 LIKE 검색)은 여전히 약 1.8초**입니다. 요청 범위 밖이라 그대로 두었습니다. 원하시면 별도로 작업할 수 있습니다. 이름 검색은 일반 B-tree 인덱스로는 `LIKE '%...%'` 패턴을 처리하기 어려우니, 필요하면 trigram 인덱스 같은 방법을 검토해야 합니다.
- **쿠폰 테스트 실패**는 기존 문제이므로 별도 이슈로 추적하시는 것이 좋겠습니다.

</td>
<td valign="top">

## 작업 결과 보고

관리자 회원 목록 화면(`GET /admin/members`)의 응답 속도를 개선했습니다. 회원 2만 명 기준 평균 응답 시간은 4.2초에서 0.31초로 줄었습니다.

### 원인

1. **N+1 쿼리**: 회원마다 최근 주문을 따로 조회했습니다. 한 페이지에 50명이 표시되므로 요청 한 번에 쿼리가 51번 실행되었습니다.
2. **`members.created_at` 인덱스 부재**: 목록을 생성일 기준으로 정렬할 때 전체 테이블을 스캔했습니다.

### 조치

1. `MemberRepository.findPage`가 최근 주문을 `JOIN LATERAL` 쿼리 한 번으로 가져오도록 변경했습니다.
2. 마이그레이션 `20261120_add_members_created_at_idx`를 추가했습니다. 이 마이그레이션은 `CREATE INDEX CONCURRENTLY`로 작성되어 적용 중에도 테이블 쓰기를 막지 않습니다.

### 검증

- 같은 데이터로 10회 측정한 평균 응답 시간은 4.2초에서 0.31초로 줄었습니다.
- `members.integration.spec.ts` 12개 테스트를 모두 통과했습니다.
- 전체 통합 테스트 148개 중 147개가 통과했습니다.
- 실패한 1개는 `coupons.integration.spec.ts`의 "만료 쿠폰 정리" 케이스입니다. 이 실패는 이번 변경 이전의 main 브랜치에서도 재현되었습니다. 시간대 문제로 보이며, 이번 작업 범위에 포함하지 않아 수정하지 않았습니다.

### 이번에 다루지 않은 항목

- **회원 검색(이름 `LIKE` 검색)**: 여전히 약 1.8초가 걸립니다. 요청 범위 밖이어서 그대로 두었습니다. 필요하면 별도 작업으로 진행할 수 있습니다.

### 확인이 필요한 사항

- 마이그레이션은 스테이징 DB에만 적용했습니다. 운영 DB 적용 여부와 시점은 사용자께서 결정해 주셔야 합니다. `CREATE INDEX CONCURRENTLY`는 테이블을 잠그지 않지만, 대용량 테이블에서는 완료까지 시간이 걸리고 실패 시 무효 인덱스가 남을 수 있으므로 적용 전에 확인해 주시기 바랍니다.

</td>
<td valign="top">

## 결과

회원 목록 화면(`GET /admin/members`)의 평균 응답 시간을 4.2초에서 0.31초로 줄였습니다. 회원 2만 명 기준으로 같은 데이터에서 10회 측정한 평균입니다.

## 원인과 조치

- **회원마다 최근 주문을 따로 조회하던 문제**: 한 페이지에 회원 50명이 표시되어 쿼리가 51번 실행되었습니다. `MemberRepository.findPage`가 최근 주문을 `JOIN LATERAL` 쿼리 한 번으로 가져오도록 변경했습니다.
- **정렬 기준 컬럼에 인덱스가 없던 문제**: `members.created_at`으로 정렬할 때 전체 테이블을 스캔했습니다. 마이그레이션 `20261120_add_members_created_at_idx`에서 이 컬럼에 인덱스를 추가합니다. `CREATE INDEX CONCURRENTLY`를 사용하므로 인덱스를 만드는 동안에도 테이블 쓰기가 막히지 않습니다.

## 확인 결과

- `members.integration.spec.ts` 12개 테스트가 모두 통과했습니다.
- 전체 통합 테스트 148개 중 147개가 통과했습니다. 실패한 1개는 `coupons.integration.spec.ts`의 "만료 쿠폰 정리" 케이스입니다. 이 케이스는 이번 변경 전 main 브랜치에서도 실패했고, 시간대 문제로 보입니다. 이번 작업에서는 건드리지 않았습니다.

## 남은 작업

- **회원 검색 속도**: 이름 LIKE 검색은 여전히 약 1.8초가 걸립니다. 요청 범위 밖이라 이번 작업에서는 변경하지 않았습니다.
- **운영 DB 마이그레이션**: 마이그레이션은 현재 스테이징 DB에만 적용되어 있습니다. 운영 DB에 적용할지 정해 주시면 이어서 진행하겠습니다.

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

## 관리자 회원 목록 성능 개선 완료

`GET /admin/members`의 평균 응답 시간을 **4.2초에서 0.31초로** 줄였습니다. 같은 데이터(회원 2만 명)로 10회 측정한 평균입니다.

### 원인

1. **N+1 쿼리:** 회원마다 최근 주문을 따로 조회했습니다. 한 페이지가 50명이면 쿼리가 51번 나갔습니다.
2. **인덱스 누락:** `members.created_at`에 인덱스가 없어서 정렬할 때 전체 테이블을 스캔했습니다.

### 변경 사항

- **`MemberRepository.findPage`**: 최근 주문을 `JOIN LATERAL` 쿼리 한 번으로 함께 가져오도록 바꿨습니다.
- **마이그레이션 `20261120_add_members_created_at_idx`**: `members.created_at` 인덱스를 추가합니다. `CREATE INDEX CONCURRENTLY`를 사용해서 적용 중에도 테이블 쓰기가 막히지 않습니다.

### 테스트 결과

- `members.integration.spec.ts`: 12개 전부 통과
- 전체 통합 테스트: 148개 중 147개 통과
- 실패 1개는 `coupons.integration.spec.ts`의 "만료 쿠폰 정리" 케이스입니다. 이번 변경 전 main에서도 실패하고 있었고, 시간대 문제로 보입니다. 이번 작업 범위가 아니라서 건드리지 않았습니다.

### 아직 남은 것

- **회원 검색(이름 LIKE 검색)은 여전히 약 1.8초**가 걸립니다. 요청 범위 밖이라 그대로 두었습니다. 원하시면 별도로 처리할 수 있습니다. 앞쪽 와일드카드 LIKE는 일반 B-tree 인덱스를 쓸 수 없어서, trigram 인덱스(pg_trgm) 같은 방법이 필요할 가능성이 큽니다.

### 결정이 필요한 사항

- **운영 DB 마이그레이션 적용 여부**: 현재 인덱스 마이그레이션은 **스테이징에만 적용**되어 있습니다. 운영 적용 시점과 방법은 사용자가 결정해 주세요. `CONCURRENTLY`라 잠금 위험은 낮지만, 대용량 테이블이라 인덱스 생성 중 I/O 부하가 생길 수 있으니 트래픽이 적은 시간대에 진행하시는 것을 권장합니다.

</td>
<td valign="top">

## 작업 결과 보고

관리자 회원 목록 화면이 느린 원인 두 가지를 찾아 고쳤습니다. 같은 데이터 기준으로 `GET /admin/members`의 평균 응답 시간이 4.2초에서 0.31초로 줄었습니다.

### 원인

1. **N+1 쿼리**: 회원마다 최근 주문을 따로 조회하고 있었습니다. 한 페이지에 회원 50명이 표시되므로 요청 한 번에 쿼리가 51번 실행되었습니다.
2. **인덱스 누락**: `members.created_at` 컬럼에 인덱스가 없어서 정렬할 때 테이블 전체를 스캔했습니다.

### 조치

1. `MemberRepository.findPage`가 최근 주문을 `JOIN LATERAL` 쿼리 한 번으로 가져오도록 변경했습니다.
2. `members.created_at`에 인덱스를 추가하는 마이그레이션 `20261120_add_members_created_at_idx`를 작성했습니다. `CREATE INDEX CONCURRENTLY`를 사용하므로 인덱스를 만드는 동안에도 테이블 쓰기가 차단되지 않습니다.

### 결과

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 평균 응답 시간 (회원 2만 명, 10회 평균) | 4.2초 | 0.31초 |

### 테스트

- `members.integration.spec.ts`: 12개 모두 통과했습니다.
- 전체 통합 테스트: 148개 중 147개가 통과했습니다.

실패한 1개는 `coupons.integration.spec.ts`의 "만료 쿠폰 정리" 케이스입니다. 이 테스트는 이번 변경 전 main 브랜치에서도 실패하고 있었으며, 시간대 문제로 보입니다. 이번 작업 범위와 무관하므로 수정하지 않았습니다.

### 남은 사항

- **회원 검색은 여전히 느립니다.** 이름 LIKE 검색은 약 1.8초가 걸립니다. 요청 범위 밖이라 그대로 두었습니다. 원하시면 별도 작업으로 진행할 수 있습니다.
- **마이그레이션은 스테이징에만 적용했습니다.** 운영 DB 적용 여부는 사용자께서 결정해 주셔야 합니다. 운영에 적용하기 전에 인덱스 생성에 걸리는 시간과 디스크 여유 공간을 확인하시기를 권합니다.

</td>
<td valign="top">

## 작업 결과

관리자 회원 목록(`GET /admin/members`)의 응답 시간을 줄였습니다. 회원 2만 명 기준으로 평균 응답 시간이 4.2초에서 0.31초로 줄었습니다. 같은 데이터로 10회 측정한 평균입니다.

## 원인과 조치

- **회원마다 최근 주문을 따로 조회했습니다.** 한 페이지에 회원이 50명이면 쿼리가 51번 실행되었습니다. `MemberRepository.findPage`가 최근 주문을 `JOIN LATERAL` 쿼리 한 번으로 가져오도록 바꿨습니다.
- **`members.created_at`에 인덱스가 없어서 정렬할 때 전체를 스캔했습니다.** 인덱스를 추가하는 마이그레이션 `20261120_add_members_created_at_idx`를 작성했습니다. `CREATE INDEX CONCURRENTLY`를 사용하므로 인덱스를 만드는 동안에도 테이블 쓰기가 막히지 않습니다.

## 테스트 결과

- `members.integration.spec.ts`: 12개 전부 통과했습니다.
- 전체 통합 테스트: 148개 중 147개가 통과했습니다.
- 실패한 1개는 `coupons.integration.spec.ts`의 "만료 쿠폰 정리" 케이스입니다. 이번 변경 전의 main에서도 같은 케이스가 실패했습니다. 시간대 문제로 보이며, 이번 작업 범위가 아니어서 수정하지 않았습니다.

## 남은 문제와 결정이 필요한 사항

- 회원 검색(이름 LIKE 검색)은 여전히 약 1.8초가 걸립니다. 요청 범위 밖이라 그대로 두었습니다. 필요하면 별도로 작업할 수 있습니다.
- 마이그레이션은 스테이징 DB에만 적용했습니다. 운영 DB 적용 시점은 직접 정해 주셔야 합니다. 인덱스 생성에는 시간이 걸리므로 트래픽이 적은 시간에 적용하는 편이 좋습니다.

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
| 기본 | 0.0 | 1.50 |
| fluent-korean | 0.0 | 2.33 |
| 우리 스킬 | 0.0 | 2.17 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

**1. 제목**
카드 결제를 지금 할 수 없어요

**2. 본문**
카드사 점검 시간(매일 23:50~00:10)이라 결제가 거절됐어요. 장바구니와 입력하신 배송지 정보는 그대로 남아 있어요. 다른 카드나 계좌이체로는 지금 바로 결제할 수 있어요.

**3. 버튼**
- 다른 결제 수단 선택
- 닫기

</td>
<td valign="top">

**1. 제목**
카드 결제를 진행할 수 없어요

**2. 본문**
지금은 카드사 점검 시간(매일 23:50~00:10)이라 카드 결제가 제한돼요. 장바구니와 입력하신 배송지는 그대로 남아 있으니 다시 입력하지 않으셔도 돼요. 다른 카드나 계좌이체를 선택하면 지금 바로 결제할 수 있어요.

**3. 버튼**
- 다른 결제 수단 선택
- 닫기

</td>
<td valign="top">

**1. 제목**
카드 결제가 거절됐어요

**2. 본문**
지금은 카드사 점검 시간(매일 23:50~00:10)이라 카드 결제를 처리할 수 없어요. 장바구니와 배송지 정보는 그대로 남아 있어서, 다른 카드나 계좌이체로 바로 결제할 수 있어요.

**3. 버튼**
- 다른 결제 수단 고르기
- 닫기

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
카드사 점검 시간(매일 23:50~00:10)이라 카드 결제가 잠시 중단됐어요. 장바구니와 입력하신 배송지는 그대로 남아 있으니 다시 준비하지 않으셔도 돼요. 다른 카드나 계좌이체로는 지금 바로 결제하실 수 있어요.

**3. 버튼**
- 다른 결제 수단 선택
- 닫기

</td>
<td valign="top">

**1. 오류 팝업 제목**
결제를 진행할 수 없어요

**2. 오류 팝업 본문**
카드사가 매일 23:50부터 00:10까지 점검하고 있어서 결제가 거절되었어요. 장바구니에 담긴 상품과 입력하신 배송지는 그대로 남아 있어요. 다른 카드나 계좌이체로는 지금 바로 결제할 수 있어요.

**3. 버튼**
- 다른 결제 수단 선택
- 닫기

</td>
<td valign="top">

**제목**
카드사 점검으로 결제가 되지 않았어요

**본문**
지금은 카드사 점검 시간(매일 23:50~00:10)이라 카드 결제가 거절되었어요. 장바구니와 입력하신 배송지는 그대로 남아 있어요. 다른 카드나 계좌이체로는 지금 바로 결제할 수 있어요.

**버튼**
- 다른 결제 수단 선택
- 닫기

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
카드 결제가 잠시 안 돼요

**2. 본문**
카드사 점검 시간(매일 23:50~00:10)이라 결제가 거절됐어요. 장바구니와 입력하신 배송지는 그대로 있으니 다시 입력하지 않으셔도 돼요. 다른 카드나 계좌이체로는 지금 바로 결제하실 수 있어요.

**3. 버튼**
- 왼쪽(보조): 닫기
- 오른쪽(주요): 다른 결제 수단 선택

</td>
<td valign="top">

**1. 제목**
카드 결제를 진행할 수 없어요

**2. 본문**
카드사 점검 시간(매일 밤 11시 50분~다음 날 오전 0시 10분)에는 카드 결제를 이용할 수 없어요. 장바구니와 입력하신 배송지 정보는 그대로 남아 있어요. 다른 카드나 계좌이체로 지금 바로 결제할 수 있어요.

**3. 버튼**
- 다른 결제 수단 선택
- 닫기

</td>
<td valign="top">

**1. 제목**
카드사 점검으로 결제가 거절됐어요

**2. 본문**
매일 밤 11시 50분부터 다음 날 0시 10분까지는 카드사 점검으로 카드 결제가 중단돼요. 장바구니와 배송지는 그대로 남아 있으니, 다른 카드나 계좌이체로 지금 바로 결제할 수 있어요.

**3. 버튼**
- 다른 결제 수단 선택
- 닫기

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
| 기본 | 0.0 | 3.00 |
| fluent-korean | 0.0 | 1.33 |
| 우리 스킬 | 0.0 | 1.67 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

**1. 토글 아래 설명**

> 카드 결제 문자를 읽어 식비, 교통, 구독 등 지출 항목을 자동으로 분류합니다. 문자 내용은 기기 안에서만 처리되며, 문자 읽기 권한을 허용하지 않으면 이 기능이 꺼집니다.

**2. 처음 켰을 때 안내문**

> 자동 분류를 사용하려면 문자 읽기 권한이 필요합니다. 권한을 허용하지 않으면 이 기능은 꺼집니다.
> 카드 결제 문자를 읽어 식비, 교통, 구독 등 지출 항목을 자동으로 정합니다.
> 분류가 틀리면 직접 고칠 수 있으며, 고친 내용은 같은 가게의 다음 결제부터 반영됩니다.
> 문자 내용은 기기 안에서만 처리되고 서버로 보내지 않습니다.

</td>
<td valign="top">

**1. 토글 아래 설명**

카드 결제 문자를 읽어 식비, 교통, 구독 같은 지출 항목을 자동으로 분류합니다. 분류가 틀리면 직접 고칠 수 있으며, 수정한 내용은 같은 가게의 다음 결제부터 반영됩니다.

**2. 처음 켰을 때 보여 줄 안내문**

자동 분류를 켜면 카드 결제 문자를 읽어 지출 항목을 자동으로 정합니다. 문자 내용은 이 기기 안에서만 처리하며, 서버로 보내지 않습니다. 이 기능을 사용하려면 문자 읽기 권한이 필요합니다. 권한을 허용하지 않으면 자동 분류 기능이 꺼집니다.

</td>
<td valign="top">

**1. 토글 아래 설명**

> 카드 결제 문자를 읽어 식비, 교통, 구독 같은 지출 항목을 자동으로 정합니다. 문자 내용은 기기 안에서만 처리되고 서버로 전송되지 않으며, 문자 읽기 권한을 허용하지 않으면 이 기능이 꺼집니다.

**2. 처음 켰을 때 안내문**

> 자동 분류를 켜면 카드 결제 문자를 읽어 지출 항목을 정합니다. 분류가 틀리면 항목을 직접 고칠 수 있고, 고친 내용은 같은 가게의 다음 결제부터 반영됩니다. 문자 내용은 기기 안에서만 처리되며 서버로 보내지 않습니다. 이 기능을 사용하려면 문자 읽기 권한을 허용해야 하며, 권한을 허용하지 않으면 자동 분류가 꺼집니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

### 1. 토글 아래 설명

> 카드 결제 문자를 읽어 지출 항목을 자동으로 분류합니다. 문자 읽기 권한을 허용하지 않으면 이 기능은 꺼집니다.

### 2. 처음 켰을 때 안내문

> 자동 분류를 켜 주셔서 감사합니다. 카드 결제 문자를 읽어 식비, 교통, 구독 등 지출 항목을 자동으로 정합니다. 분류가 틀리면 직접 고칠 수 있으며, 수정한 내용은 같은 가게의 다음 결제부터 반영됩니다. 문자 내용은 기기 안에서만 처리되며 서버로 전송되지 않습니다.

</td>
<td valign="top">

### 1. 토글 아래 설명

> 카드 결제 문자를 읽어 식비, 교통, 구독 등의 지출 항목을 자동으로 정합니다. 분류가 틀리면 직접 고칠 수 있으며, 고친 내용은 같은 가게의 다음 결제부터 반영됩니다.

### 2. 처음 켰을 때 안내문

> 자동 분류를 켜면 카드 결제 문자를 읽어 지출 항목을 정합니다. 문자 내용은 이 기기 안에서만 처리되며 서버로 전송되지 않습니다. 이 기능을 사용하려면 문자 읽기 권한이 필요하며, 권한을 허용하지 않으면 자동 분류는 꺼집니다. 분류 결과가 틀리면 항목을 직접 바꿀 수 있고, 바꾼 내용은 같은 가게의 다음 결제부터 반영됩니다.

</td>
<td valign="top">

**1. 토글 아래 설명**

> 카드 결제 문자를 읽어 지출 항목을 자동으로 분류합니다. 문자 내용은 기기 안에서만 처리되며 서버로 보내지 않고, 문자 읽기 권한을 주지 않으면 이 기능은 꺼집니다.

**2. 처음 켰을 때 보여 줄 안내문**

> 자동 분류는 카드 결제 문자를 읽어 식비, 교통, 구독 같은 항목을 대신 정합니다. 분류가 틀리면 항목을 직접 고칠 수 있고, 고친 내용은 같은 가게의 다음 결제부터 반영됩니다. 문자 내용은 기기 안에서만 처리되며 서버로 전송되지 않습니다. 기능을 사용하려면 문자 읽기 권한을 허용해 주세요.

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

<cite index="">
</cite>

Hmm, that's not needed. Here is the copy.

**1. 토글 아래 설명**

> 카드 결제 문자를 읽어 식비, 교통, 구독 등 지출 항목을 자동으로 나눕니다. 분류가 틀리면 직접 고칠 수 있으며, 고친 내용은 같은 가게의 다음 결제부터 반영됩니다.

**2. 처음 켰을 때 안내문**

> 자동 분류를 켜면 카드 결제 문자를 읽어 지출 항목을 자동으로 정합니다. 문자 내용은 이 기기 안에서만 처리되며 서버로 전송되지 않습니다. 이 기능을 사용하려면 문자 읽기 권한이 필요하며, 권한을 허용하지 않으면 자동 분류는 꺼진 상태로 유지됩니다. 분류 결과가 틀린 경우 직접 수정할 수 있고, 수정한 내용은 같은 가게의 다음 결제부터 적용됩니다.

</td>
<td valign="top">

**1. 토글 아래 설명**

카드 결제 문자를 읽어 식비, 교통, 구독 등의 지출 항목을 자동으로 분류합니다. 문자 내용은 기기 안에서만 처리되며 서버로 전송되지 않습니다.

**2. 처음 켰을 때 보여 줄 안내문**

자동 분류 기능은 카드 결제 문자를 읽어 지출 항목을 자동으로 정합니다. 이 기능을 사용하려면 문자 읽기 권한이 필요하며, 권한을 허용하지 않으면 기능이 꺼집니다. 분류가 틀린 내역은 직접 고칠 수 있습니다. 고친 내용은 같은 가게의 다음 결제부터 반영됩니다.

</td>
<td valign="top">

**1. 토글 아래 설명**

> 카드 결제 문자를 읽어 식비, 교통, 구독 같은 지출 항목을 자동으로 정합니다. 문자 내용은 기기 안에서만 처리되며 서버로 전송되지 않습니다. 문자 읽기 권한을 허용하지 않으면 이 기능이 꺼집니다.

**2. 처음 켰을 때 보여 줄 안내문**

> 자동 분류를 켜면 카드 결제 문자를 읽어 식비, 교통, 구독 같은 항목으로 나눕니다. 분류가 틀렸다면 항목을 직접 고칠 수 있으며, 고친 내용은 같은 가게의 다음 결제부터 반영됩니다. 문자 내용은 기기 안에서만 처리되고 서버로 보내지 않습니다. 문자 읽기 권한을 허용하지 않으면 이 기능은 자동으로 꺼집니다.

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
| 기본 | 0.0 | 1.67 |
| fluent-korean | 3.3 | 2.67 |
| 우리 스킬 | 0.0 | 1.67 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

캐시는 응답 속도를 높이는 데만 쓰이지 않고, 서비스 안정성에도 직접 영향을 줍니다. 지난 분기에 저는 상품 상세 API 앞에 Redis 캐시를 붙였습니다. 그 결과 평균 응답 시간은 480ms에서 95ms로 줄었고, DB CPU 사용률은 71%에서 38%로 내려갔습니다.

다만 캐시를 도입하면 데이터 정합성 문제가 바로 따라옵니다. 가격이 바뀌었는데도 캐시에 남아 있던 이전 가격이 최대 10분 동안 그대로 노출되는 문제가 있었습니다. 이를 막기 위해 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 바로 삭제하도록 무효화 로직을 넣었습니다.

캐시는 빠른 만큼 그에 맞는 관리가 필요합니다.

</td>
<td valign="top">

캐시는 응답 속도를 높이는 도구에 그치지 않고, 서비스의 안정성을 떠받치는 핵심 구성 요소입니다. 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 그 결과 평균 응답 시간은 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 내려갔습니다.

다만 캐시를 도입하는 순간 데이터 정합성이라는 새로운 과제가 생깁니다. 가격이 바뀌었는데도 캐시에 남아 있던 예전 가격이 최대 10분 동안 사용자에게 노출되는 문제가 있었습니다. 이를 해결하기 위해 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 즉시 삭제하는 무효화 전략을 도입했습니다.

캐시 운영은 단순한 기술 선택을 넘어, 팀의 운영 역량이 드러나는 지표입니다. 정리하면 캐시는 빠른 만큼 신중한 관리가 필요합니다.

</td>
<td valign="top">

캐시는 응답 속도를 높이는 도구에 그치지 않고, 서비스 안정성을 떠받치는 구성 요소입니다. 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했고, 그 결과 평균 응답 시간은 480ms에서 95ms로 줄었으며 DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 도입하면 데이터 정합성 문제를 함께 해결해야 합니다. 실제로 가격이 바뀌었는데도 캐시에 남은 예전 가격이 최대 10분 동안 노출되는 문제가 있었습니다.

저는 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 즉시 삭제하도록 무효화 방식을 바꿨습니다. 캐시를 어떻게 운영하는지는 기술 선택만큼 팀의 운영 역량을 보여 준다고 생각합니다. 캐시는 빠른 만큼 신중하게 관리해야 합니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

캐시는 응답 속도를 높이는 도구에 그치지 않고, 서비스 안정성을 떠받치는 중요한 요소입니다. 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했고, 그 결과 평균 응답 시간은 480ms에서 95ms로 줄었습니다. DB의 CPU 사용률도 71%에서 38%로 낮아졌습니다. 다만 캐시를 도입하면 데이터 정합성이라는 문제가 생깁니다. 가격이 바뀐 뒤에도 캐시에 남아 있던 이전 가격이 최대 10분 동안 사용자에게 보이는 일이 있었습니다. 이 문제를 해결하려고 가격 변경 이벤트를 수신하면 해당 상품의 캐시 키를 바로 삭제하는 방식으로 무효화 전략을 바꿨습니다. 결국 캐시는 빠른 만큼 세심하게 관리해야 한다는 것이 이번 작업에서 얻은 결론입니다.

</td>
<td valign="top">

캐시는 응답 속도를 높이는 도구에 그치지 않고, 서비스 안정성을 떠받치는 중요한 구성 요소입니다. 우리는 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 그 결과 평균 응답 시간은 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 내려갔습니다. 다만 캐시를 도입하면 데이터 정합성이라는 새로운 문제가 생깁니다. 실제로 가격이 바뀌었는데도 캐시에 남아 있던 이전 가격이 최대 10분 동안 사용자에게 노출되는 문제가 있었습니다. 이를 해결하기 위해 가격 변경 이벤트를 수신하면 해당 상품의 캐시 키를 즉시 삭제하는 방식으로 무효화 전략을 도입했습니다. 캐시 운영은 단순한 기술 선택을 넘어 팀의 운영 역량을 보여주는 지표입니다. 정리하면 캐시는 빠른 만큼 신중하게 관리해야 합니다.

</td>
<td valign="top">

캐시는 응답을 빠르게 만들 뿐 아니라 서비스가 안정적으로 동작하도록 돕는 중요한 구성 요소입니다. 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했고, 그 결과 평균 응답 시간이 480ms에서 95ms로 줄었으며 DB의 CPU 사용률도 71%에서 38%로 내려갔습니다.

다만 캐시를 도입하면 데이터 정합성을 따로 관리해야 합니다. 가격이 바뀌었는데도 캐시에 남은 예전 가격이 최대 10분 동안 노출되는 문제가 있었습니다. 이를 해결하려고 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 바로 삭제하는 방식으로 무효화 전략을 도입했습니다.

캐시는 빠른 만큼 그에 맞는 관리가 필요합니다.

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

캐시는 응답 속도를 높이는 도구에 그치지 않고, 서비스 안정성을 떠받치는 핵심 구성 요소입니다. 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했고, 그 결과 평균 응답 시간은 480ms에서 95ms로, DB CPU 사용률은 71%에서 38%로 줄었습니다. 다만 캐시를 도입하면 곧바로 데이터 정합성 문제가 따라옵니다. 가격이 바뀌었는데도 캐시에 남아 있던 이전 가격이 최대 10분 동안 사용자에게 노출되는 문제를 겪었습니다. 이를 해결하기 위해 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 즉시 삭제하는 방식으로 무효화 전략을 도입했습니다. 캐시 운영은 기술 선택만의 문제가 아니라, 팀의 운영 역량이 드러나는 지표이기도 합니다. 캐시는 빠른 만큼 신중하게 관리해야 합니다.

</td>
<td valign="top">

캐시는 단순히 응답 속도를 높이는 도구가 아니라, 서비스의 안정성을 떠받치는 핵심 구성 요소입니다. 지난 분기에 우리는 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 그 결과 평균 응답 시간은 480ms에서 95ms로 줄었고, DB의 CPU 사용률도 71%에서 38%로 낮아졌습니다.

다만 캐시를 도입하면 데이터 정합성이라는 새로운 과제가 생깁니다. 우리는 가격이 바뀐 뒤에도 캐시에 남아 있던 이전 가격이 최대 10분 동안 사용자에게 노출되는 문제를 겪었습니다. 이를 해결하기 위해 가격 변경 이벤트를 수신하면 해당 상품의 캐시 키를 즉시 삭제하는 무효화 전략을 도입했습니다.

캐시 운영은 단순한 기술 선택에 그치지 않고, 팀의 운영 역량을 보여 주는 지표입니다. 정리하면, 캐시는 빠른 만큼 신중한 관리가 필요합니다.

</td>
<td valign="top">

캐시는 응답 속도를 높이는 도구이면서, 서비스가 안정적으로 동작하는 데 중요한 역할을 맡는 구성 요소입니다. 지난 분기에 상품 상세 API 앞에 Redis 캐시를 도입했습니다. 그 결과 평균 응답 시간은 480ms에서 95ms로 줄었고, DB의 CPU 사용률은 71%에서 38%로 내려갔습니다. 다만 캐시를 도입하면 데이터 정합성 문제를 함께 다뤄야 합니다. 실제로 가격이 바뀌었는데도 캐시에 남아 있던 이전 가격이 최대 10분 동안 노출되는 문제가 있었습니다. 이 문제를 해결하려고 가격 변경 이벤트를 받으면 해당 상품의 캐시 키를 바로 삭제하는 방식으로 무효화 전략을 도입했습니다. 캐시는 빠른 만큼 계속 신중하게 관리해야 합니다.

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
| 기본 | 2.0 | 1.17 |
| fluent-korean | 4.0 | 2.17 |
| 우리 스킬 | 0.0 | 2.67 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

아침 달리기는 단순한 운동이 아니라 하루를 여는 의식에 가깝습니다. 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천길을 따라 3km씩 달리고 있습니다. 처음 2주는 일어나는 것부터 힘들었고 무릎도 아팠습니다. 그런데 3주째가 되자 몸이 먼저 깨어나기 시작했습니다. 운동화 끈을 묶는 그 순간부터 하루의 분위기가 달라집니다. 꾸준히 하다 보면 건강한 생활을 오래 이어 갈 수 있다고 생각합니다. 달리기를 시작하고 나서 점심 이후에 졸린 일이 줄었고, 밤 11시 전에 잠드는 날이 늘었습니다. 체중도 4kg 줄었습니다. 달리기는 체력만이 아니라 삶을 대하는 태도까지 바꿔 주었습니다. 결국 아침 달리기는 저에게 꼭 필요한 시간이 되었습니다.

</td>
<td valign="top">

아침 달리기는 단순한 운동이 아니라, 하루를 시작하는 방식을 정하는 의식에 가깝습니다. 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km를 달리고 있습니다. 처음 2주는 일어나는 것 자체가 힘들었고 무릎도 아팠습니다. 하지만 3주째부터는 몸이 먼저 깨어나기 시작했습니다. 운동화 끈을 묶는 순간 하루의 분위기가 달라지는 것을 느낍니다. 꾸준함이 쌓이면 지속할 수 있고 건강한 삶을 실천할 수 있다는 것을 몸으로 배우고 있습니다.

달리기를 시작한 뒤로 점심 이후에 졸린 일이 줄었고, 밤 11시 전에 잠드는 날이 많아졌으며, 체중도 4kg 빠졌습니다. 달리기는 체력만 바꾸는 것이 아니라 삶을 대하는 태도까지 바꾸는 습관입니다. 결국 아침 달리기는 저에게 꼭 필요한 시간입니다.

</td>
<td valign="top">

아침 달리기는 저에게 하루를 시작하는 방식입니다. 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km를 달리고 있습니다. 처음 2주는 일어나는 것부터 힘들었고 무릎도 아팠지만, 3주째부터는 몸이 먼저 깨어나기 시작했습니다. 운동화 끈을 묶으면서 하루를 시작하는 마음이 한결 가벼워집니다. 꾸준히 달리면서 건강한 생활 리듬을 이어 가고 있습니다.

달리기를 시작한 뒤로 점심 이후에 졸리는 일이 줄었고, 밤 11시 전에 잠드는 날이 늘었으며, 체중도 4kg 빠졌습니다. 달리기를 하면서 체력뿐 아니라 생활 습관도 바뀌었습니다. 지금의 저에게 아침 달리기는 꼭 필요한 시간입니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

아침 달리기는 단순한 운동이 아니라 하루를 여는 습관에 가깝습니다. 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km씩 달리고 있습니다. 처음 2주는 일어나는 것부터 힘들었고 무릎도 아팠습니다. 3주째부터는 몸이 먼저 깨어나기 시작했습니다. 운동화 끈을 묶는 순간 하루의 분위기가 달라지는 것을 느낍니다. 꾸준히 하다 보면 건강한 생활을 지속할 수 있다고 생각합니다. 달리기를 시작하고 나서 점심 이후에 졸리는 일이 줄었고, 밤 11시 전에 잠드는 날이 늘었습니다. 체중도 4kg 줄었습니다. 달리기는 체력만이 아니라 생활을 대하는 태도까지 바꿔 주었습니다. 결국 아침 달리기는 제게 꼭 필요한 시간이 되었습니다.

</td>
<td valign="top">

아침 달리기는 단순한 운동이 아니라, 하루를 설계하는 하나의 의식입니다. 저는 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km를 달리기 시작했습니다. 처음 2주 동안은 일어나는 것 자체가 힘들었고 무릎도 아팠지만, 3주째부터는 몸이 먼저 깨어났습니다. 운동화 끈을 묶는 순간부터 하루 전체가 달라집니다. 우리는 꾸준함을 통해 지속 가능하고 건강한 삶을 실천할 수 있습니다. 달리기를 시작한 뒤로 저는 점심 식사 후에 졸음을 느끼는 일이 줄었고, 밤 11시 전에 잠들게 되었으며, 체중도 4kg 빠졌습니다. 달리기는 체력을 넘어 삶의 태도를 바꾸는 혁신적인 습관입니다. 결론적으로 아침 달리기는 저에게 꼭 필요한 시간입니다.

</td>
<td valign="top">

저에게 아침 달리기는 하루를 설계하는 시간입니다. 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km씩 달리고 있습니다. 처음 2주는 일어나는 것 자체가 힘들었고 무릎도 아팠습니다. 3주째부터는 몸이 먼저 깨어나는 느낌이 들었습니다. 운동화 끈을 묶으면 하루를 시작할 준비가 된 느낌이 듭니다.

달리기를 시작한 뒤로 점심 이후에 졸린 날이 줄었고, 밤 11시 전에 잠드는 날이 늘었습니다. 체중도 4kg 빠졌습니다. 꾸준히 달리면서 건강한 생활 습관이 자리 잡았습니다. 그래서 아침 달리기는 저에게 꼭 필요한 시간이 되었습니다.

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

아침 달리기는 단순한 운동이 아니라 하루를 준비하는 의식에 가깝습니다. 석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km씩 달리고 있습니다. 처음 2주는 일어나는 것부터 힘들었고 무릎도 아팠습니다. 그러나 3주째부터는 몸이 먼저 깨어나기 시작했습니다. 운동화 끈을 묶는 순간 하루가 달라지는 느낌이었습니다. 꾸준히 하다 보니 지속 가능하고 건강한 생활이 가능하다는 것을 조금씩 체감하고 있습니다. 달리기를 시작한 뒤로 점심 이후에 졸리는 일이 줄었고, 밤 11시 전에 잠드는 날이 늘었으며, 체중도 4kg 빠졌습니다. 체력만 좋아진 게 아니라 생활을 대하는 태도도 조금 달라진 것 같습니다. 그래서 저에게 아침 달리기는 꼭 필요한 시간입니다.

</td>
<td valign="top">

아침 달리기는 단순한 운동을 넘어, 하루를 설계하는 습관이라고 생각합니다. 저는 석 달 전부터 매일 아침 6시에 일어나, 집 앞 하천을 따라 3km를 달리고 있습니다. 처음 2주 동안은 일어나는 것 자체가 힘들었고 무릎도 아팠습니다. 하지만 3주째부터는 몸이 먼저 깨어나기 시작했습니다. 운동화 끈을 묶는 순간부터 하루가 달라지는 느낌입니다. 꾸준히 실천하면 지속 가능하고 건강한 삶을 만들 수 있다고 생각합니다. 달리기를 시작한 뒤로 점심 이후에 졸리는 일이 줄었고, 밤 11시 전에 잠들게 되었으며, 체중도 4kg 줄었습니다. 달리기는 제 체력뿐 아니라 생활을 대하는 태도까지 바꿔 놓았습니다. 그래서 저에게 아침 달리기는 꼭 필요한 시간입니다.

</td>
<td valign="top">

석 달 전부터 매일 아침 6시에 일어나 집 앞 하천을 따라 3km씩 달리고 있습니다. 처음 2주는 일어나는 것부터 힘들었고 무릎도 아팠지만, 3주째부터는 몸이 먼저 깨어나기 시작했습니다. 운동화 끈을 묶고 나면 하루를 시작할 준비가 된 느낌이 듭니다.

달리기를 시작한 뒤로 점심을 먹고 나서 졸린 일이 줄었고, 밤 11시 전에 잠드는 날이 많아졌습니다. 체중도 4kg 빠졌습니다. 꾸준히 달리면서 생활 리듬이 잡혔고, 달리기는 체력뿐 아니라 생활 습관 전반을 바꿔 주었습니다.

저에게 아침 달리기는 하루를 여는 데 꼭 필요한 시간입니다.

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
| 기본 | 0.0 | 2.67 |
| fluent-korean | 0.0 | 2.17 |
| 우리 스킬 | 0.0 | 1.17 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

예약은 오후 3시에 마감되며, 3시 이후에 예약하시면 다음 날 수거해 드려요. 수거 기사님은 방문 전에 미리 전화를 드리고, 전화를 받지 못하시면 문 앞에서 수거해 드려요. 상자는 미리 문 앞에 내놓아 주시고, 운송장은 기사님이 가져가시니 직접 출력하지 않으셔도 돼요. 상자 무게는 20kg까지 가능하며, 20kg을 넘는 경우에는 수거하지 않아요. 예약은 수거 전까지 취소할 수 있고 취소 수수료는 없어요. 다만 수거가 끝나면 취소할 수 없으며, 그때는 반송을 신청하셔야 해요. 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되며, 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님은 방문하기 전에 전화를 드리며, 전화를 받지 못하시면 문 앞에서 수거해요. 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 가져오며, 직접 출력하지 않아도 돼요. 상자 무게는 20kg까지 가능하며, 20kg을 넘으면 수거하지 않아요.

예약은 수거 전까지 취소할 수 있으며, 취소 수수료는 없어요. 다만 수거가 끝나면 취소할 수 없으니, 이때는 반송을 신청해야 해요. 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되니, 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님은 방문 전에 전화를 드리고, 전화를 받지 못하면 문 앞에서 수거해요. 상자는 문 앞에 미리 내놓아 주시고, 운송장은 기사님이 가져오니 직접 출력하지 않아도 돼요. 상자 무게는 20kg까지 가능하고, 20kg을 넘으면 수거하지 않아요. 예약은 수거 전까지 취소할 수 있고 취소 수수료는 없어요. 수거가 끝나면 취소할 수 없으니, 그때는 반송을 신청해야 해요. 반송비는 3,500원이에요.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

예약은 오후 3시에 마감되며, 3시 이후에 예약하시면 다음 날 수거해 드려요. 수거 기사님은 방문 전에 미리 전화를 드리고, 전화를 받지 못하시면 문 앞에서 수거해 드려요. 상자는 미리 문 앞에 내놓아 주시면 돼요. 운송장은 기사님이 직접 가져오므로, 따로 출력하지 않으셔도 괜찮아요. 상자 무게는 20kg까지 가능하며, 20kg이 넘으면 수거하지 않아요. 예약은 수거 전까지 취소하실 수 있고, 취소 수수료는 없어요. 다만 수거가 끝나면 예약을 취소할 수 없으며, 이때는 반송을 신청하셔야 해요. 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되며, 3시 이후에 예약하시면 수거는 다음 날 진행돼요. 수거 기사님은 방문하기 전에 전화를 드리고, 전화를 받지 못하시면 문 앞에서 수거해요. 상자는 미리 문 앞에 내놓아 주시고, 운송장은 기사님이 가져오니 직접 출력하지 않으셔도 돼요. 상자 무게는 20kg까지 가능하며, 20kg을 넘으면 수거하지 않아요. 예약은 수거 전까지 취소할 수 있으며, 취소 수수료는 없어요. 수거가 끝나면 취소할 수 없고, 그때는 반송을 신청해야 해요. 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되며, 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님은 방문 전에 전화를 드리고, 전화를 받지 못하면 문 앞에서 수거하니 상자는 미리 문 앞에 내놓아 주세요. 운송장은 기사님이 가져와서 직접 출력하지 않아도 돼요. 상자 무게는 20kg까지 가능하며, 20kg이 넘으면 수거하지 않아요.

예약은 수거 전까지 취소할 수 있고 취소 수수료도 없어요. 다만 수거가 끝나면 취소할 수 없으니, 그때는 반송을 신청해야 하며 반송비는 3,500원이에요.

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

예약은 오후 3시에 마감되며, 3시 이후에 예약하시면 다음 날 수거해 드려요. 수거 기사님은 방문 전에 전화를 드리고, 전화를 받지 못하시면 문 앞에서 수거해요. 상자는 미리 문 앞에 내놓아 주시면 돼요. 운송장은 기사님이 가져오므로 직접 출력하지 않으셔도 돼요. 상자 무게는 20kg까지 가능하며, 20kg을 넘으면 수거하지 않아요. 예약은 수거 전까지 취소할 수 있고 취소 수수료는 없어요. 다만 수거가 끝난 뒤에는 취소할 수 없으며, 그때는 반송을 신청하셔야 해요. 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되며, 3시 이후에 예약하시면 다음 날 수거해요. 수거 기사님은 방문 전에 전화를 드리고, 전화를 받지 못하시면 문 앞에서 수거해요. 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 가져오므로 직접 출력하지 않으셔도 돼요. 상자 무게는 20kg까지 가능하며, 20kg을 넘으면 수거하지 않아요. 예약은 수거 전까지 취소할 수 있고, 취소 수수료는 없어요. 수거가 끝나면 취소할 수 없으며, 그때는 반송을 신청해야 해요. 반송비는 3,500원이에요.

</td>
<td valign="top">

예약은 오후 3시에 마감되고, 3시 이후에 예약하면 다음 날 수거해요. 수거 기사님은 방문 전에 전화를 드리고, 전화를 못 받으면 문 앞에서 수거해요. 그러니 상자는 문 앞에 미리 내놓아 주세요. 운송장은 기사님이 가져오므로 직접 출력하지 않아도 돼요. 상자 무게는 20kg까지 가능하고, 20kg이 넘으면 수거하지 않아요.

예약은 수거 전까지 취소할 수 있고 취소 수수료도 없어요. 다만 수거가 끝나면 취소할 수 없으니, 그때는 반송을 신청해야 해요. 반송비는 3,500원이에요.

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
| 기본 | 0.3 | 2.17 |
| fluent-korean | 1.7 | 2.17 |
| 우리 스킬 | 0.0 | 1.67 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

````text
fix(coupon): 쿠폰 만료일 비교를 한국 시간 기준으로 수정 (#214)

만료일 비교에 UTC 날짜를 사용하던 문제를 수정했습니다. expiresOn은 한국 시간 기준 날짜인데, 한국 시간 00:00~08:59 사이에는 UTC 기준 전날 날짜가 나와 전날 만료된 쿠폰이 통과했습니다. 이제 Asia/Seoul 시간대의 오늘 날짜로 비교합니다.

- coupon.service.ts: 오늘 날짜 계산을 formatInTimeZone(…, 'Asia/Seoul')으로 변경
- coupons.integration.spec.ts: 한국 시간 오전 8시에 전날 만료 쿠폰이 거절되는지 검증하는 테스트 추가
````

</td>
<td valign="top">

````text
fix(coupon): 쿠폰 만료일 비교를 한국 시간 기준으로 수정

만료일(expiresOn)은 한국 시간 기준 날짜인데 UTC 날짜와 비교하고 있었습니다. 그래서 한국 시간 00:00~08:59 사이에는 전날 만료된 쿠폰이 통과했습니다. 오늘 날짜를 Asia/Seoul 기준으로 구해 비교하도록 바꿉니다.

- date-fns-tz 의 formatInTimeZone 으로 Asia/Seoul 기준 오늘 날짜를 구합니다.
- 한국 시간 오전 8시에 전날 만료된 쿠폰이 거절되는지 확인하는 통합 테스트를 추가합니다.

Refs: #214
````

</td>
<td valign="top">

````text
fix: 쿠폰 만료일 비교를 UTC에서 한국 시간 기준으로 변경

쿠폰 만료일은 한국 시간 기준 날짜(YYYY-MM-DD)로 저장되는데, 만료 여부를 확인할 때는 UTC 날짜와 비교하고 있었다. 그래서 한국 시간 00시부터 08시 59분 사이에는 UTC 날짜가 전날로 나와서 만료된 쿠폰이 통과했다. 어제 만료된 쿠폰이 오늘 아침에 사용되었다는 문의가 3건 접수되었다.

만료 여부를 확인할 때 date-fns-tz 로 Asia/Seoul 기준의 오늘 날짜를 구해서 만료일과 비교하도록 수정했다. 같은 문제가 다시 생기지 않도록 한국 시간 오전 8시에 전날 만료된 쿠폰이 거절되는지 확인하는 통합 테스트를 추가했다.

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
fix: 쿠폰 만료일 비교를 한국 시간 기준으로 수정

expiresOn은 한국 시간 기준 날짜인데, 만료 검사에서 오늘 날짜를 UTC 기준으로 구해 비교하고 있었다.
그래서 한국 시간 00:00~08:59 사이에는 전날 날짜로 비교되어 전날 만료된 쿠폰이 통과했다.

- 오늘 날짜를 Asia/Seoul 기준 yyyy-MM-dd 형식으로 계산하도록 변경 (date-fns-tz 사용)
- 한국 시간 오전 8시에 전날 만료된 쿠폰이 거절되는지 확인하는 통합 테스트 추가

Fixes #214
````

</td>
<td valign="top">

````text
fix: 쿠폰 만료 검사를 한국 시간 기준 날짜로 변경

기존 만료 검사는 UTC 날짜를 기준으로 쿠폰 만료일(expiresOn)과 비교했습니다. expiresOn은 한국 시간 기준 날짜이므로, 한국 시간 00시부터 08시 59분 사이에는 UTC 기준 날짜가 전날로 나와 만료된 쿠폰이 사용될 수 있었습니다. 이 커밋은 Asia/Seoul 시간대의 오늘 날짜를 구해 만료일과 비교하도록 수정합니다.

한국 시간 오전 8시에 전날 만료된 쿠폰이 거절되는지 확인하는 통합 테스트를 추가합니다.

Fixes #214
````

</td>
<td valign="top">

````text
fix: 쿠폰 만료일 비교를 한국 시간 기준으로 수정

고객센터에 어제 만료된 쿠폰이 오늘 아침에 사용되었다는 문의가 3건 접수되었다.
만료일은 한국 시간 기준 날짜(YYYY-MM-DD)로 저장되는데, 기존 코드는 현재 시각의
UTC 날짜와 비교하고 있었다. 그래서 한국 시간 00시부터 08시 59분 사이에는 전날
날짜가 나와서 만료된 쿠폰이 검사를 통과했다. 현재 날짜를 Asia/Seoul 시간대로
구해서 만료일과 비교하도록 수정했고, 한국 시간 오전 8시에 전날 만료된 쿠폰이
거절되는지 확인하는 통합 테스트를 추가했다.

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
fix: 쿠폰 만료 검사를 한국 시간 기준으로 수정 (#214)

기존에는 현재 시각을 UTC 날짜로 변환해 쿠폰 만료일(한국 시간 기준)과 비교했다. 그래서 한국 시간 00:00~08:59 사이에는 전날 날짜가 사용되어, 전날 만료된 쿠폰이 아침까지 사용 가능했다.

date-fns-tz 의 formatInTimeZone 으로 Asia/Seoul 기준 날짜를 구해 비교하도록 변경했다.

한국 시간 오전 8시에 전날 만료된 쿠폰이 410 으로 거절되는지 확인하는 통합 테스트를 추가했다.
````

</td>
<td valign="top">

````text
쿠폰 만료일을 한국 시간 기준으로 비교하도록 수정합니다 (#214)

만료일 비교에 UTC 날짜를 사용하여, 한국 시간 00:00~08:59 사이에는 전날 날짜로 판단되었습니다. 그 결과 만료된 쿠폰이 통과하는 문제가 발생했습니다. expiresOn은 한국 시간 기준 날짜이므로, 현재 시각도 Asia/Seoul 기준 날짜로 변환하여 비교하도록 변경했습니다.

이 문제는 고객센터에 어제 만료된 쿠폰이 오늘 아침에 사용되었다는 문의가 3건 접수되면서 확인되었습니다. 한국 시간 오전 8시에 전날 만료된 쿠폰이 거절되는지 검증하는 통합 테스트도 추가했습니다.
````

</td>
<td valign="top">

````text
fix: 쿠폰 만료 여부를 한국 시간 날짜로 판단하도록 수정

만료일(expiresOn)은 한국 시간 기준 날짜인데, 만료 여부를 UTC 날짜와 비교하고 있었다. 그 결과 한국 시간 00시부터 08시 59분 사이에는 비교 대상이 전날 날짜로 계산되어, 전날 만료된 쿠폰이 아침까지 사용되었다. 고객 문의 3건도 모두 이 시간대에 사용된 경우였다.

만료 판단에서 date-fns-tz 의 formatInTimeZone 으로 Asia/Seoul 기준 날짜를 구해 비교하도록 변경했다. 한국 시간 오전 8시에 전날 만료된 쿠폰이 거절되는지 확인하는 통합 테스트도 추가했다.

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
| 기본 | 2.3 | 1.50 |
| fluent-korean | 2.3 | 1.50 |
| 우리 스킬 | 0.0 | 3.00 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

````text
주문 CSV 내보내기 API 추가

- GET /orders/export 엔드포인트 추가 (admin, manager 권한)
- 한 번에 내보낼 수 있는 주문 수를 10,000건으로 제한하고, 초과 시 400 응답
- 주문을 500건씩 스트리밍해 CSV로 쓰도록 하여 전체를 메모리에 올리지 않음
- 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 추가
- 내보내기 기능에 대한 통합 테스트 추가 (정상 응답, 건수 초과, 권한 없는 사용자 403)
````

</td>
<td valign="top">

````text
주문 CSV 내보내기 API를 추가한다

관리자와 매니저만 기간과 주문 상태 조건으로 주문을 CSV 파일로 내려받을 수 있다. 한 번에 내보낼 수 있는 주문은 10,000건으로 제한하며, 초과하면 400 오류를 응답한다. 주문은 500건씩 나누어 읽고 스트림으로 쓰므로 전체 목록을 메모리에 올리지 않는다. 엑셀에서 한글이 깨지지 않도록 CSV 앞에 UTF-8 BOM을 붙인다. 권한, 건수 제한, 정상 응답을 검증하는 통합 테스트도 함께 추가한다.
````

</td>
<td valign="top">

````text
feature: 기간별 주문을 CSV로 내보내는 API를 추가

관리자와 매니저가 기간을 지정해 주문을 엑셀에서 열어 볼 수 있도록 CSV 내보내기 엔드포인트를 추가했다.
한 번에 내보낼 수 있는 주문은 최대 10,000건이며, 초과하면 400을 반환하고 기간을 줄이도록 안내한다.
주문은 500건씩 읽어서 응답에 바로 쓰므로 전체 데이터를 메모리에 올리지 않는다.
엑셀에서 한글이 깨지지 않도록 응답 앞에 UTF-8 BOM을 붙였다.
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
feat: 주문 CSV 내보내기 API 추가

- GET /orders/export 엔드포인트 추가 (admin, manager 권한만 허용)
- 내보내기 전에 조건에 맞는 주문 수를 확인하고, EXPORT_ROW_LIMIT(10,000건)을 넘으면 400 응답
- 주문을 500건씩 읽어 CSV 행으로 스트리밍 전송해 전체 데이터를 메모리에 올리지 않도록 함
- 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 추가
- 기간 내 CSV 응답, 건수 초과 시 400, staff 권한 거부(403)를 검증하는 통합 테스트 추가
````

</td>
<td valign="top">

````text
주문 CSV 내보내기 API 추가

관리자와 매니저만 `GET /orders/export`를 호출할 수 있습니다. 조회 조건에 맞는 주문이 `EXPORT_ROW_LIMIT`(10,000건)을 넘으면 400 오류를 반환합니다. 주문은 500건 단위로 읽어 스트림으로 응답하므로 전체 목록을 메모리에 올리지 않습니다. 엑셀에서 한글이 깨지지 않도록 응답 앞에 BOM을 붙입니다. 통합 테스트로 응답 형식, 건수 제한, 권한 검사를 검증합니다.
````

</td>
<td valign="top">

````text
feature: 주문 목록을 CSV 로 내보내는 엔드포인트를 추가

관리자와 매니저가 기간 안의 주문을 CSV 파일로 내려받을 수 있도록
GET /orders/export 엔드포인트를 추가했다. 주문을 500건씩 읽어서 행마다
바로 응답에 쓰므로 전체 주문을 메모리에 올리지 않는다. 한 번에 내보낼 수
있는 주문은 1만 건까지이며, 초과하면 400 을 반환하고 기간을 줄이라고
안내한다. 엑셀에서 한글이 깨지지 않도록 응답 앞에 BOM 을 붙였다.
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
주문 CSV 내보내기 API 추가 (admin, manager 전용)

- GET /orders/export 엔드포인트 추가
- 기간 내 주문 수가 10,000건을 넘으면 400 응답
- 주문을 500건 단위로 스트리밍해 CSV로 쓰므로 전체를 메모리에 올리지 않음
- 엑셀 한글 깨짐 방지를 위해 UTF-8 BOM 추가
- 내보내기 통합 테스트 추가 (정상 응답, 건수 초과, 권한 없음)
````

</td>
<td valign="top">

````text
주문 CSV 내보내기 API를 추가한다

관리자와 매니저가 기간과 주문 상태로 주문을 조회해 CSV 파일로 내려받을 수 있도록 GET /orders/export 엔드포인트를 추가한다. 주문을 500건씩 읽어 스트리밍하므로 전체 데이터를 메모리에 올리지 않는다. 내보낼 주문이 1만 건을 넘으면 400 응답으로 요청을 거부한다. 엑셀에서 한글이 깨지지 않도록 응답 앞에 BOM을 붙이며, 일반 직원(staff)의 접근은 403으로 막는다.
````

</td>
<td valign="top">

````text
feature: 기간별 주문을 CSV로 내보내는 API를 추가

관리자와 매니저가 기간별 주문을 엑셀에서 바로 열어 볼 수 있도록 CSV 내보내기 엔드포인트를 추가했다. 요청한 기간의 주문이 1만 건을 넘으면 400을 반환하고 기간을 줄이도록 안내한다. 주문은 500건씩 읽어 응답 스트림에 바로 쓰므로 전체 주문을 메모리에 올리지 않는다. 응답 앞에는 BOM을 붙여서 엑셀에서 한글이 깨지지 않도록 했다.
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
| 기본 | 6.0 | 1.50 |
| fluent-korean | 5.3 | 1.83 |
| 우리 스킬 | 0.0 | 2.67 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

매장별 예약 알림 시간 설정 기능 추가 (1~72시간, 기본 24시간)

## 배경

매장 12곳이 당일 예약이 많아 24시간 전 알림이 의미가 없다며, 2~3시간 전에 알림을 보내 달라고 요청했습니다. (#87)

## 변경 사항

- **매장별 알림 시간 설정**: `stores.reminder_hours_before` 컬럼(기본값 24)을 추가했습니다. 매장 관리자는 설정 화면에서 1~72시간 사이 값을 고를 수 있습니다. (`UpdateStoreSettingsDto`에 `reminderHoursBefore` 검증 추가, 설정 화면 `ReminderSection.tsx` 추가)
- **스케줄러 변경**: 매일 09:00에 24~48시간 뒤 예약을 찾던 방식에서, 10분마다 실행하며 "알림 시간 안에 시작하고 아직 알림을 보내지 않은 예약"을 찾아 발송하는 방식으로 바꿨습니다.
- **발송 기록**: `reservations.reminder_sent_at` 컬럼을 추가하고, 발송 후 값을 기록합니다. 부분 인덱스(`reminder_sent_at IS NULL`)를 함께 추가했습니다.
- **발신 번호 설정 분리**: 코드에 고정돼 있던 문자 발신 번호를 환경 변수 `SMS_SENDER_ID`로 옮겼습니다. 값이 없거나 형식(숫자 8~11자리)이 맞지 않으면 서버 시작 시 오류가 나고 멈춥니다.

## 배포 시 주의

- **환경 변수 설정 필수**: 배포 전에 모든 환경에 `SMS_SENDER_ID`를 설정해야 합니다. 설정하지 않으면 서버가 뜨지 않습니다.
- **기존 예약 중복 알림 가능성**: 마이그레이션 시점에 이미 등록된 예약은 `reminder_sent_at`이 NULL입니다. 새 스케줄러가 처음 돌 때 이 예약들이 알림 대상으로 잡혀, 이미 24시간 전 알림을 받은 고객에게 다시 문자가 나갈 수 있습니다. 배포 전에 기존 예약의 `reminder_sent_at`을 채울지(예: 이미 알림 대상 시점이 지난 예약은 발송 완료로 표시) 결정해야 합니다.
- **발송 지연**: 스케줄러가 10분 간격이므로 알림은 설정 시간보다 최대 10분 늦게 나갈 수 있습니다.

## 테스트

- 통합 테스트 23개 통과 (이번에 추가한 6개 포함)
- 스테이징에서 알림 시간을 2시간으로 설정한 매장에 예약을 넣고, 발송 기록이 예약 2시간 전에 생성되는 것을 확인했습니다.

## 확인하지 못한 것

- 스테이징에서는 문자 발송을 모의(mock)로 처리했습니다. 실제 통신사를 거친 발송은 확인하지 못했습니다. 운영 배포 후 실제 발송 여부를 확인해 주세요.

</td>
<td valign="top">

PR 제목과 본문을 아래와 같이 작성했습니다. 본문은 지침에 맞춰 구와 명사구로 끝내지 않고 서술어로 문장을 마무리했습니다.

매장별 예약 알림 시점 설정 기능 추가 및 발신 번호 환경 변수화

## 배경

현재 예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송됩니다. 당일 예약이 많은 매장 12곳은 24시간 전 알림이 의미가 없다며 2~3시간 전 발송을 요청했습니다 (이슈 #87).

## 변경 사항

- 매장 관리자가 설정 화면에서 알림 시점을 1~72시간 사이로 지정할 수 있도록 했습니다. 기본값은 기존과 같은 24시간입니다.
- 알림 스케줄러를 하루 한 번 09:00에 실행하던 방식에서 10분마다 실행하는 방식으로 바꾸었습니다. 스케줄러는 알림 시점 안에 시작하고 아직 알림을 보내지 않은 예약을 찾아 발송하며, 발송 시각을 `reminder_sent_at`에 기록합니다.
- 예약 테이블에 `reminder_sent_at` 컬럼을 추가하고, 미발송 예약만 빠르게 찾도록 부분 인덱스를 만들었습니다.
- 매장 테이블에 `reminder_hours_before` 컬럼을 추가했습니다. 기존 매장은 기본값 24시간이 적용됩니다.
- 문자 발신 번호를 코드에 고정하던 방식에서 환경 변수 `SMS_SENDER_ID`로 옮겼습니다. 이 값이 없으면 서버가 시작할 때 오류를 내고 멈춥니다. 배포 전에 환경 변수를 반드시 설정해야 합니다.
- 설정 화면에 알림 시점을 고르는 `ReminderSection` 컴포넌트를 추가했습니다.

## 검증

- 통합 테스트 23개가 모두 통과했습니다. 이 중 6개는 이번 PR에서 새로 작성했습니다.
- 스테이징에서 알림 시점을 2시간으로 설정한 매장에 예약을 등록했습니다. 발송 기록이 예약 2시간 전에 생성되는 것을 확인했습니다.

## 확인하지 못한 사항

- 스테이징 환경은 문자 발송을 모의(mock) 처리하므로 실제 통신사를 통한 발송은 검증하지 못했습니다. 운영 배포 후 실제 발송 여부를 따로 확인해야 합니다.

## 배포 시 주의

- 배포 전에 `SMS_SENDER_ID` 환경 변수가 설정되어 있는지 확인해야 합니다. 설정되지 않으면 서버가 기동되지 않습니다.
- 마이그레이션으로 `reservations` 테이블에 컬럼과 인덱스가 추가됩니다. 대상 테이블 규모에 따라 실행 시간이 길어질 수 있으므로 배포 시간을 미리 확인해야 합니다.

Closes #87

</td>
<td valign="top">

feature: 매장별 예약 알림 시간을 1~72시간 사이에서 설정하는 기능을 추가

## 작업 배경

예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송됩니다. 당일 예약이 많은 매장에서는 24시간 전 알림이 실익이 적어서, 12개 매장이 2~3시간 전 발송을 요청했습니다 ([#87](https://github.com/)).

## 변경 사항

- **매장 관리자가 설정 화면에서 알림 시간을 1~72시간 사이에서 고를 수 있습니다**: 설정 화면에 알림 시간 항목을 추가했고, 기본값은 기존과 같은 24시간입니다.
- **예약 알림은 10분마다 확인해서 발송합니다**: 기존에는 매일 09:00에 하루 한 번 실행되었습니다. 이제는 알림 시간 안에 시작하고 아직 알림을 보내지 않은 예약을 찾아 발송하며, 발송 시각을 예약마다 기록합니다.
- **문자 발신 번호를 환경 변수로 옮겼습니다**: 코드에 고정되어 있던 발신 번호를 `SMS_SENDER_ID` 환경 변수로 옮겼습니다. 값이 없거나 8~11자리 숫자가 아니면 서버가 시작할 때 오류를 내고 종료됩니다.

## 배포 참고 사항

- 배포 전에 `SMS_SENDER_ID` 환경 변수를 설정해야 합니다. 설정하지 않으면 서버가 시작되지 않습니다.
- 마이그레이션으로 `stores` 테이블에 `reminder_hours_before` 컬럼(기본값 24)을, `reservations` 테이블에 `reminder_sent_at` 컬럼을 추가합니다. 기존 09:00 작업은 발송 시각을 기록하지 않으므로 기존 예약의 `reminder_sent_at`은 모두 NULL입니다. 따라서 배포 직후 시작 시각이 24시간 안에 있는 예약은 알림이 한 번 더 나갈 수 있습니다.
- 미발송 예약을 찾는 부분 인덱스(`reservations_reminder_idx`)를 추가합니다.

## 확인 사항

- [x] 통합 테스트 23개 통과 (새로 작성한 테스트 6개 포함)
- [x] 스테이징에서 알림 시간을 2시간으로 설정한 매장에 예약을 넣고, 발송 기록이 예약 2시간 전에 생기는 것을 확인
- [ ] 실제 통신사 발송: 스테이징은 문자 발송을 모의 처리하므로 확인하지 못했습니다. 배포한 뒤 실제 발송 기록을 확인해야 합니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

매장별 예약 알림 시간 설정 기능 추가 (#87)

## 배경

지금은 예약 알림 문자가 모든 매장에서 예약 24시간 전에 발송됩니다. 당일 예약이 많은 매장 12곳이 24시간 전 알림은 의미가 없다며 2~3시간 전 발송을 요청했습니다 (#87).

## 변경 사항

- **매장별 알림 시간 설정**: 매장 관리자가 설정 화면에서 알림 시간을 1~72시간 사이로 고를 수 있습니다. 기본값은 기존과 같은 24시간입니다.
- **스케줄러 변경**: 매일 09:00 에 한 번 실행하던 작업을 10분마다 실행하도록 바꿨습니다. 현재 시각부터 각 매장의 알림 시간 안에 시작하는 예약 중 아직 알림을 보내지 않은 것을 찾아 발송합니다.
- **발송 기록 추가**: `reservations.reminder_sent_at` 컬럼을 추가해 발송 여부를 기록합니다. 발송 후 기록을 남기므로 같은 예약에 알림이 중복으로 나가지 않도록 했습니다.
- **발신 번호 설정 분리**: 문자 발신 번호를 코드에 고정해 두던 것을 환경 변수 `SMS_SENDER_ID` 로 옮겼습니다.

## 배포 시 주의 사항

- **환경 변수 필수**: `SMS_SENDER_ID` 가 없으면 서버가 시작 시 오류를 내고 멈춥니다. 배포 전에 모든 환경에 값을 설정해야 합니다. 값은 8~11자리 숫자여야 합니다.
- **마이그레이션**: `stores.reminder_hours_before` (기본값 24), `reservations.reminder_sent_at`, 그리고 미발송 예약을 찾기 위한 부분 인덱스를 추가합니다.
- **배포 직후 중복 알림 가능성**: 기존 예약은 `reminder_sent_at` 이 비어 있습니다. 배포 시점에 이미 09:00 작업으로 알림을 받은 예약이 아직 알림 시간 안에 있으면, 새 스케줄러가 한 번 더 발송할 수 있습니다. 배포 시점을 정하거나 기존 예약에 값을 채우는 방법을 검토해 주세요.
- **발송 순서**: 문자 발송 후 기록을 저장합니다. 발송은 되었지만 기록 저장이 실패하면 다음 실행 때 같은 예약에 다시 발송될 수 있습니다.

## 테스트

- 통합 테스트 23개 통과 (이번에 추가한 6개 포함)
- 스테이징에서 알림 시간을 2시간으로 설정한 매장에 예약을 넣고, 문자 발송 기록이 예약 2시간 전에 생기는 것을 확인했습니다.

## 확인하지 못한 것

- 스테이징에서는 문자 발송을 모의(mock)로 처리했습니다. 실제 통신사를 통한 발송은 확인하지 못했습니다. 운영 배포 후 실제 수신 여부를 확인해 주세요.

## 리뷰 요청

- 기존 예약에 대한 중복 알림을 막는 방법이 적절한지
- 발송 후 기록 저장 실패 시의 처리가 충분한지
- 10분 주기 스케줄러가 알림 대상 조회 부하에 문제가 없는지

</td>
<td valign="top">

예약 알림 발송 시점을 매장별로 설정할 수 있도록 변경 (#87)

## 배경

현재 예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송됩니다. 당일 예약이 많은 매장 12곳은 24시간 전 알림이 실효가 없다며 2~3시간 전 발송을 요청했습니다 (#87).

## 변경 사항

- 매장 관리자가 설정 화면에서 알림 시점을 1~72시간 사이로 선택할 수 있습니다. 기본값은 기존과 같은 24시간입니다.
- 스케줄러가 하루 한 번 09:00에 실행되던 방식을 10분마다 실행하는 방식으로 바꿨습니다. 각 실행은 알림 시점 안에 시작하고 아직 알림을 보내지 않은 예약을 찾아 발송한 뒤, 발송 시각을 `reminder_sent_at`에 기록합니다.
- 문자 발신 번호를 코드에 고정하던 방식을 환경 변수 `SMS_SENDER_ID`로 옮겼습니다. 이 값이 없으면 서버가 시작할 때 오류를 내고 멈춥니다.
- DB 마이그레이션으로 `stores.reminder_hours_before`와 `reservations.reminder_sent_at` 컬럼, 그리고 미발송 예약을 찾는 부분 인덱스를 추가합니다.

## 확인한 내용

- 통합 테스트 23개가 통과합니다. 이 중 6개는 이번 PR에서 새로 작성했습니다.
- 스테이징에서 알림 시점을 2시간으로 설정한 매장에 예약을 등록했습니다. 문자 발송 기록이 예약 2시간 전에 생성되는 것을 확인했습니다.

## 확인하지 못한 내용

- 스테이징은 문자 발송을 모의(mock) 처리합니다. 따라서 실제 통신사를 거친 발송은 확인하지 못했습니다.

## 배포 시 주의할 점

- 배포 전에 `SMS_SENDER_ID` 환경 변수를 설정해야 합니다. 설정하지 않으면 서버가 시작되지 않습니다.
- 기존 예약에는 `reminder_sent_at` 값이 없습니다. 그래서 배포 직후 24시간 안에 시작하는 예약은 기존 09:00 발송으로 이미 알림을 받았더라도 알림이 한 번 더 나갈 수 있습니다. 배포 전에 해당 예약의 `reminder_sent_at` 값을 채우는 방안을 검토해 주세요.

## 검토 요청

- `markReminderSent`는 문자 발송 후에 호출됩니다. 따라서 발송 뒤 기록 전에 프로세스가 중단되면 다음 실행에서 같은 예약에 알림이 중복 발송될 수 있습니다. 이 위험을 허용할지 확인이 필요합니다.

</td>
<td valign="top">

feature: 매장별 예약 알림 시간 설정을 추가

## 작업 배경

모든 매장의 예약 알림 문자가 예약 24시간 전에만 발송되어, 당일 예약이 많은 매장에서는 알림이 실효성이 없었습니다. 매장 12곳이 2~3시간 전 발송을 요청했습니다 (#87).

## 변경 사항

- **매장 관리자가 설정 화면에서 알림 시간을 1~72시간 사이로 지정할 수 있습니다**: 기본값은 기존과 같은 24시간입니다. 설정 화면에 알림 설정 영역을 추가했습니다.
- **알림 스케줄러는 10분마다 실행되며, 알림 시간 안에 시작하는 예약 중 아직 알림을 받지 않은 예약을 찾아 발송합니다**: 기존에는 매일 09:00 에 다음 날 예약만 찾아 발송했습니다. 발송 시각은 `reservations.reminder_sent_at` 에 기록되어 같은 예약에 알림이 중복으로 나가지 않습니다.
- **문자 발신 번호를 코드에서 환경 변수 `SMS_SENDER_ID` 로 옮깁니다**: 값이 없거나 숫자 8~11자리가 아니면 서버가 시작할 때 오류를 내고 멈춥니다.

## 배포 참고 사항

- 마이그레이션으로 `stores.reminder_hours_before`(기본값 24)와 `reservations.reminder_sent_at` 컬럼을 추가하고, `reservations` 테이블에 인덱스를 만듭니다. 테이블 크기에 따라 인덱스를 만드는 동안 예약 쓰기가 잠시 대기할 수 있습니다.
- 기존 예약에는 `reminder_sent_at` 값이 없습니다. 따라서 배포 직후에는 시작 시각이 24시간 안에 남아 있는 예약에 이전 09:00 작업이 보낸 알림과 별개로 알림이 한 번 더 나갈 수 있습니다.
- 배포 전에 `SMS_SENDER_ID` 환경 변수를 설정해야 합니다. 설정하지 않으면 서버가 시작되지 않습니다.

## 확인 사항

- [x] 통합 테스트 23개 통과 (새로 작성한 6개 포함)
- [x] 스테이징에서 알림 시간을 2시간으로 설정한 매장에 예약을 넣고, 발송 기록이 예약 2시간 전에 생성되는 것을 확인
- [ ] 실제 통신사 발송: 스테이징은 문자 발송을 모의로 처리하므로 확인하지 못했습니다. 배포 후 실제 발송 기록을 확인해야 합니다.

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

예약 알림 시점을 매장별로 1~72시간 전에서 설정 가능하도록 변경 (#87)

## 배경

현재 예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송됩니다. 당일 예약이 많은 매장 12곳이 24시간 전 알림은 의미가 없다며, 2~3시간 전에 보내고 싶다고 요청했습니다 (#87).

## 변경 사항

- **알림 시간 설정**: `stores.reminder_hours_before` 컬럼(기본값 24)을 추가했습니다. 매장 관리자는 설정 화면에서 1~72시간 사이 값을 고를 수 있습니다. 기본값은 기존과 같습니다.
- **스케줄러 변경**: 매일 09:00에 한 번 돌던 `sendDailyReminders`를 10분마다 도는 `sendDueReminders`로 바꿨습니다. 알림 시간 안에 시작하고 아직 알림을 보내지 않은 예약을 찾아 발송합니다.
- **중복 발송 방지**: `reservations.reminder_sent_at` 컬럼을 추가하고, 발송 후 기록합니다. 미발송 예약만 조회하도록 부분 인덱스를 만들었습니다.
- **발신 번호 분리**: 코드에 하드코딩되어 있던 문자 발신 번호를 환경 변수 `SMS_SENDER_ID`로 옮겼습니다. 형식은 숫자 8~11자리입니다.
- **설정 화면**: `ReminderSection.tsx`를 새로 추가했고, `UpdateStoreSettingsDto`에 `reminderHoursBefore` 필드를 추가했습니다 (1~72 검증).

## 배포 시 주의

- **환경 변수 필수**: `SMS_SENDER_ID`가 설정되지 않으면 서버가 시작할 때 오류를 내고 멈춥니다. 배포 전에 모든 환경에 값을 넣어야 합니다.
- **기존 예약 중복 알림 가능성 (확인 필요)**: 마이그레이션은 기존 예약의 `reminder_sent_at`을 채우지 않습니다. 배포 전 09:00 스케줄러가 이미 알림을 보낸 예약(시작 24~48시간 후)은 배포 후 24시간 전 시점에 다시 조회되어 한 번 더 발송될 수 있습니다. 배포 시점을 조정하거나, 이미 알림이 나간 미래 예약에 `reminder_sent_at`을 백필하는 방안을 검토해 주세요.
- **마이그레이션**: `reservations`와 `stores` 테이블에 컬럼을 추가하고, `reservations`에 부분 인덱스를 생성합니다.

## 확인한 내용

- 통합 테스트 23개 통과 (이번에 추가한 테스트 6개 포함)
- 스테이징에서 알림 시간을 2시간으로 설정한 매장에 예약을 생성해, 문자 발송 기록이 예약 2시간 전에 생성되는 것을 확인했습니다.

## 확인하지 못한 내용

- 스테이징은 문자 발송을 모의(mock)로 처리하므로, 실제 통신사 발송은 확인하지 못했습니다. 운영 배포 후 실제 발신 번호와 수신 여부를 확인해야 합니다.

## 관련 이슈

- closes #87

</td>
<td valign="top">

매장별 예약 알림 시간 설정 기능 추가 (#87)

## 배경

지금까지 예약 알림 문자는 모든 매장에서 예약 24시간 전에 발송되었습니다. 당일 예약이 많은 매장 12곳은 24시간 전 알림이 의미가 없다고 보고, 2~3시간 전에 알림을 보내 달라고 요청했습니다 (#87).

## 변경 사항

- 매장 관리자가 설정 화면에서 알림 시간을 1~72시간 사이로 선택할 수 있습니다. 기본값은 기존과 같은 24시간입니다.
- 알림 시간을 저장하는 `stores.reminder_hours_before` 컬럼을 추가합니다. 기존 매장에는 기본값 24가 적용됩니다.
- 알림 발송 시각을 저장하는 `reservations.reminder_sent_at` 컬럼과, 미발송 예약을 찾는 부분 인덱스를 추가합니다.
- 스케줄러는 하루 한 번 09:00에 실행하던 방식에서 10분마다 실행하는 방식으로 바뀝니다. 실행할 때마다 설정 시간 안에 시작하고 아직 알림을 받지 않은 예약을 찾아 문자를 보내고, 발송 시각을 기록합니다.
- 문자 발신 번호를 코드에서 분리해 환경 변수 `SMS_SENDER_ID`로 받도록 변경합니다. 이 값이 없으면 서버가 시작할 때 오류를 내고 멈춥니다.
- 알림 시간 설정을 위한 `ReminderSection.tsx` 컴포넌트를 추가합니다.

## 확인한 내용

- 통합 테스트 23개가 통과합니다. 이 중 6개는 이번 PR에서 새로 작성했습니다.
- 스테이징에서 알림 시간을 2시간으로 설정한 매장에 예약을 등록했고, 문자 발송 기록이 예약 2시간 전에 생성되는 것을 확인했습니다.

## 확인하지 못한 내용

- 스테이징은 문자 발송을 모의(mock)로 처리하므로, 실제 통신사를 통한 발송은 확인하지 못했습니다.

## 배포 시 주의할 점

- 배포 전에 운영 환경에 `SMS_SENDER_ID`를 설정해야 합니다. 설정하지 않으면 서버가 시작되지 않습니다.
- 기존 예약에는 `reminder_sent_at` 값이 없습니다. 그래서 배포 직후 첫 실행에서, 이미 24시간 전 알림을 받은 예약 가운데 새 설정 시간 안에 들어오는 예약에도 알림이 한 번 더 나갈 수 있습니다. 배포 전에 이 중복 발송 가능성을 검토해야 합니다.
- 스케줄러가 10분 간격으로 실행되므로, 알림은 설정한 시점을 기준으로 최대 10분 정도 늦게 발송될 수 있습니다.

</td>
<td valign="top">

feature: 매장별 예약 알림 시간을 1~72시간 범위에서 설정할 수 있게 함

## 작업 배경

현재 모든 매장의 예약 알림 문자는 예약 24시간 전에 발송됩니다. 당일 예약이 많은 매장에서는 24시간 전 알림이 실제로 도움이 되지 않는다며, 12개 매장이 2~3시간 전 발송을 요청했습니다 (#87). 기존 스케줄러는 매일 09:00에 한 번만 실행되어 24~48시간 뒤에 시작하는 예약만 찾았기 때문에 알림 시간을 바꿀 수 없었습니다.

## 변경 사항

- **매장 관리자가 예약 알림 시간을 1~72시간 사이에서 설정할 수 있습니다**: 매장 설정 화면에 알림 시간 항목을 추가했습니다. 기본값은 기존과 같은 24시간입니다.
- **알림 스케줄러가 10분마다 실행되어, 알림 시간 안에 시작하는 예약 가운데 아직 알림을 보내지 않은 예약에 문자를 보냅니다**: 알림을 보낸 예약에는 발송 시각(`reminder_sent_at`)을 기록하고, 기록이 있는 예약에는 다시 보내지 않습니다.
- 그 밖에: 문자 발신 번호를 코드에서 빼내어 환경 변수 `SMS_SENDER_ID`로 옮겼습니다. 이 값은 숫자 8~11자리여야 하며, 값이 없으면 서버가 시작할 때 오류를 내고 멈춥니다.

## 배포 참고 사항

- 배포 전에 `SMS_SENDER_ID` 환경 변수를 설정해야 합니다. 설정하지 않으면 서버가 시작되지 않습니다.
- 마이그레이션으로 `stores.reminder_hours_before`(기본값 24), `reservations.reminder_sent_at` 컬럼과 부분 인덱스가 추가됩니다.
- 기존 예약은 `reminder_sent_at`이 비어 있습니다. 그래서 배포 직후 첫 실행 때 알림 시간 안에 시작하는 기존 예약에 문자가 한 번 더 나갈 수 있습니다. 이미 09:00 알림을 받은 예약에 중복 발송되지 않도록 배포 전에 기존 예약의 `reminder_sent_at`을 채우는 방법을 검토해야 합니다.

## 확인 사항

- [x] 통합 테스트 23개 통과 (새로 작성한 테스트 6개 포함)
- [x] 스테이징에서 알림 시간을 2시간으로 설정한 매장에 예약을 등록하고, 발송 기록이 예약 2시간 전에 생성되는 것을 확인
- [ ] 실제 통신사 발송: 스테이징은 문자 발송을 모의(mock) 처리하므로 실제 발송은 확인하지 못했습니다. 배포 후 실제 문자 수신을 확인해야 합니다.
- [ ] 배포 직후 중복 발송 여부: 기존 예약의 `reminder_sent_at` 처리 방식을 정하기 전에는 확인하지 않았습니다.

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
| 기본 | 3.3 | 1.83 |
| fluent-korean | 4.0 | 1.17 |
| 우리 스킬 | 1.3 | 3.00 |

### 1번째 생성

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

장바구니 수량 빠른 연속 변경 시 합계가 어긋나는 문제 수정 (#131)

## 문제

수량 `+` 버튼을 빠르게 두 번 누르면 화면의 수량은 3인데 합계 금액은 2개 기준 값으로 남는 경우가 있습니다 (#131).

## 원인

- 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고, 응답으로 받은 장바구니로 화면 상태를 덮어씁니다.
- 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면, 예전 응답이 최신 상태를 덮어씁니다.

## 변경 사항

- `useCartQuantity`에서 수량을 바꿀 때마다 이전 요청을 `AbortController`로 취소합니다.
- 응답 장바구니의 `version`이 현재 상태의 `version`보다 낮으면 해당 응답을 버립니다.
- 서버는 변경하지 않았습니다. `version` 필드는 기존 응답에 이미 포함되어 있었습니다.
- DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.

## 테스트

- Playwright E2E 신규 4개를 추가했습니다.
  - 수량을 빠르게 두 번 올려도 합계가 맞는지 확인
  - 첫 번째 응답이 두 번째 응답보다 늦게 와도 합계가 맞는지 확인 (응답 순서를 뒤집는 케이스)
  - 수량을 올렸다가 바로 내려도 합계가 맞는지 확인
  - 요청이 실패하면 이전 수량으로 되돌리고 오류를 표시하는지 확인
- 전체 E2E 212개 통과
- Chrome에서 네트워크를 Slow 3G로 설정하고 20회 연속 클릭했을 때 합계가 맞았습니다.

## 확인하지 못한 것

- iOS Safari에서는 확인하지 못했습니다. 테스트 기기가 없었습니다. 리뷰어 중 iOS 기기로 한 번 확인해 주실 수 있으면 좋겠습니다.

## 리뷰 포인트

- `setCart`가 함수형 업데이터(`(current) => next`)를 받는지 확인해 주세요. 받지 않는다면 이 부분을 수정해야 합니다.
- `isAbortError` 헬퍼의 위치와 구현을 확인해 주세요.
- 취소된 요청은 서버에서 이미 처리되었을 수 있습니다. 이 경우에도 `version` 비교로 화면 상태가 올바르게 유지되는지 봐 주세요.

Closes #131

</td>
<td valign="top">

장바구니 수량을 빠르게 바꿀 때 합계가 어긋나는 문제를 수정합니다

## 관련 이슈

이슈 #131을 해결합니다. QA에서 수량 `+` 버튼을 빠르게 두 번 누르면 화면의 수량은 3으로 바뀌지만, 합계 금액은 수량 2개일 때의 값으로 남는다는 제보가 들어왔습니다.

## 원인

수량을 바꿀 때마다 `PATCH /cart/items/:id` 요청을 보내고, 응답으로 받은 장바구니로 화면 상태를 덮어씁니다. 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면, 예전 상태를 담은 응답이 최신 상태를 덮어씁니다.

## 변경 사항

- 수량을 바꿀 때 이전 요청이 아직 끝나지 않았다면 `AbortController`로 그 요청을 취소합니다.
- 응답에 담긴 장바구니의 `version`이 화면이 가진 `version`보다 낮으면 그 응답을 버립니다.
- 서버 코드는 변경하지 않았습니다. `version` 필드는 기존 응답에 이미 포함되어 있었습니다.

## 확인한 내용

- Playwright E2E 테스트 4개를 새로 작성했습니다. 응답 순서를 뒤집는 경우도 포함합니다.
- 전체 E2E 테스트 212개가 모두 통과했습니다.
- Chrome에서 네트워크를 Slow 3G로 낮춘 뒤 `+` 버튼을 20번 눌렀고, 그때마다 합계가 수량과 맞았습니다.

## 확인하지 못한 내용

- iOS Safari에서는 확인하지 못했습니다. 테스트 기기가 없었습니다. 가능하다면 리뷰어께서 해당 환경에서 한 번 확인해 주시기 바랍니다.

## 배포 시 유의 사항

DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.

</td>
<td valign="top">

장바구니 수량을 빠르게 바꿀 때 늦게 도착한 예전 응답이 화면을 덮어쓰는 것을 차단

## 작업 배경

장바구니에서 수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3인데 합계 금액은 수량 2개 기준으로 남는 문제가 QA에서 접수되었습니다 (#131). 수량을 바꿀 때마다 PATCH 요청을 보내고 응답으로 받은 장바구니로 화면을 덮어쓰는데, 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면 예전 상태가 최신 상태를 덮어썼습니다.

## 변경 사항

- **수량을 바꿀 때 이전 요청을 취소하고, 예전 응답은 화면에 반영하지 않습니다**: 수량을 바꾸면 진행 중인 이전 PATCH 요청을 AbortController 로 취소합니다. 응답으로 받은 장바구니의 version 이 화면이 가진 version 보다 낮으면 그 응답을 버리고 현재 상태를 유지합니다.
- 그 밖에 Playwright E2E 테스트 4개를 `cart-quantity.spec.ts` 에 추가했습니다. 빠르게 두 번 올리는 경우, 첫 번째 응답이 두 번째 응답보다 늦게 오는 경우(응답 순서를 뒤집어서 검증), 올렸다가 바로 내리는 경우, 요청이 실패했을 때 이전 수량으로 되돌리고 오류를 보여 주는 경우를 검증합니다.
- 서버 코드는 변경하지 않았습니다. version 필드는 기존 응답에 이미 포함되어 있었습니다.

## 확인 사항

- [x] Playwright E2E 를 새로 작성해 실행했고, 전체 E2E 212개가 통과했습니다.
- [x] 크롬에서 네트워크를 Slow 3G 로 설정하고 수량 + 버튼을 20번 눌러 합계가 맞는 것을 직접 확인했습니다.
- [ ] iOS 사파리에서는 확인하지 못했습니다. 테스트 기기가 없었습니다.

</td>
</tr>
</table>

<details>
<summary>2번째 생성</summary>

<table>
<tr><th width="33%">기본</th><th width="33%">fluent-korean</th><th width="33%">우리 스킬</th></tr>
<tr>
<td valign="top">

장바구니 수량을 빠르게 연속으로 바꿀 때 합계가 어긋나는 문제 수정

## 관련 이슈

Closes #131

## 원인

수량 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고, 응답으로 받은 장바구니로 화면 상태를 덮어씁니다. 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면, 예전 응답이 최신 상태를 덮어써서 화면의 수량과 합계가 어긋났습니다.

## 변경 내용

- `useCartQuantity`: 수량을 바꿀 때마다 이전 요청을 `AbortController`로 취소합니다.
- 응답의 장바구니 `version`이 화면이 가진 `version`보다 낮으면 그 응답을 버리고 현재 상태를 유지합니다.
- 취소된 요청의 AbortError는 무시하고, 그 밖의 오류는 그대로 던집니다.
- 서버는 변경하지 않았습니다. `version` 필드는 기존 응답에 이미 있었습니다.

## 테스트

- Playwright E2E 신규 4개 추가
  - 수량을 빠르게 두 번 올려도 합계가 맞는지 확인
  - 첫 번째 응답이 두 번째 응답보다 늦게 와도 합계가 맞는지 확인 (응답 순서를 뒤집어 검증)
  - 수량을 올렸다가 바로 내리는 경우 합계가 맞는지 확인
  - 요청이 실패하면 수량을 이전 값으로 되돌리고 오류를 보여 주는지 확인
- 전체 E2E 212개 통과
- Chrome에서 네트워크를 Slow 3G로 낮추고 수량 버튼을 20번 눌러 합계가 맞는 것을 확인

## 확인하지 못한 것

- iOS Safari에서는 확인하지 못했습니다. 테스트 기기가 없어서 리뷰어가 해당 환경에서 한 번 확인해 주시면 좋겠습니다.

## 배포 시 주의사항

- DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.

</td>
<td valign="top">

장바구니 수량을 빠르게 바꿀 때 합계가 어긋나는 문제를 수정합니다 (#131)

## 배경

QA에서 장바구니 수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3으로 표시되는데 합계 금액은 2개 기준 값으로 남는다는 제보가 들어왔습니다. 이 PR은 이슈 #131을 해결합니다.

## 원인

수량 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고, 응답으로 받은 장바구니 전체로 화면 상태를 덮어씁니다. 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면, 예전 상태를 담은 응답이 최신 상태를 덮어쓰게 됩니다.

## 변경 사항

- 수량을 바꿀 때마다 이전 요청을 `AbortController`로 취소합니다.
- 응답 장바구니의 `version`이 화면이 가진 `version`보다 낮으면 그 응답을 버립니다.
- 취소된 요청에서 발생한 중단 오류는 무시합니다. 다른 오류는 기존과 같이 다시 던집니다.
- 서버는 수정하지 않았습니다. `version` 필드는 기존 응답에 이미 포함되어 있었습니다.

## 확인한 내용

- Playwright E2E 테스트 4개를 새로 작성했습니다. 응답 순서를 뒤집는 경우와 요청이 실패하는 경우를 포함합니다.
- 전체 E2E 테스트 212개가 통과했습니다.
- 크롬에서 네트워크를 Slow 3G로 낮춘 뒤 수량 버튼을 20번 눌렀을 때 합계가 맞게 표시되었습니다.

## 확인하지 못한 내용

- iOS 사파리에서는 확인하지 못했습니다. 테스트 기기가 없었습니다. 리뷰어께서 iOS 사파리에서 수량을 빠르게 바꿔 보시면 좋겠습니다.

## 기타

- DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.

</td>
<td valign="top">

fix: 장바구니 수량을 연속으로 바꿀 때 이전 응답이 화면을 덮어쓰는 문제를 수정

## 작업 배경

장바구니에서 수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3으로 표시되지만 합계 금액은 2개 기준으로 남는 문제가 QA에서 제보되었습니다(#131). 수량을 바꿀 때마다 응답으로 받은 장바구니로 화면을 덮어쓰는 구조라서, 먼저 보낸 요청의 응답이 나중에 도착하면 예전 장바구니가 최신 상태를 덮어썼습니다.

## 변경 사항

- **수량을 바꾸면 진행 중이던 이전 요청이 취소됩니다**: 수량을 바꿀 때마다 이전 PATCH 요청을 AbortController로 취소하고, 취소된 요청의 응답은 화면에 반영하지 않습니다.
- **오래된 응답은 화면에 반영되지 않습니다**: 응답에 들어 있는 장바구니의 version이 화면이 가진 version보다 낮으면 버리고 현재 장바구니를 유지합니다.
- 그 밖에 서버 API는 변경하지 않았습니다. version 필드는 기존 응답에 이미 들어 있었습니다.

## 확인 사항

- [x] 새 Playwright E2E 4개 추가(응답 순서를 뒤바꾼 경우 포함), 전체 E2E 212개 통과
- [x] 크롬에서 네트워크를 Slow 3G로 낮추고 + 버튼을 20번 눌러 합계가 맞는지 확인
- [ ] iOS Safari: 테스트 기기가 없어 확인하지 못했습니다

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

장바구니 수량을 빠르게 연속 변경할 때 합계가 어긋나는 문제 수정 (#131)

## 관련 이슈

- Closes #131

## 원인

수량 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고, 응답으로 받은 장바구니로 화면 상태를 덮어씁니다. 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면, 예전 상태가 최신 상태를 덮어써서 화면의 수량과 합계가 달라졌습니다.

## 변경 내용

- `useCartQuantity`에서 수량을 바꿀 때마다 이전 요청을 `AbortController`로 취소합니다.
- 응답의 장바구니 `version`이 화면이 가진 `version`보다 낮으면 그 응답을 버립니다.
- 서버는 변경하지 않았습니다. `version` 필드는 원래 응답에 있던 값입니다.
- DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.

## 테스트

- `web/e2e/cart-quantity.spec.ts`에 Playwright E2E 4개를 추가했습니다.
  - 수량을 빠르게 두 번 올려도 합계가 맞는지 확인
  - 첫 번째 응답이 두 번째 응답보다 늦게 와도 합계가 맞는지 확인 (응답 순서를 뒤집는 경우)
  - 수량을 올렸다가 바로 내려도 합계가 맞는지 확인
  - 요청이 실패하면 이전 수량으로 되돌리고 오류를 보여 주는지 확인
- 전체 E2E 212개가 모두 통과했습니다.
- Chrome에서 네트워크를 Slow 3G로 낮추고 수량 버튼을 20번 누르는 수동 확인에서 합계가 맞았습니다.

## 확인하지 못한 것

- iOS Safari에서는 확인하지 못했습니다. 테스트 기기가 없었습니다. 리뷰어나 QA에서 확인해 주시면 좋겠습니다.

</td>
<td valign="top">

장바구니 수량 연속 변경 시 합계가 어긋나는 문제를 수정합니다 (#131)

## 개요

장바구니에서 수량 `+` 버튼을 빠르게 두 번 누르면 화면의 수량은 3으로 보이지만, 합계 금액은 2개 기준 값으로 남는 문제가 있었습니다. 이 PR은 이슈 #131을 해결합니다.

## 원인

수량을 바꿀 때마다 `PATCH /cart/items/:id` 요청을 보내고, 응답으로 받은 장바구니로 화면 상태를 덮어씁니다. 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면, 예전 응답이 최신 상태를 덮어써 화면과 합계가 어긋났습니다.

## 변경 사항

- `useCartQuantity`에서 수량을 바꿀 때마다 이전 요청을 `AbortController`로 취소합니다.
- 응답 장바구니의 `version`이 화면이 가진 `version`보다 낮으면 그 응답을 버립니다.
- 서버는 변경하지 않았습니다. `version` 필드는 기존 응답에 이미 포함되어 있었습니다.
- DB, 환경 변수, 배포 순서에 대한 변경은 없습니다.

## 확인한 것

- Playwright E2E 테스트 4개를 새로 추가했습니다. 응답 순서가 뒤바뀌는 경우, 증가 후 바로 감소하는 경우, 요청이 실패할 때 이전 값으로 되돌리고 오류를 보여 주는 경우를 포함합니다.
- 전체 E2E 테스트 212개가 모두 통과했습니다.
- Chrome에서 네트워크를 Slow 3G로 설정하고 `+` 버튼을 20번 눌렀을 때 합계가 수량과 일치했습니다.

## 확인하지 못한 것

- iOS Safari에서는 확인하지 못했습니다. 테스트 기기가 없었기 때문입니다. 가능하다면 리뷰어께서 해당 환경에서 한 번 확인해 주시면 감사하겠습니다.

</td>
<td valign="top">

장바구니 수량 변경 시 늦게 도착한 응답이 화면을 덮어쓰는 문제 수정
ㅤ
## 작업 배경

장바구니에서 수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3인데 합계 금액은 2개 값으로 남는 문제가 QA에서 제보되었습니다(이슈 #131). 버튼을 누를 때마다 `PATCH /cart/items/:id` 요청을 보내고 응답으로 받은 장바구니로 화면을 덮어쓰는데, 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 도착하면 예전 응답이 최신 상태를 덮어썼습니다. 관련 이슈: #131

## 변경 사항

- **수량을 바꾸면 이전 요청이 취소됩니다**: 새 요청을 보내기 전에 진행 중이던 요청을 `AbortController`로 취소합니다.
- **응답의 장바구니 버전이 낮으면 화면을 갱신하지 않습니다**: 응답에 담긴 `version`이 화면이 가진 `version`보다 낮으면 그 응답을 버립니다.

서버 코드는 변경하지 않았습니다. `version` 필드는 원래 응답에 포함되어 있었습니다.

## 확인 사항

- [x] Playwright E2E 테스트 4개를 새로 작성했습니다(응답 순서를 뒤집는 경우 포함). 전체 E2E 212개가 통과했습니다.
- [x] 크롬에서 네트워크를 Slow 3G로 낮추고 수량 버튼을 20번 눌러 합계가 맞는 것을 확인했습니다.
- [ ] iOS 사파리에서는 확인하지 못했습니다. 테스트 기기가 없었습니다.

## 배포 참고 사항

- 없음

</td>
</tr>
</table>

</details>

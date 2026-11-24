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

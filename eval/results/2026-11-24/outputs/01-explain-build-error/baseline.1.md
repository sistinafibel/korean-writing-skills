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

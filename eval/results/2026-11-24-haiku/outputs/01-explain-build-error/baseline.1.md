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

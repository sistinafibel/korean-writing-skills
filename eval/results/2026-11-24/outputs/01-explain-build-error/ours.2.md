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

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

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

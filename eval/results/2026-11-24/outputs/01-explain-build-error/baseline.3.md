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

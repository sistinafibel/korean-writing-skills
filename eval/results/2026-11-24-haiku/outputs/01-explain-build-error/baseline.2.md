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

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

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

## 원인

import 경로에 적힌 파일 이름과 실제 파일 이름의 대소문자가 다릅니다.

- 코드: `@/lib/dateFormat`
- 실제 파일: `src/lib/DateFormat.ts`

macOS의 기본 파일 시스템은 대소문자를 구분하지 않아서 로컬에서는 두 이름이 같은 파일로 인식되어 빌드가 통과합니다. GitHub Actions의 ubuntu-latest는 대소문자를 구분하므로 `dateFormat` 이라는 파일을 찾지 못하고 TS2307 오류를 냅니다.

## 해결 방법

`src/lib` 의 다른 파일(`currency.ts`, `http.ts`)이 모두 소문자로 시작하니 파일 이름을 `dateFormat.ts` 로 변경하는 편이 일관됩니다. macOS에서는 git이 대소문자만 바꾼 이름 변경을 인식하지 못하는 경우가 있으므로 임시 이름을 거쳐서 변경합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

이름을 변경한 뒤에는 `DateFormat` 으로 import하는 다른 파일이 남아 있지 않은지 확인합니다.

```bash
grep -rn "lib/DateFormat" src
```

파일 이름은 그대로 두고 싶다면 `BookingForm.tsx` 의 import를 `'@/lib/DateFormat'` 으로 수정해도 됩니다.

## 재발 방지

`tsconfig.json` 의 `compilerOptions` 에 아래 옵션을 추가하면 로컬에서도 대소문자가 어긋난 import가 오류로 표시되어, CI에 올리기 전에 같은 문제를 발견할 수 있습니다. TypeScript 5 이상에서는 기본값이 `true` 이지만, 명시해 두면 설정이 바뀌어도 동작이 유지됩니다.

```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

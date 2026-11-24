원인은 파일 이름과 import 경로의 대소문자가 서로 다르기 때문입니다. 실제 파일은 `src/lib/DateFormat.ts`인데 `BookingForm.tsx`에서는 `@/lib/dateFormat`으로 불러오고 있습니다. macOS의 기본 파일 시스템은 대소문자를 구분하지 않아서 로컬에서는 두 이름이 같은 파일로 해석되지만, ubuntu-latest는 대소문자를 구분하므로 `dateFormat.ts`를 찾지 못해 TS2307 오류가 발생합니다.

## 고치는 방법

같은 폴더의 `currency.ts`와 `http.ts`가 소문자로 시작하므로 파일 이름을 import에 맞추는 편이 일관됩니다. macOS에서는 대소문자만 바꾸는 이름 변경이 git에 반영되지 않는 경우가 있어서, 임시 이름을 거쳐 두 단계로 변경하는 것이 안전합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

파일 이름을 바꾸면 `DateFormat`으로 불러오는 다른 import가 로컬에서는 문제없이 동작하다가 CI에서 다시 실패할 수 있으므로, 아래 명령으로 남은 참조를 확인해서 함께 수정해야 합니다.

```bash
grep -rn "lib/DateFormat" src
```

파일 이름을 바꾸고 싶지 않다면 `BookingForm.tsx`의 import를 `@/lib/DateFormat`으로 수정해도 오류는 해결됩니다.

## 재발 방지

`tsconfig.json`의 `compilerOptions`에 `"forceConsistentCasingInFileNames": true`가 설정되어 있는지 확인하세요. 이 옵션은 디스크의 실제 파일 이름과 다른 대소문자로 불러오는 import를 대소문자를 구분하지 않는 환경에서도 오류로 보고합니다. 옵션이 켜져 있었다면 이번 문제는 로컬 빌드에서 먼저 발견되었을 것이므로, `false`로 지정되어 있거나 TypeScript 버전이 낮아서 기본값이 적용되지 않았을 가능성이 있습니다.

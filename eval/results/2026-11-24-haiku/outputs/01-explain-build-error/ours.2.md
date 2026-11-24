## 원인

파일 이름과 import 경로의 **대소문자가 다릅니다.**

- 실제 파일: `src/lib/DateFormat.ts`
- import 경로: `'@/lib/dateFormat'`

macOS의 기본 파일 시스템(APFS)은 대소문자를 구분하지 않아서 `dateFormat`으로 찾아도 `DateFormat.ts`가 매칭되므로 로컬 빌드가 성공합니다. 반면 `ubuntu-latest`의 파일 시스템은 대소문자를 구분하므로 `dateFormat.ts`를 찾지 못하고 TS2307 오류가 발생합니다.

## 수정 방법

**권장: 파일 이름을 소문자로 바꿉니다.** 같은 폴더의 `currency.ts`, `http.ts`가 모두 소문자이므로 이쪽이 일관됩니다.

macOS에서는 대소문자만 바꾸는 rename을 Git이 인식하지 못하는 경우가 있으므로, 임시 이름을 거쳐 두 번 옮깁니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateformat-tmp.ts
git mv src/lib/dateformat-tmp.ts src/lib/dateFormat.ts
```

그다음 `DateFormat`을 가리키는 다른 import가 있는지 확인합니다.

```bash
grep -rni "lib/dateformat" src
```

이 명령은 대소문자를 무시하고 찾으므로, 다른 파일에서 `DateFormat`으로 import한 곳도 함께 나옵니다. 그런 곳이 있다면 모두 `@/lib/dateFormat`으로 맞춥니다.

**대안:** 파일 이름은 그대로 두고 import를 `'@/lib/DateFormat'`으로 바꿀 수 있습니다. 이 경우 다른 파일의 `dateFormat` import도 모두 같은 이름으로 맞춰야 합니다.

## 재발 방지

`tsconfig.json`의 `compilerOptions`에 다음 옵션을 추가하면 TypeScript가 대소문자가 일치하지 않는 파일 참조를 로컬에서도 경고합니다.

```json
"forceConsistentCasingInFileNames": true
```

이 옵션이 있으면 macOS에서도 같은 문제를 빌드 단계에서 잡을 수 있습니다.

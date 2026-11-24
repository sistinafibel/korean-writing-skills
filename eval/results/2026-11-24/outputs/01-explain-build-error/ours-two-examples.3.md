원인은 파일 이름과 import 경로의 대소문자가 서로 달라서 생긴 문제입니다. 실제 파일은 `src/lib/DateFormat.ts`인데 `BookingForm.tsx`에서는 `@/lib/dateFormat`으로 불러오고 있습니다. macOS의 기본 파일 시스템은 대소문자를 구분하지 않아서 로컬에서는 두 이름이 같은 파일로 해석되지만, ubuntu-latest의 파일 시스템은 대소문자를 구분하므로 `dateFormat`이라는 파일을 찾지 못해 TS2307 오류가 발생합니다. `tsconfig.json`의 paths 설정(`"@/*": ["./src/*"]`)에는 문제가 없습니다.

## 고치는 방법

프로젝트의 다른 파일(`currency.ts`, `http.ts`)이 소문자로 시작하므로 파일 이름을 `dateFormat.ts`로 바꾸는 쪽을 권장합니다.

macOS에서는 대소문자만 다른 이름으로 한 번에 바꾸면 git이 변경을 인식하지 못할 수 있어서, 임시 이름을 거쳐서 두 단계로 바꿉니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

그다음 `DateFormat`으로 불러오는 곳이 더 남아 있지 않은지 확인합니다.

```bash
grep -rn "lib/DateFormat" src
```

이름을 바꾸는 대신 import 경로를 `@/lib/DateFormat`으로 수정해도 CI는 통과합니다. 다만 이 경우 같은 폴더의 다른 파일과 이름 규칙이 달라집니다.

## 재발 방지

`tsconfig.json`의 `compilerOptions`에 `"forceConsistentCasingInFileNames": true`를 추가하면 로컬 macOS에서도 대소문자가 다른 import를 오류로 표시하므로, CI에서 실패하기 전에 발견할 수 있습니다. TypeScript 5.x 이후 버전에서는 이 옵션이 기본값으로 켜져 있지만, 설정 파일에 명시해 두면 버전이 바뀌어도 동작이 유지됩니다. 이미 켜져 있는데도 로컬에서 오류가 나지 않았다면 git 인덱스에 남은 이름과 디스크의 이름이 다른 상태일 수 있으므로, `git ls-files src/lib`로 git이 기록한 파일 이름도 확인해 보세요.

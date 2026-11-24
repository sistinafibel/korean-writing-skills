원인은 파일 이름과 import 경로의 대소문자가 서로 달라서입니다. 실제 파일은 `src/lib/DateFormat.ts` 인데 import 는 `@/lib/dateFormat` 으로 작성되어 있습니다.

macOS 의 기본 파일 시스템은 대소문자를 구분하지 않아서 `dateFormat` 으로 써도 `DateFormat.ts` 를 찾아 줍니다. 반면 ubuntu-latest 의 파일 시스템은 대소문자를 구분하므로 `dateFormat.ts` 가 없다고 판단하고 TS2307 오류를 냅니다. paths 설정(`"@/*": ["./src/*"]`)은 정상이니 수정할 필요가 없습니다.

## 고치는 방법

파일 이름을 import 에 맞춰 `dateFormat.ts` 로 변경합니다. `src/lib` 의 나머지 파일(`currency.ts`, `http.ts`)이 camelCase 이므로 이 방향이 기존 관례와도 맞습니다. macOS 에서는 대소문자만 바꾸는 이름 변경을 git 이 인식하지 못할 수 있으므로 임시 이름을 거쳐서 두 단계로 변경합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

변경한 뒤에는 `git ls-files src/lib` 로 git 이 추적하는 이름이 `dateFormat.ts` 인지 확인합니다. 로컬 폴더에서는 이름이 바뀌어 보여도 git 에는 예전 이름이 남아 있는 경우가 있고, CI 는 git 에 기록된 이름으로 체크아웃하기 때문입니다.

또 다른 파일에서 `@/lib/DateFormat` 처럼 대문자로 import 한 곳이 있으면 같은 오류가 납니다. 아래 명령으로 대소문자가 섞인 import 를 모두 찾아서 `@/lib/dateFormat` 으로 통일하세요.

```bash
grep -rniE "lib/dateformat" src
```

## 재발 방지

`tsconfig.json` 의 `compilerOptions` 에 `"forceConsistentCasingInFileNames": true` 를 추가하면 대소문자가 다른 import 를 macOS 로컬에서도 오류로 보고합니다. TypeScript 5 이상에서는 기본값이 `true` 이지만, 이 옵션은 같은 파일을 서로 다른 대소문자로 참조할 때를 검사하므로 이 경우처럼 실제 파일 이름과 import 가 다른 상황은 macOS 에서 통과할 수 있습니다. 그래서 로컬에서 미리 잡으려면 위의 `grep` 확인이나 ESLint 의 `import/no-unresolved` 에 `caseSensitive` 옵션(기본값 `true`)을 켜 두는 방법이 더 확실합니다.

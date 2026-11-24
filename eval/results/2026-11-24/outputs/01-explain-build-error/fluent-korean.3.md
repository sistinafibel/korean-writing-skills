## 원인

파일 이름과 import 경로의 대소문자가 서로 다르기 때문에 발생하는 오류입니다.

- 실제 파일 이름은 `src/lib/DateFormat.ts` 입니다. D가 대문자입니다.
- import 경로는 `@/lib/dateFormat` 입니다. d가 소문자입니다.

macOS의 기본 파일 시스템은 대소문자를 구분하지 않기 때문에, 로컬에서는 두 이름이 같은 파일로 인식되어 빌드가 성공합니다. 반면 ubuntu-latest의 파일 시스템은 대소문자를 구분하므로, `dateFormat` 이라는 파일을 찾지 못하고 TS2307 오류가 발생합니다. `paths` 설정 자체에는 문제가 없습니다.

## 해결 방법

`src/lib` 의 다른 파일(`currency.ts`, `http.ts`)이 모두 소문자로 시작하므로, 파일 이름을 `dateFormat.ts` 로 변경하는 방법을 권장합니다.

macOS에서 대소문자만 바꾸는 이름 변경은 git이 인식하지 못하는 경우가 있으므로, 임시 이름을 거쳐서 두 번에 나누어 변경합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

그 다음 프로젝트 전체에서 `DateFormat` 으로 import하는 곳이 남아 있는지 확인합니다.

```bash
grep -rn "lib/DateFormat" src
```

파일 이름을 바꾸지 않고 import 경로를 `@/lib/DateFormat` 으로 수정해도 오류는 해결됩니다. 다만 이 경우에는 파일 이름 규칙이 일관되지 않은 상태가 그대로 유지됩니다.

## 재발 방지

`tsconfig.json` 의 `compilerOptions` 에 아래 옵션을 추가하면, 로컬(macOS)에서도 대소문자가 다른 import를 오류로 처리하므로 CI에서 실패하기 전에 미리 발견할 수 있습니다.

```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

이 옵션은 TypeScript 5.0 이후에는 기본값이 `true` 이지만, 명시해 두면 설정 의도가 분명하게 드러납니다. 또한 로컬 git 저장소에서 `git ls-files src/lib` 를 실행하면 git이 실제로 추적 중인 파일 이름의 대소문자를 확인할 수 있습니다.

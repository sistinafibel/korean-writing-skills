## 원인

파일 시스템의 대소문자 구분 방식이 macOS와 Linux에서 서로 다르기 때문에 발생한 오류입니다.

- 실제 파일 이름은 `src/lib/DateFormat.ts`이고, 코드에서는 `@/lib/dateFormat`으로 가져오고 있습니다. 두 이름은 첫 글자의 대소문자가 다릅니다.
- macOS의 기본 파일 시스템(APFS)은 대소문자를 구분하지 않으므로, 로컬에서는 두 이름을 같은 파일로 인식하여 빌드가 성공합니다.
- GitHub Actions의 ubuntu-latest는 대소문자를 구분하는 파일 시스템을 사용하므로, `dateFormat.ts`라는 파일을 찾지 못하고 TS2307 오류를 출력합니다.

## 해결 방법

### 방법 1: import 경로를 실제 파일 이름에 맞추기 (가장 간단함)

```ts
import { formatDate } from '@/lib/DateFormat';
```

`DateFormat`을 가져오는 다른 파일도 같은 오류가 발생할 수 있으므로, 프로젝트 전체에서 `dateFormat`으로 검색하여 함께 수정해야 합니다.

### 방법 2: 파일 이름을 다른 파일들의 관례에 맞추기

`currency.ts`, `http.ts`가 모두 소문자로 시작하므로, 파일 이름을 `dateFormat.ts`로 바꾸는 편이 일관성 측면에서 더 좋습니다. 다만 macOS에서 대소문자만 바꾸는 이름 변경은 Git이 변경 사항을 인식하지 못하는 경우가 있어서, 아래처럼 두 단계로 진행하는 방식이 안전합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

이후 `git ls-files src/lib`로 저장소에 기록된 이름이 `dateFormat.ts`인지 확인한 뒤 커밋하면 됩니다.

## 재발 방지

1. `tsconfig.json`의 `compilerOptions`에 `"forceConsistentCasingInFileNames": true`를 추가하면, 로컬에서도 대소문자가 다른 import를 오류로 처리합니다. 최신 TypeScript에서는 기본값이 `true`인 경우도 있으나, 명시해 두면 설정이 분명해집니다.
2. 가능하다면 CI뿐 아니라 로컬 검증 단계에서도 대소문자를 구분하는 환경(예: Docker의 Linux 컨테이너)을 사용하는 방법을 고려할 수 있습니다.
3. ESLint의 `import/no-unresolved` 규칙에 `caseSensitive` 옵션을 활성화하면 편집 단계에서 같은 문제를 미리 발견할 수 있습니다.

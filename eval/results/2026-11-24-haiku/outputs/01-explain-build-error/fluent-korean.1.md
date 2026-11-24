## 원인

파일 시스템의 대소문자 구분 여부가 다르기 때문입니다.

- 실제 파일은 `src/lib/DateFormat.ts`(D가 대문자)입니다.
- 코드는 `@/lib/dateFormat`(d가 소문자)으로 import합니다.
- macOS의 기본 파일 시스템(APFS)은 대소문자를 구분하지 않으므로 `dateFormat`으로 요청해도 `DateFormat.ts`가 찾아집니다. 그래서 로컬 빌드는 성공합니다.
- GitHub Actions의 `ubuntu-latest`는 ext4 파일 시스템을 쓰며 대소문자를 구분합니다. 따라서 `dateFormat.ts`라는 파일을 찾지 못하고 TS2307 오류가 발생합니다.

## 해결 방법

프로젝트의 다른 파일(`currency.ts`, `http.ts`)이 모두 소문자 camelCase이므로, 파일명을 import 경로와 맞추는 것이 일관성에 맞습니다.

macOS에서는 대소문자만 바꾸는 rename이 git에 반영되지 않는 경우가 있으므로, 임시 이름을 거쳐 두 단계로 변경하는 것이 안전합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.tmp.ts
git mv src/lib/dateFormat.tmp.ts src/lib/dateFormat.ts
```

그다음 `DateFormat`을 경로로 참조하는 곳이 더 있는지 확인합니다.

```bash
grep -rn "DateFormat" src
```

## 재발 방지

`tsconfig.json`의 `compilerOptions`에 다음 옵션을 추가하면 TypeScript가 import 경로와 실제 파일명의 대소문자 불일치를 로컬에서도 오류로 알려 줍니다. 이 설정이 있었다면 macOS에서 이미 실패했을 것입니다.

```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

변경 후 `pnpm build`를 로컬에서 한 번 실행해 확인한 뒤 커밋하면 CI에서도 통과합니다.

## 원인

파일 이름의 대소문자가 일치하지 않습니다. 코드는 `@/lib/dateFormat`으로 import하지만, 실제 파일은 `src/lib/DateFormat.ts`입니다.

- **macOS(APFS 기본 설정)와 Windows(NTFS)** 는 파일 이름의 대소문자를 구분하지 않으므로 `dateFormat`과 `DateFormat`을 같은 파일로 인식합니다. 그래서 로컬 빌드는 성공합니다.
- **Linux(ubuntu-latest의 ext4)** 는 대소문자를 구분하므로 `dateFormat.ts`를 찾지 못하고 빌드가 실패합니다.

TypeScript 컴파일러도 로컬 파일 시스템의 대소문자 규칙을 따르기 때문에 macOS에서는 이 문제가 드러나지 않습니다.

## 해결 방법

`src/lib`의 다른 파일들(`currency.ts`, `http.ts`)이 모두 소문자로 시작하는 camelCase이므로, 파일 이름을 소문자로 맞추는 것이 일관성 측면에서 좋습니다.

macOS에서는 대소문자만 바꾸는 `mv`가 무시될 수 있으므로, 임시 이름을 거쳐 두 번 옮깁니다.

```bash
git mv src/lib/DateFormat.ts src/lib/tmp-dateFormat.ts
git mv src/lib/tmp-dateFormat.ts src/lib/dateFormat.ts
```

그다음 프로젝트 전체에서 `DateFormat` 경로를 참조하는 곳이 없는지 확인합니다.

```bash
grep -rn "DateFormat'" src/ || true
grep -rn "lib/DateFormat" src/ || true
```

참조가 있다면 모두 `@/lib/dateFormat`으로 고칩니다. 이후 `pnpm build`로 확인하고 커밋합니다.

## 재발 방지

`tsconfig.json`의 `compilerOptions`에 다음 옵션을 추가하면, 로컬에서도 대소문자가 맞지 않는 import를 바로 잡아낼 수 있습니다.

```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

이 옵션은 TypeScript 차원에서 대소문자 불일치를 검사하므로, macOS나 Windows에서도 오류로 표시됩니다.

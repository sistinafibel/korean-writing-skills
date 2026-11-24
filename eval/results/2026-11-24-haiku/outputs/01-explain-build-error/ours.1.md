## 원인

파일 이름과 import 경로의 대소문자가 다릅니다.

- 실제 파일: `src/lib/DateFormat.ts` (D가 대문자)
- import 경로: `'@/lib/dateFormat'` (d가 소문자)

macOS 기본 파일 시스템(APFS)과 Windows(NTFS)는 대소문자를 구분하지 않아서 로컬 `pnpm build`가 통과합니다. 반면 `ubuntu-latest`의 Linux 파일 시스템(ext4)은 대소문자를 구분하므로 `dateFormat.ts`라는 파일을 찾지 못하고 TS2307 오류가 납니다.

다른 파일(`currency.ts`, `http.ts`)이 모두 소문자 camelCase이므로, 파일 이름을 `dateFormat.ts`로 맞추는 쪽이 프로젝트 관례에 맞습니다.

## 수정 방법

### 1. 파일 이름을 소문자로 바꿉니다

Git이 대소문자만 다른 이름 변경을 무시하는 경우가 있어서 `git mv`를 두 번 실행합니다.

```bash
git mv src/lib/DateFormat.ts src/lib/tmp-dateformat.ts
git mv src/lib/tmp-dateformat.ts src/lib/dateFormat.ts
```

Windows PowerShell에서도 같은 명령을 사용할 수 있습니다.

### 2. 다른 import 경로도 확인합니다

`DateFormat`으로 import한 곳이 남아 있으면 같은 오류가 다시 발생합니다.

```bash
grep -rn "DateFormat" src/
```

### 3. 같은 문제를 로컬에서 잡도록 설정합니다

`tsconfig.json`의 `compilerOptions`에 다음 옵션을 추가하면, macOS에서도 대소문자 불일치를 `pnpm build` 단계에서 바로 확인할 수 있습니다.

```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

### 4. 커밋 제목 예시

```
fix: dateFormat 모듈의 파일 이름을 import 경로와 대소문자까지 일치시킴
```

## 확인 방법

수정한 뒤 로컬에서 `pnpm build`를 실행하고, CI에서도 같은 빌드가 통과하는지 확인합니다. 로컬에서 결과를 완전히 재현하려면 Linux 컨테이너나 WSL에서 `pnpm build`를 실행해 보는 것도 좋습니다.

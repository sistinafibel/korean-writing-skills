## 원인: 파일명 대소문자 불일치

실제 파일명은 `src/lib/DateFormat.ts`(대문자 D, F)인데, import 경로는 `'@/lib/dateFormat'`(소문자 d, f)입니다.

- **macOS**(APFS 기본 설정)와 **Windows**(NTFS)의 파일시스템은 대소문자를 구분하지 않으므로 로컬에서는 `dateFormat`이 `DateFormat.ts`로 찾아집니다.
- **GitHub Actions의 ubuntu-latest**(ext4)는 대소문자를 구분하므로 `dateFormat.ts`라는 파일이 없다고 판단해 빌드가 실패합니다.

## 해결 방법

가장 간단한 방법은 파일명을 import 경로와 맞추는 것입니다. macOS에서 대소문자만 바꾸면 Git이 변경을 감지하지 못하는 경우가 있으므로 `git mv`를 두 단계로 실행하세요.

```bash
git mv src/lib/DateFormat.ts src/lib/dateFormat.ts.tmp
git mv src/lib/dateFormat.ts.tmp src/lib/dateFormat.ts
git commit -m "fix: rename DateFormat.ts to dateFormat.ts for case-sensitive filesystems"
git push
```

또는 반대로 import 쪽을 `'@/lib/DateFormat'`으로 고쳐도 됩니다. 어느 쪽이든 **파일명과 import 경로의 대소문자가 정확히 같으면** 됩니다.

## 함께 확인하면 좋은 것

- 다른 import도 같은 문제가 없는지 확인하세요. `currency`, `http`는 소문자라 현재는 문제가 없어 보입니다. 프로젝트 전체를 검색하면 됩니다.
  ```bash
  grep -rn "from '@/lib/" src | sort
  ```
- 로컬에서도 잡히도록 `tsconfig.json`에 `"forceConsistentCasingInFileNames": true`를 설정해 두면, 이런 불일치를 macOS/Windows에서도 바로 에러로 확인할 수 있습니다.
- 파일명 규칙(예: 유틸 파일은 전부 camelCase)을 팀에서 통일해 두면 재발을 줄일 수 있습니다.

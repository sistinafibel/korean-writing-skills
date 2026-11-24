---
id: 01-explain-build-error
category: 설명 답변
kind: prose
title: CI 에서만 실패하는 빌드의 원인 설명
---
CI 에서만 빌드가 실패합니다. 로컬(macOS)에서는 `pnpm build` 가 잘 되는데 GitHub Actions(ubuntu-latest)에서는 아래 오류가 납니다. 원인이 무엇이고 어떻게 고치면 되는지 설명해 주세요.

```
src/features/booking/BookingForm.tsx:4:28 - error TS2307: Cannot find module '@/lib/dateFormat' or its corresponding type declarations.

4 import { formatDate } from '@/lib/dateFormat';
                             ~~~~~~~~~~~~~~~~~~

Found 1 error in src/features/booking/BookingForm.tsx:4
```

`src/lib` 폴더에는 이런 파일이 있습니다.

```
src/lib/DateFormat.ts
src/lib/currency.ts
src/lib/http.ts
```

tsconfig.json 의 paths 는 `"@/*": ["./src/*"]` 입니다.

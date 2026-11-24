/**
 * natural-korean 의 조항마다 예시를 2개까지만 남긴 실험용 사본을 만든다.
 *
 * 원본(`plugins/korean-writing/skills/natural-korean/SKILL.md`)은 수정하지 않고,
 * 아래 목록의 예시를 지운 결과를 `eval/experiments/natural-korean-two-examples.md` 로 저장한다.
 * 원본이 바뀌어서 지울 예시를 찾지 못하면 오류를 내므로, 사본이 원본과 어긋난 채로 남지 않는다.
 *
 * 실행: node eval/experiments/make-two-examples.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, '..', '..', 'plugins', 'korean-writing', 'skills', 'natural-korean', 'SKILL.md');
const target = path.join(here, 'natural-korean-two-examples.md');

/**
 * 예시가 3개 이상인 조항에서 지우는 예시다. 조항마다 일상 글의 예시 하나와
 * 개발 글의 예시 하나가 남도록 골랐다.
 */
const REMOVED_EXAMPLES = [
  // 문장 단위 3 (끊어 쓴 문장): 3개 가운데 '-니' 로 잇는 예시를 지운다
  ' [발송 파일에서 뺐어요. 예약현황을 다시 받아 확인해 주세요. → 발송 파일에서 뺐으니 예약현황을 다시 받아 확인해 주세요.]',
  // 구 단위 3 (비유적 어휘): 3개 가운데 마지막 예시를 지운다
  ', <요청을 받습니다 -> 요청을 확인했습니다 (혹은 요청대로 수행하겠습니다)>',
  // 상투적인 문형 1 (부정으로 강조하는 구조): 4개 가운데 2개를 지운다
  ' [요가는 단순히 운동이 아니라, 마음의 평화를 찾는 수련이다 → 요가를 하면서 몸뿐 아니라 마음도 차분해지더라고요.]',
  ' [이건 단순한 계획이 아니야. 너의 인생 패러다임의 전환이야. → 이 계획은 너의 인생을 바꾸는 계기가 될 수 있어.]',
  // 상투적인 문형 2 (격언처럼 단정하는 문장): 3개 가운데 1개를 지운다
  ' [진심을 보이는 순간, 관계는 깊어진다 → 진심을 보이니까 서로 가까워졌어요.]',
];

let text = fs.readFileSync(source, 'utf8').replace(/\r\n/g, '\n');
for (const example of REMOVED_EXAMPLES) {
  if (!text.includes(example)) {
    throw new Error(`원본에서 지울 예시를 찾지 못했습니다. 원본이 바뀌었는지 확인하세요: ${example}`);
  }
  text = text.replace(example, '');
}
fs.writeFileSync(target, text, 'utf8');
process.stdout.write(`${path.relative(process.cwd(), target)} 를 만들었습니다. 지운 예시 ${REMOVED_EXAMPLES.length}개\n`);

/**
 * 케이스마다 조건별 출력을 나란히 놓은 비교표(`side-by-side.md`)와,
 * 루트 README 에 넣는 벤치마크 절을 만든다.
 */
import { fmt } from './aggregate.mjs';
import { EXCERPT_LIMIT, columnsTable, excerpt, literalColumnsTable, literalHtml, promptBlock, renderOutput, table } from './render.mjs';

/** README 벤치마크 절에서 쓰는 조건의 표시 이름 */
export const README_LABELS = { baseline: '처음', 'fluent-korean': '이전 스킬', ours: '이후 스킬' };

/** README 벤치마크 절에 케이스를 하나씩 싣는 갈래. 표시 이름과 케이스 파일의 갈래 이름을 짝짓는다 */
const README_CATEGORIES = [
  { label: '설명 답변', category: '설명 답변' },
  { label: '화면 문구', category: '화면 문구' },
  { label: '고쳐 쓰기', category: 'AI 문체 고쳐 쓰기' },
  { label: '커밋 메시지', category: '커밋 메시지' },
  { label: 'PR 본문', category: 'PR 제목과 본문' },
];

/**
 * 케이스 하나의 조건별 수치를 작은 표로 만든다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @param {object} comparison 비교 정의
 * @param {object} evalCase 케이스
 * @param {(id: string) => string} labelOf 조건 식별자를 표시 이름으로 바꾸는 함수
 * @returns {string} 조건, 규칙 위반 수, 순위 평균을 담은 표
 */
function caseNumbers(results, comparison, evalCase, labelOf) {
  const summary = results.summarize(comparison, (c) => c.id === evalCase.id);
  const rows = comparison.conditions.map((id) => [
    labelOf(id),
    fmt(summary.rules[id].violationsPerOutput, 1),
    fmt(summary.judged.byCondition[id].meanRank),
  ]);
  return table(['조건', `규칙 위반 수 (${results.runs}회 평균)`, `블라인드 순위 평균 (1~${comparison.conditions.length})`], rows);
}

/**
 * 한 번의 생성에 대한 조건별 출력을 열로 나란히 놓는다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @param {object} evalCase 케이스
 * @param {string[]} conditionIds 나란히 놓을 조건
 * @param {number} run 생성 번호
 * @param {(id: string) => string} labelOf 조건 식별자를 표시 이름으로 바꾸는 함수
 * @returns {string} HTML 표
 */
function outputsRow(results, evalCase, conditionIds, run, labelOf) {
  const columns = conditionIds.map((id) => {
    const output = results.readOutput(evalCase.id, id, run);
    return { heading: labelOf(id), body: output === null ? '(출력 없음)' : renderOutput(output, evalCase.kind) };
  });
  return columnsTable(columns);
}

/**
 * README 에 실을 조건별 출력을 Markdown 원문 그대로 열로 나란히 놓는다. 긴 출력은 앞부분만 싣는다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @param {object} evalCase 케이스
 * @param {string[]} conditionIds 나란히 놓을 조건
 * @param {(id: string) => string} labelOf 조건 식별자를 표시 이름으로 바꾸는 함수
 * @param {(caseId: string, conditionId: string, run: number) => string} linkOf 전체 출력 파일의 링크를 만드는 함수
 * @returns {string} HTML 표
 */
function literalOutputsRow(results, evalCase, conditionIds, labelOf, linkOf) {
  const columns = conditionIds.map((id) => {
    const output = results.readOutput(evalCase.id, id, 1);
    if (output === null) return { heading: labelOf(id), html: '(출력 없음)' };
    const shown = excerpt(output, EXCERPT_LIMIT, false);
    const tail = shown.cut ? `\n(뒷부분 생략. <a href="${linkOf(evalCase.id, id, 1)}">전체 보기</a>)` : '';
    return { heading: labelOf(id), html: `${literalHtml(shown.text)}${tail}` };
  });
  return literalColumnsTable(columns);
}

/**
 * 나란히 보는 비교표 전체를 만든다.
 *
 * 세 조건 비교의 출력을 생성 번호마다 열로 나란히 놓고, 다른 비교에만 들어가는 조건의 출력은
 * 케이스 끝에 접어서 붙인다. 출력은 생성된 그대로 싣는다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @returns {string} `side-by-side.md` 의 내용
 */
export function renderSideBySide(results) {
  const main = results.comparisons.find((c) => c.id === 'main');
  const labelOf = (id) => results.conditionById[id].short;
  const extraIds = results.conditions.map((c) => c.id).filter((id) => !main.conditions.includes(id));
  const parts = [
    `# 나란히 보는 비교표 (${results.options.run})`,
    `생성 모델은 \`${results.meta.model}\` 이고, 조건마다 케이스마다 ${results.runs}번씩 생성했습니다. 출력은 생성된 그대로 실었고 고치거나 줄이지 않았습니다. 커밋 메시지는 줄바꿈이 보이도록 코드 블록에 넣었습니다.`,
    '케이스마다 첫 번째 생성 결과를 펼쳐 두었고, 두 번째와 세 번째 생성 결과와 다른 비교에만 들어가는 조건의 출력은 접어 두었습니다. 표의 수치는 규칙 검사와 블라인드 판정의 케이스별 평균입니다.',
    table(['표에 쓰는 이름', '조건', '시스템 프롬프트에 넣은 지침'], results.conditions.map((c) => [c.short, c.label, c.sources.length ? c.sources.map((s) => s.name).join(', ') : '없음'])),
  ];
  for (const evalCase of results.cases) {
    parts.push(`## ${evalCase.id}: ${evalCase.title}`, `갈래: ${evalCase.category}`, promptBlock(evalCase.prompt), caseNumbers(results, main, evalCase, labelOf));
    for (let run = 1; run <= results.runs; run += 1) {
      const row = outputsRow(results, evalCase, main.conditions, run, labelOf);
      parts.push(run === 1 ? `### ${run}번째 생성\n\n${row}` : `<details>\n<summary>${run}번째 생성</summary>\n\n${row}\n\n</details>`);
    }
    const extras = extraIds.filter((id) => results.readOutput(evalCase.id, id, 1) !== null);
    if (extras.length) {
      const blocks = [];
      for (let run = 1; run <= results.runs; run += 1) blocks.push(`${run}번째 생성\n\n${outputsRow(results, evalCase, extras, run, labelOf)}`);
      parts.push(`<details>\n<summary>다른 비교에 들어가는 조건의 출력 (${extras.map(labelOf).join(', ')})</summary>\n\n${blocks.join('\n\n')}\n\n</details>`);
    }
  }
  return `${parts.join('\n\n')}\n`;
}

/**
 * README 벤치마크 절에서 "이후 스킬이 더 낮게 평가된 케이스"로 실을 케이스를 고른다.
 *
 * 케이스마다 이후 스킬의 순위 평균에서 다른 조건 가운데 가장 좋은 순위 평균을 빼고,
 * 그 차이가 가장 큰(이후 스킬에 가장 불리한) 케이스를 고른다. 차이가 0 이하이면 고르지 않는다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @param {object} main 세 조건 비교의 정의
 * @returns {{evalCase: object, gap: number} | null} 고른 케이스와 순위 차이
 */
export function worstCaseForOurs(results, main) {
  const summary = results.summarize(main);
  let worst = null;
  for (const evalCase of summary.cases) {
    const ours = summary.judged.byCondition.ours.rankByCase[evalCase.id];
    const others = main.conditions.filter((id) => id !== 'ours').map((id) => summary.judged.byCondition[id].rankByCase[evalCase.id]);
    if (ours === undefined || others.some((r) => r === undefined)) continue;
    const gap = ours - Math.min(...others);
    if (gap > 0 && (!worst || gap > worst.gap)) worst = { evalCase, gap };
  }
  return worst;
}

/**
 * 루트 README 에 넣을 벤치마크 절을 만든다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @returns {string} 벤치마크 절의 본문 (절 제목은 README 에 있다)
 */
export function renderReadmeBenchmark(results) {
  const main = results.comparisons.find((c) => c.id === 'main');
  const summary = results.summarize(main);
  const labelOf = (id) => README_LABELS[id];
  const resultPath = `eval/results/${results.options.run}`;
  const linkOf = (caseId, conditionId, run) => `${resultPath}/outputs/${caseId}/${conditionId}.${run}.md`;
  const guidance = { baseline: '없음', 'fluent-korean': 'fluent-korean 원본', ours: '이 저장소의 natural-korean 과 git-writing-korean' };
  const headline = table(
    ['조건', '시스템 프롬프트에 넣은 지침', '출력 1건당 규칙 위반 수', '블라인드 순위 평균 (1~3, 낮을수록 좋음)', '시스템 프롬프트 토큰 수'],
    main.conditions.map((id) => [
      labelOf(id),
      guidance[id],
      fmt(summary.rules[id].violationsPerOutput),
      fmt(summary.judged.byCondition[id].meanRank),
      results.tokens ? results.tokens.conditions[id].tokens.toLocaleString('en-US') : '없음',
    ]),
  );
  const parts = [
    `같은 모델(\`${results.meta.model}\`)에 같은 입력을 보내고 시스템 프롬프트에 넣는 지침만 바꿔서 출력을 비교했습니다. 케이스 ${summary.cases.length}개를 조건마다 ${results.runs}번씩 생성했고, 실행한 날짜는 ${results.options.run} 입니다. 조건 이름은 지침이 없는 조건을 "처음", fluent-korean 원본만 넣은 조건을 "이전 스킬", 이 저장소의 최신 스킬 두 개를 넣은 조건을 "이후 스킬"로 표기합니다.`,
    headline,
    `규칙 위반 수는 사용하지 않는 기호와 상투적인 문형, 커밋과 PR 의 형식 기준을 스크립트로 센 값입니다. 커밋 타입이나 절 이름처럼 이 저장소의 스킬만 정하고 있는 기준이 포함되어 있으므로, 그 기준을 받지 않은 두 조건의 수치가 높게 나오는 것은 당연한 결과입니다. 블라인드 순위는 이 기준을 받지 않은 판정 모델(\`${results.meta.judgeModel}\`)이 조건 이름을 가린 출력을 명확성, 자연스러움, 정보량, 지시 준수로 평가해서 정한 순위이고, 순서를 뒤집어서 두 번 판정한 값의 평균입니다. 판정 기준과 케이스별 수치, 전체 출력은 [eval/](eval/README.md) 와 [${resultPath}/summary.md](${resultPath}/summary.md), [${resultPath}/side-by-side.md](${resultPath}/side-by-side.md) 에 있습니다.`,
    '### 같은 입력에 대한 세 조건의 출력',
    `갈래마다 첫 번째 케이스의 첫 번째 생성 결과를 실었습니다. 결과를 보고 고른 출력이 아니므로 이후 스킬에 불리한 출력도 그대로 실려 있습니다. 출력은 모델이 쓴 Markdown 원문을 고치지 않고 글자 그대로 표시했고, ${EXCERPT_LIMIT.toLocaleString('en-US')}자를 넘는 출력은 앞부분만 싣고 전체 파일을 링크했습니다. Markdown 이 적용된 모습과 나머지 생성 결과는 [${resultPath}/side-by-side.md](${resultPath}/side-by-side.md) 에서 볼 수 있습니다.`,
  ];
  const shown = [];
  for (const { label, category } of README_CATEGORIES) {
    const evalCase = results.cases.find((c) => c.category === category);
    if (!evalCase) continue;
    shown.push(evalCase.id);
    parts.push(`#### ${label}: ${evalCase.title}`, promptBlock(evalCase.prompt), literalOutputsRow(results, evalCase, main.conditions, labelOf, linkOf), caseNumbers(results, main, evalCase, labelOf));
  }
  const worst = worstCaseForOurs(results, main);
  parts.push('### 이후 스킬이 더 낮게 평가된 케이스');
  if (!worst) {
    parts.push('블라인드 순위 평균이 다른 조건보다 낮게 나온 케이스가 없었습니다.');
  } else {
    const intro = `케이스마다 이후 스킬의 블라인드 순위 평균에서 다른 두 조건 가운데 더 좋은 순위 평균을 뺐을 때, 그 차이가 가장 큰 케이스는 \`${worst.evalCase.id}\` 입니다(차이 ${fmt(worst.gap)}).`;
    if (shown.includes(worst.evalCase.id)) {
      parts.push(`${intro} 이 케이스의 출력은 위에 실려 있습니다.`);
    } else {
      parts.push(`${intro} 이 케이스도 첫 번째 생성 결과를 싣습니다.`, `#### ${worst.evalCase.category}: ${worst.evalCase.title}`, promptBlock(worst.evalCase.prompt), literalOutputsRow(results, worst.evalCase, main.conditions, labelOf, linkOf), caseNumbers(results, main, worst.evalCase, labelOf));
    }
  }
  parts.push(
    '### 다시 실행하는 방법',
    'Node.js 20 이상과 로그인된 Claude Code CLI 가 있으면 아래 명령으로 생성, 규칙 검사, 판정, 보고서 작성을 한 번에 실행합니다. 실행 방법과 조건을 격리하는 방법은 [eval/README.md](eval/README.md) 에 있습니다.',
    '```sh\nnode eval/run.mjs\n```',
  );
  return parts.join('\n\n');
}

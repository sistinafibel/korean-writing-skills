/**
 * 규칙 검사 결과를 항목별 표(`rule-checks.md`)로 만든다.
 */
import { CHECK_LABELS, COUNT_LABELS, fmt, pct } from './aggregate.mjs';
import { table } from './render.mjs';

/**
 * 기호와 문형의 출현 수를 조건별로 보여 주는 표를 만든다.
 *
 * @param {object} comparison 비교 정의
 * @param {object} summary `results.summarize` 의 결과
 * @param {string[]} labels 조건의 표시 이름
 * @returns {string} 항목별 출현 수와 합계를 담은 표
 */
function countsTable(comparison, summary, labels) {
  const failedChecks = (id) => Object.entries(summary.rules[id].checks)
    .filter(([name]) => name !== 'noEmoji')
    .reduce((sum, [, tally]) => sum + (tally.total - tally.pass), 0);
  return table(['항목', ...labels], [
    ...Object.keys(COUNT_LABELS).map((name) => [COUNT_LABELS[name], ...comparison.conditions.map((id) => summary.rules[id].counts[name] ?? 0)]),
    ['커밋과 PR 의 형식 검사에서 통과하지 못한 항목 수', ...comparison.conditions.map(failedChecks)],
    ['합계 (규칙 위반 수)', ...comparison.conditions.map((id) => summary.rules[id].violations)],
  ]);
}

/**
 * 문장 통계를 조건별로 보여 주는 표를 만든다.
 *
 * @param {object} comparison 비교 정의
 * @param {object} summary `results.summarize` 의 결과
 * @param {string[]} labels 조건의 표시 이름
 * @returns {string} 문장 수, 쉼표, 끝맺음 비율을 담은 표
 */
function sentencesTable(comparison, summary, labels) {
  const stat = (id) => summary.rules[id].sentences;
  const row = (title, cell) => [title, ...comparison.conditions.map((id) => cell(stat(id)))];
  return table(['항목', ...labels], [
    row('문장 수', (s) => s.total ?? 0),
    row('문장당 쉼표 수', (s) => fmt(s.total ? s.commas / s.total : null)),
    row('쉼표가 3개 이상인 문장의 비율', (s) => pct(s.manyCommas ?? 0, s.total ?? 0)),
    row('문단 문장 가운데 명사형이나 연결어미로 끝난 비율', (s) => pct(s.paragraphIncomplete ?? 0, s.paragraph ?? 0)),
    row('목록 문장 가운데 명사형이나 연결어미로 끝난 비율 (참고)', (s) => pct(s.listIncomplete ?? 0, s.list ?? 0)),
  ]);
}

/**
 * 형식 검사의 통과 수를 조건별로 보여 주는 표를 만든다.
 *
 * @param {object} comparison 비교 정의
 * @param {object} summary `results.summarize` 의 결과
 * @param {string[]} labels 조건의 표시 이름
 * @returns {string} 검사 항목마다 "통과한 출력 수 / 전체"를 담은 표
 */
function checksTable(comparison, summary, labels) {
  const names = Object.keys(CHECK_LABELS).filter((name) => summary.rules[comparison.conditions[0]].checks[name]);
  return table(['항목', ...labels], names.map((name) => [
    CHECK_LABELS[name],
    ...comparison.conditions.map((id) => {
      const tally = summary.rules[id].checks[name] ?? { pass: 0, total: 0 };
      return `${tally.pass} / ${tally.total}`;
    }),
  ]));
}

/**
 * 규칙 검사 항목별 표를 비교마다 만든다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @returns {string} `rule-checks.md` 의 내용
 */
export function renderRuleChecks(results) {
  const parts = [
    `# 규칙 검사 결과 (${results.options.run})`,
    '스크립트(`eval/lib/rules.mjs`)가 출력에서 센 값입니다. 코드 블록과 인라인 코드 안의 글자는 세지 않았습니다. 문장 통계는 제목 줄과 표, 한글이 6글자 미만인 구절을 제외하고 계산했습니다.',
  ];
  const sentenceGroups = [['산문 케이스의 문장 통계', ['prose']], ['커밋 본문과 PR 본문의 문장 통계', ['commit', 'pr']]];
  const checkGroups = [['커밋 케이스의 형식 검사 (통과한 출력 수 / 전체)', ['commit']], ['PR 케이스의 형식 검사 (통과한 출력 수 / 전체)', ['pr']]];
  for (const comparison of results.comparisons) {
    const all = results.summarize(comparison);
    if (!all.cases.length || comparison.conditions.some((id) => all.rules[id].outputs === 0)) continue;
    const labels = comparison.conditions.map((id) => results.conditionById[id].short);
    const outputs = all.rules[comparison.conditions[0]].outputs;
    parts.push(`## ${comparison.label}`, `### 기호와 문형의 출현 수 (케이스 ${all.cases.length}개, 조건마다 출력 ${outputs}개의 합)`, countsTable(comparison, all, labels));
    for (const [groups, render] of [[sentenceGroups, sentencesTable], [checkGroups, checksTable]]) {
      for (const [title, kinds] of groups) {
        const subset = results.summarize(comparison, (c) => kinds.includes(c.kind));
        if (!subset.cases.length) continue;
        const suffix = render === sentencesTable ? ` (케이스 ${subset.cases.length}개)` : '';
        parts.push(`### ${title}${suffix}`, render(comparison, subset, labels));
      }
    }
  }
  return `${parts.join('\n\n')}\n`;
}

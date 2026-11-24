/**
 * 생성, 규칙 검사, 판정 결과를 읽어서 사람이 읽을 보고서를 만든다.
 *
 * 만드는 파일:
 * - `side-by-side.md`: 케이스마다 조건별 출력을 나란히 놓은 비교표
 * - `rule-checks.md`: 규칙 검사 항목별 표
 * - `summary.md`: 조건별 핵심 수치와 실험 결과 요약
 * `--update-readme` 를 주면 루트 README 의 벤치마크 절(두 표시 사이)도 다시 쓴다.
 *
 * 실행: node eval/report.mjs [--run 2026-11-24] [--update-readme]
 */
import fs from 'node:fs';
import path from 'node:path';
import { CRITERIA, CRITERIA_LABELS, fmt } from './lib/aggregate.mjs';
import { REPO_DIR, readOptions } from './lib/config.mjs';
import { excerpt, loadResults, renderOutput, table } from './lib/render.mjs';
import { renderRuleChecks } from './lib/rule-tables.mjs';
import { renderReadmeBenchmark, renderSideBySide, worstCaseForOurs } from './lib/side-by-side.mjs';

/**
 * 조건의 시스템 프롬프트 토큰 수를 문자열로 돌려준다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @param {string} id 조건 식별자
 * @returns {string} 천 단위로 끊은 토큰 수. 측정값이 없으면 "없음"
 */
function tokensOf(results, id) {
  const entry = results.tokens?.conditions?.[id];
  return entry ? entry.tokens.toLocaleString('en-US') : '없음';
}

/**
 * 비교 하나의 핵심 수치 표를 만든다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @param {object} comparison 비교 정의
 * @param {object} summary `results.summarize` 의 결과
 * @returns {string} 조건별 출력 수, 규칙 위반 수, 순위 평균, 1위 비율, 토큰 수를 담은 표
 */
function headlineTable(results, comparison, summary) {
  const n = comparison.conditions.length;
  return table(
    ['조건', '출력 수', '출력 1건당 규칙 위반 수', `블라인드 순위 평균 (1~${n})`, '1위 비율', '시스템 프롬프트 토큰 수'],
    comparison.conditions.map((id) => {
      const judged = summary.judged.byCondition[id];
      return [
        results.conditionById[id].short,
        summary.rules[id].outputs,
        fmt(summary.rules[id].violationsPerOutput),
        fmt(judged.meanRank),
        judged.firstRate === null ? '없음' : `${Math.round(judged.firstRate * 100)}%`,
        tokensOf(results, id),
      ];
    }),
  );
}

/**
 * 생성 번호별 수치로 편차를 보여 주는 표를 만든다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @param {object} comparison 비교 정의
 * @param {object} summary `results.summarize` 의 결과
 * @returns {string} 조건마다 생성 번호별 규칙 위반 수와 순위 평균을 담은 표
 */
function varianceTable(results, comparison, summary) {
  const runs = Array.from({ length: results.runs }, (_, i) => i + 1);
  return table(
    ['조건', ...runs.map((r) => `${r}번째 생성의 규칙 위반 수`), ...runs.map((r) => `${r}번째 생성의 순위 평균`)],
    comparison.conditions.map((id) => [
      results.conditionById[id].short,
      ...summary.rules[id].violationsByRun,
      ...runs.map((r) => fmt(summary.judged.byCondition[id].rankByRun[r])),
    ]),
  );
}

/**
 * 판정 기준별 평균 점수 표를 만든다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @param {object} comparison 비교 정의
 * @param {object} summary `results.summarize` 의 결과
 * @returns {string} 조건별 기준 점수 표
 */
function scoresTable(results, comparison, summary) {
  return table(
    ['조건', ...CRITERIA.map((c) => CRITERIA_LABELS[c])],
    comparison.conditions.map((id) => [results.conditionById[id].short, ...CRITERIA.map((c) => fmt(summary.judged.byCondition[id].scores[c]))]),
  );
}

/**
 * 갈래별 또는 케이스별로 조건의 순위 평균과 규칙 위반 수를 나란히 보여 주는 표를 만든다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @param {object} comparison 비교 정의
 * @param {{name: string, filter: (evalCase: object) => boolean}[]} groups 행으로 삼을 묶음
 * @param {string} firstHeader 첫 열의 머리글
 * @returns {string} 묶음마다 조건별 순위 평균과 출력 1건당 규칙 위반 수를 담은 표
 */
function breakdownTable(results, comparison, groups, firstHeader) {
  const labels = comparison.conditions.map((id) => results.conditionById[id].short);
  const rows = groups.map((group) => {
    const summary = results.summarize(comparison, group.filter);
    return [
      group.name,
      ...comparison.conditions.map((id) => fmt(summary.judged.byCondition[id].meanRank)),
      ...comparison.conditions.map((id) => fmt(summary.rules[id].violationsPerOutput, 1)),
    ];
  });
  return table([firstHeader, ...labels.map((l) => `순위: ${l}`), ...labels.map((l) => `위반: ${l}`)], rows);
}

/**
 * 판정이 위치에 치우쳤는지와 두 순서의 판정이 일치했는지를 문장으로 만든다.
 *
 * @param {object} summary `results.summarize` 의 결과
 * @returns {string} 위치별 순위 평균과 1위 일치율을 설명하는 문장
 */
function reliabilityNote(summary) {
  const positions = summary.judged.rankByPosition.map((rank, i) => `${String.fromCharCode(65 + i)} 자리 ${fmt(rank)}`).join(', ');
  const agreement = summary.judged.topAgreement === null ? '없음' : `${Math.round(summary.judged.topAgreement * 100)}%`;
  return `판정 ${summary.judged.sets}건에서 보여 준 자리별 순위 평균은 ${positions} 입니다. 자리에 따른 치우침이 없다면 모든 자리의 값이 같아야 합니다. 같은 묶음을 순서를 뒤집어 판정했을 때 1위가 같았던 비율은 ${agreement} 입니다.`;
}

/**
 * 세 조건 비교에서 우리 스킬이 가장 나았던 케이스와 가장 못했던 케이스를 출력 일부와 함께 보여 준다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @param {object} main 세 조건 비교의 정의
 * @param {object} summary `results.summarize` 의 결과
 * @returns {string} 두 케이스의 수치와 첫 번째 생성 결과의 앞부분
 */
function bestAndWorst(results, main, summary) {
  const gapOf = (evalCase) => {
    const ours = summary.judged.byCondition.ours.rankByCase[evalCase.id];
    const others = main.conditions.filter((id) => id !== 'ours').map((id) => summary.judged.byCondition[id].rankByCase[evalCase.id]);
    return ours === undefined || others.some((r) => r === undefined) ? null : ours - Math.min(...others);
  };
  const ranked = summary.cases.map((c) => ({ evalCase: c, gap: gapOf(c) })).filter((x) => x.gap !== null).sort((a, b) => a.gap - b.gap);
  if (!ranked.length) return '판정 결과가 없어서 고르지 못했습니다.';
  const show = (title, { evalCase, gap }) => {
    const rival = main.conditions.filter((id) => id !== 'ours').sort((a, b) => summary.judged.byCondition[a].rankByCase[evalCase.id] - summary.judged.byCondition[b].rankByCase[evalCase.id])[0];
    const block = (id) => {
      const output = results.readOutput(evalCase.id, id, 1) ?? '(출력 없음)';
      const rank = fmt(summary.judged.byCondition[id].rankByCase[evalCase.id]);
      return `${results.conditionById[id].label} (이 케이스의 순위 평균 ${rank}), 첫 번째 생성 결과의 앞부분:\n\n${renderOutput(excerpt(output, 700).text, evalCase.kind === 'commit' ? 'commit' : 'prose').split('\n').map((l) => `> ${l}`).join('\n')}`;
    };
    return `### ${title}: ${evalCase.id}\n\n${evalCase.title}. 우리 스킬의 순위 평균에서 다른 조건 가운데 가장 좋은 순위 평균을 뺀 값은 ${fmt(gap)} 입니다.\n\n${block('ours')}\n\n${block(rival)}`;
  };
  const worst = worstCaseForOurs(results, main);
  const parts = [show('우리 스킬이 가장 나았던 케이스', ranked[0])];
  parts.push(worst ? show('우리 스킬이 가장 못했던 케이스', worst) : '### 우리 스킬이 가장 못했던 케이스\n\n순위 평균이 다른 조건보다 낮게 나온 케이스가 없었습니다.');
  return parts.join('\n\n');
}

/**
 * 실행 정보(모델, 호출 횟수, 걸린 시간)를 목록으로 만든다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @returns {string} 실행 정보 목록
 */
function runInfo(results) {
  const { meta, generation } = results;
  const records = Object.values(generation);
  const minutes = (ms) => `${(ms / 60000).toFixed(1)}분`;
  const phase = (name) => meta.phases?.[name] ?? { calls: 0, wallMs: 0 };
  const lines = [
    `- 생성 모델: \`${meta.model}\`, 판정 모델: \`${meta.judgeModel ?? '판정 전'}\`, Claude Code CLI: ${meta.claudeCodeVersion ?? '기록 없음'}`,
    `- 케이스 ${results.cases.length}개, 조건 ${results.conditions.length}개, 조건마다 케이스마다 ${results.runs}번 생성`,
    `- 생성 호출 ${phase('generate').calls}번(남아 있는 출력 ${records.length}개), 걸린 시간 ${minutes(phase('generate').wallMs)}`,
    `- 판정 호출 ${phase('judge').calls}번, 걸린 시간 ${minutes(phase('judge').wallMs)}`,
    `- 토큰 측정 호출 ${phase('tokens').calls}번, 걸린 시간 ${minutes(phase('tokens').wallMs)}`,
    `- 입력 토큰 합계 ${records.reduce((a, r) => a + r.inputTokens, 0).toLocaleString('en-US')}, 출력 토큰 합계 ${records.reduce((a, r) => a + r.outputTokens, 0).toLocaleString('en-US')} (생성 호출만, 사고 토큰 포함)`,
  ];
  return lines.join('\n');
}

/**
 * 토큰 측정 결과에서 두 실험의 절감량을 설명하는 문단과 표를 만든다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @returns {string} 조건별 토큰 표와 스킬 부분별 토큰 표
 */
function tokenSection(results) {
  if (!results.tokens) return '토큰을 아직 측정하지 않았습니다. `node eval/measure-tokens.mjs` 를 실행하면 이 절이 채워집니다.';
  const { conditions, parts, model } = results.tokens;
  const conditionTable = table(
    ['조건', '시스템 프롬프트 글자 수', '입력 토큰 수'],
results.conditions.filter((c) => conditions[c.id]).map((c) => [c.short, conditions[c.id].chars.toLocaleString('en-US'), conditions[c.id].tokens.toLocaleString('en-US')]),
  );
  const partTable = table(['측정한 부분', '글자 수', '입력 토큰 수'], parts.map((p) => [p.label, p.chars.toLocaleString('en-US'), p.tokens.toLocaleString('en-US')]));
  const diff = (a, b) => (conditions[a] && conditions[b] ? (conditions[a].tokens - conditions[b].tokens).toLocaleString('en-US') : '없음');
  return [
    `\`${model}\` 에 같은 질문을 지침 없이 한 번, 지침을 넣고 한 번 보내서 CLI 가 보고한 입력 토큰 수의 차이를 쟀습니다. 글자 수로 어림한 값이 아닙니다.`,
    conditionTable,
    `git-writing-korean 의 분량을 줄여서 절감한 토큰은 ${diff('ours-before-optimization', 'ours')}개이고, natural-korean 의 예시를 조항당 2개로 줄이면 절감되는 토큰은 ${diff('ours', 'ours-two-examples')}개입니다.`,
    '스킬의 description 은 스킬을 불러오지 않아도 세션마다 항상 들어가고, 본문은 스킬을 불러올 때에만 들어갑니다.',
    partTable,
  ].join('\n\n');
}

/**
 * 요약 보고서를 만든다.
 *
 * @param {object} results `loadResults` 가 돌려준 자료
 * @returns {string} `summary.md` 의 내용
 */
function renderSummary(results) {
  const parts = [
    `# 평가 요약 (${results.options.run})`,
    runInfo(results),
    '## 조건',
    table(['표에 쓰는 이름', '조건', '알아 둘 점'], results.conditions.map((c) => [c.short, c.label, c.note ?? ''])),
  ];
  const categories = [...new Set(results.cases.map((c) => c.category))];
  for (const comparison of results.comparisons) {
    const summary = results.summarize(comparison);
    if (!summary.cases.length || !summary.judged.sets) continue;
    parts.push(`## ${comparison.label}`, `케이스 ${summary.cases.length}개가 대상입니다.`, headlineTable(results, comparison, summary));
    parts.push('생성 번호별 수치는 다음과 같습니다. 같은 조건에서 생성할 때마다 결과가 얼마나 달라지는지 볼 수 있습니다.', varianceTable(results, comparison, summary));
    parts.push('판정 기준별 평균 점수(1~5점)는 다음과 같습니다.', scoresTable(results, comparison, summary));
    const usedCategories = categories.filter((name) => summary.cases.some((c) => c.category === name));
    if (usedCategories.length > 1) {
      parts.push('갈래별 수치입니다.', breakdownTable(results, comparison, usedCategories.map((name) => ({ name, filter: (c) => c.category === name })), '갈래'));
    }
    parts.push('케이스별 수치입니다.', breakdownTable(results, comparison, summary.cases.map((c) => ({ name: c.id, filter: (x) => x.id === c.id })), '케이스'));
    parts.push(reliabilityNote(summary));
    if (comparison.id === 'main') parts.push(bestAndWorst(results, comparison, summary));
  }
  parts.push('## 시스템 프롬프트 토큰 수', tokenSection(results));
  parts.push(
    '## 읽을 때 주의할 점',
    [
      '- 규칙 위반 수에는 커밋 타입, 제목 끝맺음, PR 절 이름처럼 이 저장소의 스킬만 정하고 있는 기준이 들어 있습니다. 그 기준을 받지 않은 조건이 이 수치에서 불리한 것은 당연하므로, 조건 사이의 품질 차이는 블라인드 순위와 비교표의 실제 출력으로 판단해야 합니다.',
      '- 규칙 검사는 정규식으로 세기 때문에 팀을 가리키는 정당한 "우리"나 근거를 함께 적은 수식어도 위반으로 셉니다. 항목별 수치는 `rule-checks.md` 에 있습니다.',
      '- 블라인드 판정은 판정 모델 하나의 판단입니다. 케이스가 12개이고 조건마다 3번씩 생성했으므로 순위 평균의 작은 차이는 우연일 수 있습니다.',
      '- 시스템 프롬프트에 스킬 본문을 직접 넣어서 비교했습니다. 실제 사용에서는 에이전트가 스킬을 불러올지를 스스로 판단하므로, 스킬을 불러오지 않은 세션에서는 이 결과가 그대로 나타나지 않습니다.',
      '- 조건마다 시스템 프롬프트의 길이가 다릅니다. 지침이 길수록 호출마다 입력 토큰이 더 들어갑니다.',
    ].join('\n'),
  );
  return `${parts.join('\n\n')}\n`;
}

/**
 * 루트 README 의 벤치마크 절을 다시 쓴다.
 *
 * @param {string} section 두 표시 사이에 넣을 내용
 * @returns {void}
 * @throws {Error} README 에 표시가 없을 때
 */
function updateReadme(section) {
  const file = path.join(REPO_DIR, 'README.md');
  const readme = fs.readFileSync(file, 'utf8');
  const pattern = /(<!-- benchmark:start -->)[\s\S]*?(<!-- benchmark:end -->)/;
  if (!pattern.test(readme)) throw new Error('README.md 에 benchmark:start 와 benchmark:end 표시가 있어야 합니다.');
  // README 가 CRLF 로 저장되어 있으면 넣는 내용의 줄바꿈도 CRLF 로 맞춘다
  const eol = readme.includes('\r\n') ? '\r\n' : '\n';
  const block = `\n\n${section.replace(/\r\n/g, '\n')}\n\n`.replace(/\n/g, eol);
  fs.writeFileSync(file, readme.replace(pattern, (_, start, end) => `${start}${block}${end}`), 'utf8');
}

/**
 * 보고서 단계 전체를 실행한다.
 *
 * @param {string[]} argv 명령줄 인자
 * @returns {void}
 */
function main(argv) {
  const options = readOptions(argv);
  const results = loadResults(options);
  fs.writeFileSync(path.join(options.resultDir, 'side-by-side.md'), renderSideBySide(results), 'utf8');
  fs.writeFileSync(path.join(options.resultDir, 'rule-checks.md'), renderRuleChecks(results), 'utf8');
  fs.writeFileSync(path.join(options.resultDir, 'summary.md'), renderSummary(results), 'utf8');
  if (options.raw['update-readme'] === true) updateReadme(renderReadmeBenchmark(results));
  process.stdout.write(`보고서를 ${path.relative(process.cwd(), options.resultDir)} 에 만들었습니다.\n`);
}

main(process.argv.slice(2));

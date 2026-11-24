/**
 * 보고서를 Markdown 으로 만들 때 함께 쓰는 도구와, 결과 파일을 한 번에 읽어 두는 함수다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { aggregateJudgments, aggregateRules } from './aggregate.mjs';
import { appliesTo, loadCases, loadConditions, outputPath, readJson } from './config.mjs';

/** 보고서와 README 에 출력을 실을 때 이 글자 수를 넘으면 앞부분만 싣는다 */
export const EXCERPT_LIMIT = 1200;

/**
 * Markdown 표를 만든다.
 *
 * @param {string[]} headers 머리글
 * @param {(string | number)[][]} rows 행 목록
 * @returns {string} 표 문자열
 */
export function table(headers, rows) {
  const line = (cells) => `| ${cells.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n');
}

/**
 * 긴 글의 앞부분만 잘라 낸다. 줄 중간에서 자르지 않고, 코드 블록이 열린 채로 끝나면 닫는다.
 *
 * @param {string} text 원문
 * @param {number} [limit] 글자 수 상한
 * @param {boolean} [closeFence] 코드 블록이 열린 채로 끝나면 닫는 표시를 덧붙일지. Markdown 으로 그릴 때에만 필요하다
 * @returns {{text: string, cut: boolean}} 잘라 낸 글과, 잘랐는지 여부
 */
export function excerpt(text, limit = EXCERPT_LIMIT, closeFence = true) {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return { text: trimmed, cut: false };
  const head = trimmed.slice(0, limit);
  const lastBreak = head.lastIndexOf('\n');
  let cut = lastBreak > limit / 2 ? head.slice(0, lastBreak) : head;
  if (closeFence && (cut.match(/```/g) ?? []).length % 2 === 1) cut += '\n```';
  return { text: cut, cut: true };
}

/**
 * 출력 하나를 표의 칸에 넣을 Markdown 으로 만든다.
 *
 * 커밋 메시지는 줄바꿈이 그대로 보이도록 코드 블록에 넣고, 나머지는 Markdown 그대로 넣는다.
 *
 * @param {string} text 출력 (잘라 낸 것일 수 있음)
 * @param {'prose' | 'commit' | 'pr'} kind 케이스 종류
 * @returns {string} 칸에 넣을 Markdown
 */
export function renderOutput(text, kind) {
  return kind === 'commit' ? `\`\`\`\`text\n${text}\n\`\`\`\`` : text;
}

/**
 * 여러 출력을 열로 나란히 놓은 HTML 표를 만든다. 칸 안의 Markdown 이 그려지도록 빈 줄을 둔다.
 *
 * @param {{heading: string, body: string}[]} columns 열 머리글과 내용
 * @returns {string} HTML 표
 */
export function columnsTable(columns) {
  const width = Math.floor(100 / columns.length);
  const head = columns.map((c) => `<th width="${width}%">${c.heading}</th>`).join('');
  const cells = columns.map((c) => `<td valign="top">\n\n${c.body}\n\n</td>`).join('\n');
  return `<table>\n<tr>${head}</tr>\n<tr>\n${cells}\n</tr>\n</table>`;
}

/**
 * 글을 Markdown 으로 해석되지 않는 HTML 로 바꾼다. 줄바꿈과 들여쓰기는 그대로 보이게 한다.
 *
 * README 처럼 다른 내용과 함께 있는 문서에 출력을 실을 때 쓴다. 출력 안의 `## 제목` 이
 * 문서의 목차에 섞이지 않고, 모델이 쓴 Markdown 원문이 글자 그대로 보인다.
 *
 * @param {string} text 원문
 * @returns {string} 빈 줄이 없는 HTML 조각
 */
export function literalHtml(text) {
  return text.split('\n').map((line) => {
    const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const indent = escaped.length - escaped.trimStart().length;
    return `${'&nbsp;'.repeat(indent)}${escaped.slice(indent)}<br>`;
  }).join('\n');
}

/**
 * 여러 출력을 Markdown 원문 그대로 열로 나란히 놓은 HTML 표를 만든다.
 *
 * 표 전체에 빈 줄이 없어야 Markdown 처리기가 칸 안의 글을 해석하지 않는다.
 *
 * @param {{heading: string, html: string}[]} columns 열 머리글과 `literalHtml` 로 만든 내용
 * @returns {string} HTML 표
 */
export function literalColumnsTable(columns) {
  const width = Math.floor(100 / columns.length);
  const head = columns.map((c) => `<th width="${width}%">${c.heading}</th>`).join('');
  const cells = columns.map((c) => `<td valign="top">\n${c.html}\n</td>`).join('\n');
  return `<table>\n<tr>${head}</tr>\n<tr>\n${cells}\n</tr>\n</table>`;
}

/**
 * 케이스의 입력을 접어 두는 블록으로 만든다.
 *
 * @param {string} prompt 케이스의 입력
 * @returns {string} details 블록
 */
export function promptBlock(prompt) {
  return `<details>\n<summary>입력 보기</summary>\n\n\`\`\`\`\`text\n${prompt}\n\`\`\`\`\`\n\n</details>`;
}

/**
 * 결과 폴더의 파일을 모두 읽어서 보고서를 만드는 데에 쓸 자료로 묶는다.
 *
 * @param {{resultDir: string, run: string, runs: number}} options 실행 옵션
 * @returns {object} 케이스, 조건, 비교, 검사 결과, 판정 결과, 토큰 측정값과 그것을 다루는 함수
 */
export function loadResults(options) {
  const cases = loadCases();
  const defined = loadConditions();
  const meta = readJson(path.join(options.resultDir, 'meta.json'), { phases: {}, conditions: {} });
  const runs = meta.runsPerCase ?? options.runs;
  const perOutput = readJson(path.join(options.resultDir, 'rule-checks.json'), {});
  const judgments = Object.values(readJson(path.join(options.resultDir, 'judgments.json'), {}));
  const generation = readJson(path.join(options.resultDir, 'generation.json'), {});
  const tokens = readJson(path.join(options.resultDir, 'tokens.json'), null);
  // 이 실행에서 실제로 생성한 조건과, 그 조건만으로 이루어진 비교만 보고서에 싣는다
  const generatedIds = new Set(Object.keys(generation).map((key) => key.slice(key.indexOf('/') + 1).replace(/\.\d+$/, '')));
  const conditions = defined.conditions.filter((c) => generatedIds.has(c.id));
  const comparisons = defined.comparisons.filter((c) => c.conditions.every((id) => generatedIds.has(id)));
  const conditionById = Object.fromEntries(conditions.map((c) => [c.id, c]));

  /**
   * 출력 파일을 읽는다.
   *
   * @param {string} caseId 케이스 식별자
   * @param {string} conditionId 조건 식별자
   * @param {number} run 생성 번호
   * @returns {string | null} 출력. 파일이 없으면 null
   */
  const readOutput = (caseId, conditionId, run) => {
    const file = outputPath(options.resultDir, caseId, conditionId, run);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : null;
  };

  /**
   * 비교 하나의 규칙 검사와 판정을 조건별로 모은다.
   *
   * @param {object} comparison 비교 정의
   * @param {(evalCase: object) => boolean} [filter] 케이스를 더 걸러 내는 함수
   * @returns {{cases: object[], rules: Record<string, object>, judged: object}} 케이스, 조건별 규칙 집계, 판정 집계
   */
  const summarize = (comparison, filter = () => true) => {
    const selected = cases.filter((c) => appliesTo(comparison, c) && filter(c));
    const ids = new Set(selected.map((c) => c.id));
    const rules = Object.fromEntries(comparison.conditions.map((id) => [id, aggregateRules(perOutput, selected, id, runs)]));
    const judged = aggregateJudgments(judgments.filter((j) => j.comparison === comparison.id && ids.has(j.caseId)), comparison.conditions);
    return { cases: selected, rules, judged };
  };

  return { options, cases, conditions, comparisons, conditionById, meta, runs, perOutput, judgments, generation, tokens, readOutput, summarize };
}

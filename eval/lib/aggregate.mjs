/**
 * 출력별 규칙 검사 결과와 묶음별 판정 결과를 조건 단위로 모으는 모듈이다.
 * 보고서 스크립트가 표를 만들 때 쓴다.
 */

/** 판정 모델이 점수를 매기는 기준의 이름 */
export const CRITERIA = ['clarity', 'naturalness', 'informativeness', 'compliance'];

/** 판정 기준의 표시 이름 */
export const CRITERIA_LABELS = { clarity: '명확성', naturalness: '자연스러움', informativeness: '정보량', compliance: '지시 준수' };

/** 출현 수를 세는 항목의 표시 이름 */
export const COUNT_LABELS = {
  middleDot: '가운뎃점',
  emDash: '엠대시',
  enDash: '엔대시',
  arrow: '화살표',
  notSimply: "'단순히 ~가 아니라'",
  beyond: "'A를 넘어 B'",
  theMoment: "'~하는 순간'",
  we: "주어 '우리'",
  emptyModifier: '평가만 담은 수식어',
  recap: "반복 정리 표지 ('정리하면' 등)",
  emoji: '이모지',
  vocabulary: '사용하지 않는 어휘 (커밋, PR)',
};

/** 통과 여부를 보는 검사 항목의 표시 이름 */
export const CHECK_LABELS = {
  titleType: '타입이 목록에 있음',
  titleEnding: '제목이 명사형으로 끝남',
  titleLength: '제목 설명이 55자 이하',
  titleParticles: '제목에 조사를 씀 (추정)',
  titleNoParenList: '제목에 괄호 나열이 없음',
  messageOnly: '설명이나 코드 블록 없이 메시지만 출력',
  bodyPlainStyle: '본문이 해라체',
  titleOnFirstLine: '첫 줄에 제목만 있음',
  sections: '절 이름과 순서가 기준과 같음',
  deploySection: '배포 참고 사항 절의 유무가 상황에 맞음',
  uncheckedBox: '확인하지 못한 항목을 [ ] 로 표시',
  politeStyle: '본문이 합니다체',
  noSignature: '세션 링크와 서명이 없음',
  noEmoji: '이모지가 없음',
};

/**
 * 평균을 구한다.
 *
 * @param {number[]} values 값 목록
 * @returns {number | null} 평균. 값이 없으면 null
 */
export function mean(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/**
 * 한 조건의 규칙 검사 결과를 케이스 묶음에 대해 모은다.
 *
 * @param {Record<string, object>} perOutput `케이스/조건.번호` 를 키로 하는 출력별 검사 결과
 * @param {{id: string, kind: string}[]} cases 모을 케이스
 * @param {string} conditionId 조건 식별자
 * @param {number} runs 케이스마다 생성한 횟수
 * @returns {{outputs: number, violations: number, violationsPerOutput: number | null, violationsByRun: number[],
 *   counts: Record<string, number>, sentences: Record<string, number>,
 *   checks: Record<string, {pass: number, total: number}>, byCase: Record<string, number | null>}}
 *   출력 수, 위반 수의 합과 평균, 생성 번호별 위반 수, 항목별 출현 수, 문장 통계, 검사 항목별 통과 수, 케이스별 평균 위반 수
 */
export function aggregateRules(perOutput, cases, conditionId, runs) {
  const result = { outputs: 0, violations: 0, violationsByRun: [], counts: {}, sentences: {}, checks: {}, byCase: {} };
  for (let run = 1; run <= runs; run += 1) {
    let runViolations = 0;
    for (const evalCase of cases) {
      const entry = perOutput[`${evalCase.id}/${conditionId}.${run}`];
      if (!entry) continue;
      result.outputs += 1;
      result.violations += entry.violations;
      runViolations += entry.violations;
      for (const [name, value] of Object.entries(entry.counts)) result.counts[name] = (result.counts[name] ?? 0) + value;
      for (const [name, value] of Object.entries(entry.sentences)) result.sentences[name] = (result.sentences[name] ?? 0) + value;
      for (const [name, check] of Object.entries(entry.checks)) {
        const tally = result.checks[name] ?? { pass: 0, total: 0 };
        result.checks[name] = { pass: tally.pass + (check.ok ? 1 : 0), total: tally.total + 1 };
      }
    }
    result.violationsByRun.push(runViolations);
  }
  for (const evalCase of cases) {
    const values = [];
    for (let run = 1; run <= runs; run += 1) {
      const entry = perOutput[`${evalCase.id}/${conditionId}.${run}`];
      if (entry) values.push(entry.violations);
    }
    result.byCase[evalCase.id] = mean(values);
  }
  result.violationsPerOutput = result.outputs ? result.violations / result.outputs : null;
  return result;
}

/**
 * 한 비교의 판정 결과를 조건별로 모은다.
 *
 * @param {object[]} judgments 이 비교에 속한 판정 기록
 * @param {string[]} conditionIds 비교에 들어간 조건의 식별자
 * @returns {{sets: number, byCondition: Record<string, {meanRank: number | null, firstRate: number | null,
 *   scores: Record<string, number | null>, rankByRun: Record<string, number | null>,
 *   rankByCase: Record<string, number | null>}>, rankByPosition: (number | null)[], topAgreement: number | null}}
 *   판정한 묶음 수, 조건별 순위 평균과 1위 비율과 기준별 점수, 위치별 순위 평균, 두 순서의 1위 일치율
 */
export function aggregateJudgments(judgments, conditionIds) {
  const byCondition = {};
  for (const id of conditionIds) {
    const ranks = [];
    const rankByRun = {};
    const rankByCase = {};
    const scoreLists = Object.fromEntries(CRITERIA.map((c) => [c, []]));
    for (const judgment of judgments) {
      const rank = judgment.ranking.indexOf(id) + 1;
      if (rank === 0) continue;
      ranks.push(rank);
      (rankByRun[judgment.run] ??= []).push(rank);
      (rankByCase[judgment.caseId] ??= []).push(rank);
      for (const criterion of CRITERIA) scoreLists[criterion].push(judgment.scores[id][criterion]);
    }
    byCondition[id] = {
      meanRank: mean(ranks),
      firstRate: ranks.length ? ranks.filter((r) => r === 1).length / ranks.length : null,
      scores: Object.fromEntries(CRITERIA.map((c) => [c, mean(scoreLists[c])])),
      rankByRun: Object.fromEntries(Object.entries(rankByRun).map(([run, list]) => [run, mean(list)])),
      rankByCase: Object.fromEntries(Object.entries(rankByCase).map(([caseId, list]) => [caseId, mean(list)])),
    };
  }
  // 위치 편향: 기호 A, B, C 순서로 보여 준 자리마다 받은 순위의 평균
  const positions = conditionIds.map((_, index) => {
    const label = String.fromCharCode(65 + index);
    return mean(judgments.map((j) => j.ranking.indexOf(j.labels[label]) + 1).filter((r) => r > 0));
  });
  // 같은 묶음을 순서를 뒤집어 판정했을 때 1위가 같은 비율
  const firstByPair = {};
  for (const judgment of judgments) {
    (firstByPair[`${judgment.caseId}|${judgment.run}`] ??= []).push(judgment.ranking[0]);
  }
  const pairs = Object.values(firstByPair).filter((pair) => pair.length === 2);
  return {
    sets: judgments.length,
    byCondition,
    rankByPosition: positions,
    topAgreement: pairs.length ? pairs.filter(([a, b]) => a === b).length / pairs.length : null,
  };
}

/**
 * 숫자를 소수 자릿수를 정해서 문자열로 만든다. 값이 없으면 줄표 대신 "없음"을 쓴다.
 *
 * @param {number | null | undefined} value 숫자
 * @param {number} [digits] 소수 자릿수
 * @returns {string} 표에 넣을 문자열
 */
export function fmt(value, digits = 2) {
  return value === null || value === undefined || Number.isNaN(value) ? '없음' : value.toFixed(digits);
}

/**
 * 비율을 백분율 문자열로 만든다.
 *
 * @param {number} part 분자
 * @param {number} total 분모
 * @returns {string} "12%" 같은 문자열. 분모가 0이면 "없음"
 */
export function pct(part, total) {
  return total ? `${Math.round((part / total) * 100)}%` : '없음';
}

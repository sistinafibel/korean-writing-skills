/**
 * 평가 전체를 차례로 실행한다: 격리 확인, 생성, 규칙 검사, 판정, 토큰 측정, 보고서.
 *
 * 이미 끝난 생성과 판정은 건너뛰므로, 중간에 멈췄다면 같은 명령을 다시 실행하면 이어서 진행한다.
 * 인자는 각 단계의 스크립트에 그대로 전달한다.
 *
 * 실행: node eval/run.mjs [--run 2026-11-24] [--model claude-sonnet-5-5] [--judge-model claude-opus-5-5]
 *       [--runs 3] [--concurrency 4] [--comparisons main] [--update-readme] [--skip-isolation]
 */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { EVAL_DIR, loadConditions, parseArgs } from './lib/config.mjs';

/**
 * 단계 하나를 자식 프로세스로 실행한다.
 *
 * @param {string} script `eval/` 아래의 스크립트 이름
 * @param {string[]} args 스크립트에 전달할 인자
 * @returns {void}
 * @throws {Error} 스크립트가 0 이 아닌 값으로 끝났을 때
 */
function step(script, args) {
  process.stdout.write(`\n== ${script} ==\n`);
  const result = spawnSync(process.execPath, [path.join(EVAL_DIR, script), ...args], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${script} 가 실패했습니다 (종료 코드 ${result.status}).`);
}

/**
 * 전체 실행 순서를 진행한다.
 *
 * @param {string[]} argv 명령줄 인자
 * @returns {void}
 */
function main(argv) {
  const raw = parseArgs(argv);
  const generateArgs = [...argv];
  // 비교를 골랐다면 그 비교에 들어가는 조건만 생성한다
  if (typeof raw.comparisons === 'string' && typeof raw.conditions !== 'string') {
    const wanted = raw.comparisons.split(',');
    const { comparisons } = loadConditions();
    const ids = [...new Set(comparisons.filter((c) => wanted.includes(c.id)).flatMap((c) => c.conditions))];
    generateArgs.push('--conditions', ids.join(','));
  }
  if (raw['skip-isolation'] !== true) step('verify-isolation.mjs', argv);
  step('generate.mjs', generateArgs);
  step('check-rules.mjs', argv);
  step('judge.mjs', argv);
  step('measure-tokens.mjs', argv);
  step('report.mjs', argv);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}

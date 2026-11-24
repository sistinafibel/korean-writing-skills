/**
 * 생성한 출력을 모두 읽어서 규칙 검사를 하고 `rule-checks.json` 으로 저장한다.
 *
 * 모델을 호출하지 않으므로 언제든 다시 실행할 수 있다. 검사 기준은 `lib/rules.mjs` 에 있다.
 *
 * 실행: node eval/check-rules.mjs [--run 2026-11-24]
 */
import fs from 'node:fs';
import path from 'node:path';
import { appliesTo, loadCases, loadConditions, outputPath, readOptions, writeJson } from './lib/config.mjs';
import { checkOutput } from './lib/rules.mjs';

/**
 * 규칙 검사 단계 전체를 실행한다.
 *
 * @param {string[]} argv 명령줄 인자
 * @returns {void}
 */
function main(argv) {
  const options = readOptions(argv);
  const cases = loadCases(options.cases);
  const { conditions } = loadConditions();
  /** @type {Record<string, object>} `케이스/조건.번호` 를 키로 하는 출력별 검사 결과 */
  const perOutput = {};
  for (const evalCase of cases) {
    for (const condition of conditions) {
      if (!appliesTo(condition, evalCase)) continue;
      for (let run = 1; run <= options.runs; run += 1) {
        const file = outputPath(options.resultDir, evalCase.id, condition.id, run);
        if (!fs.existsSync(file)) continue;
        perOutput[`${evalCase.id}/${condition.id}.${run}`] = checkOutput(evalCase, fs.readFileSync(file, 'utf8'));
      }
    }
  }
  writeJson(path.join(options.resultDir, 'rule-checks.json'), perOutput);
  process.stdout.write(`출력 ${Object.keys(perOutput).length}개를 검사했습니다.\n`);
}

main(process.argv.slice(2));

/**
 * 조건마다 케이스마다 출력을 생성한다.
 *
 * 같은 모델에 같은 입력을 보내고 시스템 프롬프트의 지침만 바꾼다. 이미 생성한 출력은
 * 건너뛰는데, 그 조건의 지침이 그 뒤에 바뀌었다면(시스템 프롬프트의 해시가 다르면) 다시 생성한다.
 *
 * 실행: node eval/generate.mjs [--run 2026-11-24] [--model claude-sonnet-5-5] [--runs 3]
 *       [--cases 01-explain-build-error,...] [--conditions baseline,ours] [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import { callClaude, claudeVersion, runPool } from './lib/claude.mjs';
import { appliesTo, buildSystemPrompt, loadCases, loadConditions, outputPath, readJson, readOptions, writeJson } from './lib/config.mjs';

/**
 * 생성 단계 전체를 실행한다.
 *
 * @param {string[]} argv 명령줄 인자
 * @returns {Promise<void>}
 */
async function main(argv) {
  const options = readOptions(argv);
  const cases = loadCases(options.cases);
  const { conditions } = loadConditions();
  const selected = conditions.filter((c) => !options.conditions || options.conditions.includes(c.id));
  const metaFile = path.join(options.resultDir, 'meta.json');
  const generationFile = path.join(options.resultDir, 'generation.json');
  const meta = readJson(metaFile, { run: options.run, model: options.model, conditions: {}, phases: {} });
  if (meta.model !== options.model) {
    throw new Error(`결과 폴더 ${options.run} 은 ${meta.model} 로 생성한 것입니다. 다른 모델은 --run 으로 다른 폴더에 생성하세요.`);
  }
  /** @type {Record<string, object>} 출력 파일별 생성 기록 */
  const records = readJson(generationFile, {});

  const prompts = {};
  for (const condition of selected) {
    const built = await buildSystemPrompt(condition);
    prompts[condition.id] = built;
    meta.conditions[condition.id] = { label: condition.label, note: condition.note, sha256: built.sha256, chars: built.chars, sources: built.sources };
  }

  const jobs = [];
  for (const evalCase of cases) {
    for (const condition of selected) {
      if (!appliesTo(condition, evalCase)) continue;
      for (let run = 1; run <= options.runs; run += 1) {
        const key = `${evalCase.id}/${condition.id}.${run}`;
        const file = outputPath(options.resultDir, evalCase.id, condition.id, run);
        const upToDate = fs.existsSync(file) && records[key]?.systemPromptSha256 === prompts[condition.id].sha256;
        if (upToDate && !options.force) continue;
        jobs.push({ key, file, evalCase, condition });
      }
    }
  }

  const startedAt = Date.now();
  process.stdout.write(`생성할 출력 ${jobs.length}개 (모델 ${options.model}, 동시 실행 ${options.concurrency})\n`);
  let done = 0;
  await runPool(jobs, options.concurrency, async (job) => {
    const result = await callClaude({ model: options.model, systemPromptFile: prompts[job.condition.id].file, prompt: job.evalCase.prompt });
    fs.mkdirSync(path.dirname(job.file), { recursive: true });
    fs.writeFileSync(job.file, `${result.text.trim()}\n`, 'utf8');
    records[job.key] = {
      systemPromptSha256: prompts[job.condition.id].sha256,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs: result.durationMs,
      attempts: result.attempts,
      generatedAt: new Date().toISOString(),
    };
    writeJson(generationFile, records);
    done += 1;
    process.stdout.write(`  [${done}/${jobs.length}] ${job.key}\n`);
  });

  const previous = meta.phases.generate ?? { calls: 0, wallMs: 0 };
  meta.phases.generate = { calls: previous.calls + jobs.length, wallMs: previous.wallMs + (Date.now() - startedAt) };
  meta.claudeCodeVersion = await claudeVersion();
  meta.runsPerCase = options.runs;
  meta.generatedAt = new Date().toISOString();
  writeJson(metaFile, meta);
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`생성에 실패했습니다: ${error.message}\n`);
  process.exitCode = 1;
});

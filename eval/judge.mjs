/**
 * 조건 이름을 가린 출력을 판정 모델에게 보내서 점수와 순위를 받는다.
 *
 * 비교(`conditions.json` 의 comparisons)마다, 케이스마다, 생성 번호마다 출력을 한 묶음으로 만들고
 * 순서를 섞어서 한 번, 그 순서를 뒤집어서 한 번 판정한다. 판정 기준과 지시는 `rubric.md` 에 있다.
 *
 * 실행: node eval/judge.mjs [--run 2026-11-24] [--judge-model claude-opus-5-5] [--comparisons main]
 */
import fs from 'node:fs';
import path from 'node:path';
import { CRITERIA } from './lib/aggregate.mjs';
import { callClaude, runPool } from './lib/claude.mjs';
import { CACHE_DIR, EVAL_DIR, appliesTo, loadCases, loadConditions, outputPath, readJson, readOptions, sha256, writeJson } from './lib/config.mjs';

/** 판정 답변을 해석하지 못했을 때 다시 묻는 횟수 */
const PARSE_ATTEMPTS = 3;

/**
 * `rubric.md` 에서 판정 모델에게 보낼 지시를 읽는다.
 *
 * @returns {string} 두 표시 사이의 지시문
 * @throws {Error} 표시를 찾지 못했을 때
 */
function readJudgeInstructions() {
  const rubric = fs.readFileSync(path.join(EVAL_DIR, 'rubric.md'), 'utf8').replace(/\r\n/g, '\n');
  const match = rubric.match(/<!-- judge:start -->\n([\s\S]*?)\n<!-- judge:end -->/);
  if (!match) throw new Error('rubric.md 에서 judge:start 와 judge:end 표시를 찾지 못했습니다.');
  return match[1].trim();
}

/**
 * 문자열로 정한 씨앗에서 0 이상 1 미만의 난수를 차례로 만드는 함수를 돌려준다.
 *
 * 같은 묶음은 다시 실행해도 같은 순서로 섞이게 하려고 `Math.random` 대신 쓴다.
 *
 * @param {string} seed 씨앗 문자열
 * @returns {() => number} 난수 생성 함수 (mulberry32)
 */
function seededRandom(seed) {
  let state = parseInt(sha256(seed).slice(0, 8), 16);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 배열을 씨앗에 따라 섞은 새 배열을 돌려준다 (피셔-예이츠 방식).
 *
 * @template T
 * @param {T[]} items 섞을 배열
 * @param {string} seed 씨앗 문자열
 * @returns {T[]} 섞은 배열
 */
function shuffle(items, seed) {
  const random = seededRandom(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 판정 모델에게 보낼 사용자 메시지를 만든다.
 *
 * @param {string} instructions 판정 지시문
 * @param {string} casePrompt 케이스의 입력
 * @param {{label: string, text: string}[]} candidates 기호와 출력
 * @returns {string} 사용자 메시지
 */
function buildJudgePrompt(instructions, casePrompt, candidates) {
  const outputs = candidates.map((c) => `<출력 기호="${c.label}">\n${c.text.trim()}\n</출력>`).join('\n\n');
  return `${instructions}\n\n아래가 작성자들이 받은 입력과 각자 쓴 출력입니다.\n\n<입력>\n${casePrompt}\n</입력>\n\n${outputs}`;
}

/**
 * 판정 모델의 답변에서 JSON 을 꺼내고 형식을 확인한다.
 *
 * @param {string} text 판정 모델의 답변
 * @param {string[]} labels 이 묶음에 쓴 기호
 * @returns {{scores: Record<string, Record<string, number>>, ranking: string[], reason: string}} 점수, 순위, 이유
 * @throws {Error} JSON 이 아니거나 순위와 점수에 모든 기호가 들어 있지 않을 때
 */
function parseJudgment(text, labels) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('JSON 객체가 없습니다.');
  const parsed = JSON.parse(text.slice(start, end + 1));
  const ranking = parsed.ranking;
  if (!Array.isArray(ranking) || ranking.length !== labels.length || !labels.every((l) => ranking.includes(l))) {
    throw new Error(`ranking 에 모든 기호가 한 번씩 있어야 합니다: ${JSON.stringify(ranking)}`);
  }
  for (const label of labels) {
    for (const criterion of CRITERIA) {
      const score = parsed.scores?.[label]?.[criterion];
      if (!Number.isInteger(score) || score < 1 || score > 5) throw new Error(`${label} 의 ${criterion} 점수가 1~5 의 정수가 아닙니다.`);
    }
  }
  return { scores: parsed.scores, ranking, reason: String(parsed.reason ?? '') };
}

/**
 * 아직 판정하지 않았거나 출력, 지시문, 판정 모델이 바뀐 묶음을 모은다.
 *
 * @param {object} options `readOptions` 가 돌려준 실행 옵션
 * @param {Record<string, object>} judgments 이미 저장된 판정 기록
 * @param {string} instructionsHash 판정 지시문의 해시
 * @returns {object[]} 판정할 묶음. 묶음마다 키, 해시, 비교, 케이스, 생성 번호, 순서, 기호를 붙인 출력이 있다
 */
function collectJobs(options, judgments, instructionsHash) {
  const cases = loadCases(options.cases);
  const comparisons = loadConditions().comparisons.filter((c) => !options.comparisons || options.comparisons.includes(c.id));
  const jobs = [];
  for (const comparison of comparisons) {
    for (const evalCase of cases.filter((c) => appliesTo(comparison, c))) {
      for (let run = 1; run <= options.runs; run += 1) {
        const files = comparison.conditions.map((id) => ({ id, file: outputPath(options.resultDir, evalCase.id, id, run) }));
        if (!files.every((f) => fs.existsSync(f.file))) {
          process.stdout.write(`  건너뜀: ${comparison.id} ${evalCase.id} ${run}번째 (출력이 모두 있지 않음)\n`);
          continue;
        }
        const outputs = files.map((f) => ({ id: f.id, text: fs.readFileSync(f.file, 'utf8') }));
        const shuffled = shuffle(outputs, `${comparison.id}|${evalCase.id}|${run}`);
        for (const order of [1, 2]) {
          // 두 번째 판정은 첫 번째 순서를 뒤집는다. 기호는 자리에 따라 붙이므로 기호도 함께 바뀐다
          const ordered = order === 1 ? shuffled : [...shuffled].reverse();
          const candidates = ordered.map((o, i) => ({ label: String.fromCharCode(65 + i), id: o.id, text: o.text }));
          const key = `${comparison.id}|${evalCase.id}|${run}|${order}`;
          const hash = sha256(`${instructionsHash}|${options.judgeModel}|${candidates.map((c) => `${c.label}:${c.text}`).join('|')}`).slice(0, 16);
          if (judgments[key]?.hash === hash && !options.force) continue;
          jobs.push({ key, hash, comparison, evalCase, run, order, candidates });
        }
      }
    }
  }
  return jobs;
}

/**
 * 묶음 하나를 판정한다. 답변을 해석하지 못하면 정해진 횟수만큼 다시 묻는다.
 *
 * @param {object} job `collectJobs` 가 만든 묶음
 * @param {{judgeModel: string, instructions: string, emptyPrompt: string}} context 판정 모델, 지시문, 빈 시스템 프롬프트 파일
 * @returns {Promise<{record: object, calls: number}>} 저장할 판정 기록과 호출한 횟수
 * @throws {Error} 정해진 횟수 안에 답변을 해석하지 못했을 때
 */
async function judgeOne(job, context) {
  const labels = job.candidates.map((c) => c.label);
  const prompt = buildJudgePrompt(context.instructions, job.evalCase.prompt, job.candidates);
  let parsed = null;
  let durationMs = 0;
  let calls = 0;
  let lastError = null;
  while (!parsed && calls < PARSE_ATTEMPTS) {
    const result = await callClaude({ model: context.judgeModel, systemPromptFile: context.emptyPrompt, prompt });
    calls += 1;
    durationMs += result.durationMs;
    try {
      parsed = parseJudgment(result.text, labels);
    } catch (error) {
      lastError = error;
    }
  }
  if (!parsed) throw new Error(`${job.key} 의 판정 답변을 해석하지 못했습니다: ${lastError.message}`);
  const idOf = Object.fromEntries(job.candidates.map((c) => [c.label, c.id]));
  const record = {
    comparison: job.comparison.id,
    caseId: job.evalCase.id,
    run: job.run,
    order: job.order,
    hash: job.hash,
    judgeModel: context.judgeModel,
    labels: idOf,
    ranking: parsed.ranking.map((label) => idOf[label]),
    scores: Object.fromEntries(labels.map((label) => [idOf[label], parsed.scores[label]])),
    reason: parsed.reason,
    durationMs,
  };
  return { record, calls };
}

/**
 * 판정 단계 전체를 실행한다.
 *
 * @param {string[]} argv 명령줄 인자
 * @returns {Promise<void>}
 */
async function main(argv) {
  const options = readOptions(argv);
  const instructions = readJudgeInstructions();
  const instructionsHash = sha256(instructions).slice(0, 12);
  const judgmentsFile = path.join(options.resultDir, 'judgments.json');
  /** @type {Record<string, object>} 묶음과 순서별 판정 기록 */
  const judgments = readJson(judgmentsFile, {});
  const emptyPrompt = path.join(CACHE_DIR, 'system-prompts', 'empty.md');
  fs.mkdirSync(path.dirname(emptyPrompt), { recursive: true });
  fs.writeFileSync(emptyPrompt, '', 'utf8');

  const jobs = collectJobs(options, judgments, instructionsHash);
  const startedAt = Date.now();
  process.stdout.write(`판정할 묶음 ${jobs.length}개 (판정 모델 ${options.judgeModel}, 동시 실행 ${options.concurrency})\n`);
  let done = 0;
  let totalCalls = 0;
  await runPool(jobs, options.concurrency, async (job) => {
    const { record, calls } = await judgeOne(job, { judgeModel: options.judgeModel, instructions, emptyPrompt });
    judgments[job.key] = record;
    totalCalls += calls;
    writeJson(judgmentsFile, judgments);
    done += 1;
    process.stdout.write(`  [${done}/${jobs.length}] ${job.key}\n`);
  });

  const metaFile = path.join(options.resultDir, 'meta.json');
  const meta = readJson(metaFile, { phases: {} });
  const previous = meta.phases.judge ?? { calls: 0, wallMs: 0 };
  meta.phases.judge = { calls: previous.calls + totalCalls, wallMs: previous.wallMs + (Date.now() - startedAt) };
  meta.judgeModel = options.judgeModel;
  meta.judgeInstructionsHash = instructionsHash;
  writeJson(metaFile, meta);
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`판정에 실패했습니다: ${error.message}\n`);
  process.exitCode = 1;
});

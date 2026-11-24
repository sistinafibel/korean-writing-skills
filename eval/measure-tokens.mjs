/**
 * 조건마다 시스템 프롬프트가 차지하는 입력 토큰 수를 실제 호출로 측정한다.
 *
 * 같은 사용자 메시지를 지침 없이 한 번, 지침을 넣고 한 번 보내서 CLI 가 보고하는
 * 입력 토큰 수의 차이를 그 지침의 토큰 수로 본다. 글자 수로 어림하지 않는다.
 * 우리 스킬은 스킬별 본문과 description 도 따로 측정한다. description 은 스킬을 불러오지
 * 않아도 세션마다 항상 들어가는 부분이고, 본문은 스킬을 불러올 때에만 들어가는 부분이다.
 *
 * 실행: node eval/measure-tokens.mjs [--run 2026-11-24] [--model claude-sonnet-5-5]
 */
import fs from 'node:fs';
import path from 'node:path';
import { callClaude, runPool } from './lib/claude.mjs';
import { CACHE_DIR, buildSystemPrompt, loadConditions, readJson, readOptions, readSource, sha256, splitFrontmatter, writeJson } from './lib/config.mjs';

/** 토큰 수를 잴 때 보내는 사용자 메시지. 답변이 짧게 끝나는 질문을 쓴다 */
const PROBE_PROMPT = '1 더하기 1 은 얼마인가요? 숫자만 답해 주세요.';

/**
 * 글 하나를 시스템 프롬프트로 넣었을 때의 입력 토큰 수를 잰다.
 *
 * @param {string} model 모델
 * @param {string} text 시스템 프롬프트로 넣을 글. 빈 문자열이면 지침 없음
 * @returns {Promise<number>} CLI 가 보고한 입력 토큰 수
 */
async function inputTokensWith(model, text) {
  const dir = path.join(CACHE_DIR, 'system-prompts');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `probe.${sha256(text).slice(0, 12)}.md`);
  fs.writeFileSync(file, text, 'utf8');
  const result = await callClaude({ model, systemPromptFile: file, prompt: PROBE_PROMPT });
  return result.inputTokens;
}

/**
 * 토큰 측정 단계 전체를 실행한다.
 *
 * @param {string[]} argv 명령줄 인자
 * @returns {Promise<void>}
 */
async function main(argv) {
  const options = readOptions(argv);
  const { conditions } = loadConditions();
  const targets = [];
  for (const condition of conditions) {
    const built = await buildSystemPrompt(condition);
    targets.push({ group: 'conditions', id: condition.id, label: condition.label, text: built.text });
  }
  // 우리 스킬의 본문과 description 을 스킬별로, 분량을 줄이기 전과 후로 나누어 잰다
  const skillSources = conditions
    .filter((c) => ['ours', 'ours-before-optimization', 'ours-two-examples'].includes(c.id))
    .flatMap((c) => c.sources.map((source) => ({ conditionId: c.id, source })));
  const seen = new Set();
  for (const { conditionId, source } of skillSources) {
    const { text, origin } = await readSource(source);
    if (seen.has(origin)) continue;
    seen.add(origin);
    const { meta, body } = splitFrontmatter(text);
    targets.push({ group: 'parts', id: `${origin}#body`, label: `${source.name} 본문 (${origin})`, conditionId, text: body.trim() });
    if (meta.description) {
      targets.push({ group: 'parts', id: `${origin}#description`, label: `${source.name} description (${origin})`, conditionId, text: meta.description });
    }
  }

  const startedAt = Date.now();
  const baseline = await inputTokensWith(options.model, '');
  const measured = await runPool(targets, options.concurrency, async (target) => {
    const tokens = target.text ? (await inputTokensWith(options.model, target.text)) - baseline : 0;
    process.stdout.write(`  ${target.label}: ${tokens} 토큰\n`);
    return { group: target.group, id: target.id, label: target.label, chars: target.text.length, tokens };
  });

  writeJson(path.join(options.resultDir, 'tokens.json'), {
    model: options.model,
    probeInputTokensWithoutSystemPrompt: baseline,
    conditions: Object.fromEntries(measured.filter((m) => m.group === 'conditions').map((m) => [m.id, { tokens: m.tokens, chars: m.chars }])),
    parts: measured.filter((m) => m.group === 'parts').map(({ id, label, chars, tokens }) => ({ id, label, chars, tokens })),
  });
  const metaFile = path.join(options.resultDir, 'meta.json');
  const meta = readJson(metaFile, { phases: {} });
  meta.phases.tokens = { calls: targets.filter((t) => t.text).length + 1, wallMs: Date.now() - startedAt };
  writeJson(metaFile, meta);
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`토큰 측정에 실패했습니다: ${error.message}\n`);
  process.exitCode = 1;
});

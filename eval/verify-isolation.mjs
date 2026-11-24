/**
 * 생성 호출에 다른 지침이 섞이지 않는지 실제 API 요청을 가로채서 확인한다.
 *
 * 로컬에 기록용 프록시를 띄우고 `ANTHROPIC_BASE_URL` 로 CLI 의 요청을 그 프록시로 보낸다.
 * 프록시는 요청 본문을 읽은 뒤 api.anthropic.com 으로 그대로 전달한다. 인증 헤더는 전달만 하고
 * 기록하지 않으며, 결과 파일에는 계정을 식별하는 값(이메일, 계정 식별자)을 남기지 않는다.
 *
 * 확인하는 것:
 * 1. 지침 없는 조건의 system 에는 CLI 의 식별 문장만 있다.
 * 2. 지침이 있는 조건의 system 에는 식별 문장과 넣어 준 지침만 있다.
 * 3. 사용자 메시지에 CLAUDE.md, rules, 출력 스타일, 스킬 목록, 언어 설정이 들어 있지 않다.
 * 4. 도구가 하나도 전달되지 않는다.
 *
 * 실행: node eval/verify-isolation.mjs [--run 2026-11-24] [--model claude-sonnet-5-5]
 */
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { callClaude } from './lib/claude.mjs';
import { buildSystemPrompt, loadConditions, readOptions, writeJson } from './lib/config.mjs';

/** CLI 가 사용자 지정 시스템 프롬프트 앞에 항상 붙이는 식별 문장 */
const IDENTITY_LINE = "You are a Claude agent, built on Anthropic's Claude Agent SDK.";
/** 사용자 설정이 새어 들어왔다면 나타날 표지 */
const LEAK_MARKERS = ['CLAUDE.md', 'claudeMd', 'rules/', 'output style', 'Output Style', 'skills are available', 'Always respond in', '# Language', 'jsdoc', 'JSDoc', '커밋 메시지', '스킬'];
/** 확인에 쓰는 사용자 메시지 */
const PROBE_PROMPT = 'REST API 가 무엇인지 한 문장으로 설명해 주세요.';

/**
 * 요청 본문을 모으면서 api.anthropic.com 으로 전달하는 프록시를 띄운다.
 *
 * @returns {Promise<{port: number, bodies: object[], close: () => void}>} 포트, 가로챈 요청 본문 목록, 종료 함수
 */
function startRecordingProxy() {
  const bodies = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      if (req.method === 'POST' && req.url.startsWith('/v1/messages')) {
        try { bodies.push(JSON.parse(body.toString('utf8'))); } catch { /* JSON 이 아닌 본문은 기록하지 않는다 */ }
      }
      const upstream = https.request(
        { hostname: 'api.anthropic.com', path: req.url, method: req.method, headers: { ...req.headers, host: 'api.anthropic.com' } },
        (upstreamRes) => { res.writeHead(upstreamRes.statusCode, upstreamRes.headers); upstreamRes.pipe(res); },
      );
      upstream.on('error', (error) => { res.writeHead(502); res.end(String(error)); });
      upstream.end(body);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ port: server.address().port, bodies, close: () => server.close() }));
  });
}

/**
 * 가로챈 요청 하나에서 지침이 들어갈 수 있는 부분을 요약한다.
 *
 * @param {object} body Messages API 요청 본문
 * @param {string} expectedSystem 이 조건에서 넣어 준 시스템 프롬프트
 * @returns {{systemBlocks: string[], systemIsClean: boolean, contextSections: string[], leakMarkers: string[], tools: number}}
 *   system 블록의 요약, system 에 식별 문장과 넣어 준 지침만 있는지, 메시지에 붙은 맥락의 종류, 발견한 누출 표지, 도구 수
 */
function summarize(body, expectedSystem) {
  const system = (body.system ?? []).map((block) => block.text).filter((text) => !text.startsWith('x-anthropic-billing-header'));
  const expected = [IDENTITY_LINE, ...(expectedSystem ? [expectedSystem] : [])];
  const systemIsClean = system.length === expected.length && system.every((text, i) => text.trim() === expected[i].trim());
  const messageText = body.messages.flatMap((m) => (Array.isArray(m.content) ? m.content : [{ text: String(m.content) }])).map((c) => c.text ?? '').join('\n');
  const withoutSystemPrompt = expectedSystem ? messageText.split(expectedSystem).join('') : messageText;
  return {
    systemBlocks: system.map((text) => (text === IDENTITY_LINE ? 'CLI 식별 문장' : `넣어 준 지침 (${text.length}자)`)),
    systemIsClean,
    contextSections: [...messageText.matchAll(/^# (\w[\w ]*)$/gm)].map((m) => m[1]),
    leakMarkers: LEAK_MARKERS.filter((marker) => withoutSystemPrompt.includes(marker)),
    tools: (body.tools ?? []).length,
  };
}

/**
 * 격리 확인 전체를 실행한다.
 *
 * @param {string[]} argv 명령줄 인자
 * @returns {Promise<void>}
 */
async function main(argv) {
  const options = readOptions(argv);
  const { conditions } = loadConditions();
  const targets = conditions.filter((c) => ['baseline', 'fluent-korean', 'ours'].includes(c.id));
  const proxy = await startRecordingProxy();
  const report = { model: options.model, checkedAt: new Date().toISOString(), conditions: {} };
  let ok = true;
  try {
    for (const condition of targets) {
      const built = await buildSystemPrompt(condition);
      const before = proxy.bodies.length;
      const result = await callClaude({
        model: options.model,
        systemPromptFile: built.file,
        prompt: PROBE_PROMPT,
        extraEnv: { ANTHROPIC_BASE_URL: `http://127.0.0.1:${proxy.port}` },
      });
      const requests = proxy.bodies.slice(before);
      const summary = summarize(requests[requests.length - 1], built.text);
      const clean = requests.length === 1 && summary.systemIsClean && summary.leakMarkers.length === 0 && summary.tools === 0;
      ok = ok && clean;
      report.conditions[condition.id] = { requests: requests.length, ...summary, clean, answer: result.text.trim() };
      process.stdout.write(`${clean ? '깨끗함' : '확인 필요'}: ${condition.id} (요청 ${requests.length}개, system ${summary.systemBlocks.join(' + ')}, 맥락 ${summary.contextSections.join(', ') || '없음'}, 도구 ${summary.tools}개)\n`);
    }
  } finally {
    proxy.close();
  }
  report.ok = ok;
  writeJson(path.join(options.resultDir, 'isolation-check.json'), report);
  if (!ok) {
    process.stderr.write('다른 지침이 섞였을 수 있습니다. isolation-check.json 을 확인하세요.\n');
    process.exitCode = 1;
  }
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`격리 확인에 실패했습니다: ${error.message}\n`);
  process.exitCode = 1;
});

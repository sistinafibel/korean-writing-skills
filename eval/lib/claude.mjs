/**
 * Claude Code CLI(`claude -p`)를 다른 지침이 섞이지 않게 호출하는 모듈이다.
 *
 * 이 평가는 조건마다 시스템 프롬프트로 넣는 지침만 달라야 한다. 그래서 사용자 PC 에
 * 설정된 CLAUDE.md, rules, 출력 스타일, 플러그인, 스킬, 훅, MCP 서버를 모두 끄고
 * 도구도 주지 않은 채로 호출한다. 인증은 CLI 가 이미 가지고 있는 로그인 정보를 그대로 쓴다.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

/** 자식 프로세스에 그대로 넘기는 Claude 관련 환경 변수. 인증과 공급자 선택에 쓰는 것만 남긴다 */
const KEPT_CLAUDE_ENV = new Set([
  'CLAUDE_CONFIG_DIR',
  'CLAUDE_CODE_OAUTH_TOKEN',
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY',
]);

/** 호출 한 번에 허용하는 시간(밀리초) */
const CALL_TIMEOUT_MS = 10 * 60 * 1000;
/** 실패했을 때 다시 시도하는 횟수 */
const MAX_ATTEMPTS = 4;

/**
 * 실행할 claude 바이너리를 찾는다.
 *
 * Windows 에서 npm 으로 설치하면 `claude.cmd` 가 PATH 에 있는데, `.cmd` 는 셸을 거쳐야
 * 실행되고 빈 문자열 인자를 넘기기 어렵다. 그래서 `.cmd` 옆의 `claude.exe` 를 직접 찾는다.
 *
 * @returns {string} 실행 파일 경로. 찾지 못하면 `claude`
 */
export function resolveClaudeBinary() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  if (process.platform !== 'win32') return 'claude';
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    if (!dir) continue;
    const direct = path.join(dir, 'claude.exe');
    if (fs.existsSync(direct)) return direct;
    const viaNpm = path.join(dir, 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
    if (fs.existsSync(path.join(dir, 'claude.cmd')) && fs.existsSync(viaNpm)) return viaNpm;
  }
  return 'claude';
}

/**
 * 자식 프로세스에 넘길 환경 변수를 만든다.
 *
 * 이 스크립트를 Claude Code 세션 안에서 실행하면 부모 세션의 환경 변수(세션 식별자,
 * 노력 수준 등)가 자식에게 전해진다. 인증에 필요한 것만 남기고 나머지 `CLAUDE*` 변수를 지운다.
 *
 * @returns {NodeJS.ProcessEnv} 정리한 환경 변수
 */
function cleanEnv() {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('CLAUDE') && !KEPT_CLAUDE_ENV.has(key)) continue;
    env[key] = value;
  }
  // 세션 이름을 짓는 부가 호출을 끈다. 평가 호출 한 번이 API 요청 한 번이 되게 한다.
  env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE = '1';
  return env;
}

/**
 * 호출할 때 작업 폴더로 쓸 빈 폴더를 돌려준다.
 *
 * 저장소 안에서 호출하면 그 저장소의 설정이나 git 상태가 맥락에 들어갈 수 있으므로
 * 저장소 밖의 빈 폴더를 쓴다.
 *
 * @returns {string} 빈 폴더의 경로
 */
function emptyWorkingDir() {
  const dir = path.join(os.tmpdir(), 'korean-writing-eval-cwd');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * @typedef {object} ClaudeResult
 * @property {string} text 모델의 답변
 * @property {number} inputTokens 입력 토큰 수 (캐시에 쓰거나 캐시에서 읽은 토큰 포함)
 * @property {number} outputTokens 출력 토큰 수 (사고 토큰 포함)
 * @property {number} durationMs CLI 가 보고한 소요 시간
 * @property {number} attempts 성공할 때까지 시도한 횟수
 */

/**
 * `claude -p` 를 한 번 실행한다.
 *
 * @param {{model: string, systemPromptFile: string, prompt: string, extraEnv?: Record<string, string>}} request
 *   모델, 시스템 프롬프트 파일(빈 파일이면 지침 없음), 사용자 메시지, 추가 환경 변수
 * @returns {Promise<ClaudeResult>} 답변과 사용량
 * @throws {Error} CLI 가 오류를 보고했거나 출력을 해석하지 못했을 때
 */
function callOnce({ model, systemPromptFile, prompt, extraEnv }) {
  const args = [
    '-p',
    '--safe-mode', // CLAUDE.md, 스킬, 플러그인, 훅, 출력 스타일을 끈다
    '--system-prompt-file', systemPromptFile,
    '--tools', '', // 도구 없음
    '--strict-mcp-config', // MCP 서버 없음
    '--disable-slash-commands',
    '--setting-sources', '', // 사용자, 프로젝트, 로컬 설정을 읽지 않음
    '--no-session-persistence',
    '--effort', 'medium',
    '--model', model,
    '--output-format', 'json',
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(resolveClaudeBinary(), args, {
      cwd: emptyWorkingDir(),
      env: { ...cleanEnv(), ...extraEnv },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`claude 호출이 ${CALL_TIMEOUT_MS / 1000}초 안에 끝나지 않았습니다.`));
    }, CALL_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', () => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(stdout);
        if (parsed.is_error || typeof parsed.result !== 'string') {
          throw new Error(`claude 가 오류를 보고했습니다 (${parsed.api_error_status ?? parsed.subtype}): ${String(parsed.result).slice(0, 300)}`);
        }
        const usage = parsed.usage ?? {};
        resolve({
          text: parsed.result,
          inputTokens: (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
          outputTokens: usage.output_tokens ?? 0,
          durationMs: parsed.duration_ms ?? 0,
          attempts: 1,
        });
      } catch (error) {
        reject(new Error(`${error.message}\n${stderr.slice(0, 500)}${stdout.slice(0, 300)}`));
      }
    });
    child.stdin.end(prompt, 'utf8');
  });
}

/**
 * `claude -p` 를 호출하고, 실패하면 간격을 늘려 가며 다시 시도한다.
 *
 * @param {{model: string, systemPromptFile: string, prompt: string, extraEnv?: Record<string, string>}} request
 *   모델, 시스템 프롬프트 파일, 사용자 메시지, 추가 환경 변수
 * @returns {Promise<ClaudeResult>} 답변과 사용량
 * @throws {Error} 정해진 횟수만큼 시도해도 실패했을 때
 */
export async function callClaude(request) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await callOnce(request);
      return { ...result, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        // 사용량 제한에 걸린 경우를 고려해 30초, 60초, 120초로 대기 시간을 늘린다.
        const waitMs = 30000 * 2 ** (attempt - 1);
        process.stderr.write(`  호출 실패 (${attempt}번째), ${waitMs / 1000}초 뒤에 다시 시도합니다: ${error.message.split('\n')[0]}\n`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }
  throw new Error(`claude 호출이 ${MAX_ATTEMPTS}번 모두 실패했습니다: ${lastError.message}`);
}

/**
 * 작업 목록을 정해진 수만큼 동시에 처리한다.
 *
 * @template T, R
 * @param {T[]} items 처리할 항목
 * @param {number} concurrency 동시에 실행할 수
 * @param {(item: T, index: number) => Promise<R>} worker 항목 하나를 처리하는 함수
 * @returns {Promise<R[]>} 항목 순서와 같은 순서의 결과
 */
export async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * 설치된 Claude Code CLI 의 버전을 읽는다.
 *
 * @returns {Promise<string>} 버전 문자열. 읽지 못하면 `unknown`
 */
export function claudeVersion() {
  return new Promise((resolve) => {
    const child = spawn(resolveClaudeBinary(), ['--version'], { env: cleanEnv(), windowsHide: true });
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.on('error', () => resolve('unknown'));
    child.on('close', () => resolve(out.trim() || 'unknown'));
  });
}

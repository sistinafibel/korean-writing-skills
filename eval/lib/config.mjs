/**
 * 평가 설정을 읽는 공용 모듈이다.
 *
 * 케이스 파일(`eval/cases/*.md`)과 조건 정의(`eval/conditions.json`)를 읽고,
 * 조건마다 시스템 프롬프트로 넣을 지침 문서를 모아서 임시 파일로 만든다.
 * 다른 저장소의 지침(fluent-korean, im-not-ai)은 이 저장소에 복사하지 않고
 * 실행할 때 내려받아 `eval/.cache/` (git 에서 제외)에만 둔다.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** `eval/` 폴더의 절대 경로 */
export const EVAL_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
/** 저장소 루트의 절대 경로 */
export const REPO_DIR = path.dirname(EVAL_DIR);
/** 내려받은 지침과 조립한 시스템 프롬프트를 두는 폴더 (git 에서 제외) */
export const CACHE_DIR = path.join(EVAL_DIR, '.cache');

/** 생성에 쓰는 기본 모델 */
export const DEFAULT_MODEL = 'claude-sonnet-5-5';
/** 블라인드 판정에 쓰는 기본 모델 */
export const DEFAULT_JUDGE_MODEL = 'claude-opus-5-5';
/** 조건마다 케이스마다 생성하는 횟수의 기본값 */
export const DEFAULT_RUNS = 3;

/**
 * 명령줄 인자를 `--이름 값` 또는 `--이름` 형태로 읽는다.
 *
 * @param {string[]} argv `process.argv.slice(2)` 에 해당하는 인자 목록
 * @returns {Record<string, string | boolean>} 인자 이름과 값. 값이 없는 인자는 `true`
 */
export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const name = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[name] = true;
    } else {
      args[name] = next;
      i += 1;
    }
  }
  return args;
}

/**
 * 오늘 날짜를 `YYYY-MM-DD` 로 돌려준다. 결과 폴더 이름의 기본값으로 쓴다.
 *
 * @returns {string} 로컬 시간 기준 날짜
 */
export function today() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * 공통 실행 옵션을 명령줄 인자에서 뽑는다.
 *
 * @param {string[]} argv 명령줄 인자
 * @returns {{run: string, resultDir: string, model: string, judgeModel: string, runs: number,
 *   concurrency: number, cases: string[] | null, conditions: string[] | null,
 *   comparisons: string[] | null, force: boolean, raw: Record<string, string | boolean>}}
 *   실행 이름, 결과 폴더, 모델, 반복 횟수, 동시 실행 수, 걸러 낼 케이스와 조건
 */
export function readOptions(argv) {
  const raw = parseArgs(argv);
  const run = typeof raw.run === 'string' ? raw.run : today();
  const list = (value) => (typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : null);
  return {
    run,
    resultDir: path.join(EVAL_DIR, 'results', run),
    model: typeof raw.model === 'string' ? raw.model : DEFAULT_MODEL,
    judgeModel: typeof raw['judge-model'] === 'string' ? raw['judge-model'] : DEFAULT_JUDGE_MODEL,
    runs: typeof raw.runs === 'string' ? Number(raw.runs) : DEFAULT_RUNS,
    concurrency: typeof raw.concurrency === 'string' ? Number(raw.concurrency) : 4,
    cases: list(raw.cases),
    conditions: list(raw.conditions),
    comparisons: list(raw.comparisons),
    force: raw.force === true,
    raw,
  };
}

/**
 * 문서 맨 앞의 YAML 프런트매터를 떼어 낸다.
 *
 * @param {string} text 문서 전체
 * @returns {{meta: Record<string, string>, body: string}} `키: 값` 을 읽은 메타데이터와 본문
 */
export function splitFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/^﻿/, '');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: normalized };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return { meta, body: normalized.slice(match[0].length) };
}

/**
 * @typedef {object} EvalCase
 * @property {string} id 케이스 식별자. 파일 이름에서 확장자를 뺀 값과 같다
 * @property {string} category 갈래 이름 (설명 답변, 화면 문구, 커밋 메시지 등)
 * @property {'prose' | 'commit' | 'pr'} kind 규칙 검사의 종류
 * @property {string} title 케이스를 한 줄로 설명하는 제목
 * @property {'required' | 'absent' | undefined} deploy PR 케이스에서 배포 참고 사항 절이 있어야 하는지
 * @property {string} prompt 모델에게 사용자 메시지로 보내는 입력
 */

/**
 * `eval/cases/` 의 케이스를 파일 이름 순서로 읽는다.
 *
 * @param {string[] | null} [only] 읽을 케이스 식별자. 비우면 전부 읽는다
 * @returns {EvalCase[]} 케이스 목록
 * @throws {Error} 프런트매터에 id 나 kind 가 없을 때
 */
export function loadCases(only = null) {
  const dir = path.join(EVAL_DIR, 'cases');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  const cases = files.map((file) => {
    const { meta, body } = splitFrontmatter(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (!meta.id || !meta.kind) throw new Error(`케이스 ${file} 의 프런트매터에 id 와 kind 가 있어야 합니다.`);
    return {
      id: meta.id,
      category: meta.category ?? '',
      kind: meta.kind,
      title: meta.title ?? meta.id,
      deploy: meta.deploy,
      prompt: body.trim(),
    };
  });
  return only ? cases.filter((c) => only.includes(c.id)) : cases;
}

/**
 * @typedef {object} ConditionSource
 * @property {string} name 지침 문서의 이름. 시스템 프롬프트에서 `<skill name="...">` 로 표시한다
 * @property {string} [path] 저장소 루트 기준 파일 경로
 * @property {string} [git] `커밋:경로` 형태. 과거 커밋의 파일을 `git show` 로 읽는다
 * @property {string} [url] 내려받을 주소. 다른 저장소의 지침은 커밋을 고정한 raw 주소로 적는다
 * @property {string} [localFallback] 내려받지 못했을 때 읽을 로컬 경로 (`~` 는 홈 폴더)
 */

/**
 * @typedef {object} Condition
 * @property {string} id 조건 식별자. 출력 파일 이름에 쓴다
 * @property {string} label 조건을 설명하는 이름
 * @property {string} short 표의 머리글에 쓰는 짧은 이름
 * @property {string} [note] 조건을 해석할 때 알아야 하는 점
 * @property {ConditionSource[]} sources 시스템 프롬프트에 넣는 지침 문서. 비어 있으면 지침 없음
 * @property {string[]} [kinds] 이 조건을 적용할 케이스 종류. 없으면 모든 케이스
 * @property {string[]} [categories] 이 조건을 적용할 갈래. 없으면 모든 갈래
 */

/**
 * @typedef {object} Comparison
 * @property {string} id 비교 식별자
 * @property {string} label 표에 표시하는 이름
 * @property {string[]} conditions 함께 놓고 판정할 조건의 식별자
 * @property {string[]} [kinds] 이 비교에 넣을 케이스 종류. 없으면 모든 케이스
 * @property {string[]} [categories] 이 비교에 넣을 갈래. 없으면 모든 갈래
 */

/**
 * `eval/conditions.json` 을 읽는다.
 *
 * @returns {{conditions: Condition[], comparisons: Comparison[]}} 조건 목록과 비교 목록
 */
export function loadConditions() {
  return JSON.parse(fs.readFileSync(path.join(EVAL_DIR, 'conditions.json'), 'utf8'));
}

/**
 * 조건이 케이스에 적용되는지 확인한다.
 *
 * @param {{kinds?: string[], categories?: string[]}} scoped 조건이나 비교
 * @param {EvalCase} evalCase 케이스
 * @returns {boolean} 적용되면 true
 */
export function appliesTo(scoped, evalCase) {
  if (scoped.kinds && !scoped.kinds.includes(evalCase.kind)) return false;
  if (scoped.categories && !scoped.categories.includes(evalCase.category)) return false;
  return true;
}

/**
 * 문자열의 SHA-256 해시를 16진수로 돌려준다.
 *
 * @param {string} text 해시할 문자열
 * @returns {string} 16진수 64자
 */
export function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * 지침 문서 하나의 원문을 읽는다. 주소에서 받은 문서는 캐시에 저장해 두고 다시 쓴다.
 *
 * @param {ConditionSource} source 지침 문서의 위치
 * @returns {Promise<{text: string, origin: string}>} 원문과, 원문을 어디에서 읽었는지
 * @throws {Error} 어느 위치에서도 읽지 못했을 때
 */
export async function readSource(source) {
  if (source.path) {
    return { text: fs.readFileSync(path.join(REPO_DIR, source.path), 'utf8'), origin: source.path };
  }
  if (source.git) {
    const text = execFileSync('git', ['show', source.git], { cwd: REPO_DIR, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    return { text, origin: `git:${source.git}` };
  }
  if (source.url) {
    const cacheFile = path.join(CACHE_DIR, 'sources', `${sha256(source.url).slice(0, 16)}.md`);
    if (fs.existsSync(cacheFile)) return { text: fs.readFileSync(cacheFile, 'utf8'), origin: source.url };
    try {
      const response = await fetch(source.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      fs.writeFileSync(cacheFile, text, 'utf8');
      return { text, origin: source.url };
    } catch (error) {
      const fallback = source.localFallback?.replace(/^~/, os.homedir());
      if (fallback && fs.existsSync(fallback)) {
        return { text: fs.readFileSync(fallback, 'utf8'), origin: `local:${source.localFallback}` };
      }
      throw new Error(`${source.url} 을 내려받지 못했고 대신 읽을 로컬 파일도 없습니다: ${error.message}`);
    }
  }
  throw new Error(`지침 문서 ${source.name} 에 path, git, url 가운데 하나가 있어야 합니다.`);
}

/**
 * 조건의 지침 문서를 모아 시스템 프롬프트를 만들고 임시 파일로 저장한다.
 *
 * 문서마다 프런트매터를 떼고 본문만 `<skill name="...">` 로 감싼다. 스킬을 불러오면
 * 본문만 대화에 들어가는 것과 같게 하고, 문서가 서로를 이름으로 가리킬 수 있게 하기 위해서다.
 * 지침이 없는 조건은 빈 파일을 만든다.
 *
 * @param {Condition} condition 조건
 * @returns {Promise<{file: string, text: string, sha256: string, chars: number,
 *   sources: {name: string, origin: string, sha256: string, chars: number}[]}>}
 *   시스템 프롬프트 파일의 경로와 내용, 해시, 글자 수, 문서별 출처
 */
export async function buildSystemPrompt(condition) {
  const parts = [];
  const sources = [];
  for (const source of condition.sources) {
    const { text, origin } = await readSource(source);
    const body = splitFrontmatter(text).body.trim();
    parts.push(`<skill name="${source.name}">\n${body}\n</skill>`);
    sources.push({ name: source.name, origin, sha256: sha256(body), chars: body.length });
  }
  const text = parts.join('\n\n');
  const hash = sha256(text);
  const dir = path.join(CACHE_DIR, 'system-prompts');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${condition.id}.${hash.slice(0, 12)}.md`);
  fs.writeFileSync(file, text, 'utf8');
  return { file, text, sha256: hash, chars: text.length, sources };
}

/**
 * JSON 파일을 읽고, 파일이 없으면 기본값을 돌려준다.
 *
 * @template T
 * @param {string} file 파일 경로
 * @param {T} fallback 파일이 없을 때 돌려줄 값
 * @returns {T} 읽은 값
 */
export function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
}

/**
 * 값을 들여쓴 JSON 으로 저장한다. 폴더가 없으면 만든다.
 *
 * @param {string} file 파일 경로
 * @param {unknown} value 저장할 값
 * @returns {void}
 */
export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/**
 * 출력 파일의 경로를 만든다.
 *
 * @param {string} resultDir 결과 폴더
 * @param {string} caseId 케이스 식별자
 * @param {string} conditionId 조건 식별자
 * @param {number} run 몇 번째 생성인지 (1부터)
 * @returns {string} `outputs/<케이스>/<조건>.<번호>.md` 경로
 */
export function outputPath(resultDir, caseId, conditionId, run) {
  return path.join(resultDir, 'outputs', caseId, `${conditionId}.${run}.md`);
}

/**
 * 출력 하나를 두 스킬의 조항에 비추어 기계적으로 세는 규칙 검사 모듈이다.
 *
 * 정규식으로 셀 수 있는 것만 다루므로 문장의 뜻이나 맥락은 보지 못한다. 예를 들어
 * 팀을 가리키는 정당한 '우리'도 한 건으로 세고, 사실을 함께 적은 '효율적인'도 한 건으로 센다.
 * 그래서 결과는 조건 사이의 상대적인 차이를 보는 데에 쓰고, 한 건 한 건의 옳고 그름은
 * 나란히 보는 비교표에서 사람이 판단한다.
 *
 * 기준의 출처:
 * - natural-korean: 문장 단위 2, 4, 구 단위 4, 5, 상투적인 문형 1~3, 글 전체 구성 1
 * - git-writing-korean: 제목, 커밋 본문, PR 본문, 어휘와 기호
 */

/** git-writing-korean 의 타입 표 */
export const COMMIT_TYPES = ['feature', 'fix', 'refactor', 'perf', 'docs', 'test', 'chore', 'ci', 'deploy'];

/** git-writing-korean 이 고정한 PR 본문의 절 이름과 순서 */
export const PR_SECTIONS = ['작업 배경', '변경 사항', '배포 참고 사항', '확인 사항'];
/** PR 본문에 반드시 있어야 하는 절 */
export const PR_REQUIRED_SECTIONS = ['작업 배경', '변경 사항', '확인 사항'];

/** 제목 설명의 길이 기준. 스킬의 "50자 안팎"을 55자 이하로 해석한다 */
export const TITLE_MAX_LENGTH = 55;

/** 사용하지 않는 기호 (git-writing-korean 어휘와 기호, natural-korean 구 단위 4) */
export const SYMBOL_PATTERNS = {
  middleDot: /[·ㆍ・‧]/g,
  emDash: /[—―]/g,
  enDash: /–/g,
  arrow: /[→⇒➜➔➡↔←]|(?<![-<])->/g,
};

/** 상투적인 문형과 평가만 담은 수식어 (natural-korean 구 단위 5, 상투적인 문형 1~3, 글 전체 구성 1) */
export const PHRASE_PATTERNS = {
  // '단순히 A가 아니라 B', '단순한 A가 아니다'
  notSimply: /단순(?:히|한)[^.!?\n]{0,40}?(?:아니라|아닌|아니고|아닙니다|아니에요|아니야|아니다)/g,
  // 'A를 넘어 B', '단순한 A를 넘어'
  beyond: /[을를] 넘어(?:서)?(?=[\s,])/g,
  // '~하는 순간, ~된다'
  theMoment: /[가-힣]+는 순간/g,
  // 주어로 쓴 '우리'. '우리말', '우리나라' 같은 합성어는 세지 않는다
  we: /(?<![가-힣])우리(?:는|가|도|의|를|에게|들은|들이|들의)?(?![가-힣])/g,
  // 평가만 담은 수식어. 앞의 일곱 개는 스킬 조항에 있는 것이고 뒤의 여섯 개는 같은 종류로 흔히 쓰이는 것이다
  emptyModifier: /혁신적|지속\s?가능|효율적|명확한|체계적|강력한|핵심적|획기적|탁월한|뛰어난|완벽한|근본적|본질적/g,
  // 같은 내용을 다시 정리하는 문단의 시작
  recap: /(?<![가-힣])(?:정리하면|정리하자면|요약하면|요약하자면|결론적으로|한마디로)/g,
};

/** git-writing-korean 의 어휘 표에서 사용하지 않는 표현 */
export const VOCABULARY_PATTERN = new RegExp(
  [
    '(?<![가-힣])더(?:한다|합니다|했|하는|함)', // 메뉴를 더한다
    '얹(?:는다|습니다|었|음|는)', // 기능을 얹는다
    '(?<![가-힣])(?:뺀다|뺍니다|뺐|뺌)', // 단계를 뺀다
    '걷(?:는다|습니다|어낸|어냈|어냄|었)', // 화면을 걷는다
    '길이 끊', // 넘어가는 길이 끊긴 곳
    '돌려(?:준다|줍니다|주|줌|줬)', // 503 을 돌려준다
    '버튼을 (?:먼저 )?막', // 버튼을 막는다
    '(?:눌러|돌려) ?(?:봤|보았)', // 눌러 봤습니다, 돌려 봤습니다
    '찍(?:힌다|힙니다|히|혔)', // 로그에 찍힌다
    '(?:서버|프로세스|앱|워커)[가이]? ?죽', // 서버가 죽는다
    '다듬', // 코드를 다듬는다
    '손(?:본다|봅니다|봤|보)', // 손본다
    '정리(?:한다|합니다|했|함|하고|해서)', // 정리한다
  ].join('|'),
  'g',
);

/** 세션 링크와 도구 서명 (git-writing-korean PR 본문) */
const SIGNATURE_PATTERN = /claude\.ai\/code|Generated with|Co-Authored-By|🤖/i;
/** 이모지 */
const EMOJI_PATTERN = /\p{Extended_Pictographic}/gu;
/** 서술어와 종결어미로 끝난 문장의 마지막 글자 */
const COMPLETE_ENDINGS = new Set(['다', '요', '까', '죠', '오', '네']);
/** '-기' 로 끝나도 명사인 낱말의 끝 두 글자 */
const NOUNS_ENDING_IN_GI = ['폐기', '대기', '연기', '표기', '초기', '크기', '동기', '포기', '기기', '보기'];
/** '-로' 로 끝나도 명사인 낱말의 끝 두 글자 */
const NOUNS_ENDING_IN_RO = ['경로', '통로', '회로', '진로'];

/**
 * 정규식에 맞는 곳의 수를 센다.
 *
 * @param {string} text 대상 글
 * @param {RegExp} pattern 전역(g) 정규식
 * @returns {number} 맞는 곳의 수
 */
function count(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

/**
 * 코드 블록과 인라인 코드를 지운다. 두 스킬 모두 코드와 인용한 원문에는 지침을 적용하지 않는다.
 *
 * @param {string} text Markdown 글
 * @returns {string} 코드를 지운 글
 */
export function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

/**
 * 답변 전체를 코드 블록 하나로 감쌌다면 그 안의 내용만 꺼낸다.
 *
 * @param {string} text 모델의 답변
 * @returns {{text: string, wrapped: boolean}} 감싼 표시를 벗긴 글과, 감싸져 있었는지
 */
export function unwrapFence(text) {
  const trimmed = text.replace(/\r\n/g, '\n').trim();
  const match = trimmed.match(/^```[a-z]*\n([\s\S]*?)\n```$/);
  if (match && !match[1].includes('\n```\n')) return { text: match[1].trim(), wrapped: true };
  return { text: trimmed, wrapped: false };
}

/**
 * 글을 문단 문장과 목록 문장으로 나눈다. 제목 줄, 표, 굵은 글씨로만 된 표지 줄은 뺀다.
 *
 * Markdown 에서는 빈 줄 없이 이어지는 줄이 한 문단이고, 커밋 본문은 72자 안팎에서 줄을 바꾸므로
 * 이어지는 줄을 먼저 한 덩어리로 합친 뒤에 문장으로 나눈다. 목록 항목 아래에 이어지는 줄은 그 항목에 붙인다.
 *
 * @param {string} text 코드를 지운 Markdown 글
 * @returns {{paragraph: string[], list: string[]}} 문단에 속한 문장과 목록 항목에 속한 문장
 */
export function splitSentences(text) {
  /** @type {{isList: boolean, text: string}[]} 빈 줄이나 목록 표시로 나뉜 덩어리 */
  const blocks = [];
  let current = null;
  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim().replace(/^>\s*/, '');
    if (!line || /^#{1,6}\s/.test(line) || line.startsWith('|') || /^[-*_=]{3,}$/.test(line)) {
      flush();
      continue;
    }
    const marker = line.match(/^(?:[-*+]|\d+[.)])\s+/);
    if (marker) {
      flush();
      current = { isList: true, text: line.slice(marker[0].length).replace(/^\[[ xX]\]\s*/, '') };
    } else if (current) {
      current = { ...current, text: `${current.text} ${line}` };
    } else {
      current = { isList: false, text: line };
    }
  }
  flush();
  const paragraph = [];
  const list = [];
  for (const block of blocks) {
    if (/^\*\*[^*]+\*\*:?$/.test(block.text)) continue; // "**팝업 제목**" 같은 표지 줄
    const sentences = block.text.split(/(?<=[.!?…]["'”’)\]*]?)\s+/).map((s) => s.trim()).filter(Boolean);
    for (const sentence of sentences) {
      if (count(sentence, /[가-힣]/g) < 6) continue; // 버튼 글자처럼 아주 짧은 구절은 문장으로 보지 않는다
      (block.isList ? list : paragraph).push(sentence);
    }
  }
  return { paragraph, list };
}

/**
 * 문장이 서술어와 종결어미로 끝났는지 확인한다 (natural-korean 문장 단위 2).
 *
 * @param {string} sentence 문장 하나
 * @returns {boolean} '-다', '-요', '-까' 등으로 끝났으면 true
 */
export function isCompleteSentence(sentence) {
  const core = sentence
    .replace(/\s*\([^()]*\)\s*[.!?…:]*\s*$/, '') // 문장 끝의 괄호 설명
    .replace(/[\s*_"'”’)\].!?…:~]+$/, '');
  return COMPLETE_ENDINGS.has(core.slice(-1));
}

/**
 * 한글 음절의 받침이 ㅁ 인지 확인한다. '숨김', '늘림', '함' 같은 명사형 끝맺음을 찾는 데에 쓴다.
 *
 * @param {string} syllable 한글 한 글자
 * @returns {boolean} 받침이 ㅁ 이면 true
 */
function hasMieumFinal(syllable) {
  const code = syllable.charCodeAt(0) - 0xac00;
  // 한글 음절은 (초성 × 21 + 중성) × 28 + 종성 으로 배열되어 있고 종성 16번이 ㅁ 이다
  return code >= 0 && code <= 11171 && code % 28 === 16;
}

/**
 * 제목의 끝맺음이 git-writing-korean 의 명사형 기준에 맞는지 확인한다.
 *
 * @param {string} description 타입을 뺀 제목 설명
 * @returns {{ok: boolean, reason: string}} 통과 여부와 판단 근거
 */
export function checkTitleEnding(description) {
  const core = description
    .replace(/\s*\((?:#?\d+|v?\d[\d.]*|[^(),]{1,20})\)\s*$/, '') // 제목 끝의 짧은 참조 하나
    .replace(/[\s.。]+$/, '');
  const words = core.split(/\s+/);
  const last = words[words.length - 1] ?? '';
  const previous = words[words.length - 2] ?? '';
  if (!/[가-힣]$/.test(core)) return { ok: false, reason: '한글로 끝나지 않음' };
  if (/다$/.test(last)) return { ok: false, reason: '"-다"로 끝남' };
  if (/요$/.test(last)) return { ok: false, reason: '"-요"로 끝남' };
  if (/기$/.test(last) && !NOUNS_ENDING_IN_GI.some((noun) => last.endsWith(noun))) return { ok: false, reason: '"-기"로 끝남' };
  if (/로$/.test(last) && !NOUNS_ENDING_IN_RO.some((noun) => last.endsWith(noun))) return { ok: false, reason: '"-으로"로 끝남' };
  if (last === '함') {
    return /(?:게|도록)$/.test(previous)
      ? { ok: true, reason: '"~하게 함"' }
      : { ok: false, reason: '상태를 설명하는 구절 없이 "함"으로 끝남' };
  }
  if (last.length > 1 && last.endsWith('함')) return { ok: false, reason: '"-함"을 덧붙임' };
  if (last === '처리' || last === '작업') return { ok: false, reason: '의미가 없는 명사를 덧붙임' };
  return { ok: true, reason: hasMieumFinal(last.slice(-1)) ? '"-ㅁ/-음"' : '명사' };
}

/**
 * 제목에서 타입과 설명을 나눈다.
 *
 * @param {string} title 커밋 제목이나 PR 제목
 * @returns {{type: string | null, description: string}} 타입(없으면 null)과 설명
 */
export function parseTitle(title) {
  const match = title.match(/^([A-Za-z]+)(?:\([^)]*\))?!?:\s*(.*)$/);
  return match ? { type: match[1], description: match[2] } : { type: null, description: title };
}

/**
 * 제목에서 조사를 하나도 쓰지 않았는지 추정한다.
 *
 * 낱말이 조사로 흔히 쓰이는 글자로 끝나는지만 보므로 정확하지 않다. 낱말이 셋 이상인데
 * 조사로 보이는 글자가 하나도 없을 때에만 생략으로 본다.
 *
 * @param {string} description 타입을 뺀 제목 설명
 * @returns {boolean} 조사를 쓴 것으로 보이면 true
 */
function usesParticles(description) {
  const words = description.split(/\s+/).filter((w) => /[가-힣]/.test(w));
  if (words.length < 3) return true;
  return words.slice(0, -1).some((w) => /[을를이가은는에의로와과도서면]$/.test(w));
}

/**
 * 제목 한 줄을 검사한다. 커밋 제목과 PR 제목에 같은 기준을 쓴다.
 *
 * @param {string} title 제목
 * @returns {Record<string, {ok: boolean, detail: string}>} 검사 항목별 결과
 */
export function checkTitle(title) {
  const { type, description } = parseTitle(title);
  const ending = checkTitleEnding(description);
  return {
    titleType: { ok: type !== null && COMMIT_TYPES.includes(type), detail: type ?? '타입 없음' },
    titleEnding: { ok: ending.ok, detail: ending.reason },
    titleLength: { ok: description.length <= TITLE_MAX_LENGTH, detail: `${description.length}자` },
    titleParticles: { ok: usesParticles(description), detail: '조사로 끝나는 낱말이 있는지 추정' },
    titleNoParenList: { ok: !/\([^)]*,[^)]*\)/.test(title), detail: '괄호 안에 항목을 나열했는지' },
  };
}

/**
 * 글의 기호, 문형, 문장 통계를 센다. 모든 종류의 케이스에 쓴다.
 *
 * @param {string} text 모델이 쓴 글 (코드 블록 포함)
 * @returns {{counts: Record<string, number>, sentences: {paragraph: number, paragraphIncomplete: number,
 *   list: number, listIncomplete: number, total: number, commas: number, manyCommas: number}}}
 *   항목별 출현 수와 문장 통계
 */
export function measureProse(text) {
  const prose = stripCode(text);
  const counts = {};
  for (const [name, pattern] of Object.entries(SYMBOL_PATTERNS)) counts[name] = count(prose, pattern);
  for (const [name, pattern] of Object.entries(PHRASE_PATTERNS)) counts[name] = count(prose, pattern);
  counts.emoji = count(prose, EMOJI_PATTERN);
  const { paragraph, list } = splitSentences(prose);
  const all = [...paragraph, ...list];
  const commaCounts = all.map((s) => count(s, /(?<!\d),(?!\d)/g)); // 1,643 같은 숫자의 쉼표는 세지 않는다
  return {
    counts,
    sentences: {
      paragraph: paragraph.length,
      paragraphIncomplete: paragraph.filter((s) => !isCompleteSentence(s)).length,
      list: list.length,
      listIncomplete: list.filter((s) => !isCompleteSentence(s)).length,
      total: all.length,
      commas: commaCounts.reduce((a, b) => a + b, 0),
      manyCommas: commaCounts.filter((n) => n >= 3).length,
    },
  };
}

/**
 * 커밋 메시지 케이스의 출력을 검사한다.
 *
 * @param {string} output 모델의 답변
 * @returns {{title: string, checks: Record<string, {ok: boolean, detail: string}>, vocabulary: number, proseText: string}}
 *   뽑아낸 제목, 검사 항목별 결과, 사용하지 않는 어휘의 수, 문장 통계를 낼 본문
 */
export function checkCommit(output) {
  const { text, wrapped } = unwrapFence(output);
  const lines = text.split('\n');
  const title = lines[0].trim();
  const body = lines.slice(1).join('\n').trim();
  const bodySentences = splitSentences(stripCode(body));
  const politeEndings = [...bodySentences.paragraph, ...bodySentences.list].filter((s) => /(?:니다|요)[.!]?$/.test(s.replace(/[\s*_"')\]]+$/, '')));
  const checks = {
    ...checkTitle(title),
    // 케이스가 "커밋 메시지만 출력하고 코드 블록 표시를 붙이지 말라"고 요구한다
    messageOnly: {
      ok: !wrapped && !text.includes('```') && !/커밋 메시지|다음은|아래는|:$/.test(title),
      detail: wrapped ? '코드 블록으로 감쌈' : '설명이나 코드 블록 없이 메시지만 있는지',
    },
    bodyPlainStyle: { ok: politeEndings.length === 0, detail: `본문에서 합니다체나 해요체로 끝난 문장 ${politeEndings.length}개` },
  };
  return { title, checks, vocabulary: count(stripCode(text), VOCABULARY_PATTERN), proseText: body };
}

/**
 * PR 케이스의 출력을 검사한다.
 *
 * @param {string} output 모델의 답변
 * @param {'required' | 'absent' | undefined} deploy 배포 참고 사항 절이 있어야 하는지
 * @returns {{title: string, checks: Record<string, {ok: boolean, detail: string}>, vocabulary: number, proseText: string}}
 *   뽑아낸 제목, 검사 항목별 결과, 사용하지 않는 어휘의 수, 문장 통계를 낼 본문
 */
export function checkPr(output, deploy) {
  const { text, wrapped } = unwrapFence(output);
  const lines = text.split('\n');
  const firstLine = lines[0].trim();
  const title = firstLine.replace(/^#+\s*/, '').replace(/^(?:PR\s*)?제목\s*[:：]\s*/, '').replace(/^\*\*(.*)\*\*$/, '$1').replace(/^`(.*)`$/, '$1').trim();
  const body = lines.slice(1).join('\n').trim();
  const prose = stripCode(body);
  const headings = [...prose.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].trim());
  const positions = headings.map((h) => PR_SECTIONS.indexOf(h));
  const inOrder = positions.every((p, i) => p !== -1 && (i === 0 || p > positions[i - 1]));
  const hasRequired = PR_REQUIRED_SECTIONS.every((name) => headings.includes(name));
  const hasDeploy = headings.includes('배포 참고 사항');
  const sentences = splitSentences(prose);
  const offStyle = [...sentences.paragraph, ...sentences.list].filter((s) => {
    const core = s.replace(/\s*\([^()]*\)\s*[.!?…:]*\s*$/, '').replace(/[\s*_"'”’)\].!?…:~]+$/, '');
    return /요$/.test(core) || (/다$/.test(core) && !/니다$/.test(core));
  });
  const checks = {
    ...checkTitle(title),
    titleOnFirstLine: { ok: !wrapped && firstLine === title, detail: '첫 줄에 꾸밈 없이 제목만 있는지' },
    sections: { ok: inOrder && hasRequired, detail: headings.join(' / ') || '2단계 제목 없음' },
    deploySection: {
      ok: deploy === 'required' ? hasDeploy : !hasDeploy,
      detail: deploy === 'required' ? '배포 참고 사항 절이 있어야 함' : '배포 참고 사항 절을 생략해야 함',
    },
    uncheckedBox: { ok: /^\s*[-*]\s+\[ \]/m.test(prose), detail: '확인하지 못한 항목을 [ ] 로 표시했는지' },
    politeStyle: { ok: offStyle.length === 0, detail: `합니다체가 아닌 종결 ${offStyle.length}개` },
    noSignature: { ok: !SIGNATURE_PATTERN.test(text), detail: '세션 링크나 서명이 없는지' },
    noEmoji: { ok: count(stripCode(text), EMOJI_PATTERN) === 0, detail: '이모지가 없는지' },
  };
  return { title, checks, vocabulary: count(stripCode(text), VOCABULARY_PATTERN), proseText: body };
}

/**
 * 출력 하나를 케이스 종류에 맞게 검사한다.
 *
 * @param {{kind: 'prose' | 'commit' | 'pr', deploy?: 'required' | 'absent'}} evalCase 케이스
 * @param {string} output 모델의 답변
 * @returns {{counts: Record<string, number>, sentences: object, checks: Record<string, {ok: boolean, detail: string}>,
 *   title: string | null, violations: number}} 출현 수, 문장 통계, 검사 결과, 뽑아낸 제목, 위반 수의 합
 */
export function checkOutput(evalCase, output) {
  let specific = { title: null, checks: {}, vocabulary: 0, proseText: output };
  if (evalCase.kind === 'commit') specific = checkCommit(output);
  if (evalCase.kind === 'pr') specific = checkPr(output, evalCase.deploy);
  // 기호와 문형은 답변 전체에서 세고, 문장 통계는 제목을 뺀 본문에서 낸다
  const whole = measureProse(evalCase.kind === 'prose' ? output : unwrapFence(output).text);
  const body = evalCase.kind === 'prose' ? whole : measureProse(specific.proseText);
  const counts = { ...whole.counts };
  if (evalCase.kind !== 'prose') counts.vocabulary = specific.vocabulary;
  // 이모지는 출현 수로 이미 세었으므로 noEmoji 검사는 위반 수에 다시 더하지 않는다
  const failedChecks = Object.entries(specific.checks).filter(([name, c]) => !c.ok && name !== 'noEmoji').length;
  const violations = Object.values(counts).reduce((a, b) => a + b, 0) + failedChecks;
  return { counts, sentences: body.sentences, checks: specific.checks, title: specific.title, violations };
}

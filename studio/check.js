// 결과 점검기. 스튜디오(브라우저)와 tools/check.js(node)가 같은 코드를 쓴다.
// 글의 설득력은 판단하지 않는다. 숫자·문항 번호·근거 연결·금지 표현·말투·카드 글자 길이를 확인한다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.Studio = root.Studio || {}).check = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const LAYOUTS = ['cover', 'composition', 'points', 'comparison', 'excerpt', 'closing'];
  const ROLES = ['intro', 'feature', 'strategy', 'example', 'closing'];
  const KIND_GROUPS = [['선택형', '선다형', '객관식'], ['서술형', '서답형', '주관식', '논술형'], ['단답형']];
  const KIND_RE = '(선택형|선다형|객관식|서술형|서답형|주관식|논술형|단답형)';

  // ---------- 카드 칸 크기: [글자 크기, 폭, 최대 줄 수] ----------
  const TITLE = [72, 904, 2], INTRO = [32, 904, 2], KICKER = [26, 700, 1];
  const SLOTS = {
    cover: { kicker: KICKER, title: [92, 904, 3], intro: [35, 904, 2], hero_unit: [32, 904, 1], takeaway: [31, 904, 2] },
    composition: { kicker: KICKER, title: TITLE, intro: INTRO, takeaway: [34, 904, 2], 'stats.*.label': [36, 420, 1] },
    points: { kicker: KICKER, title: TITLE, intro: INTRO, 'items.*.title': [40, 802, 1], 'items.*.body': [31, 802, 2], takeaway: [32, 904, 2] },
    comparison: { kicker: KICKER, title: TITLE, intro: INTRO, 'items.*.title': [32, 420, 1], 'items.*.tag': [28, 440, 1], 'items.*.body': [34, 852, 3], takeaway: [32, 904, 2] },
    excerpt: { kicker: KICKER, title: TITLE, intro: INTRO, quote_label: [26, 832, 1], quote: [40, 832, 2], response_label: [26, 832, 1], response: [40, 832, 2], note: [32, 904, 2], takeaway: [30, 904, 2] },
    closing: { kicker: KICKER, title: TITLE, intro: INTRO, 'items.*.title': [40, 802, 1], 'items.*.body': [31, 802, 1], cta: [30, 824, 1] },
  };
  const REQUIRED = {
    cover: ['title', 'hero'], composition: ['title', 'stats', 'total'], points: ['title', 'items'],
    comparison: ['title', 'items'], excerpt: ['title', 'quote', 'response'], closing: ['title', 'items'],
  };

  // ---------- 금지 표현 ----------
  const CLAIMS = [
    /적중/, /보장/, /100\s?%/, /1등/, /최고의/, /성적\s?향상/, /성적이\s?오르/, /성적을\s?올/, /점수가\s?오르/, /점수를\s?올/,
    /상위권/, /변별력/, /킬러/, /가장\s?어려운/, /최고\s?난도/, /많이\s?틀린/, /오답률/, /정답률/, /학교\s?평균/, /평균\s?점수/,
    /등급\s?컷/, /만점자/, /합격률/, /1등급/,
  ];
  const META = [/출처\s*[:：]/, /참고\s?자료/, /검수/, /AI가\s?(작성|만든|쓴)/, /ChatGPT|챗GPT|Claude|클로드|인공지능이/];

  // ---------- AI 말투 ----------
  const TONE = [
    { re: /살펴보겠습니다|알아보겠습니다|알아볼까요|살펴볼까요|함께 보겠습니다/g, why: '도입 상투어', fix: '바로 사실로 시작하세요. 예: "이번 시험은 서술형이 40점이었습니다."' },
    { re: /짚어\s?(봅|보겠|드리|보았|봤)/g, why: '"짚어 보다"는 AI 글에 자주 나와요', fix: '"정리했습니다"로 바꾸거나 바로 내용을 쓰세요.' },
    { re: /중요합니다|중요한 것은|중요하다는|중요해요/g, why: '"중요하다"만으로는 이유가 없어요', fix: '왜 필요한지 문항 근거로 쓰세요. 예: "8점짜리라 하나만 틀려도 차이가 큽니다."' },
    { re: /핵심(입니다|이에요|이다|은|포인트)/g, why: '"핵심"은 추상적이에요', fix: '무엇을 하는지 동작으로 쓰세요.' },
    { re: /(하는|키우는|기르는|쓰는|읽는)\s?힘/g, why: '"~하는 힘" 같은 추상어', fix: '학생이 실제로 하는 행동으로 쓰세요. 예: "주어를 바꿔 다시 쓰기"' },
    { re: /꾸준히|꼼꼼히|철저히|체계적(으로|인)|완벽(하게|히|한)|효과적(으로|인)/g, why: '막연한 부사', fix: '횟수·방법·기준으로 바꾸세요. 예: "답을 쓴 뒤 단어 수를 세어 봅니다."' },
    { re: /다양한/g, why: '"다양한"은 내용이 없어요', fix: '무엇이 있었는지 직접 나열하세요.' },
    { re: /한 걸음 더|한층 더|더 나아가/g, why: '상투적인 연결어', fix: '빼고 다음 문장으로 바로 넘어가세요.' },
    { re: /뿐만 아니라|이처럼|결론적으로|요약하자면|마지막으로,/g, why: '번역투 연결어', fix: '빼거나 "그리고", "그래서"로 바꾸세요.' },
    { re: /여러분/g, why: '학부모를 "여러분"으로 부르면 강의처럼 들려요', fix: '"어머님, 아버님" 대신 문장 주어를 빼거나 "자녀"로 쓰세요.' },
    { re: /역량|실력 향상|능력을 향상|능력 향상|성장할|성장하는/g, why: '추상적인 교육 용어', fix: '시험에서 확인한 구체적인 행동으로 쓰세요.' },
    { re: /놓치지 마세요|주목해야|눈여겨볼|주목할 만한/g, why: '광고 문구 같은 말투', fix: '왜 봐야 하는지 숫자나 문항으로 보여 주세요.' },
    { re: /단순히[^.]{0,20}(넘어|아니라)|를 넘어서?/g, why: '"단순히 ~가 아니라" 구문은 AI 글 티가 나요', fix: '하고 싶은 말만 바로 쓰세요.' },
    { re: /라고 할 수 있습니다|라 하겠습니다|할 수 있겠습니다/g, why: '흐릿한 문장 끝', fix: '"~입니다"로 단정하세요.' },
    { re: /에 있어서|을 통해|를 통해/g, why: '번역투', fix: '"~로", "~해서"로 바꾸세요.' },
    { re: /필수(적|입니다)|반드시 필요/g, why: '과장된 강조', fix: '이유를 쓰면 강조하지 않아도 됩니다.' },
    { re: /—/g, why: '줄표(—)는 AI 글 티가 나요', fix: '쉼표나 마침표로 끊으세요.' },
    { re: /인데요[.,!]/g, why: '블로그 말버릇', fix: '"~입니다", "~예요"로 끝내세요.' },
  ];
  const TONE_LIMIT = 3;

  // ---------- 도구 ----------
  const isStr = v => typeof v === 'string' && v.trim() !== '';
  const groupOf = kind => KIND_GROUPS.find(g => g.includes(String(kind || '').replace(/\s/g, ''))) || [String(kind || '')];
  function units(str) {
    let u = 0;
    for (const ch of String(str)) {
      const c = ch.codePointAt(0);
      if ((c >= 0xac00 && c <= 0xd7a3) || (c >= 0x1100 && c <= 0x11ff) || (c >= 0x3000 && c <= 0x318f) || c >= 0xff00) u += 1;
      else if (ch >= 'A' && ch <= 'Z') u += 0.68;
      else if (ch >= 'a' && ch <= 'z') u += 0.53;
      else if (ch >= '0' && ch <= '9') u += 0.58;
      else if (ch === ' ') u += 0.28;
      else u += 0.4;
    }
    return u;
  }
  function estimateLines(text, perLine) {
    let lines = 0;
    for (const para of String(text).split('\n')) {
      let cur = 0;
      lines += 1;
      for (const word of para.split(' ')) {
        const w = units(word);
        const add = cur ? units(' ') + w : w;
        if (cur && cur + add > perLine) { lines += 1 + Math.floor(w / perLine); cur = w % perLine; }
        else if (!cur && w > perLine) { lines += Math.floor(w / perLine); cur = w % perLine; }
        else cur += add;
      }
    }
    return lines;
  }
  function parseNumbers(s) {
    const out = [];
    for (const part of s.split(/[·,ㆍ]/)) {
      const m = part.match(/(\d+)\s*[~∼\-]\s*(\d+)/);
      if (m) { for (let n = Number(m[1]); n <= Number(m[2]) && n - Number(m[1]) < 40; n++) out.push(n); }
      else if (/\d/.test(part)) out.push(Number(part.replace(/\D/g, '')));
    }
    return out;
  }
  const snippet = (text, index, len) => {
    const s = Math.max(0, index - 12), e = Math.min(text.length, index + len + 12);
    return (s ? '…' : '') + text.slice(s, e).replace(/\n/g, ' ') + (e < text.length ? '…' : '');
  };

  // 공개되는 글을 위치와 함께 모은다.
  function publicTexts(data) {
    const out = [];
    const blog = data.blog || {};
    if (isStr(blog.title)) out.push({ where: 'blog.title', text: blog.title });
    (Array.isArray(blog.sections) ? blog.sections : []).forEach((s, i) => {
      if (isStr(s.heading)) out.push({ where: `blog.sections[${i}].heading`, text: s.heading });
      (Array.isArray(s.paragraphs) ? s.paragraphs : []).forEach((p, j) => { if (isStr(p)) out.push({ where: `blog.sections[${i}].paragraphs[${j}]`, text: p }); });
    });
    (Array.isArray(data.cards) ? data.cards : []).forEach((c, i) => {
      const walk = (v, path) => {
        if (typeof v === 'string') { if (v.trim()) out.push({ where: `cards[${i}]${path}`, text: v, card: true }); }
        else if (Array.isArray(v)) v.forEach((x, j) => walk(x, `${path}[${j}]`));
        else if (v && typeof v === 'object') Object.keys(v).forEach(k => { if (!['evidence_ids', 'layout', 'color'].includes(k)) walk(v[k], `${path}.${k}`); });
      };
      walk(c, '');
    });
    if (isStr(data.caption)) out.push({ where: 'caption', text: data.caption, caption: true });
    return out;
  }

  function validate(data, options) {
    const opts = options || {};
    const errors = [], warnings = [], tone = [];
    let blogChars = 0, questions = [], groups = new Map();
    const err = (where, message, fix, rule) => errors.push({ level: 'error', rule: rule || 'check', where, message, fix: fix || '' });
    const warn = (where, message, fix, rule) => warnings.push({ level: 'warn', rule: rule || 'check', where, message, fix: fix || '' });

    if (!data || typeof data !== 'object') {
      err('(전체)', '결과가 JSON 객체가 아니에요.', 'result.json 형식을 확인하세요.', 'schema');
      return finish();
    }

    // ---------- 문항표 ----------
    const ledger = data.ledger || {};
    questions = Array.isArray(ledger.questions) ? ledger.questions : [];
    const qmap = new Map();
    if (!questions.length) err('ledger.questions', '문항표가 비어 있어요.', '시험지의 모든 문항을 문항표에 먼저 적으세요.', 'ledger');
    questions.forEach((q, i) => {
      const where = `ledger.questions[${i}]`;
      if (!isStr(q.id)) err(where, '문항 id가 없어요.', '"MC-1", "WR-3"처럼 붙이세요.', 'ledger');
      else if (qmap.has(q.id)) err(where, `문항 id ${q.id}가 겹쳐요.`, '', 'ledger');
      else qmap.set(q.id, q);
      if (!isStr(q.kind)) err(where, '문항 유형(kind)이 없어요.', '"선택형", "서술형"처럼 시험지 표기대로 쓰세요.', 'ledger');
      if (q.number === undefined || q.number === null || q.number === '') err(where, '문항 번호(number)가 없어요.', '', 'ledger');
      if (!(q.points === null || (typeof q.points === 'number' && q.points >= 0))) err(where, '배점(points)은 숫자나 null이어야 해요.', '배점을 읽지 못했으면 null로 두세요.', 'ledger');
      if (!['confirmed', 'uncertain', 'unreadable'].includes(q.confidence)) err(where, '판독 상태(confidence)는 confirmed / uncertain / unreadable 중 하나여야 해요.', '', 'ledger');
    });
    questions.forEach(q => {
      const key = groupOf(q.kind)[0];
      const g = groups.get(key) || { label: String(q.kind), count: 0, points: 0, unknown: 0, perItem: new Set(), numbers: new Set() };
      g.count += 1;
      if (typeof q.points === 'number') { g.points += q.points; g.perItem.add(q.points); } else g.unknown += 1;
      g.numbers.add(Number(q.number));
      groups.set(key, g);
    });
    const knownSum = questions.reduce((n, q) => n + (typeof q.points === 'number' ? q.points : 0), 0);
    if (typeof ledger.total_points === 'number' && Math.abs(knownSum - ledger.total_points) > 1e-9) {
      warn('ledger.total_points', `문항표 배점 합계(${knownSum}점)가 총점(${ledger.total_points}점)과 달라요.`, '빠진 문항이나 읽지 못한 배점이 있는지 확인하세요. 글에는 확인된 배점만 쓰세요.', 'ledger');
    }

    // ---------- 근거 연결 ----------
    const checkEvidence = (ids, where, required) => {
      if (!Array.isArray(ids) || !ids.length) {
        if (required) err(where, '근거 문항(evidence_ids)이 없어요.', '이 내용의 근거가 된 문항 id를 적으세요.', 'evidence');
        return;
      }
      ids.forEach(id => {
        const q = qmap.get(id);
        if (!q) err(where, `근거 문항 ${id}가 문항표에 없어요.`, '문항표의 id를 그대로 쓰세요.', 'evidence');
        else if (q.confidence === 'unreadable') err(where, `근거 문항 ${id}는 읽지 못한 문항이에요.`, '다른 문항을 근거로 쓰거나 이 내용을 빼세요.', 'evidence');
        else if (q.confidence === 'uncertain') warn(where, `근거 문항 ${id}는 판독이 불확실해요.`, '선생님 확인이 필요하다고 보고하세요.', 'evidence');
      });
    };

    // ---------- 블로그 ----------
    const blog = data.blog || {};
    const sections = Array.isArray(blog.sections) ? blog.sections : [];
    if (!isStr(blog.title)) err('blog.title', '블로그 제목이 없어요.', '', 'schema');
    else if (blog.title.replace(/\n/g, '').length > 45) warn('blog.title', `블로그 제목이 ${blog.title.length}자예요.`, '45자 안쪽이 검색 결과에서 잘리지 않아요.', 'blog');
    if (sections.length < 4) err('blog.sections', `블로그 절이 ${sections.length}개예요.`, '인사·총평, 특징, 대비, 대표 문항, 상담 안내 순으로 4개 이상 쓰세요.', 'blog');
    sections.forEach((s, i) => {
      const where = `blog.sections[${i}]`;
      if (!ROLES.includes(s.role)) err(where, `절 역할(role) '${s.role}'을 알 수 없어요.`, `${ROLES.join(' / ')} 중 하나로 쓰세요.`, 'schema');
      const ps = Array.isArray(s.paragraphs) ? s.paragraphs : [];
      if (!ps.length || !ps.every(isStr)) err(where, '빈 문단이 있어요.', '', 'schema');
      ps.forEach((p, j) => {
        if (!isStr(p)) return;
        blogChars += p.replace(/\s/g, '').length;
        if (p.length > 230) warn(`${where}.paragraphs[${j}]`, `문단이 ${p.length}자로 길어요.`, '모바일에서 읽기 좋게 2~4문장씩 나누세요.', 'blog');
      });
      checkEvidence(s.evidence_ids, where, ['feature', 'strategy', 'example'].includes(s.role));
    });
    const roles = sections.map(s => s.role);
    if (sections.length && !roles.includes('example')) err('blog.sections', '대표 문항 해설(role: example)이 없어요.', '실제 문항 하나를 골라 주어진 것·새로 판단할 것·조건 점검 순서로 풀어 쓰세요.', 'blog');
    const exampleText = sections.filter(s => s.role === 'example').map(s => (s.paragraphs || []).join('\n')).join('\n');
    if (exampleText && !/[A-Za-z]+(\s+[A-Za-z',.?!]+){2,}/.test(exampleText)) warn('blog.sections', '대표 문항 해설에 실제 영어 문장 발췌가 없어요.', '문항의 짧은 원문이나 답안 틀을 보여 주세요.', 'blog');
    const closing = sections[sections.length - 1];
    if (sections.length && (!closing || closing.role !== 'closing')) err('blog.sections', '마지막 절이 상담 안내(role: closing)가 아니에요.', '시험에서 확인한 필요 → 학원에서 함께 준비 → 상담 문의 순으로 끝내세요.', 'closing');
    if (closing && closing.role === 'closing') {
      const t = (closing.paragraphs || []).join('\n');
      const name = isStr(opts.academyName) ? opts.academyName : (data.academy && data.academy.name) || '';
      if (!(name && t.includes(name)) && !/학원/.test(t)) err(`blog.sections[${sections.length - 1}]`, '마무리에 학원이 나오지 않아요.', '학원 이름(없으면 "우리 학원")으로 함께 준비하자고 제안하세요.', 'closing');
      if (!/상담|문의/.test(t)) err(`blog.sections[${sections.length - 1}]`, '마무리에 상담·문의 안내가 없어요.', '"~로 문의해 주세요"로 끝내세요. 가정 복습 안내로만 끝내지 마세요.', 'closing');
    }
    if (blogChars && blogChars < 1300) warn('blog', `블로그 본문이 ${blogChars}자(공백 제외)로 짧아요.`, '대표 문항 해설을 더 구체적으로 쓰세요. 길이를 채우려고 반복하지는 마세요.', 'blog');
    if (blogChars > 3600) warn('blog', `블로그 본문이 ${blogChars}자(공백 제외)로 길어요.`, '반복되는 문단을 줄이세요.', 'blog');

    // ---------- 카드 ----------
    const cards = Array.isArray(data.cards) ? data.cards : [];
    if (!cards.length) err('cards', '카드가 없어요.', '5~7장을 만드세요.', 'schema');
    else if (cards.length < 5 || cards.length > 7) warn('cards', `카드가 ${cards.length}장이에요.`, '인스타 카드뉴스는 5~7장을 권장해요.', 'cards');
    if (cards.length && !cards.some(c => c.layout === 'closing')) err('cards', '상담 카드(layout: closing)가 없어요.', '마지막 장을 closing으로 만드세요.', 'closing');
    if (cards.length && cards[0].layout !== 'cover') warn('cards[0]', '첫 장이 표지(cover)가 아니에요.', '', 'cards');
    cards.forEach((c, i) => {
      const where = `cards[${i}]`;
      if (!LAYOUTS.includes(c.layout)) { err(where, `레이아웃 '${c.layout}'을 알 수 없어요.`, `${LAYOUTS.join(' / ')} 중 하나로 쓰세요.`, 'schema'); return; }
      (REQUIRED[c.layout] || []).forEach(key => {
        const v = c[key];
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) err(`${where}.${key}`, `${key} 칸이 비어 있어요.`, '', 'schema');
      });
      if (c.layout === 'comparison' && (!Array.isArray(c.items) || c.items.length !== 2)) err(`${where}.items`, '조건 비교 카드는 항목이 정확히 2개여야 해요.', '', 'schema');
      if (c.layout === 'composition' && (!Array.isArray(c.stats) || c.stats.length !== 2)) err(`${where}.stats`, '배점 카드는 항목이 정확히 2개여야 해요.', '유형이 셋 이상이면 두 묶음으로 합치세요. 예: 선택형 / 서술형(단답형 포함)', 'schema');
      if (['points', 'closing'].includes(c.layout) && Array.isArray(c.items) && c.items.length > (c.layout === 'closing' ? 3 : 4)) err(`${where}.items`, `항목이 ${c.items.length}개예요.`, c.layout === 'closing' ? '3개 이하로 줄이세요.' : '4개 이하로 줄이세요.', 'schema');
      checkEvidence(c.evidence_ids, where, ['composition', 'points', 'comparison', 'excerpt'].includes(c.layout));
      // 글자 길이 (스튜디오가 실제 글꼴로 다시 확인한다)
      const slots = SLOTS[c.layout] || {};
      Object.keys(slots).forEach(key => {
        const [size, width, max] = slots[key];
        const paths = [];
        if (key.includes('*')) {
          const [arr, , field] = key.split('.');
          (Array.isArray(c[arr]) ? c[arr] : []).forEach((it, j) => paths.push([`${arr}[${j}].${field}`, it && it[field]]));
        } else paths.push([key, c[key]]);
        const maxLines = c.layout === 'points' && key === 'items.*.body' && Array.isArray(c.items) && c.items.length > 3 ? 1 : max;
        paths.forEach(([p, v]) => {
          if (!isStr(v)) return;
          const lines = estimateLines(v, width / size);
          if (lines > maxLines) err(`${where}.${p}`, `글자가 약 ${lines}줄이라 칸(${maxLines}줄)을 넘쳐요.`, `한 줄에 한글 약 ${Math.floor(width / size)}자, ${maxLines}줄 안으로 줄이세요.`, 'length');
        });
      });
      if (c.layout === 'cover' && isStr(String(c.hero || '')) && !/^\d{1,3}$/.test(String(c.hero)) && estimateLines(String(c.hero), 904 / 110) > 1) err(`${where}.hero`, '표지의 큰 글자가 한 줄을 넘쳐요.', '숫자(3자리까지)나 짧은 영어 단어 하나로 쓰세요.', 'length');
      if (c.layout === 'composition' && Array.isArray(c.stats) && c.stats.length === 2) {
        const sum = c.stats.reduce((n, s) => n + (Number(s.points) || 0), 0);
        if (Number(c.total) !== sum) err(`${where}.total`, `배점 합계(${sum})와 total(${c.total})이 달라요.`, '', 'facts');
        c.stats.forEach((s, j) => {
          const g = groups.get(groupOf(s.label)[0]);
          if (!g) return;
          if (Number(s.count) !== g.count) err(`${where}.stats[${j}]`, `${s.label} 문항 수 ${s.count}개가 문항표(${g.count}개)와 달라요.`, '문항표에서 다시 세세요.', 'facts');
          if (!g.unknown && Number(s.points) !== g.points) err(`${where}.stats[${j}]`, `${s.label} 배점 ${s.points}점이 문항표(${g.points}점)와 달라요.`, '', 'facts');
        });
      }
    });

    // ---------- 캡션 ----------
    if (!isStr(data.caption)) warn('caption', '인스타 캡션이 없어요.', '', 'caption');
    const tags = Array.isArray(data.hashtags) ? data.hashtags : [];
    if (!tags.length) warn('hashtags', '해시태그가 없어요.', '학교·학년·과목·지역 태그를 5~15개 넣으세요.', 'caption');
    if (tags.length > 30) err('hashtags', `해시태그가 ${tags.length}개예요.`, '인스타그램은 30개까지만 허용해요.', 'caption');
    tags.forEach((t, i) => { if (/\s/.test(String(t).trim())) warn(`hashtags[${i}]`, `해시태그 "${t}"에 띄어쓰기가 있어요.`, '붙여 쓰세요.', 'caption'); });
    const captionLength = String(data.caption || '').length + tags.join(' #').length + 4;
    if (captionLength > 2200) err('caption', `캡션이 약 ${captionLength}자예요.`, '인스타그램 캡션은 2,200자까지예요.', 'caption');

    // ---------- 공개 글 전체 ----------
    const texts = publicTexts(data);
    const kindRef = new RegExp(KIND_RE + '\\s*(\\d+(?:\\s*[·,ㆍ~∼\\-]\\s*\\d+)*)\\s*번', 'g');
    const kindCount = new RegExp(KIND_RE + '\\s*(?:은|는|이|가)?\\s*(\\d+)\\s*문항', 'g');
    const kindPoints = new RegExp(KIND_RE + '\\s*(?:은|는|이|가)?\\s*(?:(\\d+)\\s*문항\\s*,?\\s*)?(\\d+(?:\\.\\d+)?)\\s*점', 'g');
    texts.forEach(({ where, text, caption }) => {
      let m;
      if (questions.length) {
        kindRef.lastIndex = 0;
        while ((m = kindRef.exec(text))) {
          const group = groupOf(m[1]);
          const nums = parseNumbers(m[2]);
          nums.forEach(n => {
            const ok = questions.some(q => group.includes(String(q.kind).replace(/\s/g, '')) && Number(q.number) === n);
            if (!ok) err(where, `"${m[1]} ${n}번"은 문항표에 없어요.`, '문항표의 유형·번호와 맞추세요.', 'facts');
          });
        }
        kindCount.lastIndex = 0;
        while ((m = kindCount.exec(text))) {
          const g = groups.get(groupOf(m[1])[0]);
          const n = Number(m[2]);
          // 전체보다 많으면 틀린 숫자, 적으면 일부를 가리키는 말일 수 있다.
          if (g && n > g.count) err(where, `"${m[0].trim()}" → 문항표에는 ${m[1]}이 ${g.count}문항뿐이에요.`, '문항표 숫자로 고치세요.', 'facts');
          else if (g && n < g.count) warn(where, `"${m[0].trim()}" → 문항표의 ${m[1]}은 모두 ${g.count}문항이에요.`, `일부를 말하는 거라면 "${m[1]} ${g.count}문항 중 ${n}문항"처럼 분명히 쓰세요. 전체를 말하는 거라면 ${g.count}로 고치세요.`, 'facts');
        }
        kindPoints.lastIndex = 0;
        while ((m = kindPoints.exec(text))) {
          const g = groups.get(groupOf(m[1])[0]);
          const v = Number(m[3]);
          if (g && !g.unknown && v > g.points) err(where, `"${m[0].trim()}" → 문항표에는 ${m[1]} 합계가 ${g.points}점이에요.`, '문항표 숫자로 고치세요.', 'facts');
          else if (g && !g.unknown && v !== g.points && !g.perItem.has(v)) warn(where, `"${m[0].trim()}" → 문항표의 ${m[1]} 합계는 ${g.points}점이에요.`, '일부 문항의 배점이라면 어느 문항인지 분명히 쓰세요. 전체라면 합계로 고치세요.', 'facts');
        }
      }
      CLAIMS.forEach(re => {
        const hit = text.match(re);
        if (hit) err(where, `"${hit[0]}" 표현은 성적·결과 자료가 있어야 쓸 수 있어요.`, '시험지에서 확인한 사실로 바꾸세요.', 'claims');
      });
      META.forEach(re => {
        const hit = text.match(re);
        if (hit) err(where, `공개 글에 제작·출처 문구("${hit[0]}")가 있어요.`, '근거는 문항표에만 남기고 공개 글에서는 빼세요.', 'meta');
      });
      const holder = caption ? text.replace(/\{학원명\}(\(으\)로|\(이\)가|\(은\)는|\(을\)를|\(과\)와)?/g, '') : text;
      const ph = holder.match(/\[[가-힣\s]{1,12}\]|\{[^}\n]{1,20}\}|○○|OO|XX|△△/);
      if (ph) err(where, `채우지 않은 자리 표시("${ph[0]}")가 있어요.`, '실제 내용으로 바꾸거나 문장을 빼세요.', 'placeholder');
      TONE.forEach(t => {
        t.re.lastIndex = 0;
        let hit;
        while ((hit = t.re.exec(text))) {
          tone.push({ level: 'warn', rule: 'tone', where, message: `${t.why}: "${snippet(text, hit.index, hit[0].length)}"`, fix: t.fix });
        }
      });
    });
    // 블로그 줄바꿈: 줄이 서술어로만 시작하면 말이 끝나기 전에 끊은 것이다.
    sections.forEach((sec, i) => (Array.isArray(sec.paragraphs) ? sec.paragraphs : []).forEach((p, j) => {
      if (!isStr(p)) return;
      p.split('\n').slice(1).forEach(line => {
        const m = line.trim().match(/^(합니다|입니다|됩니다|있습니다|했습니다|봅니다|씁니다|줍니다|정리했습니다|확인합니다)/);
        if (m) tone.push({ level: 'warn', rule: 'tone', where: `blog.sections[${i}].paragraphs[${j}]`, message: `줄바꿈이 어색해요: 줄이 "${m[1]}"로 시작해요`, fix: '줄은 문장이나 구절이 끝나는 곳(마침표, 쉼표 뒤)에서만 바꾸세요.' });
      });
    }));
    // 카드 제목이 "핵심 분석", "학습 전략"처럼 이름표로 끝나면 주장이 없다.
    cards.forEach((c, i) => {
      if (isStr(c.title) && /(분석|총정리|정리|포인트|핵심|전략|비법|꿀팁|가이드|안내)$/.test(c.title.trim()) && c.layout !== 'closing') {
        tone.push({ level: 'warn', rule: 'tone', where: `cards[${i}].title`, message: `카드 제목이 이름표 같아요: "${c.title.replace(/\n/g, ' ')}"`, fix: '이 카드의 주장을 한 문장으로 쓰세요. 예: "서술형 5문항이\\n40점입니다"' });
      }
    });
    if (tone.length > TONE_LIMIT) err('(말투)', `AI 말투 표현이 ${tone.length}개예요.`, `${TONE_LIMIT}개 이하로 고치세요. 아래 말투 경고를 하나씩 바꾸면 됩니다.`, 'tone');

    return finish();

    function finish() {
      const summary = {
        blog_chars: blogChars,
        cards: Array.isArray(data && data.cards) ? data.cards.length : 0,
        questions: questions.length,
        groups: Array.from(groups.values()).map(g => ({ kind: g.label, count: g.count, points: g.unknown ? null : g.points })),
        tone: tone.length,
      };
      return { ok: errors.length === 0, errors, warnings: warnings.concat(tone), summary };
    }
  }

  // 채팅 AI에게 보낼 수정 요청 문장
  function toPrompt(report) {
    const lines = report.errors.concat(report.warnings.filter(w => w.rule === 'tone')).slice(0, 30)
      .map((x, i) => `${i + 1}. [${x.where}] ${x.message}${x.fix ? ' → ' + x.fix : ''}`);
    return '아래 점검 결과를 반영해서 결과 JSON 전체를 다시 출력해 주세요. 사실(배점·문항 번호)은 문항표와 맞추고, 말투는 학부모에게 선생님이 직접 말하듯 짧고 구체적으로 고쳐 주세요.\n\n' + lines.join('\n');
  }

  return { validate, toPrompt, estimateLines, SLOTS, LAYOUTS, ROLES };
});

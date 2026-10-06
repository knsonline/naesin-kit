// 콘텐츠 스튜디오: 학원 테마, 카드뉴스 미리보기·편집·PNG 저장, 블로그 원고 복사, 점검
(function (S) {
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 저장 못 해도 화면은 동작 */ } },
  };
  const THEME_KEYS = Object.keys(S.DEFAULT_THEME);

  const state = { data: null, original: null, theme: null, logo: null, selected: 0, tab: 'cards', overflow: [], align: 'center' };

  // ---------- 조사 맞추기: 새봄영어(으)로 → 새봄영어로 ----------
  function josa(text) {
    const pairs = { '(으)로': ['으로', '로'], '(이)가': ['이', '가'], '(은)는': ['은', '는'], '(을)를': ['을', '를'], '(과)와': ['과', '와'] };
    return text.replace(/(.)(\(으\)로|\(이\)가|\(은\)는|\(을\)를|\(과\)와)/g, (m, prev, token) => {
      const code = prev.charCodeAt(0) - 0xac00;
      if (code < 0 || code > 11171) return prev + pairs[token][1];
      const jong = code % 28;
      if (token === '(으)로') return prev + (jong === 0 || jong === 8 ? '로' : '으로');
      return prev + (jong === 0 ? pairs[token][1] : pairs[token][0]);
    });
  }

  // ---------- 위치·필드 이름 ----------
  const FIELD = {
    kicker: '머리말', title: '제목', intro: '설명', hero: '큰 글자', hero_unit: '큰 글자 설명', takeaway: '맺음 문장',
    quote_label: '발췌 이름', quote: '발췌 문장', response_label: '답안 이름', response: '답안 문장', note: '풀이 순서',
    cta: '상담 안내 첫 줄', total: '전체 배점', stats: '배점 항목', items: '항목', layout: '레이아웃',
    'theme.name': '학원 이름', 'theme.contact': '상담 안내 문구',
  };
  const SUB = { title: '제목', body: '설명', tag: '표시', label: '이름', count: '문항 수', points: '배점' };
  function fieldLabel(field) {
    if (!field) return '';
    if (FIELD[field]) return FIELD[field];
    const m = field.match(/^(items|stats)[.[](\d+)\]?\.(\w+)$/);
    if (m) return `${Number(m[2]) + 1}번 ${m[1] === 'stats' ? '배점' : '항목'} ${SUB[m[3]] || m[3]}`;
    return field;
  }
  function whereLabel(where) {
    let m = where.match(/^cards\[(\d+)\]\.?(.*)$/);
    if (m) {
      const card = state.data.cards[Number(m[1])];
      const name = `카드 ${pad(Number(m[1]) + 1)} ${S.LAYOUT_LABEL[card && card.layout] || ''}`.trim();
      return m[2] ? `${name} · ${fieldLabel(m[2].replace(/\[(\d+)\]/g, '.$1'))}` : name;
    }
    m = where.match(/^blog\.sections\[(\d+)\](?:\.(heading|paragraphs\[(\d+)\]))?/);
    if (m) {
      const sec = state.data.blog.sections[Number(m[1])] || {};
      const name = `블로그 ${Number(m[1]) + 1}절${sec.heading ? ` "${sec.heading}"` : ''}`;
      if (m[2] === 'heading') return name + ' · 소제목';
      return m[3] !== undefined ? `${name} · ${Number(m[3]) + 1}번째 문단` : name;
    }
    if (where === 'blog.title') return '블로그 제목';
    if (where.startsWith('blog')) return '블로그';
    if (where.startsWith('ledger')) return '문항표';
    if (where.startsWith('caption')) return '인스타 캡션';
    if (where.startsWith('hashtags')) return '해시태그';
    if (where === '(말투)') return '말투 전체';
    return where;
  }
  const overflowText = w => (w.message ? `${fieldLabel(w.field)}: ${w.message}` : `${fieldLabel(w.field)} ${w.lines}줄 → ${w.max}줄 이내로 줄여 주세요`);

  // ---------- 테마 ----------
  const effectiveTheme = () => {
    const academy = (state.data && state.data.academy) || {};
    return Object.assign({}, state.theme, {
      name: state.theme.name || academy.name || '',
      contact: state.theme.contact || academy.contact || '',
    });
  };
  function applyTheme(t) {
    const next = {};
    THEME_KEYS.forEach(k => { next[k] = t && t[k] !== undefined ? t[k] : S.DEFAULT_THEME[k]; });
    if (!S.STYLES[next.style]) next.style = S.DEFAULT_THEME.style;
    if (!S.FONTS[next.font]) next.font = S.DEFAULT_THEME.font;
    next.color = S.color.normalizeHex(next.color) || S.DEFAULT_THEME.color;
    next.point = S.color.normalizeHex(next.point) || '';
    state.theme = next;
    loadLogo();
    store.set('kit.theme', state.theme);
    syncThemeControls();
    render(true);
  }
  function changeTheme(patch, thumbs) {
    Object.assign(state.theme, patch);
    store.set('kit.theme', state.theme);
    syncThemeControls();
    render(thumbs !== false);
  }
  function loadLogo() {
    state.logo = null;
    if (!state.theme.logo) return;
    const img = new Image();
    img.onload = () => { state.logo = img; render(true); };
    img.src = state.theme.logo;
  }
  function downscale(dataUrl, max) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * r));
        c.height = Math.max(1, Math.round(img.height * r));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }
  const readFile = (file, as) => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    if (as === 'url') fr.readAsDataURL(file); else fr.readAsText(file, 'utf-8');
  });

  function buildThemeControls() {
    $('#t-style').innerHTML = Object.entries(S.STYLES).map(([k, v]) =>
      `<button type="button" class="style-opt" data-v="${k}"><canvas width="216" height="270"></canvas><span>${esc(v.label)}</span></button>`).join('');
    $('#t-style').addEventListener('click', ev => { const b = ev.target.closest('[data-v]'); if (b) changeTheme({ style: b.dataset.v }, false); });
    $('#t-font').innerHTML = Object.entries(S.FONTS).map(([k, v]) =>
      `<button type="button" class="font-opt" data-v="${k}"><b data-family="${v.head.family}" data-weight="${v.head.weight}">${esc(v.label)}</b><small data-family="${v.body.family}">${esc(v.sample)}</small></button>`).join('');
    // 글꼴 미리보기는 화면에 보일 때만 글꼴 파일을 받는다 (휴대폰 데이터 절약).
    const showFonts = () => $$('#t-font [data-family]').forEach(el => {
      el.style.fontFamily = `'${el.dataset.family}'`;
      if (el.dataset.weight) el.style.fontWeight = el.dataset.weight;
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { showFonts(); io.disconnect(); } });
      io.observe($('#t-font'));
    } else showFonts();
    $('#t-font').addEventListener('click', ev => { const b = ev.target.closest('[data-v]'); if (b) changeTheme({ font: b.dataset.v }); });
    $('#swatches').innerHTML = S.SWATCHES.map(c => `<button type="button" class="swatch" data-v="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
    $('#swatches').addEventListener('click', ev => { const v = ev.target.dataset.v; if (v) changeTheme({ color: v }); });
    $('#t-color').addEventListener('input', ev => changeTheme({ color: ev.target.value }));
    $('#t-point-on').addEventListener('change', ev => changeTheme({ point: ev.target.checked ? ($('#t-point').value || state.theme.color) : '' }));
    $('#t-point').addEventListener('input', ev => { if ($('#t-point-on').checked) changeTheme({ point: ev.target.value }); });
    $('#t-name').addEventListener('input', ev => changeTheme({ name: ev.target.value.trim() }, false));
    $('#t-contact').addEventListener('input', ev => changeTheme({ contact: ev.target.value.trim() }, false));
    $('#t-logo').addEventListener('change', async ev => {
      const file = ev.target.files[0];
      ev.target.value = '';
      if (!file) return;
      try {
        const url = await downscale(await readFile(file, 'url'), 480);
        changeTheme({ logo: url });
        loadLogo();
      } catch (e) { toast('로고 이미지를 읽지 못했어요. PNG나 JPG 파일로 다시 해 주세요.'); }
    });
    $('#logo-clear').addEventListener('click', () => { changeTheme({ logo: null }); loadLogo(); });
    $('#theme-save').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(Object.assign({ kit: 'theme' }, state.theme), null, 2)], { type: 'application/json' });
      download(blob, `${state.theme.name || '우리학원'}_테마.json`);
    });
    $('#theme-load').addEventListener('change', async ev => {
      const file = ev.target.files[0];
      ev.target.value = '';
      if (!file) return;
      try { applyTheme(JSON.parse(await readFile(file))); toast('테마를 불러왔어요.'); }
      catch (e) { toast('테마 파일을 읽지 못했어요.'); }
    });
    $('#theme-reset').addEventListener('click', () => applyTheme(S.DEFAULT_THEME));
  }
  function syncThemeControls() {
    const t = state.theme;
    const fill = (sel, v) => { if (document.activeElement !== $(sel)) $(sel).value = v || ''; };
    fill('#t-name', t.name); fill('#m-name', t.name);
    fill('#t-contact', t.contact); fill('#m-contact', t.contact);
    fill('#m-region', t.region); fill('#m-greeting', t.greeting);
    const academy = (state.data && state.data.academy) || {};
    $('#t-name').placeholder = academy.name ? `결과에 적힌 이름: ${academy.name}` : "비워 두면 '우리 학원'";
    $('#t-color').value = t.color;
    $('#t-point-on').checked = !!t.point;
    $('#t-point').disabled = !t.point;
    if (t.point) $('#t-point').value = t.point;
    $$('#t-style [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === t.style));
    $$('#t-font [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === t.font));
    $$('#swatches .swatch').forEach(b => b.classList.toggle('on', b.dataset.v === t.color));
    $('#logo-preview').hidden = !t.logo;
    if (t.logo) $('#logo-preview').src = t.logo;
    $('#logo-clear').hidden = !t.logo;
  }

  // ---------- 데이터 ----------
  function setData(d, sourceLabel) {
    if (!d || !Array.isArray(d.cards) || !d.cards.length) { toast('카드 데이터(cards)가 없어요.'); return false; }
    state.original = clone(d);
    state.data = clone(d);
    state.selected = 0;
    $('#data-label').textContent = sourceLabel;
    syncThemeControls();
    buildEditor();
    render(true);
    return true;
  }
  function parseData(text) {
    try { return JSON.parse(text); } catch (e) { /* 앞뒤 설명이나 코드블록이 섞인 경우 */ }
    const start = text.indexOf('{'), end = text.lastIndexOf('}');
    if (start < 0 || end < start) throw new Error('JSON을 찾지 못했어요');
    return JSON.parse(text.slice(start, end + 1));
  }

  // ---------- 카드 편집 ----------
  const SPECS = {
    cover: ['kicker', 'title*', 'intro*', 'hero', 'hero_unit', 'takeaway*'],
    composition: ['kicker', 'title*', 'intro*', '@stats', 'total#', 'takeaway*'],
    points: ['kicker', 'title*', 'intro*', '@items', 'takeaway*'],
    comparison: ['kicker', 'title*', 'intro*', '@items+tag', 'takeaway*'],
    excerpt: ['kicker', 'title*', 'intro*', 'quote_label', 'quote*', 'response_label', 'response*', 'note*', 'takeaway*'],
    closing: ['kicker', 'title*', 'intro*', '@items', 'cta'],
  };
  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  function setPath(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] = o[k] || {}), obj);
    target[last] = value;
  }
  function fieldHtml(card, path, kind) {
    const value = getPath(card, path);
    const v = value === undefined || value === null ? '' : String(value);
    const id = 'f-' + path.replace(/\./g, '-');
    const input = kind === 'text'
      ? `<textarea id="${id}" data-path="${path}" rows="${Math.min(4, Math.max(2, v.split('\n').length))}">${esc(v)}</textarea>`
      : `<input id="${id}" data-path="${path}" ${kind === 'num' ? 'type="number" data-num="1"' : ''} value="${esc(v)}">`;
    return `<label class="field" for="${id}"><span>${esc(fieldLabel(path))}</span>${input}</label>`;
  }
  function buildEditor() {
    const card = state.data.cards[state.selected];
    if (!card) return;
    const spec = SPECS[card.layout] || ['kicker', 'title*', 'intro*', 'takeaway*'];
    const html = [];
    spec.forEach(s => {
      if (s === '@stats') {
        (card.stats || []).forEach((_, j) => html.push(`<div class="group">${fieldHtml(card, `stats.${j}.label`, 'line')}<div class="pair">${fieldHtml(card, `stats.${j}.count`, 'num')}${fieldHtml(card, `stats.${j}.points`, 'num')}</div></div>`));
      } else if (s.startsWith('@items')) {
        (card.items || []).forEach((_, j) => html.push(`<div class="group">${fieldHtml(card, `items.${j}.title`, 'line')}${s.endsWith('+tag') ? fieldHtml(card, `items.${j}.tag`, 'line') : ''}${fieldHtml(card, `items.${j}.body`, 'text')}</div>`));
      } else {
        const kind = s.endsWith('*') ? 'text' : s.endsWith('#') ? 'num' : 'line';
        html.push(fieldHtml(card, s.replace(/[*#]$/, ''), kind));
      }
    });
    $('#edit-title').textContent = `카드 ${pad(state.selected + 1)} ${S.LAYOUT_LABEL[card.layout] || card.layout}`;
    $('#edit-fields').innerHTML = html.join('');
    $$('#cards .card').forEach((el, i) => el.classList.toggle('selected', i === state.selected));
  }
  function onEdit(ev) {
    const path = ev.target.dataset.path;
    if (!path) return;
    const card = state.data.cards[state.selected];
    const raw = ev.target.value;
    setPath(card, path, ev.target.dataset.num ? (raw === '' ? '' : Number(raw)) : raw);
    render(false);
  }

  // ---------- 그리기 ----------
  const loadedFonts = new Set();
  async function ensureFonts(fontSet) {
    if (!document.fonts || !document.fonts.load) return;
    const specs = [fontSet.head, fontSet.hero, fontSet.quote, { family: fontSet.body.family, weight: fontSet.body.weight }, { family: fontSet.body.family, weight: fontSet.bold }];
    const todo = specs.filter(s => !loadedFonts.has(s.family + s.weight));
    if (!todo.length) return;
    await Promise.all(todo.map(s => document.fonts.load(`${s.weight} 40px "${s.family}"`, '가A1').catch(() => null)));
    todo.forEach(s => loadedFonts.add(s.family + s.weight));
  }
  function envFor(style) {
    const d = state.data;
    return {
      base: S.base(state.theme.color, state.theme.point),
      style: style || state.theme.style,
      f: S.FONTS[state.theme.font],
      theme: effectiveTheme(),
      logo: state.logo,
      total: d.cards.length,
      series: d.series || '',
    };
  }

  let timer = null, running = false, again = false, thumbsWanted = false;
  function render(withThumbs) {
    if (withThumbs) thumbsWanted = true;
    clearTimeout(timer);
    timer = setTimeout(draw, 30);
  }
  async function draw() {
    if (!state.data || !state.theme) return;
    if (running) { again = true; return; }
    running = true;
    try {
      const d = state.data;
      await ensureFonts(S.FONTS[state.theme.font]);
      const env = envFor();
      $('#color-note').textContent = (S.styleColors(env.base, env.style).notes || []).join(' ');
      const wrap = $('#cards');
      while (wrap.children.length > d.cards.length) wrap.lastChild.remove();
      d.cards.forEach((card, i) => {
        let el = wrap.children[i];
        if (!el) {
          el = document.createElement('figure');
          el.className = 'card';
          el.tabIndex = 0;
          el.innerHTML = '<canvas></canvas><figcaption><span class="name"></span><span class="status"></span></figcaption><ul class="warns"></ul>';
          el.addEventListener('click', () => select(i));
          el.addEventListener('keydown', ev => { if (ev.key === 'Enter') select(i); });
          wrap.appendChild(el);
        }
        const warns = S.renderCard(el.querySelector('canvas'), card, Object.assign({ index: i }, env));
        state.overflow[i] = warns;
        el.classList.toggle('selected', i === state.selected);
        el.querySelector('.name').textContent = `${pad(i + 1)} ${S.LAYOUT_LABEL[card.layout] || card.layout}`;
        const st = el.querySelector('.status');
        st.textContent = warns.length ? `고칠 곳 ${warns.length}` : '확인 완료';
        st.className = 'status ' + (warns.length ? 'warn' : 'ok');
        el.querySelector('.warns').innerHTML = warns.map(w => `<li>${esc(overflowText(w))}</li>`).join('');
      });
      state.overflow.length = d.cards.length;
      if (thumbsWanted) { thumbsWanted = false; drawThumbs(env); }
      updateCaption();
      runCheck();
      if (state.tab === 'blog') renderBlog();
    } finally {
      running = false;
      if (again) { again = false; render(false); }
    }
  }
  const scratch = document.createElement('canvas');
  function drawThumbs(env) {
    const card = state.data.cards[0];
    $$('#t-style .style-opt').forEach(btn => {
      S.renderCard(scratch, card, Object.assign({}, env, { style: btn.dataset.v, index: 0 }));
      const c = btn.querySelector('canvas');
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(scratch, 0, 0, c.width, c.height);
    });
  }
  function select(i) {
    state.selected = i;
    buildEditor();
  }

  // ---------- 점검 ----------
  let lastReport = null;
  function runCheck() {
    const academyName = effectiveTheme().name;
    const report = S.check.validate(state.data, { academyName });
    const overflow = [];
    state.overflow.forEach((list, i) => (list || []).forEach(w => overflow.push({
      level: 'error', rule: 'overflow', where: `cards[${i}]`, message: overflowText(w), fix: '스튜디오에서 실제 글꼴로 잰 결과예요.',
    })));
    // 스튜디오는 실제 글꼴로 잰 넘침을 쓰고, 점검기의 글자 수 추정은 뺀다.
    const errors = overflow.concat(report.errors.filter(e => e.rule !== 'length'));
    lastReport = { errors, warnings: report.warnings, summary: report.summary };
    if (state.afterCheck) { const f = state.afterCheck; state.afterCheck = null; f(lastReport); }
    const tone = report.warnings.filter(w => w.rule === 'tone').length;
    const badge = $('#tab-check .badge');
    badge.textContent = errors.length ? String(errors.length) : tone ? String(tone) : '';
    badge.className = 'badge ' + (errors.length ? 'bad' : tone ? 'meh' : '');
    $('#warn-total').textContent = overflow.length ? `글자 넘침 ${overflow.length}곳` : '';
    if (state.tab === 'check') renderCheck();
  }
  function renderCheck() {
    const r = lastReport;
    if (!r) return;
    const tone = r.warnings.filter(w => w.rule === 'tone');
    const other = r.warnings.filter(w => w.rule !== 'tone');
    const s = r.summary;
    const item = x => `<li class="${x.level}"><div class="where">${esc(whereLabel(x.where))}</div><div class="msg">${esc(x.message)}</div>${x.fix ? `<div class="fix">${esc(x.fix)}</div>` : ''}</li>`;
    const group = (title, list, cls) => list.length ? `<section class="check-group ${cls}"><h3>${title} <span>${list.length}</span></h3><ul>${list.map(item).join('')}</ul></section>` : '';
    $('#check-summary').innerHTML = `
      <div class="stat ${r.errors.length ? 'bad' : 'good'}"><b>${r.errors.length}</b><span>고칠 곳</span></div>
      <div class="stat ${tone.length > 3 ? 'bad' : tone.length ? 'meh' : 'good'}"><b>${tone.length}</b><span>AI 말투</span></div>
      <div class="stat"><b>${other.length}</b><span>확인할 곳</span></div>
      <p class="facts">문항표 ${s.questions}문항 · ${s.groups.map(g => `${esc(g.kind)} ${g.count}문항${g.points === null ? '' : ' ' + g.points + '점'}`).join(' · ')}<br>블로그 ${s.blog_chars}자 · 카드 ${s.cards}장</p>`;
    $('#check-list').innerHTML = (r.errors.length || tone.length || other.length)
      ? group('꼭 고칠 곳', r.errors, 'errors') + group('AI 말투', tone, 'tone') + group('확인해 볼 곳', other, 'others')
      : '<p class="all-good">고칠 곳이 없어요. 블로그와 카드를 게시 전에 한 번 읽어 보세요.</p>';
  }
  async function copyFixPrompt() {
    if (!lastReport) return;
    const text = S.check.toPrompt({ errors: lastReport.errors, warnings: lastReport.warnings });
    await copyText(text);
    toast('수정 요청 문장을 복사했어요. AI 채팅에 붙여 넣으세요.');
  }

  // ---------- 블로그 ----------
  const cardFile = n => {
    const c = state.data.cards[n - 1];
    return `${pad(n)}_${S.LAYOUT_LABEL[c && c.layout] || 'card'}.png`;
  };
  const inline = text => esc(text).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  function blogSections() {
    const blog = state.data.blog;
    return blog && Array.isArray(blog.sections) ? blog.sections : [];
  }
  function renderBlog() {
    const blog = state.data.blog;
    const view = $('#blog-view');
    if (!blog) { view.innerHTML = '<p class="empty">이 결과에는 블로그 원고가 없어요.</p>'; return; }
    view.dataset.align = state.align;
    const canvases = $$('#cards canvas');
    const parts = [`<h1>${inline(blog.title || '')}</h1>`];
    blogSections().forEach(sec => {
      if (sec.heading) parts.push(`<h2>${inline(sec.heading)}</h2>`);
      if (Number.isInteger(sec.image) && canvases[sec.image - 1]) {
        parts.push(`<figure><img alt="" data-card="${sec.image - 1}"><figcaption>이 자리에 <b>${esc(cardFile(sec.image))}</b> 이미지를 넣으세요</figcaption></figure>`);
      }
      (sec.paragraphs || []).forEach(p => parts.push(`<p>${inline(p)}</p>`));
    });
    view.innerHTML = parts.join('');
    $$('#blog-view img[data-card]').forEach(img => {
      const src = canvases[Number(img.dataset.card)];
      const small = document.createElement('canvas');
      small.width = 540; small.height = 675;
      small.getContext('2d').drawImage(src, 0, 0, 540, 675);
      img.src = small.toDataURL('image/jpeg', 0.85);
    });
    const chars = blogSections().reduce((n, s) => n + (s.paragraphs || []).join('').replace(/\s/g, '').length, 0);
    $('#blog-meta').textContent = `본문 ${chars}자 (공백 제외) · 이미지 ${blogSections().filter(s => Number.isInteger(s.image)).length}장`;
  }
  // 네이버 블로그 에디터에 붙여 넣을 서식 있는 본문 (제목은 따로 입력하므로 빼고 만든다)
  function blogHtml() {
    const align = state.align === 'center' ? 'center' : 'left';
    const out = [];
    const p = html => out.push(`<p style="text-align:${align}">${html}</p>`);
    const gap = () => out.push(`<p style="text-align:${align}"><br></p>`);
    blogSections().forEach(sec => {
      if (sec.heading) { gap(); p(`<span style="font-size:19px"><b>${inline(sec.heading)}</b></span>`); gap(); }
      if (Number.isInteger(sec.image) && state.data.cards[sec.image - 1]) { p(`[이미지: ${esc(cardFile(sec.image))}]`); gap(); }
      (sec.paragraphs || []).forEach(t => { p(inline(t)); gap(); });
    });
    return out.join('');
  }
  function blogPlain() {
    const out = [];
    blogSections().forEach(sec => {
      if (sec.heading) out.push(sec.heading);
      if (Number.isInteger(sec.image) && state.data.cards[sec.image - 1]) out.push(`[이미지: ${cardFile(sec.image)}]`);
      (sec.paragraphs || []).forEach(t => out.push(t.replace(/\*\*/g, '')));
    });
    return out.join('\n\n');
  }
  async function copyRich() {
    const html = blogHtml(), plain = blogPlain();
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      })]);
    } catch (e) {
      const box = document.createElement('div');
      box.contentEditable = 'true';
      box.innerHTML = html;
      box.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(box);
      const range = document.createRange();
      range.selectNodeContents(box);
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      document.execCommand('copy');
      sel.removeAllRanges();
      box.remove();
    }
    toast('본문을 서식과 함께 복사했어요. 네이버 블로그 본문에 붙여 넣으세요.');
  }

  // ---------- 저장·복사 ----------
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }
  const toBlob = canvas => new Promise(r => canvas.toBlob(r, 'image/png'));
  let confirmUntil = 0;
  function needsConfirm() {
    const n = state.overflow.reduce((a, w) => a + (w ? w.length : 0), 0);
    if (!n || Date.now() < confirmUntil) return false;
    confirmUntil = Date.now() + 6000;
    toast(`글자가 넘치는 곳이 ${n}곳 있어요. 그대로 저장하려면 한 번 더 눌러 주세요.`);
    return true;
  }
  async function exportAll() {
    if (needsConfirm()) return;
    toast('카드 이미지를 준비하고 있어요…');
    const canvases = $$('#cards canvas');
    const files = [];
    for (let i = 0; i < canvases.length; i++) files.push({ name: cardFile(i + 1), blob: await toBlob(canvases[i]) });
    download(await S.zip(files), `카드뉴스_${effectiveTheme().name || '우리학원'}.zip`);
    toast('PNG를 ZIP으로 저장했어요.');
  }
  // 휴대폰: 공유 시트로 사진 저장·인스타 바로 올리기. 안 되면 길게 눌러 저장하는 화면을 연다.
  async function shareCards() {
    if (needsConfirm()) return;
    toast('카드 이미지를 준비하고 있어요…');
    const canvases = $$('#cards canvas');
    const files = [];
    for (let i = 0; i < canvases.length; i++) files.push(new File([await toBlob(canvases[i])], cardFile(i + 1), { type: 'image/png' }));
    if (navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    const grid = $('#save-grid');
    grid.innerHTML = '';
    files.forEach(f => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.alt = f.name;
      grid.appendChild(img);
    });
    $('#save-dialog').showModal();
  }
  async function exportOne() {
    const canvas = $$('#cards canvas')[state.selected];
    if (canvas) download(await toBlob(canvas), cardFile(state.selected + 1));
  }

  // ---------- 캡션 ----------
  function captionText() {
    const d = state.data;
    const name = effectiveTheme().name || '우리 학원';
    const body = josa(String(d.caption || '').split('{학원명}').join(name));
    const tags = (d.hashtags || []).map(t => (String(t).startsWith('#') ? t : '#' + t)).join(' ');
    return [body, tags].filter(Boolean).join('\n\n');
  }
  function updateCaption() {
    if (document.activeElement !== $('#caption')) $('#caption').value = state.data.caption || '';
    $('#caption-preview').textContent = captionText();
  }

  // ---------- 탭·알림 ----------
  function setTab(tab) {
    state.tab = tab;
    document.body.dataset.tab = tab;
    $$('.tabs [role="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    $$('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== tab; });
    if (tab === 'blog') renderBlog();
    if (tab === 'check') renderCheck();
  }
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
  }

  // ---------- 시작 ----------
  function init() {
    buildThemeControls();
    $('#edit-fields').addEventListener('input', onEdit);
    $('#reset-card').addEventListener('click', () => {
      state.data.cards[state.selected] = clone(state.original.cards[state.selected]);
      buildEditor();
      render(false);
    });
    $('#export-all').addEventListener('click', exportAll);
    $('#export-one').addEventListener('click', () => { if (!needsConfirm()) exportOne(); });
    $('#caption').addEventListener('input', ev => { state.data.caption = ev.target.value; updateCaption(); runCheck(); });
    $('#copy-caption').addEventListener('click', async () => { await copyText(captionText()); toast('캡션을 복사했어요.'); });
    $('#copy-rich').addEventListener('click', copyRich);
    $('#copy-plain').addEventListener('click', async () => { await copyText(blogPlain()); toast('본문을 글자만 복사했어요.'); });
    $('#copy-title').addEventListener('click', async () => { await copyText(String(state.data.blog && state.data.blog.title || '').replace(/\n/g, ' ')); toast('제목을 복사했어요.'); });
    $('#blog-images').addEventListener('click', exportAll);
    $$('#align [data-v]').forEach(b => b.addEventListener('click', () => {
      state.align = b.dataset.v;
      $$('#align [data-v]').forEach(x => x.classList.toggle('on', x === b));
      renderBlog();
    }));
    $('#copy-fix').addEventListener('click', copyFixPrompt);
    $$('.tabs [role="tab"]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

    // 결과 불러오기
    const dialog = $('#load-dialog');
    $('#open-load').addEventListener('click', () => { $('#paste-box').value = ''; dialog.showModal(); });
    $('#load-cancel').addEventListener('click', () => dialog.close());
    $('#load-paste').addEventListener('click', () => {
      try { if (setData(parseData($('#paste-box').value), '붙여 넣은 결과')) { dialog.close(); toast('결과를 불러왔어요. 점검 탭도 확인해 보세요.'); } }
      catch (e) { toast('붙여 넣은 글에서 결과를 찾지 못했어요: ' + e.message); }
    });
    $('#data-file').addEventListener('change', async ev => {
      const file = ev.target.files[0];
      ev.target.value = '';
      if (!file) return;
      try { if (setData(parseData(await readFile(file)), file.name)) { dialog.close(); toast('결과를 불러왔어요.'); } }
      catch (e) { toast('파일을 읽지 못했어요: ' + e.message); }
    });
    $('#load-sample').addEventListener('click', () => { if (setData(window.KIT_SAMPLE, '예제 · 가상 시험')) dialog.close(); });
    if (document.fonts) document.fonts.addEventListener('loadingdone', () => render(true));

    // 만들기 탭 (채팅으로 만들기)
    [['#m-name', 'name'], ['#m-contact', 'contact'], ['#m-region', 'region'], ['#m-greeting', 'greeting']].forEach(([sel, key]) =>
      $(sel).addEventListener('input', ev => changeTheme({ [key]: ev.target.value.trim() }, false)));
    $('#copy-prompt').addEventListener('click', async () => {
      const t = state.theme;
      await copyText(S.chatPrompt({ name: t.name, region: t.region, contact: t.contact, greeting: t.greeting }));
      toast('프롬프트를 복사했어요. 채팅에 시험지를 첨부하고 붙여 넣으세요.');
    });
    $('#m-open').addEventListener('click', () => {
      const status = $('#m-status');
      const show = (cls, text) => { status.hidden = false; status.className = 'm-status ' + cls; status.textContent = text; };
      let data;
      try { data = parseData($('#m-result').value); }
      catch (e) { show('bad', '결과를 찾지 못했어요. AI 답의 코드 블록 전체를 복사했는지 확인해 주세요.'); return; }
      state.afterCheck = report => {
        const n = report.errors.length;
        if (n) show('bad', `고칠 곳이 ${n}개 있어요. 4번 '수정 요청 복사'를 눌러 같은 대화에 보내 주세요. 자세한 내용은 점검 탭에 있어요.`);
        else show('good', '고칠 곳이 없어요. 카드뉴스 탭에서 꾸미고, 블로그 탭에서 복사하세요.');
      };
      if (!setData(data, '붙여 넣은 결과')) { state.afterCheck = null; show('bad', '결과에 카드(cards)가 없어요. AI에게 프롬프트의 출력 형식대로 다시 보내 달라고 하세요.'); }
    });
    $('#m-fix').addEventListener('click', () => {
      if (!lastReport || (!lastReport.errors.length && !lastReport.warnings.some(w => w.rule === 'tone'))) { toast('지금은 고칠 곳이 없어요.'); return; }
      copyFixPrompt();
    });
    $('#m-sample').addEventListener('click', () => { if (setData(window.KIT_SAMPLE, '예제 · 가상 시험')) setTab('cards'); });
    const onWeb = /^https?:$/.test(location.protocol);
    $('#kit-link').hidden = !onWeb;
    $('#kit-local').hidden = onWeb;

    // 휴대폰 저장
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    $('#share-cards').hidden = !coarse;
    $('#share-cards').addEventListener('click', shareCards);
    $('#save-close').addEventListener('click', () => $('#save-dialog').close());

    state.theme = Object.assign({}, S.DEFAULT_THEME, store.get('kit.theme') || {});
    const hasResult = window.KIT_RESULT && Array.isArray(window.KIT_RESULT.cards);
    if (hasResult) setData(window.KIT_RESULT, '최근 결과 · data/result.js');
    else setData(window.KIT_SAMPLE, '예제 · 가상 시험');
    applyTheme(state.theme);
    setTab(hasResult ? 'cards' : 'make');
  }
  document.addEventListener('DOMContentLoaded', init);
})(window.Studio = window.Studio || {});

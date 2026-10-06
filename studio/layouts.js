// 1080×1350 카드 그리기. 스타일 8종 × 레이아웃 6종.
// 레이아웃은 글자 칸의 위치와 크기를 고정하고, 스타일은 배경·머리말·색만 바꾼다.
(function (S) {
  const W = 1080, H = 1350, X = 88, CW = 904;
  const C = S.color;
  S.CARD_SIZE = { W, H };
  S.LAYOUT_LABEL = { cover: '표지', composition: '배점', points: '핵심', comparison: '조건비교', excerpt: '대표문항', closing: '상담' };

  const pad = n => String(n).padStart(2, '0');
  const fmt = n => (Number.isInteger(Number(n)) ? String(Number(n)) : String(Number(n)).replace(/\.?0+$/, ''));
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }
  function rule(ctx, x, y, w, color, width) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, width || 1.5);
  }

  let noiseCanvas = null;
  function noise() {
    if (noiseCanvas) return noiseCanvas;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const img = x.createImageData(W, H);
    let seed = 20261022;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < img.data.length; i += 4) {
      const r = rnd();
      if (r < 0.45) {
        const v = r < 0.22 ? 70 : 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = Math.floor(rnd() * 16);
      }
    }
    x.putImageData(img, 0, 0);
    noiseCanvas = c;
    return c;
  }

  // ---------- 스타일 ----------
  const FULL = layout => layout === 'cover' || layout === 'closing';

  S.STYLES = {
    paper: {
      label: '시험지',
      colors: b => S.lightSet(b, '#F8F6F0', C.hsl(b.h, Math.min(b.s, 40), 14), {
        outer: [C.hsl(b.h, 32, 89), C.hsl((b.h + 50) % 360, 28, 89)],
      }),
      header: 'rule',
      paint(ctx, k) {
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, k.outer[0]);
        g.addColorStop(1, k.outer[1]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.16)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 12;
        ctx.fillStyle = k.bg;
        ctx.fillRect(28, 28, W - 56, H - 56);
        ctx.restore();
        ctx.save();
        ctx.beginPath(); ctx.rect(28, 28, W - 56, H - 56); ctx.clip();
        ctx.drawImage(noise(), 0, 0);
        ctx.restore();
        const s = 74, x1 = W - 28, y0 = 28;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x1 - s, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + s); ctx.closePath(); ctx.fill();
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = -3; ctx.shadowOffsetY = 4;
        ctx.fillStyle = C.mix(k.bg, '#000000', 0.06);
        ctx.beginPath(); ctx.moveTo(x1 - s, y0); ctx.lineTo(x1 - s, y0 + s); ctx.lineTo(x1, y0 + s); ctx.closePath(); ctx.fill();
        ctx.restore();
      },
    },

    minimal: {
      label: '미니멀',
      colors: b => S.lightSet(b, '#FFFFFF', '#15181D'),
      header: 'rule',
      paint(ctx, k) {
        ctx.fillStyle = k.bg; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = k.band; ctx.fillRect(0, 0, W, 16);
      },
    },

    bold: {
      label: '컬러 블록',
      colors(b, layout) {
        const ink = C.hsl(b.h, Math.min(b.s, 45), 13);
        const light = S.lightSet(b, C.hsl(b.h, Math.min(b.s, 60), 95.5), ink, { pale: '#FFFFFF' });
        if (!FULL(layout)) return light;
        // 표지와 상담 카드는 대표 색 면 위에 글자를 올린다.
        const f = C.solid(b.brand, ink);
        return Object.assign({}, light, {
          bg: f.fill, ink: f.on, muted: f.onMuted, accent: f.on, point: f.on, line: f.onLine,
          pale: C.mix(f.fill, f.on, 0.12), tint: f.onMuted, tint2: C.mix(f.fill, f.on, 0.2),
          band: f.on, onBand: f.fill, onBandMuted: C.mix(f.fill, f.on, 0.3),
        });
      },
      header: layout => (FULL(layout) ? 'rule' : 'band'),
      paint(ctx, k, layout) {
        ctx.fillStyle = k.bg; ctx.fillRect(0, 0, W, H);
        if (!FULL(layout)) return;
        ctx.save();
        ctx.globalAlpha = 0.08; ctx.fillStyle = k.ink;
        ctx.beginPath(); ctx.arc(W - 90, H - 120, 340, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(W - 40, 210, 120, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      },
    },

    note: {
      label: '노트',
      colors: b => S.lightSet(b, '#FFFEF7', '#1F2937', {
        ruled: '#D9E4F0', margin: C.hsl(b.ph, 70, 72), pale: C.hsl(b.ph, 75, 91),
      }),
      header: 'rule',
      paint(ctx, k) {
        ctx.fillStyle = k.bg; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = k.ruled;
        for (let y = 186; y < H - 20; y += 56) ctx.fillRect(0, y, W, 2);
        ctx.fillStyle = k.margin; ctx.fillRect(62, 0, 3, H);
        ctx.fillStyle = C.mix(k.bg, '#000000', 0.1);
        [230, 675, 1120].forEach(y => { ctx.beginPath(); ctx.arc(30, y, 13, 0, Math.PI * 2); ctx.fill(); });
      },
    },

    newsletter: {
      label: '소식지',
      colors: b => S.lightSet(b, '#FBFAF6', C.hsl(b.h, Math.min(b.s, 35), 13), { deep: C.hsl(b.h, Math.min(b.s, 45), 17) }),
      header: 'masthead',
      paint(ctx, k) {
        ctx.fillStyle = k.bg; ctx.fillRect(0, 0, W, H);
        rule(ctx, X, 1236, CW, k.ink, 2);
        rule(ctx, X, 1243, CW, k.ink, 1);
      },
    },

    dark: {
      label: '다크',
      colors: b => S.darkSet(b, C.hsl(b.h, Math.min(b.s, 32), 11)),
      header: 'rule',
      paint(ctx, k) {
        ctx.fillStyle = k.bg; ctx.fillRect(0, 0, W, H);
        const g = ctx.createRadialGradient(150, 110, 0, 150, 110, 950);
        g.addColorStop(0, rgba(k.accent, 0.2));
        g.addColorStop(1, rgba(k.accent, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      },
    },

    magazine: {
      label: '매거진',
      colors: b => S.lightSet(b, '#FAFAF7', '#121212'),
      header: 'short',
      paint(ctx, k) {
        ctx.fillStyle = k.bg; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = k.band; ctx.fillRect(0, 0, 22, H);
      },
    },

    soft: {
      label: '둥근 카드',
      colors: b => S.lightSet(b, '#FFFFFF', '#1E2330', {
        outerBg: C.hsl(b.h, Math.min(Math.max(b.s, 30), 55), 90), pale: C.hsl(b.h, 40, 95.5),
      }),
      header: 'chip',
      paint(ctx, k) {
        ctx.fillStyle = k.outerBg; ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.10)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
        ctx.fillStyle = k.bg;
        rr(ctx, 36, 36, W - 72, H - 72, 44); ctx.fill();
        ctx.restore();
      },
    },
  };

  // ---------- 머리말 ----------
  const page = e => pad(e.index + 1) + ' / ' + pad(e.total);
  const kickerOf = (c, e) => c.kicker || e.series;
  const HEADERS = {
    rule(ctx, c, e) {
      const k = e.k, f = e.f;
      S.text(ctx, kickerOf(c, e), { x: X, y: 78, w: 700, size: 26, family: f.body.family, weight: f.bold, color: k.muted, maxLines: 1, field: 'kicker', report: e.report });
      S.text(ctx, page(e), { x: X + CW - 200, y: 79, w: 200, size: 24, family: f.body.family, weight: f.bold, color: k.muted, align: 'right' });
      rule(ctx, X, 140, CW, k.ink, 2);
    },
    band(ctx, c, e) {
      const k = e.k, f = e.f;
      ctx.fillStyle = k.band; ctx.fillRect(0, 0, W, 150);
      S.text(ctx, kickerOf(c, e), { x: X, y: 52, w: 700, size: 28, family: f.body.family, weight: f.bold, color: k.onBand, maxLines: 1, field: 'kicker', report: e.report });
      S.text(ctx, page(e), { x: X + CW - 200, y: 54, w: 200, size: 25, family: f.body.family, weight: f.bold, color: k.onBandMuted, align: 'right' });
    },
    masthead(ctx, c, e) {
      const k = e.k, f = e.f;
      const on = C.solid(k.deep, '#111111');
      ctx.fillStyle = on.fill; ctx.fillRect(0, 0, W, 150);
      S.text(ctx, e.theme.name || '영어 내신 소식', { x: X, y: 26, w: 640, size: 40, lh: 1.25, family: f.head.family, weight: f.head.weight, color: on.on, maxLines: 1 });
      S.text(ctx, kickerOf(c, e), { x: X, y: 90, w: 640, size: 24, family: f.body.family, weight: f.bold, color: on.onMuted, maxLines: 1, field: 'kicker', report: e.report });
      S.text(ctx, page(e), { x: X + CW - 200, y: 36, w: 200, size: 24, family: f.body.family, weight: f.bold, color: on.onMuted, align: 'right' });
      ctx.fillStyle = k.accent; ctx.fillRect(0, 150, W, 8);
    },
    chip(ctx, c, e) {
      const k = e.k, f = e.f;
      const style = { size: 26, family: f.body.family, weight: f.bold };
      const w = Math.min(760, S.measure(ctx, kickerOf(c, e), style) + 52);
      ctx.fillStyle = k.tint2;
      rr(ctx, X, 70, w, 56, 28); ctx.fill();
      S.text(ctx, kickerOf(c, e), Object.assign({ x: X + 26, y: 78, w: w - 52, color: k.ink, maxLines: 1, field: 'kicker', report: e.report }, style));
      S.text(ctx, page(e), { x: X + CW - 200, y: 81, w: 200, size: 24, family: f.body.family, weight: f.bold, color: k.muted, align: 'right' });
    },
    short(ctx, c, e) {
      const k = e.k, f = e.f;
      S.text(ctx, kickerOf(c, e), { x: X, y: 78, w: 640, size: 26, family: f.body.family, weight: f.bold, color: k.ink, maxLines: 1, field: 'kicker', report: e.report });
      ctx.fillStyle = k.accent; ctx.fillRect(X, 128, 64, 6);
      S.text(ctx, pad(e.index + 1), { x: X + CW - 300, y: 34, w: 300, size: 96, lh: 1.05, family: f.hero.family, weight: f.hero.weight, color: k.tint, align: 'right' });
    },
  };

  function footer(ctx, e) {
    const t = e.theme, f = e.f;
    if (!t.name && !e.logo) return;
    let x = X;
    const y = 1252;
    if (e.logo) {
      const h = 48, w = Math.min(170, e.logo.width * h / e.logo.height);
      ctx.drawImage(e.logo, x, y, w, h);
      x += w + 14;
    }
    if (t.name) S.text(ctx, t.name, { x, y: y + 4, w: 600, size: 26, family: f.body.family, weight: f.bold, color: e.k.muted, maxLines: 1 });
  }

  // ---------- 레이아웃 ----------
  const head = (e, size) => ({ size: Math.round(size * (e.f.headScale || 1)), family: e.f.head.family, weight: e.f.head.weight });
  const body = (e, bold) => ({ family: e.f.body.family, weight: bold ? e.f.bold : e.f.body.weight });

  function titleBlock(ctx, c, e) {
    const k = e.k;
    const t = S.text(ctx, c.title, Object.assign({ x: X, y: 186, w: CW, lh: 1.2, color: k.ink, maxLines: 2, field: 'title', report: e.report, spacing: -1 }, head(e, 72)));
    // 제목이 한 줄이면 설명을 바로 아래로 붙인다.
    const y = 186 + Math.min(2, Math.max(1, t.lines)) * t.lineHeight + 16;
    S.text(ctx, c.intro, Object.assign({ x: X, y, w: CW, size: 32, lh: 1.4, color: k.muted, maxLines: 2, field: 'intro', report: e.report }, body(e)));
  }

  function itemList(ctx, items, e, y0, rowH) {
    const k = e.k, f = e.f;
    const bodyLines = rowH < 170 ? 1 : 2;
    items.forEach((it, j) => {
      const y = y0 + j * rowH;
      S.text(ctx, pad(j + 1), { x: X, y: y - 4, w: 90, size: 44, lh: 1.1, family: f.hero.family, weight: f.hero.weight, color: k.point });
      S.text(ctx, it.title, Object.assign({ x: 190, y, w: 802, size: 40, lh: 1.25, color: k.ink, maxLines: 1, field: `items.${j}.title`, report: e.report }, body(e, true)));
      S.text(ctx, it.body, Object.assign({ x: 190, y: y + 62, w: 802, size: 31, lh: 1.38, color: k.muted, maxLines: bodyLines, field: `items.${j}.body`, report: e.report }, body(e)));
      if (j < items.length - 1) rule(ctx, 190, y + rowH - 22, 802, k.line, 1.2);
    });
  }

  const L = {};

  L.cover = (ctx, c, e) => {
    const k = e.k, f = e.f;
    const t = S.text(ctx, c.title, Object.assign({ x: X, y: 196, w: CW, lh: 1.16, color: k.ink, maxLines: 3, field: 'title', report: e.report, spacing: -2 }, head(e, 92)));
    const introY = 196 + Math.min(3, Math.max(1, t.lines)) * t.lineHeight + 30;
    S.text(ctx, c.intro, Object.assign({ x: X, y: introY, w: CW, size: 35, lh: 1.4, color: k.muted, maxLines: 2, field: 'intro', report: e.report }, body(e)));
    rule(ctx, X, 680, CW, k.ink, 1.5);
    const hero = c.hero === undefined || c.hero === null ? '' : String(c.hero);
    const numeric = /^\d{1,3}$/.test(hero);
    const size = numeric ? 236 : 110;
    S.text(ctx, hero, { x: X, y: 830 - size * 0.55, w: CW, size, lh: 1.1, family: f.hero.family, weight: f.hero.weight, color: k.accent, maxLines: 1, field: 'hero', report: e.report, spacing: numeric ? -6 : -2 });
    S.text(ctx, c.hero_unit, Object.assign({ x: X, y: 968, w: CW, size: 32, lh: 1.3, color: k.ink, maxLines: 1, field: 'hero_unit', report: e.report }, body(e, true)));
    rule(ctx, X, 1040, CW, k.ink, 1.5);
    S.text(ctx, c.takeaway, Object.assign({ x: X, y: 1066, w: CW, size: 31, lh: 1.42, color: k.muted, maxLines: 2, field: 'takeaway', report: e.report }, body(e)));
  };

  L.composition = (ctx, c, e) => {
    const k = e.k, f = e.f;
    titleBlock(ctx, c, e);
    const stats = Array.isArray(c.stats) ? c.stats.slice(0, 2) : [];
    const sum = stats.reduce((n, s) => n + (Number(s.points) || 0), 0);
    const total = Number(c.total) || sum;
    if (stats.length !== 2) e.report({ field: 'stats', message: '배점 항목은 2개여야 해요' });
    else if (Math.abs(sum - total) > 1e-9) e.report({ field: 'total', message: `배점 합계 ${fmt(sum)}점이 전체 ${fmt(total)}점과 달라요` });
    const colors = [k.ink, k.accent];
    stats.forEach((s, j) => {
      const x = X + j * 460;
      const count = s.count === undefined ? '' : String(s.count);
      S.text(ctx, s.label, Object.assign({ x, y: 512, w: 420, size: 36, lh: 1.3, color: k.ink, maxLines: 1, field: `stats.${j}.label`, report: e.report }, body(e, true)));
      const countStyle = { size: 132, lh: 1.1, family: f.hero.family, weight: f.hero.weight, spacing: -4 };
      S.text(ctx, count, Object.assign({ x, y: 566, w: 420, color: colors[j] }, countStyle));
      const cw = S.measure(ctx, count, countStyle);
      S.text(ctx, '문항', Object.assign({ x: x + cw + 12, y: 640, w: 140, size: 32, lh: 1.3, color: k.muted }, body(e, true)));
      S.text(ctx, fmt(s.points) + '점', Object.assign({ x, y: 738, w: 420, size: 46, lh: 1.2, color: colors[j] }, body(e, true)));
    });
    // 비율은 정수로 반올림하고 두 값의 합을 100으로 맞춘다.
    const first = total ? Math.round(100 * (Number(stats[0] && stats[0].points) || 0) / total) : 0;
    const pcts = [first, 100 - first];
    const fills = [k.tint, k.accent];
    let bx = X;
    stats.forEach((s, j) => {
      const w = total ? CW * (Number(s.points) || 0) / total : 0;
      ctx.fillStyle = fills[j];
      ctx.fillRect(bx, 842, w, 52);
      S.text(ctx, pcts[j] + '%', Object.assign({ x: bx, y: 906, w, size: 30, lh: 1.3, color: k.ink, align: 'center' }, body(e, true)));
      bx += w;
    });
    S.text(ctx, '배점 비율 · 전체 ' + fmt(total) + '점 기준', Object.assign({ x: X, y: 968, w: CW, size: 26, lh: 1.3, color: k.muted }, body(e)));
    S.text(ctx, c.takeaway, Object.assign({ x: X, y: 1052, w: CW, size: 34, lh: 1.42, color: k.ink, maxLines: 2, field: 'takeaway', report: e.report }, body(e, true)));
  };

  L.points = (ctx, c, e) => {
    const k = e.k;
    titleBlock(ctx, c, e);
    const all = Array.isArray(c.items) ? c.items : [];
    if (all.length > 4) e.report({ field: 'items', message: '항목은 4개까지만 보여요' });
    const items = all.slice(0, 4);
    const rowH = items.length > 3 ? 150 : 190;
    itemList(ctx, items, e, 512, rowH);
    S.text(ctx, c.takeaway, Object.assign({ x: X, y: Math.max(1100, 512 + items.length * rowH + 10), w: CW, size: 32, lh: 1.4, color: k.accent, maxLines: 2, field: 'takeaway', report: e.report }, body(e, true)));
  };

  L.comparison = (ctx, c, e) => {
    const k = e.k;
    titleBlock(ctx, c, e);
    const items = Array.isArray(c.items) ? c.items.slice(0, 2) : [];
    if (items.length !== 2) e.report({ field: 'items', message: '비교 항목은 2개여야 해요' });
    items.forEach((it, j) => {
      const y = 508 + j * 292;
      ctx.fillStyle = j ? k.tint2 : k.pale;
      rr(ctx, X, y, CW, 68, 12); ctx.fill();
      const tagColor = j ? C.readable(k.point, k.tint2, 4) : k.muted;
      S.text(ctx, it.title, Object.assign({ x: X + 26, y: y + 13, w: 420, size: 32, lh: 1.3, color: k.ink, maxLines: 1, field: `items.${j}.title`, report: e.report }, body(e, true)));
      S.text(ctx, it.tag, Object.assign({ x: X + CW - 26 - 440, y: y + 15, w: 440, size: 28, lh: 1.3, color: tagColor, align: 'right', maxLines: 1, field: `items.${j}.tag`, report: e.report }, body(e, true)));
      S.text(ctx, it.body, Object.assign({ x: X + 26, y: y + 92, w: CW - 52, size: 34, lh: 1.42, color: k.ink, maxLines: 3, field: `items.${j}.body`, report: e.report }, body(e)));
    });
    S.text(ctx, c.takeaway, Object.assign({ x: X, y: 1100, w: CW, size: 32, lh: 1.4, color: k.accent, maxLines: 2, field: 'takeaway', report: e.report }, body(e, true)));
  };

  L.excerpt = (ctx, c, e) => {
    const k = e.k, f = e.f;
    titleBlock(ctx, c, e);
    ctx.fillStyle = k.pale;
    rr(ctx, X, 500, CW, 450, 18); ctx.fill();
    const ix = X + 36, iw = CW - 72;
    const quote = { size: 40, lh: 1.38, family: f.quote.family, weight: f.quote.weight, color: k.ink, maxLines: 2 };
    S.text(ctx, c.quote_label, Object.assign({ x: ix, y: 530, w: iw, size: 26, lh: 1.3, color: k.muted, maxLines: 1, field: 'quote_label', report: e.report }, body(e, true)));
    S.text(ctx, c.quote, Object.assign({ x: ix, y: 576, w: iw, field: 'quote', report: e.report }, quote));
    ctx.save();
    ctx.strokeStyle = k.line; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(ix, 722); ctx.lineTo(ix + iw, 722); ctx.stroke();
    ctx.restore();
    S.text(ctx, c.response_label, Object.assign({ x: ix, y: 746, w: iw, size: 26, lh: 1.3, color: k.muted, maxLines: 1, field: 'response_label', report: e.report }, body(e, true)));
    S.text(ctx, c.response, Object.assign({ x: ix, y: 792, w: iw, field: 'response', report: e.report }, quote));
    S.text(ctx, c.note, Object.assign({ x: X, y: 984, w: CW, size: 32, lh: 1.4, color: k.accent, maxLines: 2, field: 'note', report: e.report }, body(e, true)));
    S.text(ctx, c.takeaway, Object.assign({ x: X, y: 1094, w: CW, size: 30, lh: 1.42, color: k.muted, maxLines: 2, field: 'takeaway', report: e.report }, body(e)));
  };

  L.closing = (ctx, c, e) => {
    const k = e.k;
    titleBlock(ctx, c, e);
    const all = Array.isArray(c.items) ? c.items : [];
    if (all.length > 3) e.report({ field: 'items', message: '항목은 3개까지만 보여요' });
    itemList(ctx, all.slice(0, 3), e, 506, 160);
    // 상담 안내 띠: 학원 이름과 상담 문구는 테마에서 가져온다.
    const y = 1006, h = 214;
    ctx.fillStyle = k.band;
    rr(ctx, X, y, CW, h, 20); ctx.fill();
    const tx = X + 40;
    let tw = CW - 80;
    if (e.logo) {
      const lh = 120, lw = Math.min(220, e.logo.width * lh / e.logo.height);
      ctx.drawImage(e.logo, X + CW - 40 - lw, y + (h - lh) / 2, lw, lh);
      tw -= lw + 24;
    }
    S.text(ctx, c.cta || '다음 영어 내신, 같이 준비해요', Object.assign({ x: tx, y: y + 30, w: tw, size: 30, lh: 1.3, color: k.onBandMuted, maxLines: 1, field: 'cta', report: e.report }, body(e, true)));
    S.text(ctx, e.theme.name || '우리 학원', Object.assign({ x: tx, y: y + 76, w: tw, lh: 1.2, color: k.onBand, maxLines: 1, field: 'theme.name', report: e.report }, head(e, 54)));
    S.text(ctx, e.theme.contact || '편하게 상담 문의해 주세요', Object.assign({ x: tx, y: y + 152, w: tw, size: 28, lh: 1.3, color: k.onBandMuted, maxLines: 1, field: 'theme.contact', report: e.report }, body(e)));
  };

  S.styleColors = (base, style, layout) => (S.STYLES[style] || S.STYLES.paper).colors(base, layout || 'points');

  // env: base(색 재료), style, f(글꼴 묶음), theme, logo, index, total, series
  S.renderCard = function (canvas, card, env) {
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const warnings = [];
    const layout = L[card.layout] ? card.layout : null;
    const style = S.STYLES[env.style] || S.STYLES.paper;
    const e = Object.assign({}, env, { report: w => warnings.push(w) });
    e.k = style.colors(env.base, layout);
    style.paint(ctx, e.k, layout, e);
    const headerType = typeof style.header === 'function' ? style.header(layout) : style.header;
    HEADERS[headerType](ctx, card, e);
    if (layout) L[layout](ctx, card, e);
    else warnings.push({ field: 'layout', message: `알 수 없는 레이아웃 '${card.layout}'` });
    // 소식지 스타일은 머리띠에 학원 이름이 있으니 아래에 다시 쓰지 않는다.
    if (layout !== 'closing' && headerType !== 'masthead') footer(ctx, e);
    return warnings;
  };
})(window.Studio = window.Studio || {});

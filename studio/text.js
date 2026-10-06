// 캔버스 글자 쓰기: 어절 단위 줄바꿈, 줄 수 초과 감지. 글자를 자동으로 줄이지 않는다.
(function (S) {
  S.font = (weight, size, family) => `${weight} ${size}px "${family}", "kit-notosans", sans-serif`;

  function setup(ctx, o) {
    ctx.font = S.font(o.weight || 400, o.size, o.family);
    if ('letterSpacing' in ctx) ctx.letterSpacing = (o.spacing || 0) + 'px';
  }
  function reset(ctx) {
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  function wrap(ctx, text, width) {
    const out = [];
    for (const paragraph of String(text).split('\n')) {
      let line = '';
      for (const word of paragraph.split(' ')) {
        const candidate = line ? line + ' ' + word : word;
        if (ctx.measureText(candidate).width <= width) { line = candidate; continue; }
        if (line) out.push(line);
        if (ctx.measureText(word).width <= width) { line = word; continue; }
        // 한 어절이 폭보다 길면 글자 단위로 나눈다.
        let chunk = '';
        for (const ch of word) {
          if (chunk && ctx.measureText(chunk + ch).width > width) { out.push(chunk); chunk = ch; }
          else chunk += ch;
        }
        line = chunk;
      }
      out.push(line);
    }
    return out;
  }

  S.measure = function (ctx, value, o) {
    setup(ctx, o);
    const w = ctx.measureText(String(value)).width;
    reset(ctx);
    return w;
  };

  // o: x, y(위쪽), w, size, lh(배수), family, weight, color, align, maxLines, field, report, spacing
  S.text = function (ctx, value, o) {
    const lineHeight = Math.round(o.size * (o.lh || 1.35));
    if (value === undefined || value === null || value === '') return { lines: 0, height: 0, lineHeight };
    setup(ctx, o);
    const lines = wrap(ctx, value, o.w);
    ctx.fillStyle = o.color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = o.align || 'left';
    const ax = o.align === 'center' ? o.x + o.w / 2 : o.align === 'right' ? o.x + o.w : o.x;
    lines.forEach((ln, i) => ctx.fillText(ln, ax, o.y + i * lineHeight + lineHeight / 2));
    reset(ctx);
    ctx.textAlign = 'left';
    if (o.maxLines && lines.length > o.maxLines && o.report) {
      o.report({ field: o.field, lines: lines.length, max: o.maxLines });
    }
    return { lines: lines.length, height: lines.length * lineHeight, lineHeight };
  };
})(window.Studio = window.Studio || {});

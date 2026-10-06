// 색 계산 도구. 대표 색과 포인트 색에서 스타일별 색 묶음을 만들 때 쓴다.
// 글자가 배경과 잘 구분되지 않으면 명도를 자동으로 조정한다.
(function (S) {
  function normalizeHex(value) {
    const m = String(value || '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return '#' + h.toUpperCase();
  }
  function hexToRgb(hex) {
    const n = parseInt(normalizeHex(hex).slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(rgb) {
    return '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function toHsl(hex) {
    const [r, g, b] = hexToRgb(hex).map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }
  function hsl(h, s, l) {
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
  }
  function luminance(hex) {
    const c = hexToRgb(hex).map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) {
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function mix(a, b, t) {
    const x = hexToRgb(a), y = hexToRgb(b);
    return rgbToHex(x.map((v, i) => v + (y[i] - v) * t));
  }
  // 배경과의 대비가 target 이상이 될 때까지 명도를 조정한다 (밝은 배경이면 어둡게, 어두운 배경이면 밝게).
  function readable(color, bg, target) {
    const [h, s, l0] = toHsl(color);
    const darken = luminance(bg) > 0.18;
    let l = l0, out = normalizeHex(color);
    while (contrast(out, bg) < target && l > 3 && l < 97) {
      l += darken ? -2 : 2;
      out = hsl(h, s, l);
    }
    return out;
  }
  // 면 색 위에 올릴 글자색: 흰색과 진한 색 중 더 잘 보이는 쪽. 둘 다 약하면 면 색을 진하게 바꾼다.
  function solid(color, darkInk) {
    let fill = normalizeHex(color);
    const pick = f => {
      const cw = contrast('#FFFFFF', f), cd = contrast(darkInk, f);
      return cw >= cd ? ['#FFFFFF', cw] : [darkInk, cd];
    };
    let [on, ratio] = pick(fill);
    let adjusted = false;
    if (ratio < 4.5) {
      fill = readable(fill, '#FFFFFF', 4.6);
      [on, ratio] = pick(fill);
      adjusted = true;
    }
    return { fill, on, onMuted: mix(on, fill, 0.16), onLine: mix(on, fill, 0.6), adjusted };
  }

  // 스타일이 공통으로 쓰는 재료
  S.base = function (brandInput, pointInput) {
    const brand = normalizeHex(brandInput) || '#1F5C4A';
    const point = normalizeHex(pointInput) || brand;
    const [h, s, l] = toHsl(brand);
    const [ph, ps] = toHsl(point);
    return { brand, point, h, s, l, ph, ps };
  };

  // 밝은 배경용 색 묶음
  S.lightSet = function (b, bg, ink, extra) {
    const notes = [];
    const accent = readable(b.brand, bg, 3.4);
    const point = readable(b.point, bg, 3.4);
    if (accent !== b.brand) notes.push('고른 색이 밝아서 글자에 쓰는 색만 조금 진하게 맞췄어요.');
    const band = solid(b.brand, ink);
    if (band.adjusted) notes.push('면 색으로 쓸 때는 글자가 잘 보이도록 조금 진하게 맞췄어요.');
    return Object.assign({
      bg, ink, muted: mix(ink, bg, 0.36), accent, point,
      line: mix(ink, bg, 0.8),
      pale: hsl(b.h, Math.min(b.s, 26), 92),
      tint: hsl(b.h, Math.min(Math.max(b.s, 35), 65), 74),
      tint2: hsl(b.ph, Math.min(Math.max(b.ps, 30), 60), 88),
      band: band.fill, onBand: band.on, onBandMuted: band.onMuted,
      notes,
    }, extra || {});
  };

  // 어두운 배경용 색 묶음
  S.darkSet = function (b, bg) {
    const ink = '#F4F3EF';
    const accent = readable(b.brand, bg, 4.6);
    const point = readable(b.point, bg, 4.6);
    const band = solid(accent, bg);
    return {
      bg, ink, muted: mix(ink, bg, 0.3), accent, point,
      line: mix(ink, bg, 0.78),
      pale: mix(bg, '#FFFFFF', 0.08),
      tint: mix(accent, bg, 0.5),
      tint2: mix(point, bg, 0.72),
      band: band.fill, onBand: band.on, onBandMuted: band.onMuted,
      notes: accent !== b.brand ? ['어두운 배경에서 잘 보이도록 색을 조금 밝게 맞췄어요.'] : [],
    };
  };

  S.color = { normalizeHex, contrast, mix, hsl, toHsl, readable, solid };
})(window.Studio = window.Studio || {});

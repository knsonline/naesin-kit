// 학원이 고를 수 있는 글꼴 조합과 색. 글꼴 파일은 studio/fonts/에 들어 있다.
(function (S) {
  const F = (family, weight) => ({ family, weight });

  S.FONTS = {
    classic: { label: '명조 제목', sample: '시험지 느낌', head: F('kit-notoserif', 700), hero: F('kit-notoserif', 900), body: F('kit-notosans', 400), bold: 700, quote: F('kit-notoserif', 400) },
    modern: { label: '굵은 고딕', sample: '단정하고 힘 있게', head: F('kit-notosans', 900), hero: F('kit-notosans', 900), body: F('kit-notosans', 400), bold: 700, quote: F('kit-notosans', 400) },
    impact: { label: '굵은 간판', sample: '멀리서도 보이게', head: F('kit-blackhan', 400), hero: F('kit-blackhan', 400), body: F('kit-notosans', 400), bold: 700, quote: F('kit-notosans', 400) },
    retro: { label: '도현체', sample: '정겨운 간판 글씨', head: F('kit-dohyeon', 400), hero: F('kit-dohyeon', 400), body: F('kit-notosans', 400), bold: 700, quote: F('kit-notosans', 400) },
    friendly: { label: '둥근 글씨', sample: '부드럽고 귀엽게', head: F('kit-jua', 400), hero: F('kit-jua', 400), body: F('kit-gowundodum', 400), bold: 700, quote: F('kit-gowundodum', 400) },
    elegant: { label: '고운 명조', sample: '차분하고 단정하게', head: F('kit-gowunbatang', 700), hero: F('kit-gowunbatang', 700), body: F('kit-gowundodum', 400), bold: 700, quote: F('kit-gowunbatang', 400) },
    editorial: { label: '잡지 명조', sample: '잡지 기사처럼', head: F('kit-hahmlet', 800), hero: F('kit-hahmlet', 800), body: F('kit-plex', 400), bold: 700, quote: F('kit-hahmlet', 400) },
    clean: { label: '깔끔 고딕', sample: '깔끔한 보고서', head: F('kit-plex', 700), hero: F('kit-plex', 700), body: F('kit-plex', 400), bold: 700, quote: F('kit-plex', 400) },
    nanum: { label: '나눔 명조', sample: '익숙한 교과서체', head: F('kit-nanummj', 800), hero: F('kit-nanummj', 800), body: F('kit-nanumgt', 400), bold: 800, quote: F('kit-nanummj', 400) },
    hand: { label: '손글씨', sample: '선생님 필기처럼', head: F('kit-nanumpen', 400), hero: F('kit-gaegu', 700), body: F('kit-gowundodum', 400), bold: 700, quote: F('kit-gowundodum', 400), headScale: 1.28 },
  };

  S.SWATCHES = [
    '#1F5C4A', '#2E7D5B', '#0E7C86', '#1E6FB8', '#3346C8', '#22346B',
    '#5B3FA6', '#8E3B8E', '#C2185B', '#B45143', '#D9480F', '#E8743B',
    '#E0A100', '#6B7F1F', '#6D4C3D', '#2B2B2B',
  ];

  S.DEFAULT_THEME = {
    name: '', style: 'paper', color: '#1F5C4A', point: '', font: 'classic', contact: '', logo: null, region: '', greeting: '',
  };
})(window.Studio = window.Studio || {});

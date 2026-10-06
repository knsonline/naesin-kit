// 채팅(ChatGPT, Claude)용 프롬프트. 스튜디오 '만들기' 탭에서 학원 정보를 채워 복사한다.
(function (S) {
  S.chatPrompt = function (info) {
    const v = x => (x && String(x).trim()) || '';
    return `[학원 정보] (비어 있으면 '우리 학원'으로 씁니다)
학원 이름: ${v(info.name)}
지역: ${v(info.region)}
상담 안내: ${v(info.contact)}
첫인사: ${v(info.greeting)}

첨부한 영어 시험지로 학부모용 네이버 블로그 글과 인스타그램 카드뉴스 문구를 만들어 주세요.
아래 순서와 규칙을 지키고, 마지막에 JSON 코드 블록 하나만 출력하세요. 설명 문장은 쓰지 마세요.

## 1단계: 문항표
- 시험지의 모든 쪽을 직접 보고 문항마다 번호, 유형(시험지에 적힌 그대로: 선택형/선다형/서술형/서답형/단답형 등), 배점, 쪽, 요구, 조건(단어 수, 형태 변경 허용, 사용할 단어), 판독 상태를 적습니다.
- 배점을 읽지 못했으면 null. 빠진 번호를 만들지 않습니다. 필기된 답은 정답이 아닙니다. 이름·번호는 적지 않습니다.
- 판독 상태: confirmed(선명) / uncertain(일부 흐림) / unreadable(못 읽음). unreadable 문항은 글의 근거로 쓰지 않습니다.

## 2단계: 블로그 (절 5~8개, 공백 제외 1,300~3,000자)
1. intro: 인사(첫인사가 있으면 그대로, 없으면 "안녕하세요.") → "OO중학교 N학년 N학기 영어 OO고사를 정리했습니다." → 유형별 문항 수와 배점 → 숫자에서 나오는 의미 하나 → 이번 시험이 요구한 것 한 문장
2. feature 2~3개: 소제목 "1. (관찰 사실)". 그 문항이 실제로 시킨 것 → 학생이 판단해야 할 것
3. strategy: 문단마다 "**독해**\\n..."처럼 영역 이름을 굵게. 실제 문항 번호 → 학생이 할 행동 → 확인 기준
4. example: 대표 서술형 하나. 원문 한 문장(굵게, 별도 문단) → 문제가 시킨 것과 조건 → 답안 틀(굵게, 별도 문단) → 이미 주어진 것과 새로 판단할 것 → 판단 순서 → 연습 방법. 정답은 쓰지 않습니다.
5. closing: 필요했던 것 한두 문장 → "우리 아이가 어느 단계에서 막히는지 궁금하시다면 **○○에서 함께 확인해 보세요.**" → "다음 영어 내신 준비, **○○로 편하게 문의해 주세요.**" (○○ 자리에는 학원 이름, 없으면 '우리 학원') 상담 안내가 있으면 덧붙입니다. 가정 숙제로 끝내지 않습니다.
- 제목: "학교 학년 학기 영어 시험 분석 | 이번 시험의 한 줄" (45자 이내)
- 문단은 2~4줄, 줄은 \\n으로 25~40자에서 나눕니다. 문단마다 굵게는 한 군데만.
- 절에 image(카드 번호)를 넣으면 그 자리에 카드 이미지가 들어갑니다: intro 1, 특징 하나 3, 조건 이야기 4, example 5, closing 6.

## 3단계: 카드 6장 (칸이 작습니다. 글자 수를 지키고 \\n으로 줄을 직접 나누세요)
1. cover: kicker(시리즈 이름), title(3줄까지, 줄당 9자), intro(2줄, 줄당 25자), hero(대표 숫자 3자리까지), hero_unit(그 숫자의 뜻, 26자), takeaway(2줄, 줄당 28자)
2. composition: kicker, title(2줄, 줄당 12자), intro(2줄, 줄당 27자), stats(정확히 2개: label, count, points — 유형이 셋 이상이면 둘로 합침), total, takeaway(2줄, 줄당 26자)
3. points: kicker, title, intro, items 3개(title 19자, body 2줄·줄당 25자, "서술형 1번. ..."처럼 번호부터)
4. comparison: kicker, title, intro, items 정확히 2개(title 12자, tag 14자, body 3줄·줄당 24자), takeaway
5. excerpt: kicker, title, intro, quote_label, quote(원문 한 문장), response_label, response(답안 틀, 빈칸은 ______), note(판단 순서를 → 로, 27자), takeaway
6. closing: kicker, title, intro, items 3개(이번 시험에서 필요했던 연습, body 1줄 25자), cta(학부모 마음을 건드리는 한 줄, 26자). 학원 이름은 쓰지 않습니다(스튜디오가 넣습니다).
- 카드 제목은 이 시험의 주장 한 문장으로("서술형 5문항이\\n40점입니다"). "핵심 분석" 같은 이름표는 쓰지 않습니다.
- 각 카드와 블로그 절에 근거 문항 id(evidence_ids)를 적습니다.

## 4단계: 캡션과 해시태그
- 캡션: 무엇을 정리했는지 → 숫자 하나 → 대표 문항 하나 → 마지막 줄 "우리 아이가 어디서 막히는지 궁금하시면 {학원명}(으)로 문의해 주세요." ({학원명}(으)로 는 그대로 둡니다) 400자 안쪽.
- 해시태그 8~15개, # 없이: 학교명, 학교명영어, 중2영어 같은 학년영어, 영어내신, 시험이름, 서술형대비, 영어학원, 지역영어학원(지역이 있으면)

## 규칙
- 시험 사실은 이 시험지에서만 가져옵니다. 모든 숫자와 문항 번호는 문항표와 같아야 합니다.
- 학원 정보는 위에 적힌 것만 씁니다. 전화번호, 프로그램, 실적, 혜택을 만들지 않습니다.
- 쓰지 않는 말: 적중, 보장, 성적 향상, 상위권, 변별력, 킬러, 가장 어려운, 많이 틀린, 오답률, 평균, 등급컷, 출처, 검수, AI 작성 표시, [학원명] 같은 빈칸
- 말투: 학원 선생님이 학부모에게 직접 설명하듯 짧고 구체적으로. 첫 문장부터 숫자와 문항으로 말하고, 형용사 대신 숫자, 부사 대신 행동을 씁니다.
- 쓰지 않는 AI 말투: 살펴보겠습니다, 알아볼까요, 짚어 보겠습니다, 중요합니다, 핵심입니다, ~하는 힘, 역량, 실력 향상, 꾸준히, 꼼꼼히, 철저히, 체계적으로, 완벽하게, 효과적으로, 다양한, 한 걸음 더, 단순히 ~를 넘어, 이처럼, 결론적으로, ~뿐만 아니라, ~를 통해, ~에 있어서, ~라고 할 수 있습니다, 여러분, 놓치지 마세요, 주목해야, 줄표(—), 이모지

## 출력 형식 (이 구조 그대로, JSON 코드 블록 하나만)
{
  "version": "2.0",
  "academy": { "name": "", "region": "", "contact": "" },
  "exam": { "school": "", "grade": "", "term": "", "subject": "영어", "year": "", "source_file": "", "pages": 0 },
  "series": "OO중 N학년 N학기 OO고사 · 영어",
  "ledger": {
    "total_points": 100,
    "questions": [
      { "id": "MC-1", "kind": "선택형", "number": 1, "points": 6, "pages": [1], "task": "", "conditions": [], "confidence": "confirmed", "note": "" }
    ],
    "notes": []
  },
  "blog": {
    "title": "",
    "sections": [
      { "id": "intro", "role": "intro", "image": 1, "evidence_ids": [], "paragraphs": [""] },
      { "id": "f1", "role": "feature", "heading": "1. ", "evidence_ids": [], "paragraphs": [""] },
      { "id": "prepare", "role": "strategy", "heading": "", "evidence_ids": [], "paragraphs": [""] },
      { "id": "example", "role": "example", "heading": "대표 문항 | ", "image": 5, "evidence_ids": [], "paragraphs": [""] },
      { "id": "closing", "role": "closing", "heading": "", "image": 6, "evidence_ids": [], "paragraphs": [""] }
    ]
  },
  "cards": [
    { "layout": "cover", "kicker": "", "title": "", "intro": "", "hero": "", "hero_unit": "", "takeaway": "", "evidence_ids": [] },
    { "layout": "composition", "kicker": "시험 구성", "title": "", "intro": "", "stats": [{ "label": "", "count": 0, "points": 0 }, { "label": "", "count": 0, "points": 0 }], "total": 100, "takeaway": "", "evidence_ids": [] },
    { "layout": "points", "kicker": "", "title": "", "intro": "", "items": [{ "title": "", "body": "" }], "evidence_ids": [] },
    { "layout": "comparison", "kicker": "", "title": "", "intro": "", "items": [{ "title": "", "tag": "", "body": "" }, { "title": "", "tag": "", "body": "" }], "takeaway": "", "evidence_ids": [] },
    { "layout": "excerpt", "kicker": "", "title": "", "intro": "", "quote_label": "본문", "quote": "", "response_label": "", "response": "", "note": "", "takeaway": "", "evidence_ids": [] },
    { "layout": "closing", "kicker": "상담 안내", "title": "", "intro": "", "items": [{ "title": "", "body": "" }], "cta": "", "evidence_ids": [] }
  ],
  "caption": "",
  "hashtags": []
}`;
  };
})(window.Studio = window.Studio || {});

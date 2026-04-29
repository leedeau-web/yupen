// 부산 북구갑 유권자 목업 데이터 생성기 v2
// 출처:
//   선거인수·동별비율 - 22대 총선 중앙선거관리위원회 공개 데이터 (122,440명)
//   연령별 분포       - 부산 북구 주민등록 인구통계 (18세+ 기준)
//   지지율            - 미디어토마토 2026-04-24~25, n=802

'use strict';
const fs   = require('fs');
const path = require('path');

// ── 유틸 ─────────────────────────────────────────────────────────────────────
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickW = (items, weights) => {
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
};
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// 정확한 카운트로 슬롯 배열 생성 후 셔플
const buildSlots = (countMap) => {
  const slots = [];
  for (const [val, n] of Object.entries(countMap)) {
    for (let i = 0; i < n; i++) slots.push(val);
  }
  return shuffle(slots);
};

// ── 이름 풀 ───────────────────────────────────────────────────────────────────
const names = {
  남: {
    young: ['민준','준호','성호','재원','대현','현우','상민','성진','동현','재민',
            '태호','성민','진수','우진','지훈','건우','도윤','예준','시우','주원'],
    old:   ['영철','병수','창수','철호','만수','영호','봉수','기태','용철','태식',
            '경호','학수','덕수','판수','길동','종수','광수','정호','명수','재호'],
  },
  여: {
    young: ['지영','수연','민지','유진','현주','소희','은지','서연','지수','혜진',
            '은혜','수진','미진','지혜','나영','하은','서윤','지안','채원','수아'],
    old:   ['영숙','순희','미숙','명자','정숙','순자','복순','영자','금순','분자',
            '춘자','귀순','봉희','경순','옥순','말순','계순','분례','갑순','말례'],
  },
};
const surnames = ['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','류','전'];
const makeName = (gender, age) => {
  const pool = age >= 55 ? names[gender].old : names[gender].young;
  return pick(surnames) + pick(pool);
};

// ── 동별 지역 특성 (구포계/덕천계/만덕계) ────────────────────────────────────
const DONG_CHAR = {
  구포1동: 'gupo', 구포2동: 'gupo', 구포3동: 'gupo',
  덕천1동: 'deok', 덕천2동: 'deok', 덕천3동: 'deok',
  만덕2동: 'mand', 만덕3동: 'mand',
};

const JOBS = {
  gupo: ['자영업자','상인','배달기사','건설노동자','청소원','식당주인','편의점운영','무직','택시기사','일용직'],
  deok: ['회사원','공무원','교사','간호사','은행원','엔지니어','관리직','전문직','주부','자영업자'],
  mand: ['자영업자','청소원','경비원','생산직','가사도우미','택시기사','일용직','무직','배달기사','식당주인'],
};
const HOUSING = {
  gupo: () => pickW(['단독주택','빌라/연립','아파트','원룸/고시원'], [28, 36, 26, 10]),
  deok: () => pickW(['아파트','빌라/연립','단독주택'],               [62, 24, 14]),
  mand: () => pickW(['단독주택','빌라/연립','아파트'],               [42, 34, 24]),
};

// ── 속성 생성 함수 ────────────────────────────────────────────────────────────
const getEdu = (age) => {
  if (age >= 70) return pickW(['중졸','고졸','전문대졸','대졸'],       [28, 44, 16, 12]);
  if (age >= 60) return pickW(['중졸','고졸','전문대졸','대졸'],       [12, 44, 24, 20]);
  if (age >= 50) return pickW(['중졸','고졸','전문대졸','대졸'],       [ 5, 36, 30, 29]);
  if (age >= 40) return pickW(['고졸','전문대졸','대졸','대학원졸'],   [18, 28, 42, 12]);
  if (age >= 30) return pickW(['고졸','전문대졸','대졸','대학원졸'],   [10, 22, 50, 18]);
  return               pickW(['고졸','전문대졸','대졸','대학원졸'],   [ 7, 18, 56, 19]);
};

// 정치성향: P(성향|후보) ∝ P(후보|성향) × P(성향), 성향분포 진보28% 중도33% 보수39%
const getOrientation = (c) => pickW(
  ['진보','중도','보수'],
  { 하정우: [55, 31, 14], 한동훈: [10, 37, 53], 박민식: [ 7, 24, 69], 미정: [22, 55, 23] }[c],
);

const getIssue = (age) => {
  if (age >= 65) return pickW(['복지','안보','부동산','일자리','교육'], [35, 30, 20, 12,  3]);
  if (age >= 55) return pickW(['부동산','복지','안보','일자리','교육'], [27, 28, 18, 19,  8]);
  if (age >= 45) return pickW(['부동산','일자리','복지','교육','안보'], [30, 26, 22, 14,  8]);
  if (age >= 35) return pickW(['일자리','부동산','교육','복지','안보'], [33, 28, 22, 12,  5]);
  return               pickW(['일자리','교육','부동산','복지','안보'], [40, 30, 18,  8,  4]);
};

const getStrength = (c) => {
  if (c === '미정')   return pickW([1, 2],    [55, 45]);
  if (c === '하정우') return pickW([3, 4, 5], [18, 40, 42]);
  if (c === '한동훈') return pickW([3, 4, 5], [28, 44, 28]);
  return                     pickW([3, 4, 5], [26, 44, 30]); // 박민식
};

const getVoting = (age, str) => {
  if (age >= 65) return pickW(['반드시','아마도','모름','안할것'], [70, 22,  6,  2]);
  if (str >= 5)  return pickW(['반드시','아마도','모름','안할것'], [76, 18,  4,  2]);
  if (str >= 4)  return pickW(['반드시','아마도','모름','안할것'], [55, 33,  9,  3]);
  if (str === 3) return pickW(['반드시','아마도','모름','안할것'], [38, 38, 18,  6]);
  return                pickW(['반드시','아마도','모름','안할것'], [13, 30, 37, 20]);
};

const getPastParty = (o) => {
  if (o === '진보') return pickW(['민주당','조국혁신당','정의당','기타','없음(첫투표)'], [70, 10,  6, 10,  4]);
  if (o === '보수') return pickW(['국민의힘','개혁신당','기타','없음(첫투표)','민주당'],  [72,  8, 10,  6,  4]);
  return                  pickW(['민주당','국민의힘','개혁신당','기타','없음(첫투표)'],  [30, 30,  8, 20, 12]);
};

const getSpeech = (age) => {
  if (age >= 70) return pickW(['소극적','감정적','무관심','적극적','논리적'], [28, 34, 24, 10,  4]);
  if (age >= 60) return pickW(['감정적','소극적','적극적','무관심','논리적'], [30, 24, 24, 17,  5]);
  if (age >= 50) return pickW(['적극적','감정적','논리적','소극적','무관심'], [28, 26, 22, 15,  9]);
  if (age >= 40) return pickW(['논리적','적극적','감정적','소극적','무관심'], [30, 28, 22, 13,  7]);
  if (age >= 30) return pickW(['논리적','적극적','소극적','무관심','감정적'], [32, 28, 18, 14,  8]);
  return               pickW(['무관심','소극적','논리적','적극적','감정적'], [30, 25, 22, 15,  8]);
};

// ── ① 연령×후보 그룹 정의 (3차원 동시 분포의 핵심) ──────────────────────────
//
// 연령 분포 (부산 북구 18세+ 인구통계, 정규화 후 200명):
//   18-29세:  26명 (12.0%)
//   30-39세:  26명 (11.8%)
//   40-49세:  27명 (12.3%)
//   50-59세:  37명 (16.9%)
//   60-69세:  45명 (21.3%)
//   70세이상: 39명 (18.2%)   합계 = 200
//
// 후보 분포 (미디어토마토 여론조사):
//   하정우 71명(35.5%) 한동훈 57명(28.5%) 박민식 52명(26.0%) 미정 20명(10.0%)
//
// 연령내 후보비율 (연령대별 교차표 기반):
//   18-29: 하8  한8  박7  미3  = 26
//   30-39: 하8  한8  박7  미3  = 26
//   40-49: 하12 한5  박7  미3  = 27   (40대 하정우 44.4% 강세)
//   50-59: 하14 한9  박10 미4  = 37
//   60-69: 하17 한12 박10 미6  = 45
//   70이상: 하12 한15 박11 미1  = 39   (70대+ 한동훈 38.5% 1위)
//
const ageGroups = [
  { ageMin: 18, ageMax: 29, candidate: '하정우', count:  8 },
  { ageMin: 18, ageMax: 29, candidate: '한동훈', count:  8 },
  { ageMin: 18, ageMax: 29, candidate: '박민식', count:  7 },
  { ageMin: 18, ageMax: 29, candidate: '미정',   count:  3 },

  { ageMin: 30, ageMax: 39, candidate: '하정우', count:  8 },
  { ageMin: 30, ageMax: 39, candidate: '한동훈', count:  8 },
  { ageMin: 30, ageMax: 39, candidate: '박민식', count:  7 },
  { ageMin: 30, ageMax: 39, candidate: '미정',   count:  3 },

  { ageMin: 40, ageMax: 49, candidate: '하정우', count: 12 },
  { ageMin: 40, ageMax: 49, candidate: '한동훈', count:  5 },
  { ageMin: 40, ageMax: 49, candidate: '박민식', count:  7 },
  { ageMin: 40, ageMax: 49, candidate: '미정',   count:  3 },

  { ageMin: 50, ageMax: 59, candidate: '하정우', count: 14 },
  { ageMin: 50, ageMax: 59, candidate: '한동훈', count:  9 },
  { ageMin: 50, ageMax: 59, candidate: '박민식', count: 10 },
  { ageMin: 50, ageMax: 59, candidate: '미정',   count:  4 },

  { ageMin: 60, ageMax: 69, candidate: '하정우', count: 17 },
  { ageMin: 60, ageMax: 69, candidate: '한동훈', count: 12 },
  { ageMin: 60, ageMax: 69, candidate: '박민식', count: 10 },
  { ageMin: 60, ageMax: 69, candidate: '미정',   count:  6 },

  { ageMin: 70, ageMax: 88, candidate: '하정우', count: 12 },
  { ageMin: 70, ageMax: 88, candidate: '한동훈', count: 15 },
  { ageMin: 70, ageMax: 88, candidate: '박민식', count: 11 },
  { ageMin: 70, ageMax: 88, candidate: '미정',   count:  1 },
];

// 합계 검증
const totalAgeGroup = ageGroups.reduce((s, g) => s + g.count, 0);
if (totalAgeGroup !== 200) throw new Error(`연령×후보 합계 오류: ${totalAgeGroup} (expected 200)`);

// ── ② 동별 정확 슬롯 ─────────────────────────────────────────────────────────
// 22대 총선 선관위 공개 데이터 비율 기준 (총 122,440명)
// 최대잉여법(Largest Remainder) 적용 → 정확히 200명
//   구포1동 23.2→23  구포2동 35.2→35  구포3동 27.6→28*
//   덕천1동 18.0→18  덕천2동 17.4→17  덕천3동 15.4→16*
//   만덕2동 37.2→37  만덕3동 26.0→26   (* 잉여 상위 2개에 +1)
const dongSlots = buildSlots({
  구포1동: 23, 구포2동: 35, 구포3동: 28,
  덕천1동: 18, 덕천2동: 17, 덕천3동: 16,
  만덕2동: 37, 만덕3동: 26,
}); // 합계: 23+35+28+18+17+16+37+26 = 200

// ── ③ 성별 정확 슬롯 ─────────────────────────────────────────────────────────
// 부산 북구 선거인 성별 비율: 남 49.15%, 여 50.85%
// 남 200×0.4915 = 98.3 → 98명, 여 102명
const genderSlots = buildSlots({ 남: 98, 여: 102 });

// ── 스펙 슬롯 펼치기 + 셔플 ──────────────────────────────────────────────────
const specSlots = shuffle(
  ageGroups.flatMap(({ ageMin, ageMax, candidate, count }) =>
    Array.from({ length: count }, () => ({ ageMin, ageMax, candidate }))
  )
);

// ── 유권자 생성 ───────────────────────────────────────────────────────────────
// 세 슬롯 배열을 인덱스로 조합 → 동별/성별/연령×후보 모두 exact match
const voters = specSlots.map(({ ageMin, ageMax, candidate }, i) => {
  const dong   = dongSlots[i];
  const gender = genderSlots[i];
  const age    = randInt(ageMin, ageMax);
  const char   = DONG_CHAR[dong];
  const orient = getOrientation(candidate);
  const str    = getStrength(candidate);

  return {
    이름:         makeName(gender, age),
    성별:         gender,
    나이:         age,
    거주동:       dong,
    직업:         pick(JOBS[char]),
    학력:         getEdu(age),
    가구형태:     HOUSING[char](),
    주요관심이슈: getIssue(age),
    지지후보:     candidate,
    지지강도:     str,
    투표의향:     getVoting(age, str),
    정치성향:     orient,
    과거투표정당: getPastParty(orient),
    말투특성:     getSpeech(age),
  };
});

shuffle(voters); // 행 순서 무작위화

// ── CSV 출력 (BOM 포함 UTF-8, Excel 호환) ─────────────────────────────────────
const columns = [
  'id','이름','성별','나이','거주동','직업','학력','가구형태',
  '주요관심이슈','지지후보','지지강도','투표의향','정치성향','과거투표정당','말투특성',
];
const lines = [
  columns.join(','),
  ...voters.map((v, idx) => [
    idx + 1,
    v.이름, v.성별, v.나이, v.거주동, v.직업, v.학력, v.가구형태,
    v.주요관심이슈, v.지지후보, v.지지강도, v.투표의향,
    v.정치성향, v.과거투표정당, v.말투특성,
  ].join(',')),
];
const outPath = path.join(__dirname, 'bukgu_gap.csv');
fs.writeFileSync(outPath, '﻿' + lines.join('\n'), 'utf8');

// ── 검증 통계 ─────────────────────────────────────────────────────────────────
const cnt = (key, val) => voters.filter(v => v[key] === val).length;
const pct = (n) => (n / 2).toFixed(1) + '%';

console.log(`\n✓ ${voters.length}명 생성 완료 → ${outPath}`);
console.log('  출처: 선관위 22대 총선 + 미디어토마토 2026-04-24~25 (n=802)\n');

console.log('── 지지후보 (목표 vs 실제) ──────────────────────────────');
[['하정우',71,'35.5'],['한동훈',57,'28.5'],['박민식',52,'26.0'],['미정',20,'10.0']].forEach(([c,t,tp]) => {
  const a = cnt('지지후보', c);
  console.log(`  ${c}: ${a}명 (${pct(a)}) ← 목표 ${t}명 (${tp}%)`);
});

console.log('\n── 연령대 (목표 vs 실제) ───────────────────────────────');
[[18,29,'18-29세',26,12],[30,39,'30-39세',26,11.8],[40,49,'40-49세',27,12.3],
 [50,59,'50-59세',37,16.9],[60,69,'60-69세',45,21.3],[70,99,'70세이상',39,18.2]]
.forEach(([min,max,label,t,tp]) => {
  const a = voters.filter(v => v.나이 >= min && v.나이 <= max).length;
  console.log(`  ${label}: ${a}명 (${pct(a)}) ← 목표 ${t}명 (${tp}%)`);
});

console.log('\n── 성별 (목표 vs 실제) ─────────────────────────────────');
[['남',98,'49.15'],['여',102,'50.85']].forEach(([g,t,tp]) => {
  const a = cnt('성별', g);
  console.log(`  ${g}: ${a}명 (${pct(a)}) ← 목표 ${t}명 (${tp}%)`);
});

console.log('\n── 거주동 (목표 vs 실제) ───────────────────────────────');
[['구포1동',23,11.6],['구포2동',35,17.6],['구포3동',28,13.8],
 ['덕천1동',18, 9.0],['덕천2동',17, 8.7],['덕천3동',16, 7.7],
 ['만덕2동',37,18.6],['만덕3동',26,13.0]]
.forEach(([d,t,tp]) => {
  const a = cnt('거주동', d);
  console.log(`  ${d}: ${a}명 (${pct(a)}) ← 목표 ${t}명 (${tp}%)`);
});

console.log('\n── 정치성향 ─────────────────────────────────────────────');
['진보','중도','보수'].forEach(o => console.log(`  ${o}: ${cnt('정치성향',o)}명 (${pct(cnt('정치성향',o))})`));

console.log('\n── 말투특성 ─────────────────────────────────────────────');
['적극적','소극적','감정적','논리적','무관심'].forEach(s => console.log(`  ${s}: ${cnt('말투특성',s)}명 (${pct(cnt('말투특성',s))})`));

console.log('\n── 투표의향 ─────────────────────────────────────────────');
['반드시','아마도','모름','안할것'].forEach(v => console.log(`  ${v}: ${cnt('투표의향',v)}명 (${pct(cnt('투표의향',v))})`));

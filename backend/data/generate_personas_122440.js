// generate_personas_122440.js
// 부산 북구갑 유권자 122,440명 페르소나 생성기
// 기준: 1~8차 가중평균 (최신: KBS부산/한국리서치 8차 2026-05-08~10)
// 가중공식: 조사방법×표본크기×응답률×최신성
// 차수별 비중: 1차3.6% / 2차10.5% / 3차8.1% / 4차15.5% / 5차9.3% / 6차17.0% / 7차21.6% / 8차14.4%
'use strict';

const path = require('path');
const Database = require('better-sqlite3');

const TOTAL       = 122440;
const DB_PATH     = path.join(__dirname, 'personas.db');
const POLL_VERSION = 8;
const LAST_UPDATED = '2026-05-13';

// ── 유틸 ──────────────────────────────────────────────────────────────────────
const pick      = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickW     = (items, weights) => {
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
};
const randInt   = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const randFloat = (min, max) => +(min + Math.random() * (max - min)).toFixed(4);

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

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
const makeName  = (gender, age) => {
  const pool = age >= 55 ? names[gender].old : names[gender].young;
  return pick(surnames) + pick(pool);
};

// ── 동별 특성 ─────────────────────────────────────────────────────────────────
const DONG_AREA = {
  구포1동: '구포', 구포2동: '구포', 구포3동: '구포',
  덕천1동: '덕천', 덕천2동: '덕천', 덕천3동: '덕천',
  만덕2동: '만덕', 만덕3동: '만덕',
};
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
  if (age >= 70) return pickW(['중졸','고졸','전문대졸','대졸'],     [28, 44, 16, 12]);
  if (age >= 60) return pickW(['중졸','고졸','전문대졸','대졸'],     [12, 44, 24, 20]);
  if (age >= 50) return pickW(['중졸','고졸','전문대졸','대졸'],     [ 5, 36, 30, 29]);
  if (age >= 40) return pickW(['고졸','전문대졸','대졸','대학원졸'], [18, 28, 42, 12]);
  if (age >= 30) return pickW(['고졸','전문대졸','대졸','대학원졸'], [10, 22, 50, 18]);
  return               pickW(['고졸','전문대졸','대졸','대학원졸'], [ 7, 18, 56, 19]);
};

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
  return                     pickW([3, 4, 5], [26, 44, 30]);
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

// ── 신규 컬럼 생성 함수 ───────────────────────────────────────────────────────
const getVolatility = (candidate, strength) => {
  if (candidate === '미정') return randFloat(0.70, 1.00);
  if (strength <= 3)        return randFloat(0.40, 0.70);
  return                           randFloat(0.00, 0.30);
};

const getApprovalLJM = (orientation) => {
  if (orientation === '진보') return randFloat(0.85, 0.98);
  if (orientation === '중도') return randFloat(0.60, 0.75);
  return                             randFloat(0.25, 0.45);
};

const getBusanMayorPref = (candidate) => {
  // 전체 목표: 전재수 51% / 박형준 31% / 미정 18%
  if (candidate === '하정우')  return pickW(['전재수', '박형준', '미정'], [85, 5,  10]);
  if (candidate === '한동훈')  return pickW(['전재수', '박형준', '미정'], [30, 48, 22]);
  if (candidate === '박민식')  return pickW(['전재수', '박형준', '미정'], [23, 56, 21]);
  return                              pickW(['전재수', '박형준', '미정'], [55, 20, 25]); // 미정
};

// ── ① 연령×후보 그룹 (1~8차 가중평균, 합계 122,440) ─────────────
//
// 가중공식: 조사방법×표본크기×응답률×최신성
// 점수: 1차17 / 2차49 / 3차37 / 4차71 / 5차43 / 6차79 / 7차100 / 8차67
// 비중: 1차3.6% / 2차10.5% / 3차8.1% / 4차15.5% / 5차9.3% / 6차17.0% / 7차21.6% / 8차14.4%
//
// 연령 분포 (generate_bukgu.js 기준: 130/130/135/185/225/195 × 122440/1000):
//   18-29세: 15,917명  30대: 15,917명  40대: 16,529명
//   50대: 22,651명    60대: 27,549명   70+: 23,877명
//
// 후보 분포 (1~8차 가중평균):
//   하정우 44,589명(36.4%)  한동훈 31,636명(25.8%)  박민식 29,421명(24.0%)  미정 16,794명(13.7%)
//
const ageGroups = [
  // 18-29 (total: 15,917) — 가중평균: 하27.6 한25.4 박23.1 미23.9
  { ageMin: 18, ageMax: 29, candidate: '하정우', count: 4388 },
  { ageMin: 18, ageMax: 29, candidate: '한동훈', count: 4042 },
  { ageMin: 18, ageMax: 29, candidate: '박민식', count: 3680 },
  { ageMin: 18, ageMax: 29, candidate: '미정',    count: 3807 },

  // 30대 (total: 15,917) — 가중평균: 하25.9 한25.7 박27.3 미21.0
  { ageMin: 30, ageMax: 39, candidate: '하정우', count: 4130 },
  { ageMin: 30, ageMax: 39, candidate: '한동훈', count: 4095 },
  { ageMin: 30, ageMax: 39, candidate: '박민식', count: 4342 },
  { ageMin: 30, ageMax: 39, candidate: '미정',    count: 3350 },

  // 40대 (total: 16,529) — 가중평균: 하53.2 한17.5 박18.1 미11.2
  { ageMin: 40, ageMax: 49, candidate: '하정우', count: 8791 },
  { ageMin: 40, ageMax: 49, candidate: '한동훈', count: 2898 },
  { ageMin: 40, ageMax: 49, candidate: '박민식', count: 2987 },
  { ageMin: 40, ageMax: 49, candidate: '미정',    count: 1853 },

  // 50대 (total: 22,651) — 가중평균: 하45.7 한22.7 박22.6 미8.9
  { ageMin: 50, ageMax: 59, candidate: '하정우', count: 10350 },
  { ageMin: 50, ageMax: 59, candidate: '한동훈', count: 5147 },
  { ageMin: 50, ageMax: 59, candidate: '박민식', count: 5128 },
  { ageMin: 50, ageMax: 59, candidate: '미정',    count: 2026 },

  // 60대 (total: 27,549) — 가중평균: 하38.5 한28.1 박22.7 미10.8
  { ageMin: 60, ageMax: 69, candidate: '하정우', count: 10601 },
  { ageMin: 60, ageMax: 69, candidate: '한동훈', count: 7737 },
  { ageMin: 60, ageMax: 69, candidate: '박민식', count: 6241 },
  { ageMin: 60, ageMax: 69, candidate: '미정',    count: 2970 },

  // 70대+ (total: 23,877) — 가중평균: 하26.5 한32.3 박29.5 미11.7
  { ageMin: 70, ageMax: 88, candidate: '하정우', count: 6329 },
  { ageMin: 70, ageMax: 88, candidate: '한동훈', count: 7717 },
  { ageMin: 70, ageMax: 88, candidate: '박민식', count: 7043 },
  { ageMin: 70, ageMax: 88, candidate: '미정',    count: 2788 },
];

// ── ② 동별 슬롯 (22대 총선 선관위 비율 × 122,440) ───────────────────────────
//   구포1동 116/1000 = 14,203  구포2동 176/1000 = 21,549  구포3동 138/1000 = 16,897
//   덕천1동  90/1000 = 11,020  덕천2동  87/1000 = 10,652  덕천3동  77/1000 =  9,428
//   만덕2동 186/1000 = 22,774  만덕3동 = 나머지 = 15,917
const dongSlots = buildSlots({
  구포1동: 14203, 구포2동: 21549, 구포3동: 16897,
  덕천1동: 11020, 덕천2동: 10652, 덕천3동:  9428,
  만덕2동: 22774, 만덕3동: 15917,
});
if (dongSlots.length !== TOTAL) throw new Error(`동 슬롯 합계 오류: ${dongSlots.length}`);

// ── ③ 성별 슬롯 (남 49.2% / 여 50.8%) ──────────────────────────────────────
const genderSlots = buildSlots({ 남: 60240, 여: 62200 });
if (genderSlots.length !== TOTAL) throw new Error(`성별 슬롯 합계 오류: ${genderSlots.length}`);

// ── ④ 연령×후보 스펙 슬롯 펼치기 + 셔플 ─────────────────────────────────────
const specSlots = shuffle(
  ageGroups.flatMap(({ ageMin, ageMax, candidate, count }) =>
    Array.from({ length: count }, () => ({ ageMin, ageMax, candidate }))
  )
);

// ── DB 초기화 ─────────────────────────────────────────────────────────────────
if (require('fs').existsSync(DB_PATH)) require('fs').unlinkSync(DB_PATH);
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE voters (
    id               INTEGER PRIMARY KEY,
    이름             TEXT    NOT NULL,
    성별             TEXT    NOT NULL,
    나이             INTEGER NOT NULL,
    거주동           TEXT    NOT NULL,
    dong_area        TEXT    NOT NULL,
    직업             TEXT    NOT NULL,
    학력             TEXT    NOT NULL,
    가구형태         TEXT    NOT NULL,
    주요관심이슈     TEXT    NOT NULL,
    지지후보         TEXT    NOT NULL,
    지지강도         INTEGER NOT NULL,
    투표의향         TEXT    NOT NULL,
    정치성향         TEXT    NOT NULL,
    과거투표정당     TEXT    NOT NULL,
    말투특성         TEXT    NOT NULL,
    volatility       REAL    NOT NULL,
    approval_LJM     REAL    NOT NULL,
    busan_mayor_pref TEXT    NOT NULL,
    poll_version     INTEGER NOT NULL,
    last_updated     TEXT    NOT NULL
  );
  CREATE INDEX idx_dong        ON voters(거주동);
  CREATE INDEX idx_dong_area   ON voters(dong_area);
  CREATE INDEX idx_orientation ON voters(정치성향);
  CREATE INDEX idx_candidate   ON voters(지지후보);
  CREATE INDEX idx_poll        ON voters(poll_version);
  CREATE INDEX idx_volatility  ON voters(volatility DESC);
`);

const insertStmt = db.prepare(`
  INSERT INTO voters VALUES (
    ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
  )
`);

const insertBatch = db.transaction((rows) => {
  for (const r of rows) insertStmt.run(r);
});

// ── 유권자 생성 및 배치 삽입 ─────────────────────────────────────────────────
console.log(`\n유펜 페르소나 DB 생성 시작 (${TOTAL.toLocaleString()}명)...\n`);
const startTime = Date.now();
const BATCH = 5000;
let batch = [];

for (let i = 0; i < TOTAL; i++) {
  const { ageMin, ageMax, candidate } = specSlots[i];
  const dong    = dongSlots[i];
  const gender  = genderSlots[i];
  const age     = randInt(ageMin, ageMax);
  const char    = DONG_CHAR[dong];
  const orient  = getOrientation(candidate);
  const str     = getStrength(candidate);

  batch.push([
    i + 1,
    makeName(gender, age),
    gender,
    age,
    dong,
    DONG_AREA[dong],
    pick(JOBS[char]),
    getEdu(age),
    HOUSING[char](),
    getIssue(age),
    candidate,
    str,
    getVoting(age, str),
    orient,
    getPastParty(orient),
    getSpeech(age),
    getVolatility(candidate, str),
    getApprovalLJM(orient),
    getBusanMayorPref(candidate),
    POLL_VERSION,
    LAST_UPDATED,
  ]);

  if (batch.length === BATCH) {
    insertBatch(batch);
    batch = [];
    process.stdout.write(`\r  진행: ${(i + 1).toLocaleString()} / ${TOTAL.toLocaleString()} (${Math.round((i+1)/TOTAL*100)}%)`);
  }
}
if (batch.length > 0) {
  insertBatch(batch);
}
process.stdout.write(`\r  진행: ${TOTAL.toLocaleString()} / ${TOTAL.toLocaleString()} (100%)\n\n`);

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`✓ ${TOTAL.toLocaleString()}명 생성 완료 → ${DB_PATH}`);
console.log(`  소요시간: ${elapsed}초  |  poll_version: ${POLL_VERSION}  |  last_updated: ${LAST_UPDATED}\n`);

// ── 검증 통계 출력 ────────────────────────────────────────────────────────────
const pct = (n, total) => `${(n / total * 100).toFixed(1)}%`;

console.log('── 지지후보 (목표 vs 실제) ──────────────────────────────────────');
[
  ['하정우', 44589, '36.4'], ['한동훈', 31636, '25.8'], ['박민식', 29421, '24.0'], ['미정', 16794, '13.7'],
].forEach(([c, t, tp]) => {
  const a = db.prepare('SELECT COUNT(*) as n FROM voters WHERE 지지후보=?').get(c).n;
  console.log(`  ${c}: ${a.toLocaleString()}명 (${pct(a, TOTAL)}) ← 목표 ${t.toLocaleString()}명 (${tp}%)`);
});

console.log('\n── 연령대 분포 ──────────────────────────────────────────────────');
[[18,29,'18-29세'],[30,39,'30대'],[40,49,'40대'],
 [50,59,'50대'],[60,69,'60대'],[70,99,'70대+']]
.forEach(([min, max, label]) => {
  const a = db.prepare('SELECT COUNT(*) as n FROM voters WHERE 나이>=? AND 나이<=?').get(min, max).n;
  console.log(`  ${label}: ${a.toLocaleString()}명 (${pct(a, TOTAL)})`);
});

console.log('\n── 거주동별 인원 ────────────────────────────────────────────────');
for (const row of db.prepare('SELECT 거주동, COUNT(*) as n FROM voters GROUP BY 거주동 ORDER BY 거주동').all()) {
  console.log(`  ${row.거주동}: ${row.n.toLocaleString()}명 (${pct(row.n, TOTAL)})`);
}

console.log('\n── 권역별 인원 ──────────────────────────────────────────────────');
for (const row of db.prepare('SELECT dong_area, COUNT(*) as n FROM voters GROUP BY dong_area').all()) {
  console.log(`  ${row.dong_area}권: ${row.n.toLocaleString()}명 (${pct(row.n, TOTAL)})`);
}

console.log('\n── 평균 volatility ──────────────────────────────────────────────');
const vols = db.prepare(`
  SELECT 지지후보, ROUND(AVG(volatility),3) as avg_v
  FROM voters GROUP BY 지지후보
`).all();
for (const r of vols) {
  console.log(`  ${r.지지후보}: ${r.avg_v}`);
}
const overall = db.prepare('SELECT ROUND(AVG(volatility),3) as avg_v FROM voters').get();
console.log(`  전체 평균: ${overall.avg_v}`);

console.log('\n── 부산시장 선호 ────────────────────────────────────────────────');
for (const row of db.prepare('SELECT busan_mayor_pref, COUNT(*) as n FROM voters GROUP BY busan_mayor_pref').all()) {
  console.log(`  ${row.busan_mayor_pref}: ${row.n.toLocaleString()}명 (${pct(row.n, TOTAL)})`);
}

console.log('\n── 이재명 지지도 (approval_LJM 평균) ───────────────────────────');
const ljm = db.prepare(`
  SELECT 정치성향, ROUND(AVG(approval_LJM),3) as avg_ljm
  FROM voters GROUP BY 정치성향
`).all();
for (const r of ljm) {
  console.log(`  ${r.정치성향}: ${r.avg_ljm}`);
}

db.close();
console.log(`\n✓ 완료. DB 파일: ${DB_PATH}\n`);

// ── updateFromPoll 함수 (외부 호출용) ────────────────────────────────────────
/**
 * 새 여론조사 데이터를 DB에 반영한다.
 * @param {Database} db  - better-sqlite3 DB 인스턴스
 * @param {Object} pollData - { version, date, results: { overall, byAge, byDong } }
 * @returns {{ changed: number, from_to: Object }}
 */
function updateFromPoll(db, pollData) {
  const { version, date, results } = pollData;
  const total = db.prepare('SELECT COUNT(*) as n FROM voters').get().n;

  // 1. 현재 후보별 인원
  const currentRows = db.prepare('SELECT 지지후보, COUNT(*) as n FROM voters GROUP BY 지지후보').all();
  const current = {};
  for (const r of currentRows) current[r.지지후보] = r.n;

  // 2. 목표 인원 계산
  const CANDS = ['하정우', '한동훈', '박민식', '미정'];
  const target = {};
  let targetSum = 0;
  for (const c of CANDS) {
    target[c] = Math.round(total * (results.overall[c] || 0) / 100);
    targetSum += target[c];
  }
  // 반올림 오차 보정 → 마지막 항목에 추가
  target['미정'] += (total - targetSum);

  // 3. delta 계산
  const delta = {};
  for (const c of CANDS) delta[c] = target[c] - (current[c] || 0);

  const losers  = CANDS.filter(c => delta[c] < 0).sort((a, b) => delta[a] - delta[b]);
  const gainers = CANDS.filter(c => delta[c] > 0).sort((a, b) => delta[b] - delta[a]);

  if (losers.length === 0 || gainers.length === 0) {
    return { changed: 0, message: '변경 불필요 — 목표치와 현재치 동일' };
  }

  // 4. volatility 높은 순으로 switcher 선택 및 변경
  const updateStmt = db.prepare(
    'UPDATE voters SET 지지후보=?, poll_version=?, last_updated=? WHERE id=?'
  );
  const fromTo = {};
  let totalChanged = 0;

  db.transaction(() => {
    for (const loser of losers) {
      let needed = -delta[loser];
      const switchers = db.prepare(`
        SELECT id FROM voters
        WHERE 지지후보=?
        ORDER BY volatility DESC
        LIMIT ?
      `).all(loser, needed);

      // gainers에 delta 비례 배분
      let gIdx = 0;
      let gRemain = gainers[gIdx] ? delta[gainers[gIdx]] : 0;

      for (const s of switchers) {
        while (gRemain <= 0 && gIdx < gainers.length - 1) {
          gIdx++;
          gRemain = delta[gainers[gIdx]];
        }
        const newCand = gainers[gIdx];
        updateStmt.run(newCand, version, date, s.id);
        gRemain--;
        const key = `${loser}→${newCand}`;
        fromTo[key] = (fromTo[key] || 0) + 1;
        totalChanged++;
      }
    }

    // 5. poll_version 전체 갱신
    db.prepare('UPDATE voters SET poll_version=?, last_updated=?').run(version, date);
  })();

  return {
    changed: totalChanged,
    from_to: fromTo,
    new_version: version,
    updated_at: date,
  };
}

module.exports = { updateFromPoll };

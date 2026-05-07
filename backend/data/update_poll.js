// update_poll.js
// polls.json → 선형 가중치 자동계산 → ageGroups count 산출
// → generate_personas_122440.js 자동 패치 → node 실행
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const POLLS_PATH = path.join(__dirname, 'polls.json');
const GEN_PATH   = path.join(__dirname, 'generate_personas_122440.js');
const TODAY      = new Date().toISOString().slice(0, 10);
const TOTAL      = 122440;
const CANDS      = ['하정우', '한동훈', '박민식', '미정'];

// ── 연령 키 → ageMin/ageMax 변환 ─────────────────────────────────────────────
function getAgeRange(key) {
  if (key === '18-29') return { ageMin: 18, ageMax: 29 };
  if (key === '70대+') return { ageMin: 70, ageMax: 88 };
  const decade = parseInt(key);
  return { ageMin: decade, ageMax: decade + 9 };
}

// ── 1. polls.json 로드 ────────────────────────────────────────────────────────
const { surveys, agePops } = JSON.parse(fs.readFileSync(POLLS_PATH, 'utf8'));
const N       = surveys.length;
const AGE_KEYS = Object.keys(agePops);

// ── 2. 선형 가중치 계산 (1차=1, 2차=2, ..., N차=N) ──────────────────────────
const rawW  = surveys.map((_, i) => i + 1);
const wSum  = rawW.reduce((a, b) => a + b, 0);
const weights = rawW.map(w => w / wSum);

// 표시용 정수 퍼센트 (합계=100 보정)
const wPctRaw = weights.map(w => Math.round(w * 100));
const wPctSum = wPctRaw.reduce((a, b) => a + b, 0);
if (wPctSum !== 100) wPctRaw[N - 1] += (100 - wPctSum);
const weightLabel = surveys.map((s, i) => `${s.id}차 ${wPctRaw[i]}%`).join(' / ');

console.log(`\n── 조사 수: ${N}차  적용 가중치 ─────────────────────────────────────────────`);
surveys.forEach((s, i) =>
  console.log(`  ${s.id}차 ${s.source} (${s.period}, n=${s.n}): ${(weights[i]*100).toFixed(2)}%`)
);

// ── 3. 연령×후보 가중평균 산출 ────────────────────────────────────────────────
const weightedPct = {};
for (const age of AGE_KEYS) {
  weightedPct[age] = {};
  for (const c of CANDS) {
    weightedPct[age][c] = surveys.reduce((sum, s, i) => {
      const v = s.byAge[age]?.[c];
      if (v == null) throw new Error(`polls.json에 [${s.id}차][${age}][${c}] 누락`);
      return sum + weights[i] * v;
    }, 0);
  }
  // 각 연령 합계를 100%로 정규화
  const tot = CANDS.reduce((s, c) => s + weightedPct[age][c], 0);
  for (const c of CANDS) weightedPct[age][c] = (weightedPct[age][c] / tot) * 100;
}

// ── 4. count 산출 (첫 3후보 반올림, 미정=나머지) ─────────────────────────────
const ageGroupRows = [];
const summary = {};
for (const c of CANDS) summary[c] = 0;

for (const ageKey of AGE_KEYS) {
  const pop             = agePops[ageKey];
  const { ageMin, ageMax } = getAgeRange(ageKey);
  const pcts            = weightedPct[ageKey];
  let used = 0;
  const counts = {};
  for (const c of CANDS.slice(0, -1)) {
    counts[c] = Math.round(pcts[c] / 100 * pop);
    used += counts[c];
  }
  counts['미정'] = pop - used;
  for (const c of CANDS) {
    ageGroupRows.push({ ageMin, ageMax, candidate: c, count: counts[c] });
    summary[c] += counts[c];
  }
}

const grandTotal = ageGroupRows.reduce((s, r) => s + r.count, 0);
if (grandTotal !== TOTAL) throw new Error(`합계 오류: ${grandTotal} (expected ${TOTAL})`);

console.log('\n── 후보별 분포 ─────────────────────────────────────────────────────────');
const pct = (n) => (n / TOTAL * 100).toFixed(1);
for (const c of CANDS) {
  console.log(`  ${c}: ${summary[c].toLocaleString()}명 (${pct(summary[c])}%)`);
}

// ── 5. 코드 생성 헬퍼 ─────────────────────────────────────────────────────────
function buildAgeGroupsBlock() {
  const ageLabels = {
    '18-29': '18-29세', '30대': '30대', '40대': '40대',
    '50대': '50대',     '60대': '60대', '70대+': '70대+',
  };
  const lines = [
    `// ── ① 연령×후보 그룹 (1~${N}차 가중평균, 합계 122,440) ─────────────────────────`,
    `//${' '}`,
    `// 가중치: ${weightLabel}`,
    `//${' '}`,
    `// 연령 분포 (generate_bukgu.js 기준: 130/130/135/185/225/195 × 122440/1000):`,
    `//   18-29세: 15,917명  30대: 15,917명  40대: 16,529명`,
    `//   50대: 22,651명    60대: 27,549명   70+: 23,877명`,
    `//${' '}`,
    `// 후보 분포 (1~${N}차 가중평균):`,
    `//   하정우 ${summary['하정우'].toLocaleString()}명(${pct(summary['하정우'])}%)  한동훈 ${summary['한동훈'].toLocaleString()}명(${pct(summary['한동훈'])}%)`,
    `//   박민식 ${summary['박민식'].toLocaleString()}명(${pct(summary['박민식'])}%)  미정   ${summary['미정'].toLocaleString()}명(${pct(summary['미정'])}%)`,
    `//${' '}`,
    `const ageGroups = [`,
  ];

  for (const ageKey of AGE_KEYS) {
    const pop   = agePops[ageKey];
    const wPcts = weightedPct[ageKey];
    const label = ageLabels[ageKey];
    const sub   = CANDS.map(c => `${c === '미정' ? '미' : c.slice(-2)}${wPcts[c].toFixed(1)}`).join(' ');
    const { ageMin, ageMax } = getAgeRange(ageKey);

    lines.push(`  // ${label} (total: ${pop.toLocaleString()}) — 가중평균: 하${wPcts['하정우'].toFixed(1)} 한${wPcts['한동훈'].toFixed(1)} 박${wPcts['박민식'].toFixed(1)} 미${wPcts['미정'].toFixed(1)}`);

    const grp = ageGroupRows.filter(r => r.ageMin === ageMin && r.ageMax === ageMax);
    for (const row of grp) {
      const pad = row.candidate === '미정' ? '   ' : '';
      lines.push(`  { ageMin: ${ageMin}, ageMax: ${ageMax}, candidate: '${row.candidate}',${pad} count: ${row.count} },`);
    }
    lines.push('');
  }
  // 마지막 빈 줄 제거
  if (lines[lines.length - 1] === '') lines.pop();
  lines.push(`];\n\nconst totalCheck = ageGroups.reduce((s, g) => s + g.count, 0);`);
  return lines.join('\n');
}

function buildValidationArray() {
  const rows = CANDS.map(c => {
    const pad = c === '미정' ? '   ' : '';
    return `['${c}', ${pad}${summary[c]}, '${pct(summary[c])}']`;
  });
  return `[\n  ${rows[0]}, ${rows[1]},\n  ${rows[2]}, ${rows[3]},\n]`;
}

// ── 6. generate_personas_122440.js 패치 ───────────────────────────────────────
let src = fs.readFileSync(GEN_PATH, 'utf8');

// 6-1. 단순 단일행 치환
src = src.replace(/const POLL_VERSION = \d+;/, `const POLL_VERSION = ${N};`);
src = src.replace(/const LAST_UPDATED = '[^']+';/, `const LAST_UPDATED = '${TODAY}';`);
src = src.replace(
  /\/\/ 기준: .+/,
  `// 기준: 1~${N}차 가중평균 (최신: ${surveys[N-1].source} ${N}차 ${surveys[N-1].period})`
);

// 6-2. ageGroups 블록 치환 (마커 기반)
const AG_START = '// ── ① 연령×후보 그룹';
const AG_END   = '\nif (totalCheck !== TOTAL)';
const agStart  = src.indexOf(AG_START);
const agEnd    = src.indexOf(AG_END);
if (agStart === -1 || agEnd === -1) throw new Error('ageGroups 블록 마커를 찾을 수 없습니다.');
src = src.slice(0, agStart) + buildAgeGroupsBlock() + src.slice(agEnd);

// 6-3. 검증 출력 배열 치환
const VAL_END   = '].forEach(([c, t, tp]) => {';
const valEndIdx = src.indexOf(VAL_END);
if (valEndIdx === -1) throw new Error('검증 배열 마커를 찾을 수 없습니다.');
const valStartIdx = src.lastIndexOf('\n[', valEndIdx) + 1; // '\n[' 다음 '['부터
src = src.slice(0, valStartIdx) + buildValidationArray() + src.slice(valEndIdx + 1);

fs.writeFileSync(GEN_PATH, src, 'utf8');
console.log(`\n✓ ${GEN_PATH} 패치 완료 (POLL_VERSION=${N}, LAST_UPDATED=${TODAY})`);

// ── 7. DB 재생성 실행 ─────────────────────────────────────────────────────────
console.log('\n── DB 재생성 시작 ───────────────────────────────────────────────────────\n');
execSync(`node "${GEN_PATH}"`, { stdio: 'inherit', cwd: __dirname });

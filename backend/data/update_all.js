'use strict';
/**
 * update_all.js — polls.json 기반 자동 업데이트
 *
 * 실행: node backend/data/update_all.js
 *
 * 처리 순서:
 *   [1/3] personas.db 재생성 (generate_personas_122440.js 패치 → 실행)
 *   [2/3] AboutTab.jsx POLL_WEIGHTS + 가중평균 테이블 + 메타 업데이트
 *   [3/3] context.md 최신 차수 요약 append (미수록 시에만)
 */

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ── 경로 ─────────────────────────────────────────────────────────────────────
const BASE   = __dirname;
const ROOT   = path.resolve(BASE, '../..');
const POLLS  = path.join(BASE, 'polls.json');
const CTX_MD = path.join(BASE, 'context_polls.md');
const GEN_JS = path.join(BASE, 'generate_personas_122440.js');
const ABOUT  = path.join(ROOT, 'frontend/src/components/AboutTab.jsx');

// ── 상수 ─────────────────────────────────────────────────────────────────────
const TOTAL      = 122440;
const AGE_ORDER  = ['18-29', '30대', '40대', '50대', '60대', '70대+'];
const CANDS      = ['하정우', '한동훈', '박민식', '미정'];
const AGE_RANGES = {
  '18-29': [18, 29], '30대': [30, 39], '40대': [40, 49],
  '50대':  [50, 59], '60대': [60, 69], '70대+': [70, 88],
};
const AGE_LABEL = {
  '18-29': '18~29세', '30대': '30대', '40대': '40대',
  '50대': '50대',     '60대': '60대', '70대+': '70대+',
};

// ── 로거 ─────────────────────────────────────────────────────────────────────
const log  = (s) => console.log(`    ${s}`);
const ok   = (s) => console.log(`  ✓ ${s}`);
const fail = (s) => { console.error(`\n  ✗ ${s}\n`); process.exit(1); };

// ═════════════════════════════════════════════════════════════════════════════
// 공통 계산
// ═════════════════════════════════════════════════════════════════════════════

/** responseRate: surveys[i].responseRate 우선, 없으면 note 파싱 */
function getResponseRate(s) {
  if (s.responseRate != null) return Number(s.responseRate);
  const m = String(s.note ?? '').match(/응답률\s*([\d.]+)/);
  if (m) return parseFloat(m[1]);
  return null;
}

/** 가중치 계산: { mW, sW, rr, rrW, tW, raw, score, pct } */
function calcWeights(surveys) {
  const raws = surveys.map((s) => {
    const mW  = /면접/.test(s.method) ? 1.5 : 1.0;
    const sW  = s.n >= 800 ? 1.3 : s.n >= 500 ? 1.0 : 0.8;
    const rr  = getResponseRate(s);
    if (rr === null) {
      fail(
        `${s.source} (${s.id}차): responseRate 없음\n` +
        `    polls.json surveys[${s.id - 1}]에 "responseRate": X.X 추가 필요`
      );
    }
    const rrW = rr >= 15 ? 1.4 : rr >= 8 ? 1.1 : rr >= 5 ? 0.9 : 0.7;
    const [, mo, dy] = s.period.split('~')[0].split('-').map(Number);
    const tW  = mo >= 5 ? 1.4 : (mo === 4 && dy >= 24) ? 1.0 : 0.7;
    return { mW, sW, rr, rrW, tW, raw: +(mW * sW * rrW * tW).toFixed(4) };
  });

  const maxRaw  = Math.max(...raws.map((r) => r.raw));
  const totalRaw = raws.reduce((s, r) => s + r.raw, 0);
  return raws.map((r) => ({
    ...r,
    score: Math.round((r.raw / maxRaw) * 100),
    pct:   r.raw / totalRaw,
  }));
}

/** 1~N차 가중평균 byAge */
function calcWeightedAvg(surveys, weights) {
  const totalRaw = weights.reduce((s, w) => s + w.raw, 0);
  const wavg = {};
  for (const ag of AGE_ORDER) {
    const raw = {};
    for (const c of CANDS) {
      raw[c] = surveys.reduce(
        (s, sv, i) => s + weights[i].raw * (sv.byAge[ag]?.[c] ?? 0), 0
      ) / totalRaw;
    }
    const rowSum = Object.values(raw).reduce((a, b) => a + b, 0) || 1;
    wavg[ag] = Object.fromEntries(CANDS.map((c) => [c, (raw[c] / rowSum) * 100]));
  }
  return wavg;
}

/** 가중평균 → ageGroups count 배열 */
function calcCounts(wavg, agePops) {
  const groups = [];
  for (const ag of AGE_ORDER) {
    const pop = agePops[ag];
    const [ageMin, ageMax] = AGE_RANGES[ag];
    let rem = pop;
    for (const c of CANDS.slice(0, -1)) {
      const cnt = Math.round(pop * wavg[ag][c] / 100);
      groups.push({ ageMin, ageMax, candidate: c, count: cnt });
      rem -= cnt;
    }
    groups.push({ ageMin, ageMax, candidate: '미정', count: rem });
  }
  return groups;
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 1: generate_personas_122440.js 패치 + node 실행
// ═════════════════════════════════════════════════════════════════════════════

function step1(surveys, weights, wavg, groups, agePops) {
  console.log('\n[1/3] personas.db 재생성');

  const n       = surveys.length;
  const latest  = surveys[n - 1];
  const today   = new Date().toISOString().slice(0, 10);
  const maxRaw  = Math.max(...weights.map((w) => w.raw));
  const totalRaw = weights.reduce((s, w) => s + w.raw, 0);

  // 후보별 전체 합계
  const byC = {};
  for (const c of CANDS) {
    byC[c] = groups.filter((g) => g.candidate === c).reduce((s, g) => s + g.count, 0);
  }

  // 비중 문자열
  const pctStr   = weights.map((w, i) => `${surveys[i].id}차${(w.pct * 100).toFixed(1)}%`).join(' / ');
  const scoreStr = weights.map((w, i) => `${surveys[i].id}차${w.score}`).join(' / ');

  // ── ageGroups 블록 생성 ──────────────────────────────────────────────────
  const lines = [];
  lines.push(`// ── ① 연령×후보 그룹 (1~${n}차 가중평균, 합계 ${TOTAL.toLocaleString()}) ${'─'.repeat(13)}`);
  lines.push('//');
  lines.push('// 가중공식: 조사방법×표본크기×응답률×최신성');
  lines.push(`// 점수: ${scoreStr}`);
  lines.push(`// 비중: ${pctStr}`);
  lines.push('//');
  lines.push('// 연령 분포 (generate_bukgu.js 기준: 130/130/135/185/225/195 × 122440/1000):');
  lines.push(`//   18-29세: ${agePops['18-29'].toLocaleString()}명  30대: ${agePops['30대'].toLocaleString()}명  40대: ${agePops['40대'].toLocaleString()}명`);
  lines.push(`//   50대: ${agePops['50대'].toLocaleString()}명    60대: ${agePops['60대'].toLocaleString()}명   70+: ${agePops['70대+'].toLocaleString()}명`);
  lines.push('//');
  lines.push(`// 후보 분포 (1~${n}차 가중평균):`);
  lines.push('//   ' + CANDS.map((c) => `${c} ${byC[c].toLocaleString()}명(${(byC[c] / TOTAL * 100).toFixed(1)}%)`).join('  '));
  lines.push('//');
  lines.push('const ageGroups = [');

  for (const ag of AGE_ORDER) {
    const [ageMin, ageMax] = AGE_RANGES[ag];
    const p = wavg[ag];
    lines.push(
      `  // ${ag} (total: ${agePops[ag].toLocaleString()}) — 가중평균:` +
      ` 하${p['하정우'].toFixed(1)} 한${p['한동훈'].toFixed(1)}` +
      ` 박${p['박민식'].toFixed(1)} 미${p['미정'].toFixed(1)}`
    );
    for (const c of CANDS) {
      const cnt = groups.find((g) => g.ageMin === ageMin && g.candidate === c)?.count ?? 0;
      const pad = c === '미정' ? '    ' : ' ';
      lines.push(`  { ageMin: ${ageMin}, ageMax: ${ageMax}, candidate: '${c}',${pad}count: ${cnt} },`);
    }
    lines.push('');
  }
  lines.pop(); // 마지막 빈 줄 제거
  lines.push('];');
  const newAgeBlock = lines.join('\n');

  // ── generate_personas_122440.js 패치 ────────────────────────────────────
  let src = fs.readFileSync(GEN_JS, 'utf-8');

  // 헤더 주석 (3줄)
  src = src.replace(
    /\/\/ 기준: .+\n\/\/ 가중공식: .+\n\/\/ 차수별 비중: .+/,
    `// 기준: 1~${n}차 가중평균 (최신: ${latest.source} ${n}차 ${latest.period})\n` +
    `// 가중공식: 조사방법×표본크기×응답률×최신성\n` +
    `// 차수별 비중: ${pctStr}`
  );

  // POLL_VERSION, LAST_UPDATED
  src = src.replace(/POLL_VERSION\s*=\s*\d+/, `POLL_VERSION = ${latest.id}`);
  src = src.replace(/LAST_UPDATED\s*=\s*'[^']+'/, `LAST_UPDATED = '${today}'`);

  // ageGroups 섹션 (① ~ ② の間)
  src = src.replace(
    /\/\/ ── ① 연령×후보[\s\S]*?(?=\/\/ ── ②)/,
    newAgeBlock + '\n\n'
  );

  // 검증 통계 배열
  const candRows = CANDS.map((c) => `['${c}', ${byC[c]}, '${(byC[c] / TOTAL * 100).toFixed(1)}']`);
  src = src.replace(
    /\[\s*\n\s+\['하정우',[\s\S]*?\['미정',\s+\d+,\s+'[\d.]+'\],?\s*\]/,
    `[\n  ${candRows.join(', ')},\n]`
  );

  fs.writeFileSync(GEN_JS, src, 'utf-8');
  ok('generate_personas_122440.js 패치 완료');

  // ── node 실행 ────────────────────────────────────────────────────────────
  log('node generate_personas_122440.js 실행 중...');
  const r = spawnSync('node', [GEN_JS], {
    cwd: BASE,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (r.status !== 0) fail(`DB 생성 실패:\n${r.stderr}`);

  // 핵심 라인만 출력
  r.stdout.split('\n').filter((l) =>
    l.includes('생성 완료') || l.includes('소요시간') ||
    l.includes('지지후보') || /\d,\d{3}명/.test(l)
  ).forEach((l) => log(l.trim()));

  ok('personas.db 재생성 완료');
  return { byC, n, latest, today };
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 2: AboutTab.jsx 업데이트
// ═════════════════════════════════════════════════════════════════════════════

function periodStr(p) {
  const [start, endDay] = p.split('~');
  const [, mo, dy] = start.split('-').map(Number);
  return endDay ? `${mo}/${dy}~${endDay}` : `${mo}/${dy}`;
}

function tierOf(raw, maxRaw) {
  if (raw >= maxRaw * 0.99) return 'best';
  if (raw >= maxRaw * 0.70) return 'high';
  if (raw >= maxRaw * 0.37) return 'mid';
  return 'low';
}

function step2(surveys, weights, wavg, meta) {
  console.log('\n[2/3] AboutTab.jsx 업데이트');

  const { byC, n, latest, today } = meta;
  const maxRaw  = Math.max(...weights.map((w) => w.raw));
  const totalRaw = weights.reduce((s, w) => s + w.raw, 0);

  // ── POLL_WEIGHTS 배열 생성 ───────────────────────────────────────────────
  const rows = surveys.map((s, i) => {
    const w  = weights[i];
    const id = `${i + 1}차`;
    return (
      `  { id: "${id}", org: "${s.source}", method: "${/면접/.test(s.method) ? '면접' : 'ARS'}", ` +
      `n: ${s.n}, rr: ${w.rr}, period: "${periodStr(s.period)}", ` +
      `mW: ${w.mW}, sW: ${w.sW}, rrW: ${w.rrW}, tW: ${w.tW}, ` +
      `score: ${w.score}, tier: "${tierOf(w.raw, maxRaw)}" },`
    );
  });
  const newPollWeights = `const POLL_WEIGHTS = [\n${rows.join('\n')}\n];`;

  // ── 가중평균 테이블 행 ───────────────────────────────────────────────────
  const avgRows = AGE_ORDER.map((ag) => {
    const p = wavg[ag];
    return (
      `      ["${AGE_LABEL[ag]}", ` +
      `${p['하정우'].toFixed(1)}, ${p['한동훈'].toFixed(1)}, ` +
      `${p['박민식'].toFixed(1)}, ${p['미정'].toFixed(1)}],`
    );
  }).join('\n');

  // ── AboutTab.jsx 패치 ────────────────────────────────────────────────────
  let src = fs.readFileSync(ABOUT, 'utf-8');

  // POLL_WEIGHTS 배열 전체 교체
  src = src.replace(
    /const POLL_WEIGHTS = \[[\s\S]*?\n\];/,
    newPollWeights
  );

  // 가중평균 테이블 데이터 교체
  src = src.replace(
    /(\{)\s*\[\s*\n(\s*)\["18~29세"[\s\S]*?\["70대\+"[^\]]*\],?\s*\](\s*\.map)/,
    `$1\n    [\n${avgRows}\n    ]$3`
  );

  // 섹션 제목 차수 갱신
  src = src.replace(
    /가중 평균 결과 \(1~\d+차, 연령대별\)/,
    `가중 평균 결과 (1~${n}차, 연령대별)`
  );

  // 설명 텍스트 차수 갱신
  src = src.replace(/1~\d+차 여론조사를 신뢰도에 비례해/, `1~${n}차 여론조사를 신뢰도에 비례해`);
  src = src.replace(/1~\d+차 가중 통합 → personas\.db 반영/, `1~${n}차 가중 통합 → personas.db 반영`);
  src = src.replace(/1~\d+차 반영/, `1~${n}차 반영`);

  // 최고점 주석 갱신
  const orgNames = surveys.filter((_, i) => weights[i].score >= 100).map((s) => s.source);
  const topStr = orgNames.length === 1 ? `${orgNames[0]} 100점` : `${orgNames.join('·')} 공동 100점`;
  src = src.replace(/→ 최고점\([^)]+\) 기준으로/, `→ 최고점(${topStr}) 기준으로`);

  // personas.db 구성 갱신
  const distStr = CANDS.map((c) => `${c} ${(byC[c] / TOTAL * 100).toFixed(1)}%`).join(' / ');
  src = src.replace(
    /("현재 poll_version", ")[^"]+(")/,
    `$1${n}차 (${latest.source} 기준)$2`
  );
  src = src.replace(/("마지막 업데이트", ")[^"]+(")/,  `$1${today}$2`);
  src = src.replace(/("지지후보 배분",\s+")[^"]+(")/,  `$1${distStr}$2`);

  fs.writeFileSync(ABOUT, src, 'utf-8');
  ok('AboutTab.jsx 업데이트 완료');
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 3: context.md 최신 차수 append
// ═════════════════════════════════════════════════════════════════════════════

function step3(surveys, wavg) {
  console.log('\n[3/3] context.md 업데이트');

  const latest = surveys[surveys.length - 1];
  const ctx    = fs.readFileSync(CTX_MD, 'utf-8');

  // 이미 수록됐는지 확인 (source + period 조합)
  const periodShort = latest.period.replace('2026-', '').replace(/-/g, '/');
  const marker = latest.source.split('/')[0]; // e.g. "JTBC"
  if (ctx.includes(marker) && ctx.includes(periodShort)) {
    ok(`context.md: ${latest.source} (${periodShort}) 이미 수록됨 — skip`);
    return;
  }

  // 연령대별 지지율 포맷
  const ageLines = AGE_ORDER.map((ag) => {
    const b = latest.byAge[ag];
    return `- ${ag}: 하정우 ${b['하정우']}% / 한동훈 ${b['한동훈']}% / 박민식 ${b['박민식']}% / 미정 ${b['미정']}%`;
  }).join('\n');

  // 가중평균 결과 포맷
  const wavgLines = AGE_ORDER.map((ag) => {
    const p = wavg[ag];
    return `- ${ag}: 하정우 ${p['하정우'].toFixed(1)}% / 한동훈 ${p['한동훈'].toFixed(1)}% / 박민식 ${p['박민식'].toFixed(1)}% / 미정 ${p['미정'].toFixed(1)}%`;
  }).join('\n');

  const today    = new Date().toISOString().slice(0, 10).replace(/-/g, '/').slice(5);
  const n        = surveys.length;
  const methodLabel = /면접/.test(latest.method) ? '전화면접' : 'ARS';
  const rr       = getResponseRate(latest);

  const block = `

---

### ${latest.source} (${periodShort}, n=${latest.n}, ${methodLabel}, 응답률 ${rr}%) — ${n}차 조사 (최신)

**${latest.source} 연령대별 지지율 (원본)**
${ageLines}

**1~${n}차 가중평균 (전체 반영)**
${wavgLines}

---

### ${today} 업데이트
**${latest.source} ${n}차 조사 추가 (${periodShort})**
- n=${latest.n} / ${methodLabel} / 응답률 ${rr}%
- 가중평균 반영: personas.db poll_version=${n} 갱신
`;

  fs.appendFileSync(CTX_MD, block, 'utf-8');
  ok(`context.md: ${n}차 요약 append 완료`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 메인
// ═════════════════════════════════════════════════════════════════════════════

function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  update_all.js — polls.json 기반 자동 업데이트');
  console.log('══════════════════════════════════════════');

  // polls.json 로드
  const polls   = JSON.parse(fs.readFileSync(POLLS, 'utf-8'));
  const surveys = polls.surveys;
  const agePops = polls.agePops;
  if (!surveys?.length) fail('polls.json surveys 배열 없음');

  log(`polls.json: ${surveys.length}차 조사 로드 완료`);

  // 공통 계산
  const weights = calcWeights(surveys);
  const wavg    = calcWeightedAvg(surveys, weights);
  const groups  = calcCounts(wavg, agePops);

  // 가중치 요약 출력
  console.log('\n  차수별 가중치:');
  surveys.forEach((s, i) => {
    const w = weights[i];
    log(`${s.id}차 ${s.source.padEnd(20)} raw=${w.raw} score=${w.score} 비중=${(w.pct*100).toFixed(1)}%`);
  });

  // 가중평균 요약 출력
  console.log('\n  1~' + surveys.length + '차 가중평균:');
  AGE_ORDER.forEach((ag) => {
    const p = wavg[ag];
    log(
      `${ag.padEnd(6)} 하${p['하정우'].toFixed(1)}% 한${p['한동훈'].toFixed(1)}%` +
      ` 박${p['박민식'].toFixed(1)}% 미${p['미정'].toFixed(1)}%`
    );
  });

  // STEP 실행
  const meta = step1(surveys, weights, wavg, groups, agePops);
  step2(surveys, weights, wavg, meta);
  step3(surveys, wavg);

  console.log('\n══════════════════════════════════════════');
  console.log('  ✓ update_all.js 완료');
  console.log('══════════════════════════════════════════\n');
}

main();

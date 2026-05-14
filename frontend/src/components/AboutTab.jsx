import { useState, useEffect } from "react";
import { API_BASE } from "../config";

// ── 데이터 ────────────────────────────────────────────────────────────────────

const POLL_WEIGHTS = [
  { id: "1차", org: "KOPRA/한국여론평판연구소", method: "ARS", n: 505, rr: 4.2, period: "4/19~20", mW: 1, sW: 1, rrW: 0.7, tW: 0.7, score: 17, tier: "low" },
  { id: "2차", org: "미디어토마토", method: "ARS", n: 802, rr: 9, period: "4/24~25", mW: 1, sW: 1.3, rrW: 1.1, tW: 1, score: 49, tier: "mid" },
  { id: "3차", org: "여론조사꽃", method: "ARS", n: 503, rr: 8.6, period: "4/26~27", mW: 1, sW: 1, rrW: 1.1, tW: 1, score: 37, tier: "mid" },
  { id: "4차", org: "KBS부산/한국리서치", method: "면접", n: 500, rr: 23.3, period: "4/27~28", mW: 1.5, sW: 1, rrW: 1.4, tW: 1, score: 71, tier: "high" },
  { id: "5차", org: "한길리서치", method: "ARS", n: 584, rr: 5.3, period: "5/1~03", mW: 1, sW: 1, rrW: 0.9, tW: 1.4, score: 43, tier: "mid" },
  { id: "6차", org: "SBS/Ipsos", method: "면접", n: 503, rr: 14.4, period: "5/1~03", mW: 1.5, sW: 1, rrW: 1.1, tW: 1.4, score: 79, tier: "high" },
  { id: "7차", org: "JTBC/메타보이스", method: "면접", n: 501, rr: 15.1, period: "5/4~05", mW: 1.5, sW: 1, rrW: 1.4, tW: 1.4, score: 100, tier: "best" },
  { id: "8차", org: "KBS부산/한국리서치", method: "ARS", n: 500, rr: 22.7, period: "5/8~10", mW: 1, sW: 1, rrW: 1.4, tW: 1.4, score: 67, tier: "mid" },
  { id: "9차", org: "국제신문·리얼미터", method: "ARS", n: 506, rr: 8.7,  period: "5/9~10", mW: 1, sW: 1, rrW: 1.1, tW: 1.4, score: 52, tier: "mid" },
];

const WEIGHT_RULES = [
  {
    label: "조사방법",
    icon: "📞",
    weight: "30%",
    items: [
      { cond: "면접(CATI)", val: "×1.5", color: "text-emerald-400", reason: "응답 품질 높음, 편향 최소" },
      { cond: "ARS",       val: "×1.0", color: "text-[var(--text)]", reason: "기본값" },
    ],
  },
  {
    label: "표본 크기",
    icon: "👥",
    weight: "20%",
    items: [
      { cond: "n ≥ 800",    val: "×1.3", color: "text-emerald-400", reason: "표본오차 ±3.5%p 이하" },
      { cond: "n 500~799",  val: "×1.0", color: "text-[var(--text)]", reason: "표준 범위" },
      { cond: "n < 500",    val: "×0.8", color: "text-orange-400", reason: "오차 범위 넓음" },
    ],
  },
  {
    label: "응답률",
    icon: "📊",
    weight: "25%",
    items: [
      { cond: "15% 이상",  val: "×1.4", color: "text-emerald-400", reason: "대표성 양호" },
      { cond: "8~14%",    val: "×1.1", color: "text-sky-400", reason: "ARS 평균" },
      { cond: "5~7%",     val: "×0.9", color: "text-orange-400", reason: "편향 주의" },
      { cond: "5% 미만",  val: "×0.7", color: "text-red-400", reason: "강성 편향 우려" },
    ],
  },
  {
    label: "최신성",
    icon: "🕐",
    weight: "25%",
    items: [
      { cond: "5월 이후",    val: "×1.4", color: "text-emerald-400", reason: "3자 구도 확정 후" },
      { cond: "4월 24일~",  val: "×1.0", color: "text-[var(--text)]", reason: "하정우 출마 이후" },
      { cond: "~4월 23일",  val: "×0.7", color: "text-orange-400", reason: "한동훈 출마 前" },
    ],
  },
];

const REFERENCE_DATA = [
  {
    title: "부산시장 여론조사",
    icon: "🏛️",
    color: "border-sky-500/30 bg-sky-500/5",
    iconBg: "bg-sky-500/15 text-sky-400",
    items: [
      "뉴스1·한국갤럽 (5/10~11, n=801, CATI, 응답률 14.7%)",
      "전재수 43% vs 박형준 41% 오차범위 내 초박빙",
      "3권역(강서·북구·사상·사하) 전재수 48% vs 박형준 33% (+15%p)",
      "이재명 국정 긍정 63% — 3권역 70% (하정우·전재수 동반 기반)",
    ],
  },
  {
    title: "일별 부산 동향",
    icon: "📰",
    color: "border-violet-500/30 bg-violet-500/5",
    iconBg: "bg-violet-500/15 text-violet-400",
    items: [
      "5/1~5/14 부산 선거 동향 누적 수집",
      "부산일보·국제신문 주요 보도 추적",
      "후보 캠프 동향, 단일화 변수 실시간 반영",
      "손털기 논란 등 현안 이슈 수동 업데이트",
    ],
  },
  {
    title: "주요 현안 이슈",
    icon: "⚡",
    color: "border-amber-500/30 bg-amber-500/5",
    iconBg: "bg-amber-500/15 text-amber-400",
    items: [
      "하정우 '손털기' 논란 (4/29)",
      "한동훈 예비후보 등록 (5/5)",
      "박민식 국힘 후보 확정 (5/6)",
      "보수 단일화 변수 — 분수령 미결",
    ],
  },
];

const BASE_DATA = [
  {
    title: "22대 총선 동별 개표 결과",
    icon: "🗳️",
    color: "border-blue-500/30",
    iconBg: "bg-blue-500/15 text-blue-400",
    rows: [
      ["구포1동", "민주 +48표", "초박빙"],
      ["구포2동", "민주 +604표", "민주 우세"],
      ["구포3동", "민주 +540표", "민주 우세"],
      ["덕천1동", "국힘 +101표", "국힘 우세"],
      ["덕천2동", "국힘 +25표", "초박빙"],
      ["덕천3동", "국힘 +41표", "초박빙"],
      ["만덕2동", "민주 +1,502표", "민주 강세"],
      ["만덕3동", "민주 +212표", "민주 소폭"],
    ],
  },
  {
    title: "21대 총선 동별 개표 결과",
    icon: "📋",
    color: "border-indigo-500/30",
    iconBg: "bg-indigo-500/15 text-indigo-400",
    rows: [
      ["구포1동", "국힘 +127표", "국힘 우세"],
      ["구포2동", "민주 +55표", "초박빙"],
      ["구포3동", "민주 +10표", "사실상 동률"],
      ["덕천1동", "국힘 +547표", "국힘 강세"],
      ["덕천2동", "국힘 +174표", "국힘 우세"],
      ["덕천3동", "국힘 +271표", "국힘 우세"],
      ["만덕2동", "민주 +709표", "민주 우세"],
      ["만덕3동", "민주 +45표", "초박빙"],
    ],
  },
];

const VOTER_STATS = [
  { dong: "구포1동", pop: "14,219명", ratio: "11.6%", area: "구포" },
  { dong: "구포2동", pop: "21,518명", ratio: "17.6%", area: "구포" },
  { dong: "구포3동", pop: "16,937명", ratio: "13.8%", area: "구포" },
  { dong: "덕천1동", pop: "11,035명", ratio: "9.0%",  area: "덕천" },
  { dong: "덕천2동", pop: "10,633명", ratio: "8.7%",  area: "덕천" },
  { dong: "덕천3동", pop: "9,370명",  ratio: "7.7%",  area: "덕천" },
  { dong: "만덕2동", pop: "22,812명", ratio: "18.6%", area: "만덕" },
  { dong: "만덕3동", pop: "15,916명", ratio: "13.0%", area: "만덕" },
];

const AGE_DIST = [
  { band: "18~29세", ratio: 13.5 },
  { band: "30대",    ratio: 13.4 },
  { band: "40대",    ratio: 16.0 },
  { band: "50대",    ratio: 18.4 },
  { band: "60대",    ratio: 19.4 },
  { band: "70대+",   ratio: 19.2 },
];

// ── 헬퍼 컴포넌트 ─────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--accent)] mb-4 flex items-center gap-2">
        <span className="h-px flex-1 bg-[var(--border)]" />
        {title}
        <span className="h-px flex-1 bg-[var(--border)]" />
      </h3>
      {children}
    </section>
  );
}

function ScoreBadge({ score, tier }) {
  const colors = {
    best: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    high: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    mid:  "bg-amber-500/20 text-amber-300 border-amber-500/40",
    low:  "bg-zinc-500/20 text-zinc-400 border-zinc-500/40",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors[tier]}`}>
      {score}점
    </span>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function AboutTab() {
  const [activeSection, setActiveSection] = useState('intro');
  const [pollsData, setPollsData] = useState(null);

  useEffect(() => {
    fetch(API_BASE + '/api/about')
      .then(r => r.json())
      .then(d => setPollsData(d))
      .catch(() => {});
  }, []);

  const POLL_WEIGHTS_LIVE = pollsData?.polls?.map(p => {
    const mW  = p.method === '면접' ? 1.5 : 1.0;
    const sW  = p.n >= 800 ? 1.3 : p.n >= 500 ? 1.0 : 0.8;
    const rrW = p.response_rate >= 15 ? 1.4 : p.response_rate >= 8 ? 1.1 : p.response_rate >= 5 ? 0.9 : 0.7;
    const tW  = p.recency_tier === 'may_onwards' ? 1.4 : p.recency_tier === 'late_april' ? 1.0 : 0.7;
    const raw = mW * sW * rrW * tW;
    return {
      id: p.label, org: p.org, method: p.method, n: p.n, rr: p.response_rate,
      period: p.period_start?.slice(5).replace('-','/') + '~' + p.period_end?.slice(5).replace('-','/'),
      mW, sW, rrW, tW,
      score: p._norm ?? Math.round(raw * 100) / 100,
      tier: raw >= 2.94 ? 'best' : raw >= 2.1 ? 'high' : raw >= 1.1 ? 'mid' : 'low',
    };
  }) ?? POLL_WEIGHTS;

  const navItems = [
    { id: "intro",    label: "프로젝트 소개" },
    { id: "weights",  label: "여론조사 가중치" },
    { id: "refs",     label: "참고 데이터" },
    { id: "base",     label: "기초 데이터" },
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* 사이드 내비 */}
      <nav className="w-56 shrink-0 border-r border-[var(--border)] py-8 px-5 flex flex-col gap-1.5">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`text-left text-sm px-4 py-2.5 rounded-lg transition-colors cursor-pointer font-medium ${
              activeSection === item.id
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text)] hover:text-[var(--text-h)] hover:bg-[var(--code-bg)]"
            }`}
          >
            {item.label}
          </button>
        ))}
        <div className="mt-auto pt-6 border-t border-[var(--border)]">
          <p className="text-[10px] text-[var(--text)] opacity-50 leading-relaxed">
            유펜 v1.0<br />
            2026 북구갑<br />
            1~9차 반영
          </p>
        </div>
      </nav>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-10 py-8">

        {/* ── 프로젝트 소개 ── */}
        {activeSection === "intro" && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[var(--text-h)] mb-1">
                유펜 <span className="text-[var(--accent)]">Yupen</span>
              </h2>
              <p className="text-sm text-[var(--text)]">부산 북구갑 유권자 페르소나 AI 여론조사 시뮬레이터</p>
            </div>

            <Section title="무엇인가">
              <div className="prose prose-sm text-[var(--text)] leading-relaxed space-y-3">
                <p>
                  유펜(Yupen)은 <strong className="text-[var(--text-h)]">2026년 6·3 부산 북구갑 보궐선거</strong>를 분석하기 위해 제작된 AI 여론조사 시뮬레이터입니다.
                  실제 여론조사 데이터, 총선 개표 결과, 통계청 인구 데이터를 기반으로 <strong className="text-[var(--text-h)]">122,440명의 가상 유권자 페르소나</strong>를 생성하고,
                  이를 Claude AI가 응답하는 방식으로 민심을 시뮬레이션합니다.
                </p>
                <p>
                  단순한 지지율 수치가 아니라, 각 유권자의 나이·거주동·직업·정치성향·지지강도를 반영한 실제 전화 인터뷰 방식의 응답을 생성합니다.
                </p>
              </div>
            </Section>

            <Section title="주요 기능">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "🗂️", title: "유권자 목록", desc: "122,440명 페르소나 필터링 및 탐색" },
                  { icon: "📞", title: "여론조사 시뮬레이션", desc: "층화추출 + Claude AI 개별 응답 생성" },
                  { icon: "📈", title: "민심동향 그래프", desc: "일별 지지율 추이 시각화" },
                  { icon: "📋", title: "배치 심층 인터뷰", desc: "복수 유권자 대상 동시 질의 분석" },
                ].map(f => (
                  <div key={f.title} className="bg-[var(--code-bg)] border border-[var(--border)] rounded-xl p-4">
                    <div className="text-xl mb-2">{f.icon}</div>
                    <p className="text-sm font-semibold text-[var(--text-h)] mb-1">{f.title}</p>
                    <p className="text-xs text-[var(--text)]">{f.desc}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="선거 구도">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: "하정우", party: "더불어민주당", color: "border-blue-500/50 bg-blue-500/5", badge: "bg-blue-500/20 text-blue-300" },
                  { name: "한동훈", party: "무소속",       color: "border-amber-500/50 bg-amber-500/5", badge: "bg-amber-500/20 text-amber-300" },
                  { name: "박민식", party: "국민의힘",     color: "border-red-500/50 bg-red-500/5", badge: "bg-red-500/20 text-red-300" },
                ].map(c => (
                  <div key={c.name} className={`border rounded-xl p-4 text-center ${c.color}`}>
                    <p className="text-lg font-bold text-[var(--text-h)] mb-1">{c.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.badge}`}>{c.party}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--text)] mt-3 opacity-60">
                ※ 북구갑 3자 구도 기준 (이영풍 후보 별도). 부산시장은 전재수(민주) vs 박형준(국힘) 양자 구도.
              </p>
            </Section>

            <Section title="데이터 업데이트">
              <div className="bg-[var(--code-bg)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
                {[
                  ["여론조사 반영", "부산 북구갑 여론조사 → personas.db 반영"],
                  ["일별 동향",     "부산 선거 동향 누적 수집"],
                  ["부산시장 조사", "바로미터 등 시장 선거 여론조사 추가"],
                  ["DB 재생성",    "rebuild_db.py 실행 시 자동 가중치 계산"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center gap-4 px-4 py-3">
                    <span className="text-xs font-semibold text-[var(--text-h)] w-28 shrink-0">{k}</span>
                    <span className="text-xs text-[var(--text)]">{v}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* ── 여론조사 가중치 ── */}
        {activeSection === "weights" && (
          <div>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-[var(--text-h)] mb-1">여론조사 가중치 설계</h2>
              <p className="text-sm text-[var(--text)]">1~9차 여론조사를 신뢰도에 비례해 가중 평균으로 통합합니다.</p>
            </div>

            <Section title="가중치 공식">
              <div className="bg-[var(--code-bg)] border border-[var(--accent)]/30 rounded-xl p-5 text-center mb-4">
                <p className="text-sm font-mono text-[var(--text-h)]">
                  종합점수 = <span className="text-sky-400">조사방법</span> × <span className="text-violet-400">표본크기</span> × <span className="text-amber-400">응답률</span> × <span className="text-emerald-400">최신성</span>
                </p>
                <p className="text-xs text-[var(--text)] mt-2 opacity-60">→ 최고점(JTBC/메타보이스 100점) 기준으로 정규화 후 가중 평균 산출</p>
              </div>
            </Section>

            <Section title="항목별 가중값">
              <div className="grid grid-cols-2 gap-3">
                {WEIGHT_RULES.map(rule => (
                  <div key={rule.label} className="bg-[var(--code-bg)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{rule.icon}</span>
                        <span className="text-sm font-semibold text-[var(--text-h)]">{rule.label}</span>
                      </div>
                      <span className="text-xs text-[var(--accent)] font-bold bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">
                        비중 {rule.weight}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {rule.items.map(item => (
                        <div key={item.cond} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold w-10 ${item.color}`}>{item.val}</span>
                            <span className="text-[var(--text-h)]">{item.cond}</span>
                          </div>
                          <span className="text-[var(--text)] opacity-60 text-[10px]">{item.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="차수별 신뢰점수">
              <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--code-bg)] border-b border-[var(--border)]">
                      {["차수","기관","방법","n","응답률","조사방법W","표본W","응답률W","최신W","신뢰점수"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-[var(--text)] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(POLL_WEIGHTS_LIVE ?? POLL_WEIGHTS).map((p, i) => (
                      <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--code-bg)]/50 transition-colors">
                        <td className="px-3 py-2.5 font-semibold text-[var(--accent)]">{p.id}</td>
                        <td className="px-3 py-2.5 text-[var(--text-h)]">{p.org}</td>
                        <td className={`px-3 py-2.5 font-medium ${p.method === "면접" ? "text-emerald-400" : "text-[var(--text)]"}`}>{p.method}</td>
                        <td className="px-3 py-2.5 text-[var(--text)]">{p.n.toLocaleString()}</td>
                        <td className={`px-3 py-2.5 font-medium ${p.rr >= 15 ? "text-emerald-400" : p.rr < 5 ? "text-red-400" : "text-[var(--text)]"}`}>{p.rr}%</td>
                        <td className={`px-3 py-2.5 font-mono ${p.mW > 1 ? "text-emerald-400" : "text-[var(--text)]"}`}>×{p.mW}</td>
                        <td className={`px-3 py-2.5 font-mono ${p.sW > 1 ? "text-emerald-400" : "text-[var(--text)]"}`}>×{p.sW}</td>
                        <td className={`px-3 py-2.5 font-mono ${p.rrW >= 1.4 ? "text-emerald-400" : p.rrW < 1 ? "text-red-400" : "text-[var(--text)]"}`}>×{p.rrW}</td>
                        <td className={`px-3 py-2.5 font-mono ${p.tW >= 1.4 ? "text-emerald-400" : p.tW < 1 ? "text-red-400" : "text-[var(--text)]"}`}>×{p.tW}</td>
                        <td className="px-3 py-2.5"><ScoreBadge score={p.score} tier={p.tier} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-[var(--text)] opacity-50 mt-2">
                ※ 가중 평균은 연령대×후보별로 적용되어 personas.db 지지후보 분포에 반영됩니다.
              </p>
            </Section>

            <Section title="가중 평균 결과 (1~9차, 연령대별)">
              <div className="bg-[var(--code-bg)] border border-[var(--border)] rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-4 py-2.5 text-left font-semibold text-[var(--text)]">연령대</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-blue-400">하정우</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-amber-400">한동훈</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-red-400">박민식</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-[var(--text)]">미정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
    [
      ["18~29세", 27.6, 25.4, 23.1, 23.9],
      ["30대", 25.9, 25.7, 27.3, 21.0],
      ["40대", 53.2, 17.5, 18.1, 11.2],
      ["50대", 45.7, 22.7, 22.6, 8.9],
      ["60대", 38.5, 28.1, 22.7, 10.8],
      ["70대+", 26.5, 32.3, 29.5, 11.7],
    ].map(([band, h, k, p, m]) => (
                      <tr key={band} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-4 py-2.5 font-semibold text-[var(--text-h)]">{band}</td>
                        <td className="px-4 py-2.5 text-right text-blue-400 font-medium">{h}%</td>
                        <td className="px-4 py-2.5 text-right text-amber-400 font-medium">{k}%</td>
                        <td className="px-4 py-2.5 text-right text-red-400 font-medium">{p}%</td>
                        <td className="px-4 py-2.5 text-right text-[var(--text)]">{m}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}

        {/* ── 참고 데이터 ── */}
        {activeSection === "refs" && (
          <div>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-[var(--text-h)] mb-1">참고 데이터</h2>
              <p className="text-sm text-[var(--text)]">시뮬레이션의 맥락 데이터로 활용되는 정성 정보입니다.</p>
            </div>

            <Section title="실시간 반영 데이터">
              <div className="flex flex-col gap-3">
                {REFERENCE_DATA.map(ref => (
                  <div key={ref.title} className={`border rounded-xl p-5 ${ref.color}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-base w-8 h-8 rounded-lg flex items-center justify-center ${ref.iconBg}`}>
                        {ref.icon}
                      </span>
                      <h4 className="text-sm font-bold text-[var(--text-h)]">{ref.title}</h4>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {ref.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[var(--text)]">
                          <span className="text-[var(--accent)] mt-0.5 shrink-0">·</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="동별 지역 특성">
              <div className="bg-[var(--code-bg)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
                {[
                  ["구포권", "구포1·2·3동", "자영업자·배달기사·소상공인 밀집. 구포역 상권 중심. 부동층 비율 높음."],
                  ["덕천권", "덕천1·2·3동", "중산층 아파트 단지. 전재수 개인 효과로 보수→박빙 전환. 보수 기반 잔존."],
                  ["만덕권", "만덕2·3동",   "고지대 서민층. 민주 강세. 만덕2동 유권자 22,812명으로 전체 최대."],
                ].map(([area, dongs, desc]) => (
                  <div key={area} className="px-4 py-3 flex gap-4">
                    <div className="w-16 shrink-0">
                      <span className="text-xs font-bold text-[var(--accent)]">{area}</span>
                      <p className="text-[10px] text-[var(--text)] opacity-60 mt-0.5">{dongs}</p>
                    </div>
                    <p className="text-xs text-[var(--text)] leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="연령대별 분리투표 패턴">
              <p className="text-[10px] text-[var(--text)] opacity-50 mb-2">출처: 뉴스1·한국갤럽 부산시장 조사 (5/10~11, n=801, CATI)</p>
              <div className="bg-[var(--code-bg)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
                {[
                  ["40~50대", "시장 전재수 62·61% 압도 — 의원 하정우 동반 지지 가능성 최고. 민주 투표블록 핵심."],
                  ["60대",    "시장 박형준 53% 우세, 전재수 40%. 의원은 하정우 47.5% — 분리투표 성향 뚜렷."],
                  ["70대+",   "시장 박형준 60%, 전재수 24%. 의원도 한동훈 30.2% 최강세. 보수 양장 동반 결집."],
                  ["18~29세", "시장 박형준 35% > 전재수 29%. 의원은 부동층 높음. 온라인 이슈 민감."],
                  ["30대",    "시장 전재수 42% > 박형준 35%. 의원 후보 개인 이미지 중시. 부동층 변동폭 큼."],
                ].map(([age, desc]) => (
                  <div key={age} className="px-4 py-3 flex gap-4">
                    <span className="text-xs font-bold text-[var(--text-h)] w-16 shrink-0">{age}</span>
                    <p className="text-xs text-[var(--text)] leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* ── 기초 데이터 ── */}
        {activeSection === "base" && (
          <div>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-[var(--text-h)] mb-1">기초 데이터</h2>
              <p className="text-sm text-[var(--text)]">personas.db 생성의 근거가 된 공식 통계 데이터입니다.</p>
            </div>

            <Section title="총선 동별 개표 결과">
              <div className="grid grid-cols-2 gap-4">
                {BASE_DATA.map(bd => (
                  <div key={bd.title} className={`border rounded-xl overflow-hidden ${bd.color}`}>
                    <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center ${bd.iconBg}`}>{bd.icon}</span>
                      <h4 className="text-xs font-bold text-[var(--text-h)]">{bd.title}</h4>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-[var(--code-bg)]">
                          <th className="px-3 py-2 text-left text-[var(--text)] font-medium">동</th>
                          <th className="px-3 py-2 text-right text-[var(--text)] font-medium">결과</th>
                          <th className="px-3 py-2 text-right text-[var(--text)] font-medium">분류</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bd.rows.map(([dong, result, cls]) => (
                          <tr key={dong} className="border-t border-[var(--border)]">
                            <td className="px-3 py-1.5 font-medium text-[var(--text-h)]">{dong}</td>
                            <td className={`px-3 py-1.5 text-right font-mono ${result.includes("민주") ? "text-blue-400" : "text-red-400"}`}>{result}</td>
                            <td className="px-3 py-1.5 text-right text-[var(--text)] opacity-60">{cls}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="동별 유권자 수 (2026년 3월 기준)">
              <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--code-bg)] border-b border-[var(--border)]">
                      <th className="px-4 py-2.5 text-left font-semibold text-[var(--text)]">동</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-[var(--text)]">권역</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-[var(--text)]">유권자 수</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-[var(--text)]">비율</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-[var(--text)] pl-4">비율 시각화</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VOTER_STATS.map(v => (
                      <tr key={v.dong} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-4 py-2.5 font-semibold text-[var(--text-h)]">{v.dong}</td>
                        <td className="px-4 py-2.5 text-[var(--text)] opacity-60">{v.area}</td>
                        <td className="px-4 py-2.5 text-right text-[var(--text-h)] font-mono">{v.pop}</td>
                        <td className="px-4 py-2.5 text-right text-[var(--accent)] font-bold">{v.ratio}</td>
                        <td className="px-4 py-2.5 pl-4">
                          <div className="h-1.5 w-full max-w-[120px] rounded-full bg-[var(--border)]">
                            <div
                              className="h-1.5 rounded-full bg-[var(--accent)] opacity-60"
                              style={{ width: `${(parseFloat(v.ratio) / 18.6) * 100}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[var(--code-bg)] border-t-2 border-[var(--border)]">
                      <td className="px-4 py-2.5 font-bold text-[var(--text-h)]" colSpan={2}>합계</td>
                      <td className="px-4 py-2.5 text-right font-bold text-[var(--text-h)] font-mono">122,440명</td>
                      <td className="px-4 py-2.5 text-right font-bold text-[var(--accent)]">100%</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="연령대 분포 (통계청 기준)">
              <div className="bg-[var(--code-bg)] border border-[var(--border)] rounded-xl p-5">
                <div className="flex flex-col gap-3">
                  {AGE_DIST.map(({ band, ratio }) => (
                    <div key={band} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[var(--text-h)] w-16 shrink-0">{band}</span>
                      <div className="flex-1 h-2 rounded-full bg-[var(--border)]">
                        <div
                          className="h-2 rounded-full bg-[var(--accent)] opacity-70 transition-all duration-500"
                          style={{ width: `${(ratio / 19.4) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[var(--accent)] w-10 text-right">{ratio}%</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--text)] opacity-50 mt-4">
                  출처: 2026년 3월말 행정안전부 주민등록인구통계 기준 · personas.db 가중치 적용 기준
                </p>
              </div>
            </Section>

            <Section title="personas.db 구성">
              <div className="bg-[var(--code-bg)] border border-[var(--border)] rounded-xl divide-y divide-[var(--border)]">
                {[
                  ["총 유권자 수",    "122,440명"],
                  ["현재 poll_version", "8차 (KBS부산/한국리서치 기준)"],
                  ["마지막 업데이트", "2026-05-13"],
                  ["지지후보 배분",   "하정우 36.4% / 한동훈 25.8% / 박민식 24.0% / 미정 13.7%"],
                  ["연령대 가중치",   "통계청 연령대별 인구 비율 반영"],
                  ["동별 가중치",    "행정안전부 유권자 명부 기준"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center px-4 py-3">
                    <span className="text-xs font-semibold text-[var(--text)] w-36 shrink-0">{k}</span>
                    <span className="text-xs text-[var(--text-h)]">{v}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

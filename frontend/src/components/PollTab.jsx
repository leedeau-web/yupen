import { useState, useEffect, useRef } from "react";
import { API_BASE } from "../config";
import {
  appendRound, loadHistory, saveHistory, normalizeServerHistory,
} from "../utils/historyStorage";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

const SAMPLE_SIZES = [50, 100, 200, 500, 1000];

const CANDIDATE_COLORS = {
  하정우: { bar: "bg-blue-500", text: "text-blue-500" },
  한동훈: { bar: "bg-amber-500", text: "text-amber-500" },
  박민식: { bar: "bg-red-500", text: "text-red-500" },
  무응답: { bar: "bg-gray-400", text: "text-gray-400" },
};

const COLORS = {
  하정우: "#3b82f6",
  한동훈: "#f59e0b",
  박민식: "#ef4444",
  무응답: "#9ca3af",
};

// JTBC/메타보이스 2026-05-04~05 (7차, n=501, 재질문 통합)
const REFERENCE = { 하정우: 37, 한동훈: 25, 박민식: 26, 무응답: 12 };

// ── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function CostBadge({ n }) {
  const est = (n * 0.003).toFixed(2);
  return (
    <span className="text-xs text-[var(--text)] px-2 py-0.5 rounded-full border border-[var(--border)]">
      예상 비용 ≈ ${est}
    </span>
  );
}

function ProgressBar({ progress, label }) {
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-[var(--text)] mb-1">
        <span>{label}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function ResultChart({ result }) {
  const candidates = ["하정우", "한동훈", "박민식", "무응답"];
  const moe = result.moe ?? 0;

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-h)]">조사 결과</h3>
        <div className="flex items-center gap-3 text-xs text-[var(--text)]">
          <span>n={result.sample_size}</span>
          <span>±{moe}%p (95% CI)</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {candidates.map((c) => {
          const pct = result.results?.[c]?.pct ?? 0;
          const ref = REFERENCE[c] ?? 0;
          const col = CANDIDATE_COLORS[c];
          return (
            <div key={c}>
              <div className="flex justify-between items-baseline text-xs mb-1">
                <span className={`font-semibold ${col.text}`}>{c}</span>
                <span className="text-[var(--text-h)] font-bold text-sm">{pct}%</span>
              </div>
              <div className="relative h-5 rounded bg-[var(--border)] overflow-visible">
                <div
                  className={`h-full rounded ${col.bar} transition-all duration-700 opacity-80`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
                <div
                  className="absolute top-0 h-full border-l-2 border-r-2 border-white/40"
                  style={{
                    left: `${Math.max(0, pct - moe)}%`,
                    width: `${Math.min(moe * 2, 100 - Math.max(0, pct - moe))}%`,
                  }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-white/70"
                  style={{ left: `${ref}%` }}
                  title={`JTBC/메타보이스 7차 ${ref}%`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text)] mt-0.5">
                <span>{result.results?.[c]?.count ?? 0}명</span>
                <span className="opacity-60">기준 {ref}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 text-[10px] text-[var(--text)] pt-2 border-t border-[var(--border)]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-white/70" />
          기준선: JTBC/메타보이스 2026-05-04~05 (7차)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-3 border border-white/40 bg-transparent" />
          ±MoE 범위
        </span>
      </div>
    </div>
  );
}

function DeltaBadge({ curr, prev }) {
  const diff = Math.round(curr - prev);
  if (diff > 0) return <span style={{ color: "#22c55e" }} className="ml-1 font-normal">(+{diff}%p)</span>;
  if (diff < 0) return <span style={{ color: "#ef4444" }} className="ml-1 font-normal">({diff}%p)</span>;
  return <span style={{ color: "#9ca3af" }} className="ml-1 font-normal">(±0)</span>;
}

function PollLogModal({ entry, index, onClose }) {
  const [showAll, setShowAll] = useState(false);
  const logs = entry.voter_logs ?? [];
  const CANDS = ["하정우", "한동훈", "박민식", "무응답"];

  const summary = CANDS.map((c) => ({
    name: c,
    original: logs.filter((v) => v.원래지지 === c).length,
    final: logs.filter((v) => v.최종응답 === c).length,
    inflow: logs.filter((v) => v.원래지지 !== c && v.최종응답 === c).length,
    outflow: logs.filter((v) => v.원래지지 === c && v.최종응답 !== c).length,
  }));
  const mijeongCount = logs.filter((v) => v.원래지지 === "미정").length;

  const topStat = (arr, key) => {
    if (!arr.length) return null;
    const counts = {};
    arr.forEach((v) => { counts[v[key]] = (counts[v[key]] || 0) + 1; });
    const [label, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return { label, pct: Math.round((n / arr.length) * 100) };
  };

  const defectorRows = ["하정우", "한동훈", "박민식"]
    .map((c) => {
      const d = logs.filter((v) => v.이탈 && v.원래지지 === c);
      if (!d.length) return null;
      return {
        candidate: c,
        count: d.length,
        topAge: topStat(d, "연령대"),
        topOri: topStat(d, "정치성향"),
        topTo: topStat(d, "최종응답"),
      };
    })
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg)] border border-[var(--border)] rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <div>
            <span className="text-sm font-bold text-[var(--text-h)]">#{index + 1} 회차 상세</span>
            <span className="text-xs text-[var(--text)] ml-3">{entry.date} · n={entry.n}</span>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none text-[var(--text)] hover:text-[var(--text-h)] cursor-pointer"
          >
            ×
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="px-5 py-10 text-sm text-center text-[var(--text)] opacity-60">
            이 회차에는 상세 로그가 없습니다.
            <br />
            <span className="text-xs">(이전 버전에서 기록된 데이터)</span>
          </div>
        ) : (
          <div className="overflow-y-auto px-5 py-5 flex flex-col gap-6">
            <section>
              <p className="text-xs font-semibold text-[var(--text-h)] uppercase tracking-wide mb-2.5">
                ① 후보별 유입·이탈
              </p>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--code-bg)] border-b border-[var(--border)]">
                      <th className="text-left px-3 py-2 font-semibold text-[var(--text-h)]">후보</th>
                      <th className="text-right px-3 py-2 font-semibold text-[var(--text)]">원래 지지</th>
                      <th className="text-right px-3 py-2 font-semibold text-[var(--text)]">최종 득표</th>
                      <th className="text-right px-3 py-2 font-semibold text-green-500">유입</th>
                      <th className="text-right px-3 py-2 font-semibold text-red-500">이탈</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map(({ name, original, final, inflow, outflow }) => (
                      <tr key={name} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-3 py-2 font-semibold" style={{ color: COLORS[name] }}>{name}</td>
                        <td className="px-3 py-2 text-right text-[var(--text)]">{original}명</td>
                        <td className="px-3 py-2 text-right font-semibold text-[var(--text-h)]">{final}명</td>
                        <td className="px-3 py-2 text-right text-green-500">{inflow > 0 ? `+${inflow}` : "—"}</td>
                        <td className="px-3 py-2 text-right text-red-500">{outflow > 0 ? `−${outflow}` : "—"}</td>
                      </tr>
                    ))}
                    {mijeongCount > 0 && (
                      <tr className="border-b border-[var(--border)] last:border-0 opacity-50">
                        <td className="px-3 py-2 text-[var(--text)]">미정</td>
                        <td className="px-3 py-2 text-right text-[var(--text)]">{mijeongCount}명</td>
                        <td className="px-3 py-2 text-right text-[var(--text)]">—</td>
                        <td className="px-3 py-2 text-right text-[var(--text)]">—</td>
                        <td className="px-3 py-2 text-right text-[var(--text)]">—</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold text-[var(--text-h)] uppercase tracking-wide mb-2.5">
                ② 이탈자 세그먼트
              </p>
              {defectorRows.length === 0 ? (
                <p className="text-xs text-[var(--text)] opacity-50">
                  이탈 없음 — 모든 유권자가 원래 지지 후보를 선택했습니다.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {defectorRows.map(({ candidate, count, topAge, topOri, topTo }) => (
                    <div
                      key={candidate}
                      className="bg-[var(--code-bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-xs flex flex-wrap gap-x-3 gap-y-0.5"
                    >
                      <span>
                        <span className="font-semibold" style={{ color: COLORS[candidate] }}>{candidate}</span>
                        <span className="text-[var(--text-h)]"> 이탈자 {count}명</span>
                      </span>
                      {topAge && <span className="text-[var(--text)]">연령 {topAge.label} {topAge.pct}%</span>}
                      {topOri && <span className="text-[var(--text)]">성향 {topOri.label} {topOri.pct}%</span>}
                      {topTo && (
                        <span className="text-[var(--text)]">
                          → <span style={{ color: COLORS[topTo.label] }}>{topTo.label}</span> {topTo.pct}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-semibold text-[var(--text-h)] uppercase tracking-wide">
                  ③ 전체 응답 목록
                </p>
                <button
                  onClick={() => setShowAll((p) => !p)}
                  className="text-xs text-[var(--accent)] hover:opacity-75 cursor-pointer"
                >
                  {showAll ? "▲ 접기" : `▼ 펼치기 (${logs.length}명)`}
                </button>
              </div>
              {showAll && (
                <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[var(--code-bg)] border-b border-[var(--border)]">
                        {["거주동","연령대","성별","성향","강도","원래지지","최종응답","이탈"].map(h => (
                          <th key={h} className="text-left px-2.5 py-2 font-semibold text-[var(--text)]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((v, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-[var(--border)] last:border-0 ${v.이탈 ? "bg-red-500/5" : ""}`}
                        >
                          <td className="px-2.5 py-1.5 text-[var(--text)]">{v.거주동}</td>
                          <td className="px-2.5 py-1.5 text-[var(--text)]">{v.연령대}</td>
                          <td className="px-2.5 py-1.5 text-[var(--text)]">{v.성별}</td>
                          <td className="px-2.5 py-1.5 text-[var(--text)]">{v.정치성향}</td>
                          <td className="px-2.5 py-1.5 text-center text-[var(--text)]">{v.지지강도}</td>
                          <td className="px-2.5 py-1.5 font-medium" style={{ color: COLORS[v.원래지지] ?? "var(--text)" }}>
                            {v.원래지지}
                          </td>
                          <td className="px-2.5 py-1.5 font-medium" style={{ color: COLORS[v.최종응답] ?? "var(--text)" }}>
                            {v.최종응답}
                          </td>
                          <td className="px-2.5 py-1.5 text-center">
                            {v.이탈
                              ? <span className="text-red-400 font-medium">이탈</span>
                              : <span className="text-[var(--text)] opacity-30">—</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 히스토리 포맷 ─────────────────────────────────────────────────────────────

function formatHistory(raw) {
  return raw.map((h, i) => ({
    label: `#${i + 1} (n=${h.sample_size})`,
    date: h.date,
    question: h.question ?? "",
    하정우: h.results?.하정우?.pct ?? 0,
    한동훈: h.results?.한동훈?.pct ?? 0,
    박민식: h.results?.박민식?.pct ?? 0,
    무응답: h.results?.무응답?.pct ?? 0,
    n: h.sample_size,
    moe: h.moe,
    voter_logs: h.log ?? h.voter_logs ?? [],
  }));
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function PollTab() {
  const [question, setQuestion] = useState("세 후보 중 누구를 지지하십니까?");
  const [sampleSize, setSampleSize] = useState(100);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [detailEntry, setDetailEntry] = useState(null);

  const estimatedSecs = Math.max(3, Math.round(sampleSize / 10));

  const loadHistoryData = async () => {
    setHistoryLoading(true);
    let raw = loadHistory();
    if (raw.length === 0) {
      try {
        const res = await fetch(`${API_BASE}/api/poll-history`);
        if (res.ok) {
          const serverData = await res.json();
          if (Array.isArray(serverData) && serverData.length > 0) {
            raw = normalizeServerHistory(serverData);
            saveHistory(raw);
          }
        }
      } catch { /* 서버 오프라인 허용 */ }
    }
    setHistory(formatHistory(raw));
    setHistoryLoading(false);
  };

  useEffect(() => { loadHistoryData(); }, []);
  useEffect(() => () => clearInterval(timerRef.current), []);

  const startPoll = async () => {
    setRunning(true);
    setProgress(0);
    setResult(null);
    setError(null);

    let elapsed = 0;
    const totalMs = estimatedSecs * 1000;
    timerRef.current = setInterval(() => {
      elapsed += 200;
      setProgress(Math.min(95, (elapsed / totalMs) * 100));
    }, 200);

    try {
      const res = await fetch(`${API_BASE}/api/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, sample_size: sampleSize }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "서버 오류");
      }
      const data = await res.json();
      setProgress(100);
      setResult(data);
      appendRound(data);
      setHistory(formatHistory(loadHistory()));
    } catch (e) {
      setError(e.message);
    } finally {
      clearInterval(timerRef.current);
      setRunning(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* ── 조사 설정 폼 ── */}
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-base font-bold text-[var(--text-h)] mb-1">갤럽식 여론조사</h2>
          <p className="text-xs text-[var(--text)]">
            유권자 표본을 추출해 Claude가 각 유권자 페르소나로 답변합니다.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-[var(--text-h)] mb-1.5 uppercase tracking-wide">
            질문
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={running}
            rows={2}
            className="w-full text-sm px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--code-bg)] text-[var(--text-h)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none placeholder:text-[var(--text)] disabled:opacity-60"
            placeholder="유권자에게 물을 질문을 입력하세요..."
          />
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[var(--text-h)] uppercase tracking-wide">
              표본 수
            </label>
            <CostBadge n={sampleSize} />
          </div>
          <div className="flex gap-2">
            {SAMPLE_SIZES.map((n) => (
              <button
                key={n}
                onClick={() => setSampleSize(n)}
                disabled={running}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  sampleSize === n
                    ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                    : "bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                {n >= 1000 ? `${n / 1000}K` : n}명
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text)] mt-1.5 opacity-60">
            예상 소요 시간: 약 {estimatedSecs}초 · {sampleSize > 200 ? "복원추출 (모집단 시뮬레이션)" : "비복원추출"}
          </p>
        </div>

        <button
          onClick={startPoll}
          disabled={running || !question.trim()}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--accent)] text-white hover:opacity-90"
        >
          {running ? "조사 진행 중..." : "조사 시작"}
        </button>

        {running && (
          <ProgressBar
            progress={progress}
            label={`Claude가 ${sampleSize}명 유권자 응답 분석 중...`}
          />
        )}

        {error && (
          <div className="mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            오류: {error}
          </div>
        )}

        {result && <ResultChart result={result} />}
      </div>

      {/* ── 여론조사 결과 섹션 ── */}
      {!historyLoading && history.length > 0 && (
        <div className="border-t border-[var(--border)] px-8 py-10 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-[var(--text-h)]">여론조사 결과</h2>
              <p className="text-xs text-[var(--text)]">
                유펜 시뮬레이션 누적 결과 · {history.length}회차
              </p>
            </div>
            <button
              onClick={loadHistoryData}
              className="text-xs text-[var(--text)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              새로고침
            </button>
          </div>

          {/* 추이 차트 */}
          {history.length > 1 && (
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-6 mb-6">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text)" }} />
                    <YAxis unit="%" domain={[0, 65]} tick={{ fontSize: 10, fill: "var(--text)" }} />
                    <Tooltip
                      formatter={(v, name) => [`${v}%`, name]}
                      contentStyle={{
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="하정우" stroke={COLORS.하정우} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="한동훈" stroke={COLORS.한동훈} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="박민식" stroke={COLORS.박민식} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="무응답" stroke={COLORS.무응답} strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 기록 테이블 */}
          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--code-bg)]">
                  <th className="text-left px-4 py-2.5 font-semibold text-[var(--text-h)]">회차</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[var(--text)]">날짜</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[var(--text)]">질문</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-[var(--text)]">n</th>
                  <th className="text-right px-4 py-2.5 font-semibold" style={{ color: COLORS.하정우 }}>하정우</th>
                  <th className="text-right px-4 py-2.5 font-semibold" style={{ color: COLORS.한동훈 }}>한동훈</th>
                  <th className="text-right px-4 py-2.5 font-semibold" style={{ color: COLORS.박민식 }}>박민식</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-[var(--text)]">무응답</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => {
                  const prev = i > 0 ? history[i - 1] : null;
                  const q = h.question;
                  const truncQ = q.length > 18 ? q.slice(0, 18) + "…" : q;
                  return (
                    <tr
                      key={i}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--code-bg)] transition-colors"
                    >
                      <td className="px-4 py-2.5 text-[var(--text-h)] font-medium">#{i + 1}</td>
                      <td className="px-4 py-2.5 text-[var(--text)]">{h.date}</td>
                      <td
                        className="px-4 py-2.5 text-[var(--text)] max-w-[180px]"
                        title={q}
                      >
                        {truncQ || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[var(--text)]">{h.n}</td>
                      <td className="px-4 py-2.5 text-right font-semibold" style={{ color: COLORS.하정우 }}>
                        {h.하정우}%{prev && <DeltaBadge curr={h.하정우} prev={prev.하정우} />}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold" style={{ color: COLORS.한동훈 }}>
                        {h.한동훈}%{prev && <DeltaBadge curr={h.한동훈} prev={prev.한동훈} />}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold" style={{ color: COLORS.박민식 }}>
                        {h.박민식}%{prev && <DeltaBadge curr={h.박민식} prev={prev.박민식} />}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[var(--text)]">
                        {h.무응답}%{prev && <DeltaBadge curr={h.무응답} prev={prev.무응답} />}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {h.voter_logs.length > 0 ? (
                          <button
                            onClick={() => setDetailEntry({ entry: h, index: i })}
                            className="text-[10px] text-[var(--accent)] hover:opacity-70 cursor-pointer whitespace-nowrap"
                          >
                            상세보기
                          </button>
                        ) : (
                          <span className="text-[10px] text-[var(--text)] opacity-30 whitespace-nowrap select-none">
                            로그없음
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailEntry && (
        <PollLogModal
          entry={detailEntry.entry}
          index={detailEntry.index}
          onClose={() => setDetailEntry(null)}
        />
      )}
    </div>
  );
}

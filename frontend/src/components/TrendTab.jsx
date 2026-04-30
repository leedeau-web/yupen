import { useState, useEffect } from "react";
import { API_BASE } from "../config";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer,
} from "recharts";

const COLORS = {
  하정우: "#3b82f6",
  한동훈: "#f59e0b",
  박민식: "#ef4444",
  무응답: "#9ca3af",
};

function DeltaBadge({ curr, prev }) {
  const diff = Math.round(curr - prev);
  if (diff > 0)
    return <span style={{ color: "#22c55e" }} className="ml-1 font-normal">(+{diff}%p)</span>;
  if (diff < 0)
    return <span style={{ color: "#ef4444" }} className="ml-1 font-normal">({diff}%p)</span>;
  return <span style={{ color: "#9ca3af" }} className="ml-1 font-normal">(±0)</span>;
}

function PollLogModal({ entry, index, onClose }) {
  const [showAll, setShowAll] = useState(false);
  const logs = entry.voter_logs ?? [];
  const CANDS = ["하정우", "한동훈", "박민식", "무응답"];

  // ① 후보별 유입·이탈 집계
  const summary = CANDS.map((c) => ({
    name: c,
    original: logs.filter((v) => v.원래지지 === c).length,
    final: logs.filter((v) => v.최종응답 === c).length,
    inflow: logs.filter((v) => v.원래지지 !== c && v.최종응답 === c).length,
    outflow: logs.filter((v) => v.원래지지 === c && v.최종응답 !== c).length,
  }));
  const mijeongCount = logs.filter((v) => v.원래지지 === "미정").length;

  // ② 이탈자 세그먼트
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
        {/* 헤더 */}
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

            {/* ① 후보별 유입·이탈 */}
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
                        <td className="px-3 py-2 font-semibold" style={{ color: COLORS[name] }}>
                          {name}
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--text)]">{original}명</td>
                        <td className="px-3 py-2 text-right font-semibold text-[var(--text-h)]">
                          {final}명
                        </td>
                        <td className="px-3 py-2 text-right text-green-500">
                          {inflow > 0 ? `+${inflow}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-red-500">
                          {outflow > 0 ? `−${outflow}` : "—"}
                        </td>
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

            {/* ② 이탈자 세그먼트 */}
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
                        <span className="font-semibold" style={{ color: COLORS[candidate] }}>
                          {candidate}
                        </span>
                        <span className="text-[var(--text-h)]"> 이탈자 {count}명</span>
                      </span>
                      {topAge && (
                        <span className="text-[var(--text)]">연령 {topAge.label} {topAge.pct}%</span>
                      )}
                      {topOri && (
                        <span className="text-[var(--text)]">성향 {topOri.label} {topOri.pct}%</span>
                      )}
                      {topTo && (
                        <span className="text-[var(--text)]">
                          → <span style={{ color: COLORS[topTo.label] }}>{topTo.label}</span>{" "}
                          {topTo.pct}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ③ 전체 응답 목록 */}
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
                        <th className="text-left px-2.5 py-2 font-semibold text-[var(--text)]">거주동</th>
                        <th className="text-left px-2.5 py-2 font-semibold text-[var(--text)]">연령대</th>
                        <th className="text-left px-2.5 py-2 font-semibold text-[var(--text)]">성별</th>
                        <th className="text-left px-2.5 py-2 font-semibold text-[var(--text)]">성향</th>
                        <th className="text-center px-2.5 py-2 font-semibold text-[var(--text)]">강도</th>
                        <th className="text-left px-2.5 py-2 font-semibold text-[var(--text)]">원래지지</th>
                        <th className="text-left px-2.5 py-2 font-semibold text-[var(--text)]">최종응답</th>
                        <th className="text-center px-2.5 py-2 font-semibold text-[var(--text)]">이탈</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((v, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-[var(--border)] last:border-0 ${
                            v.이탈 ? "bg-red-500/5" : ""
                          }`}
                        >
                          <td className="px-2.5 py-1.5 text-[var(--text)]">{v.거주동}</td>
                          <td className="px-2.5 py-1.5 text-[var(--text)]">{v.연령대}</td>
                          <td className="px-2.5 py-1.5 text-[var(--text)]">{v.성별}</td>
                          <td className="px-2.5 py-1.5 text-[var(--text)]">{v.정치성향}</td>
                          <td className="px-2.5 py-1.5 text-center text-[var(--text)]">{v.지지강도}</td>
                          <td
                            className="px-2.5 py-1.5 font-medium"
                            style={{ color: COLORS[v.원래지지] ?? "var(--text)" }}
                          >
                            {v.원래지지}
                          </td>
                          <td
                            className="px-2.5 py-1.5 font-medium"
                            style={{ color: COLORS[v.최종응답] ?? "var(--text)" }}
                          >
                            {v.최종응답}
                          </td>
                          <td className="px-2.5 py-1.5 text-center">
                            {v.이탈 ? (
                              <span className="text-red-400 font-medium">이탈</span>
                            ) : (
                              <span className="text-[var(--text)] opacity-30">—</span>
                            )}
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

export default function TrendTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailEntry, setDetailEntry] = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/poll-history`)
      .then(r => r.json())
      .then(data => {
        const formatted = data.map((h, i) => ({
          label: `#${i + 1} (n=${h.sample_size})`,
          date: h.date,
          하정우: h.results?.하정우?.pct ?? 0,
          한동훈: h.results?.한동훈?.pct ?? 0,
          박민식: h.results?.박민식?.pct ?? 0,
          무응답: h.results?.무응답?.pct ?? 0,
          n: h.sample_size,
          moe: h.moe,
          question: h.question,
          voter_logs: h.voter_logs ?? [],
        }));
        setHistory(formatted);
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text)] text-sm">
        불러오는 중...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[var(--text)] p-8">
        <p className="text-sm">아직 조사 기록이 없습니다.</p>
        <p className="text-xs opacity-60">여론조사 탭에서 조사를 실행하면 여기에 추이가 쌓입니다.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-[var(--text-h)]">여론조사 지지율 추이</h2>
          <p className="text-xs text-[var(--text)]">유펜 시뮬레이션 누적 결과 · {history.length}회</p>
        </div>
        <button
          onClick={load}
          className="text-xs text-[var(--text)] hover:text-[var(--accent)] transition-colors cursor-pointer"
        >
          새로고침
        </button>
      </div>

      {/* 차트 */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-6">
        <div className="h-80 w-full">
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
              {/* 실제 여론조사 기준선 — 여론조사꽃 2026-04-26~27 (3차, 최신) */}
              <ReferenceLine
                y={44.0}
                stroke={COLORS.하정우}
                strokeDasharray="5 5"
                label={{ value: "실제 44.0%", fill: COLORS.하정우, fontSize: 10, position: "right" }}
              />
              <ReferenceLine
                y={22.9}
                stroke={COLORS.한동훈}
                strokeDasharray="5 5"
                label={{ value: "실제 22.9%", fill: COLORS.한동훈, fontSize: 10, position: "right" }}
              />
              <ReferenceLine
                y={24.5}
                stroke={COLORS.박민식}
                strokeDasharray="5 5"
                label={{ value: "실제 24.5%", fill: COLORS.박민식, fontSize: 10, position: "right" }}
              />
              <Line type="monotone" dataKey="하정우" stroke={COLORS.하정우} strokeWidth={2.5} dot={{ r: 5 }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="한동훈" stroke={COLORS.한동훈} strokeWidth={2.5} dot={{ r: 5 }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="박민식" stroke={COLORS.박민식} strokeWidth={2.5} dot={{ r: 5 }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="무응답" stroke={COLORS.무응답} strokeWidth={1.5} dot={{ r: 4 }} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-[var(--text)] opacity-50 mt-3">
          점선: 여론조사꽃 2026-04-26~27 (3차, n=503) 실제 여론조사 기준값
        </p>
      </div>

      {/* 기록 테이블 */}
      <div className="mt-6 border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--code-bg)]">
              <th className="text-left px-4 py-2.5 font-semibold text-[var(--text-h)]">회차</th>
              <th className="text-left px-4 py-2.5 font-semibold text-[var(--text)]">날짜</th>
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
              return (
                <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--code-bg)] transition-colors">
                  <td className="px-4 py-2.5 text-[var(--text-h)] font-medium">#{i + 1}</td>
                  <td className="px-4 py-2.5 text-[var(--text)]">{h.date}</td>
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

      {/* 상세 로그 모달 */}
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

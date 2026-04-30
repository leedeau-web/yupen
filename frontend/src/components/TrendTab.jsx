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

export default function TrendTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

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
              {/* 실제 여론조사 기준선 — 미디어토마토 2026-04-24~25 */}
              <ReferenceLine
                y={43.8}
                stroke={COLORS.하정우}
                strokeDasharray="5 5"
                label={{ value: "실제 43.8%", fill: COLORS.하정우, fontSize: 10, position: "right" }}
              />
              <ReferenceLine
                y={35.9}
                stroke={COLORS.한동훈}
                strokeDasharray="5 5"
                label={{ value: "실제 35.9%", fill: COLORS.한동훈, fontSize: 10, position: "right" }}
              />
              <Line type="monotone" dataKey="하정우" stroke={COLORS.하정우} strokeWidth={2.5} dot={{ r: 5 }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="한동훈" stroke={COLORS.한동훈} strokeWidth={2.5} dot={{ r: 5 }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="박민식" stroke={COLORS.박민식} strokeWidth={2.5} dot={{ r: 5 }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="무응답" stroke={COLORS.무응답} strokeWidth={1.5} dot={{ r: 4 }} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-[var(--text)] opacity-50 mt-3">
          점선: 미디어토마토 2026-04-24~25 실제 여론조사 기준값
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

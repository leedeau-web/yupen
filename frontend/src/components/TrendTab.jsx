import { useState, useEffect } from "react";
import { API_BASE } from "../config";
import { saveDailySnapshot, loadAllSnapshots, hasTodaySnapshot } from "../utils/minsimStorage";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// 나중에 단일화 시 candidates 배열만 수정하면 됨
const CANDIDATES = [
  { key: "하정우", color: "#3b82f6", dash: false },
  { key: "한동훈", color: "#ef4444", dash: false },
  { key: "박민식", color: "#8b5cf6", dash: false },
  { key: "미정",   color: "#9ca3af", dash: true  },
];

function toMMDD(dateStr) {
  return dateStr.slice(5).replace("-", "/");
}

async function fetchSnapshot(date) {
  const res = await fetch(`${API_BASE}/api/voters?limit=2000`);
  if (!res.ok) throw new Error("API 오류");
  const data = await res.json();
  const voters = data.voters ?? [];

  const counts = {};
  CANDIDATES.forEach(({ key }) => { counts[key] = 0; });
  voters.forEach(v => {
    if (v.지지후보 in counts) counts[v.지지후보]++;
  });

  const total = voters.length || 1;
  const snapshot = { date };
  CANDIDATES.forEach(({ key }) => {
    snapshot[key] = Math.round((counts[key] / total) * 1000) / 10;
  });

  saveDailySnapshot(snapshot);
  return snapshot;
}

export default function TrendTab() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const today = new Date().toISOString().slice(0, 10);

  const initialize = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!hasTodaySnapshot()) {
        await fetchSnapshot(today);
      }
    } catch (e) {
      setError("스냅샷 생성 실패: " + e.message);
    }
    setSnapshots(loadAllSnapshots());
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await fetchSnapshot(today);
      setSnapshots(loadAllSnapshots());
    } catch (e) {
      setError("새로고침 실패: " + e.message);
    }
    setRefreshing(false);
  };

  useEffect(() => { initialize(); }, []);

  const chartData = snapshots.map(s => ({ ...s, label: toMMDD(s.date) }));
  const todaySnap = snapshots.find(s => s.date === today);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text)] text-sm">
        민심 스냅샷 로딩 중...
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-[var(--text-h)]">민심동향 그래프</h2>
          <p className="text-xs text-[var(--text)]">
            122,440명 DB 기준 일별 지지율 추이 · {snapshots.length}일 누적
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs text-[var(--text)] hover:text-[var(--accent)] transition-colors cursor-pointer disabled:opacity-50"
        >
          {refreshing ? "새로고침 중..." : "수동 새로고침"}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* 오늘 지지율 요약 카드 */}
      {todaySnap && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {CANDIDATES.map(({ key, color }) => (
            <div
              key={key}
              className="bg-[var(--code-bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-center"
            >
              <p className="text-xs text-[var(--text)] mb-1">{key}</p>
              <p className="text-2xl font-bold" style={{ color }}>{todaySnap[key]}%</p>
            </div>
          ))}
        </div>
      )}

      {/* 추이 차트 */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-6">
        {chartData.length > 1 ? (
          <>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text)" }} />
                  <YAxis unit="%" domain={[0, 60]} tick={{ fontSize: 11, fill: "var(--text)" }} />
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
                  {CANDIDATES.map(({ key, color, dash }) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={color}
                      strokeWidth={2.5}
                      strokeDasharray={dash ? "5 5" : undefined}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-[var(--text)] opacity-50 mt-3">
              매일 오전 12시 기준 · 표본 2,000명 집계 · 점선: 미정
            </p>
          </>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text)] opacity-60">
            <span>데이터가 2일 이상 쌓이면 추이 그래프가 표시됩니다.</span>
            {todaySnap && (
              <span className="opacity-80">
                오늘({toMMDD(today)}) 스냅샷 저장 완료 — 내일부터 추이가 표시됩니다.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

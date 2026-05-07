const SENTIMENT_FILTERS = {
  거주동: ["구포1동", "구포2동", "구포3동", "덕천1동", "덕천2동", "덕천3동", "만덕2동", "만덕3동"],
  연령대: ["20대", "30대", "40대", "50대", "60대", "70대이상"],
  성별: ["남", "여"],
};

const EXTRA_FILTERS = {
  지지후보: ["하정우", "한동훈", "박민식", "미정"],
  정치성향: ["진보", "중도", "보수"],
  지지강도: ["1", "2", "3", "4", "5"],
};

const CANDIDATE_BAR_COLORS = {
  하정우: "bg-indigo-500",
  한동훈: "bg-amber-500",
  박민식: "bg-red-500",
  미정:   "bg-gray-400",
};

const CANDIDATES = ["하정우", "한동훈", "박민식", "미정"];

function getStatus(stats) {
  if (!stats) return null;
  const sorted = CANDIDATES.map(c => ({ id: c, pct: stats[c]?.pct ?? 0 })).sort((a, b) => b.pct - a.pct);
  const top = sorted[0], second = sorted[1];
  const gap = top.pct - second.pct;
  if (top.id === "한동훈" && gap >= 8)
    return { icon: "✓", label: "한동훈 우세", sub: `격차 ${gap.toFixed(1)}%p — 안정권`, bg: "bg-green-50", border: "border-green-300", text: "text-green-800", subText: "text-green-600" };
  if (top.id === "한동훈" && gap < 8)
    return { icon: "△", label: "한동훈 우세 (박빙)", sub: `격차 ${gap.toFixed(1)}%p — 추가 공략 필요`, bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-800", subText: "text-yellow-600" };
  if (top.id === "박민식")
    return { icon: "⚠", label: "박민식 우세", sub: `격차 ${gap.toFixed(1)}%p — 보수 표 분열`, bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-800", subText: "text-orange-600" };
  if (top.id === "하정우")
    return { icon: "✕", label: "하정우 우세", sub: `격차 ${gap.toFixed(1)}%p — 경쟁 후보 선두`, bg: "bg-red-50", border: "border-red-300", text: "text-red-800", subText: "text-red-600" };
  return { icon: "?", label: "미정 다수", sub: "지지층 미형성", bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-600", subText: "text-gray-400" };
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
        active
          ? "bg-[var(--accent)] text-white border-[var(--accent)]"
          : "bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      }`}
    >
      {label}
    </button>
  );
}

export default function FilterPanel({
  filters, onChange,
  sentimentStats, sentimentLoading, hasSentimentFilter, sentimentFilters,
  filteredTotal,
}) {
  const toggle = (key, value) => {
    const isMulti = ['거주동', '연령대', '성별'].includes(key);
    if (isMulti) {
      const arr = filters[key] ?? [];
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      onChange({ ...filters, [key]: next });
    } else {
      onChange({ ...filters, [key]: filters[key] === value ? null : value });
    }
  };

  const reset = () => {
    onChange({ 거주동: [], 연령대: [], 성별: [], 지지후보: null, 정치성향: null, 지지강도: null });
  };

  const status = getStatus(sentimentStats);

  // 민심 기준 표시 라벨
  const sentimentLabel = hasSentimentFilter
    ? Object.values(sentimentFilters).flat().filter(Boolean).join(" · ")
    : "전체 122,440명";

  return (
    <aside className="w-56 shrink-0 flex flex-col gap-5">

      {/* ── 실시간 민심 섹션 ── */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-h)] mb-2 uppercase tracking-wide">
          실시간 민심
        </p>

        {/* 민심 상태 배지 */}
        {status && !sentimentLoading && (
          <div className={`rounded-lg border px-3 py-2.5 mb-3 flex items-start gap-2.5 ${status.bg} ${status.border}`}>
            <span className={`text-base font-black leading-none mt-0.5 ${status.text}`}>{status.icon}</span>
            <div>
              <p className={`text-xs font-bold ${status.text}`}>{status.label}</p>
              <p className={`text-[10px] mt-0.5 ${status.subText}`}>{status.sub}</p>
            </div>
          </div>
        )}

        {/* 후보별 분포 바 */}
        {sentimentLoading ? (
          <div className="flex flex-col gap-2">
            {CANDIDATES.map(c => <div key={c} className="h-7 rounded bg-[var(--border)] animate-pulse" />)}
          </div>
        ) : sentimentStats ? (
          <div className="flex flex-col gap-2">
            {CANDIDATES
              .map(c => ({ id: c, ...sentimentStats[c] }))
              .sort((a, b) => b.pct - a.pct)
              .map((c, i) => {
                const isTarget = c.id === "한동훈";
                return (
                  <div key={c.id} className={isTarget ? "rounded-md px-1.5 py-1 -mx-1.5 bg-amber-50" : ""}>
                    <div className="flex justify-between text-xs mb-0.5 items-center">
                      <span className={`font-medium flex items-center gap-1 ${isTarget ? "text-amber-700" : "text-[var(--text-h)]"}`}>
                        <span className="opacity-40 text-[10px]">{["①","②","③","④"][i]}</span>
                        {c.id}
                        {isTarget && <span className="text-[9px] bg-amber-500 text-white px-1 rounded font-bold">목표</span>}
                      </span>
                      <span className="text-[var(--text)]">
                        {(c.count ?? 0).toLocaleString()}명 <span className="font-semibold">{c.pct ?? 0}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--border)]">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${CANDIDATE_BAR_COLORS[c.id]}`}
                        style={{ width: `${c.pct ?? 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            <p className="text-[10px] text-[var(--text)] opacity-50 mt-0.5">{sentimentLabel} 기준</p>
          </div>
        ) : null}
      </div>

      {/* 거주동 */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-h)] mb-1.5 uppercase tracking-wide">거주동</p>
        <div className="flex flex-wrap gap-1.5">
          {SENTIMENT_FILTERS.거주동.map(opt => (
            <FilterChip key={opt} label={opt} active={(filters.거주동 ?? []).includes(opt)} onClick={() => toggle("거주동", opt)} />
          ))}
        </div>
      </div>

      {/* 연령대 */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-h)] mb-1.5 uppercase tracking-wide">연령대</p>
        <div className="flex flex-wrap gap-1.5">
          {SENTIMENT_FILTERS.연령대.map(opt => (
            <FilterChip key={opt} label={opt} active={(filters.연령대 ?? []).includes(opt)} onClick={() => toggle("연령대", opt)} />
          ))}
        </div>
      </div>

      {/* 성별 */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-h)] mb-1.5 uppercase tracking-wide">성별</p>
        <div className="flex flex-wrap gap-1.5">
          {SENTIMENT_FILTERS.성별.map(opt => (
            <FilterChip key={opt} label={opt} active={(filters.성별 ?? []).includes(opt)} onClick={() => toggle("성별", opt)} />
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* ── 상세 필터 섹션 ── */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-h)] mb-3 uppercase tracking-wide">상세 필터</p>
        <div className="flex flex-col gap-4">
          {Object.entries(EXTRA_FILTERS).map(([key, options]) => (
            <div key={key}>
              <p className="text-xs text-[var(--text)] mb-1.5 font-medium">{key}</p>
              <div className="flex flex-wrap gap-1.5">
                {options.map(opt => (
                  <FilterChip key={opt} label={opt} active={filters[key] === opt} onClick={() => toggle(key, opt)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* 결과 요약 + 초기화 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--text-h)] font-medium">
          {filteredTotal.toLocaleString()}명
        </span>
        <button
          onClick={reset}
          className="text-xs text-[var(--text)] hover:text-[var(--accent)] transition-colors cursor-pointer"
        >
          필터 초기화
        </button>
      </div>
    </aside>
  );
}

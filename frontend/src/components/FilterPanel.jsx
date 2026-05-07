const FILTER_OPTIONS = {
  거주동: ["구포1동", "구포2동", "구포3동", "덕천1동", "덕천2동", "덕천3동", "만덕2동", "만덕3동"],
  연령대: ["20대", "30대", "40대", "50대", "60대", "70대이상"],
  성별: ["남", "여"],
  지지후보: ["하정우", "한동훈", "박민식", "미정"],
  정치성향: ["진보", "중도", "보수"],
  지지강도: ["1", "2", "3", "4", "5"],
};

const CANDIDATE_BAR_COLORS = {
  하정우: "bg-blue-500",
  한동훈: "bg-amber-500",
  박민식: "bg-red-500",
  미정: "bg-gray-400",
};

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

// stats: { 하정우: {count, pct}, 한동훈: ..., 박민식: ..., 미정: ... } | null
// filteredTotal: 현재 필터 기준 DB 총 인원
export default function FilterPanel({ filters, onChange, stats, filteredTotal }) {
  const toggle = (key, value) => {
    onChange({ ...filters, [key]: filters[key] === value ? null : value });
  };

  const reset = () => {
    onChange({ 거주동: null, 연령대: null, 성별: null, 지지후보: null, 정치성향: null, 지지강도: null });
  };

  const candidates = ["하정우", "한동훈", "박민식", "미정"];

  return (
    <aside className="w-56 shrink-0 flex flex-col gap-5">
      {/* 지지후보 분포 — 122,440명 전체 기준 */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-h)] mb-2 uppercase tracking-wide">
          지지후보 분포
        </p>
        {stats === null ? (
          <div className="flex flex-col gap-2">
            {candidates.map(c => (
              <div key={c} className="h-8 rounded bg-[var(--border)] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {candidates.map(c => {
              const { count, pct } = stats[c] ?? { count: 0, pct: 0 };
              return (
                <div key={c}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-[var(--text-h)] font-medium">{c}</span>
                    <span className="text-[var(--text)]">
                      {count.toLocaleString()}명 {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--border)]">
                    <div
                      className={`h-1.5 rounded-full ${CANDIDATE_BAR_COLORS[c]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-[var(--text)] opacity-50 mt-0.5">
              전체 122,440명 기준
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* 필터 섹션 */}
      <div className="flex flex-col gap-4">
        {Object.entries(FILTER_OPTIONS).map(([key, options]) => (
          <div key={key}>
            <p className="text-xs font-semibold text-[var(--text-h)] mb-1.5 uppercase tracking-wide">{key}</p>
            <div className="flex flex-wrap gap-1.5">
              {options.map(opt => (
                <FilterChip
                  key={opt}
                  label={opt}
                  active={filters[key] === opt}
                  onClick={() => toggle(key, opt)}
                />
              ))}
            </div>
          </div>
        ))}
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

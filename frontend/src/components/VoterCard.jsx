import { CANDIDATE_COLORS, SPEECH_COLORS } from "../data/mockVoters";

const ISSUE_ICONS = {
  부동산: "🏠", 일자리: "💼", 복지: "🏥", 교육: "📚", 안보: "🛡️",
};

function IntensityDots({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${i <= value ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
        />
      ))}
    </div>
  );
}

export default function VoterCard({ voter, onClick }) {
  const cc = CANDIDATE_COLORS[voter.지지후보] ?? CANDIDATE_COLORS["미정"];
  const sc = SPEECH_COLORS[voter.말투특성] ?? SPEECH_COLORS["무관심"];

  return (
    <button
      onClick={() => onClick(voter)}
      className="text-left w-full rounded-xl border border-[var(--border)] p-4 hover:border-[var(--accent-border)] hover:shadow-[var(--shadow)] transition-all cursor-pointer bg-[var(--bg)] group"
    >
      {/* 상단: 이름 + 지지후보 뱃지 */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-h)] group-hover:text-[var(--accent)] transition-colors">
            {voter.이름}
          </p>
          <p className="text-xs text-[var(--text)] mt-0.5">
            {voter.나이}세 · {voter.성별} · {voter.거주동}
          </p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${cc.bg} ${cc.text}`}>
          {voter.지지후보}
        </span>
      </div>

      {/* 직업 + 이슈 */}
      <p className="text-xs text-[var(--text)] mb-3">
        {voter.직업} · {ISSUE_ICONS[voter.주요관심이슈]}{voter.주요관심이슈}
      </p>

      {/* 하단: 말투특성 + 지지강도 */}
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
          {voter.말투특성}
        </span>
        <IntensityDots value={voter.지지강도} />
      </div>
    </button>
  );
}

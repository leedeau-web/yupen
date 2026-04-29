import { useState } from "react";
import { CANDIDATE_COLORS, SPEECH_COLORS } from "../data/mockVoters";
import { API_BASE } from "../config";

const EMOTION_COLORS = {
  긍정: "text-green-600 bg-green-50",
  부정: "text-red-600 bg-red-50",
  중립: "text-gray-600 bg-gray-50",
  불안: "text-amber-600 bg-amber-50",
  분노: "text-red-700 bg-red-50",
  기대: "text-blue-600 bg-blue-50",
  무관심: "text-gray-400 bg-gray-50",
};

const PRESET_QUESTIONS = [
  "세 후보 중 누가 가장 지역 경제에 도움이 될 것 같으세요?",
  "이번 선거에서 투표할 의향이 있으신가요?",
  "지지 후보를 바꿀 가능성이 있으신가요?",
  "가장 중요하게 생각하는 선거 이슈가 무엇인가요?",
  "한동훈 후보에 대해 어떻게 생각하시나요?",
];

export default function SurveyModal({ voter, onClose }) {
  const [question, setQuestion] = useState(PRESET_QUESTIONS[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!voter) return null;

  const cc = CANDIDATE_COLORS[voter.지지후보] ?? CANDIDATE_COLORS["미정"];
  const sc = SPEECH_COLORS[voter.말투특성] ?? SPEECH_COLORS["무관심"];

  const simulate = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voter_id: voter.id, question }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "서버 오류");
      }
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--bg)] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--border)] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-[var(--text-h)]">{voter.이름}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cc.bg} ${cc.text}`}>
                {voter.지지후보}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                {voter.말투특성}
              </span>
            </div>
            <p className="text-xs text-[var(--text)]">
              {voter.나이}세 · {voter.성별} · {voter.거주동} · {voter.직업} · {voter.정치성향}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text)] hover:text-[var(--text-h)] text-xl leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* 바디 */}
        <div className="p-5 flex flex-col gap-4">
          {/* 프리셋 질문 */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-h)] mb-2 uppercase tracking-wide">질문 선택</p>
            <div className="flex flex-col gap-1.5">
              {PRESET_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => { setQuestion(q); setResult(null); setError(null); }}
                  className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                    question === q
                      ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--text)] hover:border-[var(--accent-border)]"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* 직접 입력 */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-h)] mb-1.5 uppercase tracking-wide">직접 입력</p>
            <textarea
              value={question}
              onChange={(e) => { setQuestion(e.target.value); setResult(null); setError(null); }}
              rows={2}
              className="w-full text-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--code-bg)] text-[var(--text-h)] resize-none focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          {/* 시뮬레이션 버튼 */}
          <button
            onClick={simulate}
            disabled={loading || !question.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--accent)] hover:opacity-90"
          >
            {loading ? "응답 생성 중..." : "전화 여론조사 시뮬레이션"}
          </button>

          {/* 로딩 */}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[var(--text)]">
              <span className="animate-pulse">●</span>
              <span>{voter.이름}님이 응답 중입니다...</span>
            </div>
          )}

          {/* 오류 */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
              오류: {error}
            </div>
          )}

          {/* 결과 */}
          {result && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--code-bg)] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs text-[var(--text)]">
                <span className="font-medium text-[var(--text-h)]">{voter.이름}</span>
                <span>·</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EMOTION_COLORS[result.emotion] ?? "text-gray-600 bg-gray-50"}`}>
                  {result.emotion}
                </span>
                <span className="ml-auto text-[var(--text)]">
                  설득가능성 <span className="font-semibold text-[var(--text-h)]">{Math.round(result.persuasibility * 100)}%</span>
                </span>
              </div>
              <p className="text-sm text-[var(--text-h)] leading-relaxed">
                "{result.response}"
              </p>
              <div className="h-1.5 rounded-full bg-[var(--border)]">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${result.persuasibility * 100}%`,
                    background: result.persuasibility > 0.6 ? "#22c55e" : result.persuasibility > 0.3 ? "#f59e0b" : "#9ca3af",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

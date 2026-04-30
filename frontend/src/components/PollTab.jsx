import { useState, useEffect, useRef } from "react";
import { API_BASE } from "../config";
import { appendRound } from "../utils/historyStorage";

const SAMPLE_SIZES = [50, 100, 200, 500, 1000];

const CANDIDATE_COLORS = {
  하정우: { bar: "bg-blue-500", text: "text-blue-500", border: "border-blue-500" },
  한동훈: { bar: "bg-amber-500", text: "text-amber-500", border: "border-amber-500" },
  박민식: { bar: "bg-red-500", text: "text-red-500", border: "border-red-500" },
  무응답: { bar: "bg-gray-400", text: "text-gray-400", border: "border-gray-400" },
};

// 여론조사꽃 2026-04-26~27 기준치 (3차, 최신)
const REFERENCE = { 하정우: 44.0, 한동훈: 22.9, 박민식: 24.5, 무응답: 7.0 };

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
                {/* 실제 결과 바 */}
                <div
                  className={`h-full rounded ${col.bar} transition-all duration-700 opacity-80`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
                {/* MoE 범위 표시 */}
                <div
                  className="absolute top-0 h-full border-l-2 border-r-2 border-white/40"
                  style={{
                    left: `${Math.max(0, pct - moe)}%`,
                    width: `${Math.min(moe * 2, 100 - Math.max(0, pct - moe))}%`,
                  }}
                />
                {/* 기준선 (미디어토마토) */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-white/70"
                  style={{ left: `${ref}%` }}
                  title={`미디어토마토 ${ref}%`}
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
          <span className="inline-block w-3 h-0.5 bg-white/70 border-t border-white/70" />
          기준선: 여론조사꽃 2026-04-26~27 (3차)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-3 border border-white/40 bg-transparent" />
          ±MoE 범위
        </span>
      </div>
    </div>
  );
}

export default function PollTab() {
  const [question, setQuestion] = useState("세 후보 중 누구를 지지하십니까?");
  const [sampleSize, setSampleSize] = useState(100);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const estimatedSecs = Math.max(3, Math.round(sampleSize / 10));

  const startPoll = async () => {
    setRunning(true);
    setProgress(0);
    setResult(null);
    setError(null);

    // 진행률 애니메이션 (실제 API 호출 동안)
    let elapsed = 0;
    const totalMs = estimatedSecs * 1000;
    timerRef.current = setInterval(() => {
      elapsed += 200;
      // 95%까지만 진행하다가 실제 응답 오면 100% 처리
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
    } catch (e) {
      setError(e.message);
    } finally {
      clearInterval(timerRef.current);
      setRunning(false);
    }
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-base font-bold text-[var(--text-h)] mb-1">갤럽식 여론조사</h2>
        <p className="text-xs text-[var(--text)]">
          유권자 표본을 추출해 Claude가 각 유권자 페르소나로 답변합니다.
        </p>
      </div>

      {/* 질문 입력 */}
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

      {/* 표본 수 선택 */}
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

      {/* 시작 버튼 */}
      <button
        onClick={startPoll}
        disabled={running || !question.trim()}
        className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--accent)] text-white hover:opacity-90"
      >
        {running ? "조사 진행 중..." : "조사 시작"}
      </button>

      {/* 진행률 */}
      {running && (
        <ProgressBar
          progress={progress}
          label={`Claude가 ${sampleSize}명 유권자 응답 분석 중...`}
        />
      )}

      {/* 오류 */}
      {error && (
        <div className="mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          오류: {error}
        </div>
      )}

      {/* 결과 */}
      {result && <ResultChart result={result} />}
    </div>
  );
}

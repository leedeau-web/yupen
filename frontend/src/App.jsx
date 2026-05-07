import { useState, useEffect } from "react";
import FilterPanel from "./components/FilterPanel";
import VoterCard from "./components/VoterCard";
import SurveyModal from "./components/SurveyModal";
import PollTab from "./components/PollTab";
import TrendTab from "./components/TrendTab";
import { API_BASE } from "./config";

const API = API_BASE;
const PAGE_SIZE = 50;

const TABS = [
  { id: "voters", label: "유권자 목록" },
  { id: "poll", label: "여론조사" },
  { id: "trend", label: "민심동향 그래프" },
];

const EMPTY_FILTERS = { 거주동: null, 연령대: null, 성별: null, 지지후보: null, 정치성향: null, 지지강도: null };

export default function App() {
  const [tab, setTab] = useState("voters");

  // 유권자 목록 상태
  const [voters, setVoters] = useState([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  // 전체 지지후보 통계 (122,440명 기준, 한 번만 로드)
  const [stats, setStats] = useState(null);

  const [selectedVoter, setSelectedVoter] = useState(null);

  // 전체 지지후보 분포 — 병렬 4회 호출
  const loadStats = async () => {
    const candidates = ["하정우", "한동훈", "박민식", "미정"];
    try {
      const results = await Promise.all(
        candidates.map(c =>
          fetch(`${API}/api/voters?지지후보=${encodeURIComponent(c)}&limit=1`)
            .then(r => r.json())
        )
      );
      const total = results.reduce((s, r) => s + (r.total ?? 0), 0);
      const obj = {};
      candidates.forEach((c, i) => {
        obj[c] = {
          count: results[i].total ?? 0,
          pct: total ? Math.round((results[i].total / total) * 1000) / 10 : 0,
        };
      });
      setStats(obj);
    } catch (e) {
      console.error("[yupen] stats 로드 실패:", e);
    }
  };

  // 유권자 목록 — 필터 + 페이지 기반
  const loadVoters = async (currentFilters, currentPage) => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(currentFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set("limit", PAGE_SIZE);
    params.set("offset", currentPage * PAGE_SIZE);
    try {
      const res = await fetch(`${API}/api/voters?${params}`);
      const data = await res.json();
      setVoters(data.voters ?? []);
      setFilteredTotal(data.total ?? 0);
    } catch (e) {
      console.error("[yupen] voters 로드 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    loadStats();
  }, []);

  // 필터 또는 페이지 변경 시 재로드
  useEffect(() => {
    loadVoters(filters, page);
  }, [filters, page]);

  // 필터 변경 시 페이지 리셋 (React 18 automatic batching으로 단일 effect 실행)
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  const totalPages = Math.ceil(filteredTotal / PAGE_SIZE);
  const from = filteredTotal === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, filteredTotal);

  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <header className="border-b border-[var(--border)] px-8 py-4 flex items-center justify-between sticky top-0 bg-[var(--bg)] z-10">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-h)]">
            유펜 <span className="text-[var(--accent)]">Yupen</span>
          </h1>
          <p className="text-xs text-[var(--text)]">부산 북구갑 유권자 페르소나 분석</p>
        </div>
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                tab === t.id
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text)] hover:text-[var(--text-h)] hover:bg-[var(--code-bg)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* 유권자 목록 탭 */}
      {tab === "voters" && (
        <div className="flex flex-1 gap-8 p-8">
          <FilterPanel
            filters={filters}
            onChange={handleFiltersChange}
            stats={stats}
            filteredTotal={filteredTotal}
          />
          <main className="flex-1 min-w-0">
            {/* 상단 요약 */}
            <p className="text-xs text-[var(--text)] mb-4">
              {loading
                ? "불러오는 중..."
                : filteredTotal > 0
                  ? `전체 ${filteredTotal.toLocaleString()}명 중 ${from.toLocaleString()}–${to.toLocaleString()}명 표시`
                  : "해당하는 유권자가 없습니다."
              }
            </p>

            {/* 유권자 카드 그리드 */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {voters.map(v => (
                <VoterCard key={v.id} voter={v} onClick={setSelectedVoter} />
              ))}
            </div>

            {/* 페이지네이션 */}
            {filteredTotal > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
                <span className="text-xs text-[var(--text)] opacity-70">
                  {page + 1} / {totalPages} 페이지
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 0 || loading}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    ← 이전
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page + 1 >= totalPages || loading}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    다음 →
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {tab === "poll" && <PollTab />}
      {tab === "trend" && <TrendTab />}

      {selectedVoter && (
        <SurveyModal voter={selectedVoter} onClose={() => setSelectedVoter(null)} />
      )}
    </div>
  );
}

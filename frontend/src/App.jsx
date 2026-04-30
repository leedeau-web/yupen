import { useState, useEffect } from "react";
import FilterPanel from "./components/FilterPanel";
import VoterCard from "./components/VoterCard";
import SurveyModal from "./components/SurveyModal";
import PollTab from "./components/PollTab";
import TrendTab from "./components/TrendTab";
import { API_BASE } from "./config";

const API = API_BASE;

const TABS = [
  { id: "voters", label: "유권자 목록" },
  { id: "poll", label: "여론조사" },
  { id: "trend", label: "추이 그래프" },
];

const EMPTY_FILTERS = { 거주동: null, 연령대: null, 성별: null, 지지후보: null, 정치성향: null, 지지강도: null };

export default function App() {
  const [tab, setTab] = useState("voters");
  const [allVoters, setAllVoters] = useState([]);
  const [filteredVoters, setFilteredVoters] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [loadingVoters, setLoadingVoters] = useState(true);

  // 최초 전체 유권자 로드
  useEffect(() => {
    fetch(`${API}/api/voters`)
      .then(r => r.json())
      .then(d => {
        setAllVoters(d.voters);
        setFilteredVoters(d.voters);
        setLoadingVoters(false);
      });
  }, []);

  // 필터 변경 시 API 재호출
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    fetch(`${API}/api/voters?${params}`)
      .then(r => r.json())
      .then(d => setFilteredVoters(d.voters));
  }, [filters]);

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
            onChange={setFilters}
            allVoters={allVoters}
            filteredCount={filteredVoters.length}
          />
          <main className="flex-1 min-w-0">
            <p className="text-xs text-[var(--text)] mb-4">
              {loadingVoters ? "불러오는 중..." : `${filteredVoters.length}명 표시 중`}
            </p>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredVoters.map(v => (
                <VoterCard key={v.id} voter={v} onClick={setSelectedVoter} />
              ))}
            </div>
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

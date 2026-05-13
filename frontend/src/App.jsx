import { useState, useEffect } from "react";
import FilterPanel from "./components/FilterPanel";
import VoterCard from "./components/VoterCard";
import SurveyModal from "./components/SurveyModal";
import PollTab from "./components/PollTab";
import TrendTab from "./components/TrendTab";
import AboutTab from "./components/AboutTab";
import FlowTab from "./components/FlowTab";
import { API_BASE } from "./config";

const API = API_BASE;
const PAGE_SIZE = 50;

const TABS = [
  { id: "voters", label: "유권자 목록" },
  { id: "poll",   label: "여론조사" },
  { id: "trend",  label: "민심동향 그래프" },
  { id: "flow",   label: "실시간 유동인구" },
  { id: "about",  label: "유펜 소개" },
];

const EMPTY_FILTERS = { 거주동: [], 연령대: [], 성별: [], 지지후보: null, 정치성향: null, 지지강도: null };

const CANDIDATES = ["하정우", "한동훈", "박민식", "미정"];

export default function App() {
  const [tab, setTab] = useState("voters");
  const [voters, setVoters] = useState([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  // 전체 기준 stats (초기 1회)
  const [globalStats, setGlobalStats] = useState(null);
  // 거주동+연령대+성별 기준 실시간 stats
  const [sentimentStats, setSentimentStats] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);

  const [selectedVoter, setSelectedVoter] = useState(null);

  // 민심 필터 (거주동+연령대+성별만 추출)
  const sentimentFilters = { 거주동: filters.거주동, 연령대: filters.연령대, 성별: filters.성별 };
  const hasSentimentFilter = Object.values(sentimentFilters).some(v => v.length > 0);

  // 전체 기준 stats — 초기 1회
  const loadGlobalStats = async () => {
    try {
      const results = await Promise.all(
        CANDIDATES.map(c =>
          fetch(`${API}/api/voters?지지후보=${encodeURIComponent(c)}&limit=1`).then(r => r.json())
        )
      );
      const total = results.reduce((s, r) => s + (r.total ?? 0), 0);
      const obj = {};
      CANDIDATES.forEach((c, i) => {
        obj[c] = { count: results[i].total ?? 0, pct: total ? Math.round((results[i].total / total) * 1000) / 10 : 0 };
      });
      setGlobalStats(obj);
      setSentimentStats(obj); // 초기값은 전체 기준
    } catch (e) { console.error("[yupen] globalStats 로드 실패:", e); }
  };

  // 거주동+연령대+성별 기준 실시간 stats
  const loadSentimentStats = async (sf) => {
    setSentimentLoading(true);
    const base = new URLSearchParams();
    Object.entries(sf).forEach(([k, arr]) => { arr.forEach(v => base.append(k, v)); });
    try {
      const results = await Promise.all(
        CANDIDATES.map(c => {
          const p = new URLSearchParams(base);
          p.set("지지후보", c);
          p.set("limit", "1");
          return fetch(`${API}/api/voters?${p}`).then(r => r.json());
        })
      );
      const total = results.reduce((s, r) => s + (r.total ?? 0), 0);
      const obj = {};
      CANDIDATES.forEach((c, i) => {
        obj[c] = { count: results[i].total ?? 0, pct: total ? Math.round((results[i].total / total) * 1000) / 10 : 0 };
      });
      setSentimentStats(obj);
    } catch (e) { console.error("[yupen] sentimentStats 로드 실패:", e); }
    finally { setSentimentLoading(false); }
  };

  const loadVoters = async (currentFilters, currentPage) => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(currentFilters).forEach(([k, v]) => {
      if (Array.isArray(v)) { v.forEach(item => params.append(k, item)); }
      else if (v) { params.set(k, v); }
    });
    params.set("limit", PAGE_SIZE);
    params.set("offset", currentPage * PAGE_SIZE);
    try {
      const res = await fetch(`${API}/api/voters?${params}`);
      const data = await res.json();
      setVoters(data.voters ?? []);
      setFilteredTotal(data.total ?? 0);
    } catch (e) { console.error("[yupen] voters 로드 실패:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadGlobalStats(); }, []);

  // 거주동+연령대+성별 바뀔 때만 sentimentStats 재호출
  useEffect(() => {
    if (hasSentimentFilter) {
      loadSentimentStats(sentimentFilters);
    } else {
      setSentimentStats(globalStats);
    }
  }, [JSON.stringify(filters.거주동), JSON.stringify(filters.연령대), JSON.stringify(filters.성별)]);

  useEffect(() => { loadVoters(filters, page); }, [filters, page]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  const totalPages = Math.ceil(filteredTotal / PAGE_SIZE);
  const from = filteredTotal === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, filteredTotal);

  return (
    <div className="flex flex-col min-h-screen">
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

      {tab === "voters" && (
        <div className="flex flex-1 gap-8 p-8">
          <FilterPanel
            filters={filters}
            onChange={handleFiltersChange}
            sentimentStats={sentimentStats}
            sentimentLoading={sentimentLoading}
            hasSentimentFilter={hasSentimentFilter}
            sentimentFilters={sentimentFilters}
            filteredTotal={filteredTotal}
          />
          <main className="flex-1 min-w-0">
            <p className="text-xs text-[var(--text)] mb-4">
              {loading
                ? "불러오는 중..."
                : filteredTotal > 0
                  ? `전체 ${filteredTotal.toLocaleString()}명 중 ${from.toLocaleString()}–${to.toLocaleString()}명 표시`
                  : "해당하는 유권자가 없습니다."}
            </p>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {voters.map(v => (
                <VoterCard key={v.id} voter={v} onClick={setSelectedVoter} />
              ))}
            </div>
            {filteredTotal > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
                <span className="text-xs text-[var(--text)] opacity-70">{page + 1} / {totalPages} 페이지</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 0 || loading}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
                    ← 이전
                  </button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages || loading}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
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
      {tab === "flow" && <FlowTab />}
      {tab === "about" && <AboutTab />}

      {selectedVoter && (
        <SurveyModal voter={selectedVoter} onClose={() => setSelectedVoter(null)} />
      )}
    </div>
  );
}

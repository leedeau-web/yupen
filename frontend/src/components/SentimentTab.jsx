import { useState, useEffect, useCallback } from 'react';
import VoterCard from './VoterCard';
import { API_BASE } from '../config';

const API = API_BASE;
const PAGE_SIZE = 50;

const FILTER_OPTIONS = {
  거주동: ['구포1동','구포2동','구포3동','덕천1동','덕천2동','덕천3동','만덕2동','만덕3동'],
  연령대: ['20대','30대','40대','50대','60대','70대이상'],
  성별: ['남','여'],
};

const CANDIDATES = ['하정우','한동훈','박민식','미정'];

const CANDIDATE_BAR_COLORS = {
  하정우: 'bg-indigo-500',
  한동훈: 'bg-amber-500',
  박민식: 'bg-red-500',
  미정:   'bg-gray-400',
};

function getStatus(stats) {
  if (!stats) return null;
  const sorted = CANDIDATES.map(c => ({ id: c, pct: stats[c]?.pct ?? 0 })).sort((a,b) => b.pct - a.pct);
  const top = sorted[0], second = sorted[1];
  const gap = top.pct - second.pct;
  if (top.id === '한동훈' && gap >= 8)
    return { icon:'✓', label:'한동훈 우세', sub:`격차 ${gap.toFixed(1)}%p — 안정권`, bg:'bg-green-50', border:'border-green-300', text:'text-green-800', subText:'text-green-600' };
  if (top.id === '한동훈' && gap < 8)
    return { icon:'△', label:'한동훈 우세 (박빙)', sub:`격차 ${gap.toFixed(1)}%p — 추가 공략 필요`, bg:'bg-yellow-50', border:'border-yellow-300', text:'text-yellow-800', subText:'text-yellow-600' };
  if (top.id === '박민식')
    return { icon:'⚠', label:'박민식 우세', sub:`격차 ${gap.toFixed(1)}%p — 보수 표 분열`, bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-800', subText:'text-orange-600' };
  if (top.id === '하정우')
    return { icon:'✕', label:'하정우 우세', sub:`격차 ${gap.toFixed(1)}%p — 경쟁 후보 선두`, bg:'bg-red-50', border:'border-red-300', text:'text-red-800', subText:'text-red-600' };
  return { icon:'?', label:'미정 다수', sub:'지지층 미형성', bg:'bg-gray-50', border:'border-gray-300', text:'text-gray-600', subText:'text-gray-400' };
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${active ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-transparent text-[var(--text)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]'}`}>
      {label}
    </button>
  );
}

export default function SentimentTab({ onSelectVoter }) {
  const [filters, setFilters] = useState({ 거주동: null, 연령대: null, 성별: null });
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [voters, setVoters] = useState([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async (currentFilters) => {
    setStatsLoading(true);
    const base = new URLSearchParams();
    Object.entries(currentFilters).forEach(([k,v]) => { if (v) base.set(k,v); });
    try {
      const results = await Promise.all(
        CANDIDATES.map(c => {
          const p = new URLSearchParams(base);
          p.set('지지후보', c);
          p.set('limit', '1');
          return fetch(`${API}/api/voters?${p}`).then(r => r.json());
        })
      );
      const total = results.reduce((s,r) => s + (r.total ?? 0), 0);
      const obj = {};
      CANDIDATES.forEach((c,i) => { obj[c] = { count: results[i].total ?? 0, pct: total ? Math.round((results[i].total / total) * 1000) / 10 : 0 }; });
      setStats(obj);
    } catch(e) { console.error('[yupen] sentiment stats 로드 실패:', e); }
    finally { setStatsLoading(false); }
  }, []);

  const loadVoters = useCallback(async (currentFilters, currentPage) => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(currentFilters).forEach(([k,v]) => { if (v) params.set(k,v); });
    params.set('limit', PAGE_SIZE);
    params.set('offset', currentPage * PAGE_SIZE);
    try {
      const res = await fetch(`${API}/api/voters?${params}`);
      const data = await res.json();
      setVoters(data.voters ?? []);
      setFilteredTotal(data.total ?? 0);
    } catch(e) { console.error('[yupen] sentiment voters 로드 실패:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStats(filters); }, [filters, loadStats]);
  useEffect(() => { loadVoters(filters, page); }, [filters, page, loadVoters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? null : value }));
    setPage(0);
  };
  const reset = () => { setFilters({ 거주동: null, 연령대: null, 성별: null }); setPage(0); };

  const status = getStatus(stats);
  const totalPages = Math.ceil(filteredTotal / PAGE_SIZE);
  const from = filteredTotal === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, filteredTotal);
  const activeFilters = Object.entries(filters).filter(([,v]) => v !== null);
  const filterLabel = activeFilters.length > 0 ? activeFilters.map(([,v]) => v).join(' · ') : '전체';

  return (
    <div className="flex flex-1 gap-8 p-8">
      <aside className="w-56 shrink-0 flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold text-[var(--text-h)] mb-2 uppercase tracking-wide">지지후보 분포</p>
          {status && !statsLoading && (
            <div className={`rounded-lg border px-3 py-2.5 mb-3 flex items-start gap-2.5 ${status.bg} ${status.border}`}>
              <span className={`text-base font-black leading-none mt-0.5 ${status.text}`}>{status.icon}</span>
              <div>
                <p className={`text-xs font-bold ${status.text}`}>{status.label}</p>
                <p className={`text-[10px] mt-0.5 ${status.subText}`}>{status.sub}</p>
              </div>
            </div>
          )}
          {statsLoading ? (
            <div className="flex flex-col gap-2">{CANDIDATES.map(c => <div key={c} className="h-8 rounded bg-[var(--border)] animate-pulse" />)}</div>
          ) : stats ? (
            <div className="flex flex-col gap-2">
              {CANDIDATES.map(c => ({ id: c, ...stats[c] })).sort((a,b) => b.pct - a.pct).map((c, i) => {
                const isTarget = c.id === '한동훈';
                return (
                  <div key={c.id} className={isTarget ? 'rounded-md px-1.5 py-1 -mx-1.5 bg-amber-50' : ''}>
                    <div className="flex justify-between text-xs mb-0.5 items-center">
                      <span className={`font-medium flex items-center gap-1 ${isTarget ? 'text-amber-700' : 'text-[var(--text-h)]'}`}>
                        <span className="opacity-40 text-[10px]">{['①','②','③','④'][i]}</span>
                        {c.id}
                        {isTarget && <span className="text-[9px] bg-amber-500 text-white px-1 rounded font-bold">목표</span>}
                      </span>
                      <span className="text-[var(--text)]">{(c.count ?? 0).toLocaleString()}명 <span className="font-semibold">{c.pct ?? 0}%</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--border)]">
                      <div className={`h-1.5 rounded-full transition-all duration-500 ${CANDIDATE_BAR_COLORS[c.id]}`} style={{ width: `${c.pct ?? 0}%` }} />
                    </div>
                  </div>
                );
              })}
              <p className="text-[10px] text-[var(--text)] opacity-50 mt-0.5">
                {activeFilters.length > 0 ? `${filterLabel} 기준 ${filteredTotal.toLocaleString()}명` : '전체 122,440명 기준'}
              </p>
            </div>
          ) : null}
        </div>
        <div className="border-t border-[var(--border)]" />
        <div className="flex flex-col gap-4">
          {Object.entries(FILTER_OPTIONS).map(([key, options]) => (
            <div key={key}>
              <p className="text-xs font-semibold text-[var(--text-h)] mb-1.5 uppercase tracking-wide">{key}</p>
              <div className="flex flex-wrap gap-1.5">
                {options.map(opt => <FilterChip key={opt} label={opt} active={filters[key] === opt} onClick={() => handleFilterChange(key, opt)} />)}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)]" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-h)] font-medium">{filteredTotal.toLocaleString()}명</span>
          <button onClick={reset} className="text-xs text-[var(--text)] hover:text-[var(--accent)] transition-colors cursor-pointer">필터 초기화</button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-[var(--text)]">
            {loading ? '불러오는 중...' : filteredTotal > 0 ? `전체 ${filteredTotal.toLocaleString()}명 중 ${from.toLocaleString()}–${to.toLocaleString()}명 표시` : '해당하는 유권자가 없습니다.'}
          </p>
          {status && !statsLoading && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${status.bg} ${status.border} ${status.text}`}>{status.icon} {status.label}</span>
          )}
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {voters.map(v => <VoterCard key={v.id} voter={v} onClick={onSelectVoter} />)}
        </div>
        {filteredTotal > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--text)] opacity-70">{page + 1} / {totalPages} 페이지</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p-1)} disabled={page === 0 || loading} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">← 이전</button>
              <button onClick={() => setPage(p => p+1)} disabled={page+1 >= totalPages || loading} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">다음 →</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

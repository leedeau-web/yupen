const KEY = "yupen_simulation_history";

export function loadHistory() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("[yupen] 히스토리 불러오기 실패:", e);
    return [];
  }
}

export function saveHistory(history) {
  try {
    localStorage.setItem(KEY, JSON.stringify(history));
  } catch (e) {
    console.error("[yupen] 히스토리 저장 실패 (localStorage 용량 초과 가능):", e);
  }
}

// 서버 응답 레코드를 localStorage 형식으로 정규화 후 누적 저장
export function appendRound(serverRecord) {
  const history = loadHistory();
  const round = history.length + 1;
  const entry = {
    round,
    id: serverRecord.id,
    date: serverRecord.date,
    question: serverRecord.question,
    sample_size: serverRecord.sample_size,
    results: serverRecord.results,
    moe: serverRecord.moe,
    total_cost: serverRecord.total_cost ?? 0,
    log: serverRecord.voter_logs ?? [],
  };
  history.push(entry);
  saveHistory(history);

  // 검증 로그: 모든 회차가 누적됐는지 확인
  console.log(`[yupen] ✅ ${round}회차 저장 완료 — 총 ${history.length}회차 누적`);
  console.table(
    history.map((h) => ({
      "회차": h.round,
      "날짜": h.date,
      "n": h.sample_size,
      "하정우": `${h.results?.하정우?.pct ?? 0}%`,
      "한동훈": `${h.results?.한동훈?.pct ?? 0}%`,
      "박민식": `${h.results?.박민식?.pct ?? 0}%`,
      "로그수": h.log?.length ?? 0,
    }))
  );

  return history;
}

// 서버 poll-history API 응답을 localStorage 형식으로 변환 (마이그레이션용)
export function normalizeServerHistory(serverData) {
  return serverData.map((h, i) => ({
    round: i + 1,
    id: h.id,
    date: h.date,
    question: h.question,
    sample_size: h.sample_size,
    results: h.results,
    moe: h.moe,
    total_cost: h.total_cost ?? 0,
    log: h.voter_logs ?? [],
  }));
}

export function clearHistory() {
  localStorage.removeItem(KEY);
  console.log("[yupen] 히스토리 전체 초기화");
}

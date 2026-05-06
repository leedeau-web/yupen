const KEY = 'yupen_minsim';

export function loadAllSnapshots() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDailySnapshot(data) {
  const snapshots = loadAllSnapshots();
  const idx = snapshots.findIndex(s => s.date === data.date);
  if (idx >= 0) {
    snapshots[idx] = data;
  } else {
    snapshots.push(data);
    snapshots.sort((a, b) => a.date.localeCompare(b.date));
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshots));
  } catch (e) {
    console.error('[yupen] 민심 스냅샷 저장 실패:', e);
  }
}

export function getTodaySnapshot() {
  const today = new Date().toISOString().slice(0, 10);
  return loadAllSnapshots().find(s => s.date === today) ?? null;
}

export function hasTodaySnapshot() {
  return getTodaySnapshot() !== null;
}

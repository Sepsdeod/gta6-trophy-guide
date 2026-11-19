// progressStore keeps the earned checklist in localStorage, and exports / imports
// it as a JSON file so progress survives a new browser or a cleared cache.
const STORAGE_KEY = 'gta6-trophy-guide-progress-v1';

export function createProgressStore() {
  let earned = new Set(loadStoredNames());

  function loadStoredNames() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : [];
    } catch {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
    } catch {
      // Storage full or blocked: progress still lives in memory for this visit.
    }
  }

  return {
    isEarned: (name) => earned.has(name),
    earnedCount: () => earned.size,
    earnedNames: () => [...earned],
    toggle: (name) => {
      if (earned.has(name)) earned.delete(name);
      else earned.add(name);
      save();
    },
    setEarned: (name, value) => {
      if (value) earned.add(name);
      else earned.delete(name);
      save();
    },
    reset: () => {
      earned = new Set();
      save();
    },
    exportFile: () => {
      const payload = { game: 'Grand Theft Auto VI', earned: [...earned], exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gta6-trophy-progress.json';
      a.click();
      URL.revokeObjectURL(url);
    },
    importNames: (names) => {
      const clean = names.filter((n) => typeof n === 'string');
      earned = new Set(clean);
      save();
      return clean.length;
    },
  };
}

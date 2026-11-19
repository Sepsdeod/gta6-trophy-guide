// The earned-trophy checklist, kept in the browser's localStorage.
//
// Leonida Ledger v3 stores progress under a versioned key so an older save
// can be recognised and carried forward instead of silently dropped. The
// store knows nothing about the trophy list itself: it only guards a set of
// earned trophy names, which keeps it testable and keeps the import path
// honest (unknown names are reported, never swallowed).
//
// Export format (leonida-ledger-progress, version 3):
//   { guide, format, version, exportedAt, earned: [name, ...] }
// Import accepts that shape, or a bare array of names, and reports how many
// names were kept and how many were unknown.

const CURRENT_KEY = 'leonida-ledger-progress-v3';
const LEGACY_KEY = 'gta6-trophy-guide-progress-v1';
const EXPORT_VERSION = 3;

function readNames(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => typeof entry === 'string' && entry.length > 0);
  } catch {
    return [];
  }
}

function writeNames(key, names) {
  try {
    localStorage.setItem(key, JSON.stringify(names));
    return true;
  } catch {
    // Storage full, blocked, or private mode: the set still lives in memory
    // for this visit, and the UI keeps working.
    return false;
  }
}

export function openTrophyStore() {
  // Prefer the current key. If it is empty but a v1/v2 save exists, adopt it
  // once, then remove the legacy key so the migration never runs twice.
  let names = readNames(CURRENT_KEY);
  let migrated = 0;
  if (names.length === 0) {
    const legacy = readNames(LEGACY_KEY);
    if (legacy.length > 0) {
      names = legacy;
      migrated = legacy.length;
      writeNames(CURRENT_KEY, names);
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        // The legacy key staying behind is harmless; the current key wins.
      }
    }
  }

  let earned = new Set(names);

  function persist() {
    writeNames(CURRENT_KEY, [...earned]);
  }

  return {
    // How many trophies from an earlier save were carried into this version.
    migratedCount: migrated,

    earned(name) {
      return earned.has(name);
    },

    total() {
      return earned.size;
    },

    list() {
      return [...earned];
    },

    toggle(name) {
      if (earned.has(name)) earned.delete(name);
      else earned.add(name);
      persist();
      return earned.has(name);
    },

    set(name, on) {
      if (on) earned.add(name);
      else earned.delete(name);
      persist();
    },

    wipe() {
      earned = new Set();
      persist();
    },

    download() {
      const payload = {
        guide: 'Leonida Ledger',
        format: 'leonida-ledger-progress',
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        earned: [...earned].sort(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'leonida-ledger-progress.json';
      anchor.click();
      URL.revokeObjectURL(url);
      return payload.earned.length;
    },

    // Replace the stored set with the given names. Returns what happened so
    // the caller can tell the player exactly what was kept and what was not.
    restore(names) {
      const clean = [];
      const seen = new Set();
      for (const entry of names) {
        if (typeof entry !== 'string' || entry.length === 0) continue;
        if (seen.has(entry)) continue;
        seen.add(entry);
        clean.push(entry);
      }
      const before = earned.size;
      earned = new Set(clean);
      persist();
      return { kept: clean.length, replaced: before };
    },
  };
}

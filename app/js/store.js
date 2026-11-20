// The earned-trophy checklist, kept in the browser's localStorage.
//
// Leonida Ledger v5 keeps progress under a versioned key and records the
// date each trophy was ticked, so the detail card can say when a trophy was
// earned. Older saves are recognised and carried forward instead of being
// silently dropped: a v4 save (names mapped to dates), a v3 save (a plain
// list of names) and the original v1 save all migrate into the v5 shape on
// first load, and the legacy key is removed so the migration never runs
// twice.
//
// The ledger knows nothing about the trophy list itself: it only guards a
// map of earned trophy names to the date they were earned. That keeps the
// import path honest — unknown names are reported, never swallowed.
//
// Export format (leonida-ledger-progress, version 5):
//   { guide, format, version, exportedAt, earned: { name: isoDate, ... } }
// Import accepts that shape, the v4 shape (the same, version 4), the v3
// shape ({ earned: [name, ...] }), or a bare array of names, and reports
// how many names were kept, how many were unknown, and how many the file
// replaced.

const SAVE_KEY = 'leonida-ledger-v5';
const LEGACY_KEYS = [
  'leonida-ledger-progress-v4',
  'leonida-ledger-progress-v3',
  'gta6-trophy-guide-progress-v1',
];
const FORMAT_VERSION = 5;

function readStored(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Storage full, blocked, or private mode: the map still lives in memory
    // for this visit, and the UI keeps working.
    return false;
  }
}

// Turn whatever a stored value holds into a name -> date map. A v5/v4
// object carries { earned: { name: date } }; a v3/v1 value is a plain array
// of names, which migrates in with no date attached.
function toDateMap(value) {
  const map = new Map();
  if (!value) return map;
  if (Array.isArray(value)) {
    for (const name of value) {
      if (typeof name === 'string' && name.length > 0) map.set(name, null);
    }
    return map;
  }
  if (value && typeof value === 'object' && value.earned) {
    if (Array.isArray(value.earned)) {
      for (const name of value.earned) {
        if (typeof name === 'string' && name.length > 0) map.set(name, null);
      }
    } else if (typeof value.earned === 'object') {
      for (const [name, when] of Object.entries(value.earned)) {
        if (typeof name === 'string' && name.length > 0) {
          map.set(name, typeof when === 'string' ? when : null);
        }
      }
    }
  }
  return map;
}

export function openLedger() {
  let earned = toDateMap(readStored(SAVE_KEY));
  let migrated = 0;

  if (earned.size === 0) {
    for (const key of LEGACY_KEYS) {
      const legacy = toDateMap(readStored(key));
      if (legacy.size > 0) {
        earned = legacy;
        migrated = legacy.size;
        writeStored(SAVE_KEY, { version: FORMAT_VERSION, earned: {} });
        persist();
        try {
          localStorage.removeItem(key);
        } catch {
          // The legacy key staying behind is harmless; the current key wins.
        }
        break;
      }
    }
  }

  function persist() {
    const plain = {};
    for (const [name, when] of earned) plain[name] = when;
    writeStored(SAVE_KEY, { version: FORMAT_VERSION, earned: plain });
  }

  function todayStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  return {
    // How many trophies from an earlier save were carried into this version.
    migrated,

    has(name) {
      return earned.has(name);
    },

    // The date a trophy was ticked (YYYY-MM-DD), or null when it came from
    // an older save that kept no dates.
    when(name) {
      return earned.get(name) ?? null;
    },

    count() {
      return earned.size;
    },

    names() {
      return [...earned.keys()];
    },

    mark(name) {
      if (!earned.has(name)) earned.set(name, todayStamp());
      persist();
    },

    unmark(name) {
      earned.delete(name);
      persist();
    },

    flip(name) {
      if (earned.has(name)) earned.delete(name);
      else earned.set(name, todayStamp());
      persist();
      return earned.has(name);
    },

    reset() {
      earned = new Map();
      persist();
    },

    saveFile() {
      const plain = {};
      for (const name of [...earned.keys()].sort()) {
        plain[name] = earned.get(name);
      }
      const payload = {
        guide: 'Leonida Ledger',
        format: 'leonida-ledger-progress',
        version: FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        earned: plain,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'leonida-ledger-v5-progress.json';
      anchor.click();
      URL.revokeObjectURL(url);
      return earned.size;
    },

    // Replace the stored set with the given names. Returns what happened so
    // the caller can tell the player exactly what was kept, what was
    // unknown, and what the file replaced.
    loadNames(names, knownNames) {
      const clean = [];
      const seen = new Set();
      for (const entry of names) {
        if (typeof entry !== 'string' || entry.length === 0) continue;
        if (seen.has(entry)) continue;
        seen.add(entry);
        clean.push(entry);
      }
      const known = knownNames ? new Set(knownNames) : null;
      const kept = known ? clean.filter((name) => known.has(name)) : clean;
      const unknown = clean.length - kept.length;
      const before = earned.size;
      earned = new Map(kept.map((name) => [name, todayStamp()]));
      persist();
      return { kept: kept.length, unknown, replaced: before };
    },
  };
}

// Checklist filtering, sorting and the spoiler rule.
//
// The filter state is one plain object so the toolbar, the checklist and the
// detail pane always agree about what the player is looking at. Kinds come
// from the trophy data itself ("story", "collectibles", "activities",
// "platinum" and friends); "missable" and "online" are views over flags
// rather than kinds, because the official list has no online trophies at all
// and missable cuts across kinds.
//
// Spoiler rule: with spoilers hidden, a story trophy the player has not
// earned yet shows a mask instead of its name, description, guide and
// sources. Earned story trophies always show in full — hiding something the
// player already earned would only get in the way.

export function blankFilters() {
  return {
    kind: 'all',
    grade: 'all',
    query: '',
    hideEarned: false,
    spoilersHidden: false,
    sort: 'roadmap',
  };
}

const GRADE_RANK = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

function normalise(text) {
  return String(text ?? '').toLowerCase();
}

export function passesFilters(trophy, state, isEarned) {
  if (state.kind === 'missable' && !trophy.missable) return false;
  if (state.kind === 'online') return false;
  if (
    state.kind !== 'all' &&
    state.kind !== 'missable' &&
    state.kind !== 'online' &&
    trophy.kind !== state.kind
  ) {
    return false;
  }
  if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
  if (state.hideEarned && isEarned) return false;
  if (state.query) {
    const needle = normalise(state.query);
    const haystack = normalise(
      `${trophy.name} ${trophy.description} ${trophy.guide ?? ''}`,
    );
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

// Sort the already-filtered list. Roadmap order (stage, then list order) is
// the default because it is the order a player actually earns trophies in;
// name and grade orders are for finding one trophy fast.
export function sortTrophies(list, mode) {
  const copy = [...list];
  if (mode === 'name') {
    copy.sort((a, b) => a.name.localeCompare(b.name));
  } else if (mode === 'grade') {
    copy.sort(
      (a, b) =>
        (GRADE_RANK[a.grade] ?? 99) - (GRADE_RANK[b.grade] ?? 99) ||
        a.stage - b.stage ||
        a.id - b.id,
    );
  } else if (mode === 'difficulty') {
    copy.sort(
      (a, b) =>
        (a.difficulty ?? 3) - (b.difficulty ?? 3) ||
        a.stage - b.stage ||
        a.id - b.id,
    );
  } else {
    copy.sort((a, b) => a.stage - b.stage || a.id - b.id);
  }
  return copy;
}

export function spoilerHidden(trophy, state, isEarned) {
  return state.spoilersHidden && trophy.kind === 'story' && !isEarned;
}

export function shownName(trophy, state, isEarned) {
  return spoilerHidden(trophy, state, isEarned)
    ? 'Hidden story trophy'
    : trophy.name;
}

export function shownDescription(trophy, state, isEarned) {
  return spoilerHidden(trophy, state, isEarned)
    ? 'Spoilers hidden — earn this trophy to reveal its name and description.'
    : trophy.description;
}

export function countKind(trophies, kind) {
  if (kind === 'missable') return trophies.filter((t) => t.missable).length;
  if (kind === 'online') return 0;
  if (kind === 'all') return trophies.length;
  return trophies.filter((t) => t.kind === kind).length;
}

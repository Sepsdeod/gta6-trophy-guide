// trophyFilters applies the checklist filters (kind, grade, search, hide-earned)
// and the spoiler rule: with spoilers hidden, a story trophy that is not yet
// earned shows a mask instead of its name and description.
export function createFilters() {
  return {
    kind: 'all',
    grade: 'all',
    search: '',
    hideEarned: false,
    hideSpoilers: false,
  };
}

export function trophyMatches(trophy, filters, isEarned) {
  if (filters.kind === 'missable' && !trophy.missable) return false;
  if (filters.kind === 'online') return false; // The official list has no online trophies.
  if (filters.kind !== 'all' && filters.kind !== 'missable' && trophy.kind !== filters.kind) return false;
  if (filters.grade !== 'all' && trophy.grade !== filters.grade) return false;
  if (filters.hideEarned && isEarned) return false;
  if (filters.search) {
    const needle = filters.search.toLowerCase();
    const hay = `${trophy.name} ${trophy.description}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

export function isSpoilerMasked(trophy, filters, isEarned) {
  return filters.hideSpoilers && trophy.kind === 'story' && !isEarned;
}

export function displayName(trophy, filters, isEarned) {
  return isSpoilerMasked(trophy, filters, isEarned) ? 'Hidden story trophy' : trophy.name;
}

export function displayDescription(trophy, filters, isEarned) {
  return isSpoilerMasked(trophy, filters, isEarned)
    ? 'Spoilers hidden — earn this trophy to reveal its name and description.'
    : trophy.description;
}

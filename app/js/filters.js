// Checklist filtering, sorting and the spoiler rule.
//
// The filter state is one plain object, so the toolbar, the checklist and
// the detail pane always agree about what the player is looking at. Kinds
// come from the trophy data itself ("story", "collectibles", "activities",
// "platinum"); "missable" and "online" are views over flags rather than
// kinds, because the official list has no online trophies at all and
// missable cuts across kinds.
//
// Spoiler rule: with spoilers hidden, a story trophy the player has not
// earned yet shows a mask instead of its name, description, guide and
// sources. Earned story trophies always show in full — hiding something the
// player already earned would only get in the way.

import { DIFFICULTY_WORDS } from './data.js';

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

const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

function fold(text) {
  return String(text ?? '').toLowerCase();
}

// The search looks through the name, description, guide, tip and the
// difficulty word, so a player can find a trophy by what it asks for
// ("gold medal", "moderate") as well as by its name.
function matchesQuery(trophy, query) {
  const needle = fold(query).trim();
  if (!needle) return true;
  const words = DIFFICULTY_WORDS[trophy.difficulty] ?? '';
  const haystack = fold(
    [
      trophy.name,
      trophy.description,
      trophy.guide,
      trophy.tip,
      trophy.noteStage,
      words,
    ]
      .filter(Boolean)
      .join(' '),
  );
  return needle.split(/\s+/).every((word) => haystack.includes(word));
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
  if (!matchesQuery(trophy, state.query)) return false;
  return true;
}

// Sort the already-filtered list. Roadmap order (stage, then list order) is
// the default because it is the order a player actually earns trophies in;
// name, grade and difficulty orders are for finding one trophy fast.
export function sortTrophies(list, mode) {
  const copy = [...list];
  const byRoadmap = (a, b) => a.stage - b.stage || a.id - b.id;
  if (mode === 'name') {
    copy.sort((a, b) => a.name.localeCompare(b.name));
  } else if (mode === 'grade') {
    copy.sort(
      (a, b) =>
        (GRADE_ORDER[a.grade] ?? 99) - (GRADE_ORDER[b.grade] ?? 99) ||
        byRoadmap(a, b),
    );
  } else if (mode === 'difficulty') {
    copy.sort(
      (a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3) || byRoadmap(a, b),
    );
  } else {
    copy.sort(byRoadmap);
  }
  return copy;
}

export function spoilerHidden(trophy, state, isEarned) {
  return state.spoilersHidden && trophy.kind === 'story' && !isEarned;
}

const MASKED_NAME = 'Hidden story trophy';
const MASKED_DESC =
  'Spoilers hidden — earn this trophy to reveal its name and description.';

export function shownName(trophy, state, isEarned) {
  return spoilerHidden(trophy, state, isEarned) ? MASKED_NAME : trophy.name;
}

export function shownDescription(trophy, state, isEarned) {
  return spoilerHidden(trophy, state, isEarned)
    ? MASKED_DESC
    : trophy.description;
}

export function countKind(trophies, kind) {
  if (kind === 'missable') return trophies.filter((t) => t.missable).length;
  if (kind === 'online') return 0;
  if (kind === 'all') return trophies.length;
  return trophies.filter((t) => t.kind === kind).length;
}

// How many of the trophies in a filtered view are already earned — the
// "x earned in view" figure the checklist header shows.
export function earnedInView(shown, store) {
  return shown.filter((trophy) => store.earned(trophy.name)).length;
}

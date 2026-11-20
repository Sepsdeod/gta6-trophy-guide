// Checklist filtering, sorting and the spoiler rule.
//
// The query state is one plain object, so the toolbar, the checklist and
// the detail card always agree about what the player is looking at. Kinds
// come from the trophy data itself ("story", "collectibles", "activities",
// "platinum"); "missable" and "online" are views over flags rather than
// kinds, because the official list has no online trophies at all and
// missable cuts across kinds.
//
// Spoiler rule: with spoilers hidden, a story trophy the player has not
// earned yet shows a mask instead of its name, description, guide and
// sources. Earned story trophies always show in full — hiding something the
// player already earned would only get in the way.

import { DIFFICULTY_LABELS } from './data.js';

export function freshQuery() {
  return {
    kind: 'all',
    grade: 'all',
    difficulty: 'all',
    search: '',
    hideEarned: false,
    spoilersHidden: false,
    sort: 'roadmap',
  };
}

const GRADE_RANK = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

function normalise(text) {
  return String(text ?? '').toLowerCase();
}

function tokenize(text) {
  return normalise(text).split(/[^a-z0-9]+/).filter(Boolean);
}

// The search looks through the name, description, guide, tip and the
// difficulty word, so a player can find a trophy by what it asks for
// ("gold medal", "moderate") as well as by its name. Every word the player
// types must match somewhere in that text.
function matchesSearch(trophy, search) {
  const wanted = tokenize(search);
  if (wanted.length === 0) return true;
  const words = DIFFICULTY_LABELS[trophy.hardness] ?? '';
  const haystack = normalise(
    [
      trophy.name,
      trophy.description,
      trophy.guide,
      trophy.advice,
      trophy.stageLabel,
      words,
    ]
      .filter(Boolean)
      .join(' '),
  );
  return wanted.every((word) => haystack.includes(word));
}

export function isVisible(trophy, query, done) {
  if (query.kind === 'missable' && !trophy.missable) return false;
  if (query.kind === 'online') return false;
  if (
    query.kind !== 'all' &&
    query.kind !== 'missable' &&
    query.kind !== 'online' &&
    trophy.kind !== query.kind
  ) {
    return false;
  }
  if (query.grade !== 'all' && trophy.grade !== query.grade) return false;
  if (
    query.difficulty !== 'all' &&
    String(trophy.hardness ?? '') !== query.difficulty
  ) {
    return false;
  }
  if (query.hideEarned && done) return false;
  if (!matchesSearch(trophy, query.search)) return false;
  return true;
}

// Order the already-filtered list. Roadmap order (stage, then list order) is
// the default because it is the order a player actually earns trophies in;
// name, grade and difficulty orders are for finding one trophy fast.
export function orderList(list, mode) {
  const copy = [...list];
  const byPlan = (a, b) => a.stage - b.stage || a.id - b.id;
  if (mode === 'name') {
    copy.sort((a, b) => a.name.localeCompare(b.name));
  } else if (mode === 'grade') {
    copy.sort(
      (a, b) =>
        (GRADE_RANK[a.grade] ?? 99) - (GRADE_RANK[b.grade] ?? 99) ||
        byPlan(a, b),
    );
  } else if (mode === 'difficulty') {
    copy.sort(
      (a, b) => (a.hardness ?? 3) - (b.hardness ?? 3) || byPlan(a, b),
    );
  } else {
    copy.sort(byPlan);
  }
  return copy;
}

export function isConcealed(trophy, query, done) {
  return query.spoilersHidden && trophy.kind === 'story' && !done;
}

const CONCEALED_NAME = 'Hidden story trophy';
const CONCEALED_DESC =
  'Spoilers hidden — earn this trophy to reveal its name and description.';

export function displayName(trophy, query, done) {
  return isConcealed(trophy, query, done) ? CONCEALED_NAME : trophy.name;
}

export function displayDesc(trophy, query, done) {
  return isConcealed(trophy, query, done) ? CONCEALED_DESC : trophy.description;
}

export function tallyKind(trophies, kind) {
  if (kind === 'missable') return trophies.filter((t) => t.missable).length;
  if (kind === 'online') return 0;
  if (kind === 'all') return trophies.length;
  return trophies.filter((t) => t.kind === kind).length;
}

// How many of the trophies in a filtered view are already earned — the
// "x earned in view" figure the checklist header shows.
export function earnedAmong(shown, ledger) {
  return shown.filter((trophy) => ledger.has(trophy.name)).length;
}

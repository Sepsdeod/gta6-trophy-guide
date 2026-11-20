// The guide's data: where it lives, how it is loaded, and the tables the
// views are built from.
//
// Three JSON files under app/data, all fetched locally — the app makes no
// network request at run time:
//   trophies.json       the 55 official trophies (names, descriptions and
//                       grades exactly as PlayStation publishes them) with
//                       this guide's own-words guides, kinds, missable
//                       flags and roadmap stages
//   trophy-notes.json   per-trophy difficulty (1–5), time estimate, a
//                       concrete tip, an avoid line for missables, and the
//                       roadmap stage the trophy belongs to
//   reference.json      the collectibles, activities and money reference
//
// The plan stages and the risk groups below are drawn from the official
// descriptions alone: which story chapters and missions, which collectibles
// and counts, in what order. Where a description leaves a place or a step
// unpinned, the guides say so instead of inventing one.

const DATA_FOLDER = 'data';

async function fetchJson(name) {
  const answer = await fetch(`${DATA_FOLDER}/${name}`);
  if (!answer.ok) {
    throw new Error(`Could not load ${DATA_FOLDER}/${name} (${answer.status})`);
  }
  return answer.json();
}

function asArray(document) {
  return Array.isArray(document) ? document : document.trophies;
}

// Fold the per-trophy notes into the trophy records so the views only ever
// deal with one list. A note that is missing (or a notes file that fails to
// load) leaves the trophy usable — the guide, kind and stage all come from
// trophies.json, and only the estimates and tips come from the notes.
function mergeNotes(trophies, notesDocument) {
  const byId = new Map(
    (notesDocument?.notes ?? []).map((note) => [note.id, note]),
  );
  for (const trophy of trophies) {
    const note = byId.get(trophy.id);
    if (!note) continue;
    trophy.hardness = note.difficulty;
    trophy.duration = note.time;
    trophy.advice = note.tip;
    trophy.caution = note.avoid ?? null;
    trophy.stageLabel = note.stage ?? null;
  }
}

export async function loadCatalog() {
  const document = await fetchJson('trophies.json');
  const trophies = asArray(document);

  let notesDocument = { notes: [] };
  try {
    notesDocument = await fetchJson('trophy-notes.json');
  } catch {
    notesDocument = { notes: [] };
  }
  mergeNotes(trophies, notesDocument);

  let reference = { sections: [] };
  try {
    reference = await fetchJson('reference.json');
  } catch {
    reference = { sections: [] };
  }

  return {
    trophies,
    sources: document.sources ?? {},
    reference,
    meta: document.meta ?? null,
  };
}

// Trophy points follow the usual weighting — platinum most, then gold,
// silver, bronze — and the whole set adds up to 1,230.
export const GRADE_POINTS = { platinum: 180, gold: 90, silver: 30, bronze: 15 };

export function pointsFor(trophy) {
  return GRADE_POINTS[trophy.grade] ?? 0;
}

export const DIFFICULTY_LABELS = {
  1: 'Very easy',
  2: 'Easy',
  3: 'Moderate',
  4: 'Hard',
  5: 'Very hard',
};

// The road to the platinum, in the order the game asks for it. The hour
// ranges are this guide's own estimates, drawn from what the official
// descriptions ask for — the story takes most of the time, and the clean-up
// stages are the long tail after it.
export const PLAN_STAGES = [
  {
    key: 1,
    name: 'Stage 1 — Play the story through',
    estimate: '25–30 hours',
    summary:
      'Chapters 1 to 4 and the final mission, played in order. Every chapter trophy and every named-mission trophy lands here, and so do the one-shot story missables — take each named mission the moment the story offers it and see it through to the end.',
  },
  {
    key: 2,
    name: 'Stage 2 — Strangers and 100%',
    estimate: '8–10 hours',
    summary:
      'Every stranger strand played to its final mission — the eight strands feed the Strangers & Freaks silver — and then the push toward 100% completion for the A Long Road gold. A strand left half-done stalls both.',
  },
  {
    key: 3,
    name: 'Stage 3 — The counted activities',
    estimate: '10–14 hours',
    summary:
      'Stunts, the Shooting Range, races, drone races, fishing, the arcade, meditation spots and the hunt. The 42 gold medals at the range are the hardest ask in the set; take them one weapon at a time.',
  },
  {
    key: 4,
    name: 'Stage 4 — Collectibles and the map',
    estimate: '8–10 hours',
    summary:
      'Card sets, WAiNK It locations, vehicle discovery and exploring every corner of Leonida. One long road trip across the state moves all of these at once — sweep one region at a time and check the collection menu as you go.',
  },
  {
    key: 5,
    name: 'Stage 5 — Money and mayhem',
    estimate: '8–10 hours',
    summary:
      'Partner robberies, bank vaults and armored trucks, the one-off moments around Leonida (Ocean Beach, the showroom, the bowling alley), laundering Marked Bills, spending big, and buying garages and Scooter Bros registrations.',
  },
  {
    key: 6,
    name: 'Stage 6 — Platinum',
    estimate: 'Pops with the rest',
    summary:
      'Vice Got a Price! pops the moment the other 54 are earned. Nothing extra is needed for it — just the checklist, finished.',
  },
];

// The named stage a trophy belongs to, from the notes file when it is there
// and from the plan table when it is not.
export function stageLabelFor(trophy) {
  if (trophy.stageLabel) return trophy.stageLabel;
  const entry = PLAN_STAGES.find((row) => row.key === trophy.stage);
  return entry ? entry.name : `Stage ${trophy.stage}`;
}

// Missable trophies grouped by the kind of one-time moment they hang on, so
// a player can see at a glance which moments to protect on a first run.
export const RISK_GROUPS = [
  {
    heading: 'Story chapters and named missions',
    ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 48],
    summary:
      'Chapter trophies and one-shot named missions. Each fires once, on that mission or chapter — take the mission when the story offers it and play it through to the end.',
  },
  {
    heading: 'Stranger strand finales',
    ids: [22, 23, 24, 26, 27],
    summary:
      'The final mission of a stranger strand. Play each strand to its end before the endgame — a strand left half-done also stalls the Strangers & Freaks silver.',
  },
  {
    heading: 'One-off free-roam moments',
    ids: [33, 34, 37, 44, 45, 46, 49, 50],
    summary:
      'Single moments in free roam that do not come back as missions: a partner escape, a robbery streak, a take-off, a cocktail, a showroom smash, a bowling game, a second attempt, a strange event. Do them while you are passing, not after the story.',
  },
];

export function stageMembers(trophies, key) {
  return trophies.filter((trophy) => trophy.stage === key);
}

export function stageDone(trophies, ledger, key) {
  const members = stageMembers(trophies, key);
  const done = members.filter((trophy) => ledger.has(trophy.name)).length;
  return { done, total: members.length };
}

// The first trophy the player has not earned yet, in plan order — the
// "next target" answer for the header card and the N key. Null once the
// list is finished.
export function nextPending(trophies, ledger) {
  const ordered = [...trophies].sort(
    (a, b) => a.stage - b.stage || a.id - b.id,
  );
  return ordered.find((trophy) => !ledger.has(trophy.name)) ?? null;
}

// Earned counts per kind, for the header and the kind chip labels.
export function kindBreakdown(trophies, ledger) {
  const breakdown = {};
  for (const trophy of trophies) {
    breakdown[trophy.kind] ??= { done: 0, total: 0 };
    breakdown[trophy.kind].total += 1;
    if (ledger.has(trophy.name)) breakdown[trophy.kind].done += 1;
  }
  return breakdown;
}

// Earned counts per grade, for the grade strip in the header card.
export function gradeBreakdown(trophies, ledger) {
  const breakdown = {};
  for (const trophy of trophies) {
    breakdown[trophy.grade] ??= { done: 0, total: 0 };
    breakdown[trophy.grade].total += 1;
    if (ledger.has(trophy.name)) breakdown[trophy.grade].done += 1;
  }
  return breakdown;
}

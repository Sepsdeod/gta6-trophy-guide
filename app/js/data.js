// Loading the guide's data and the tables the views are built from.
//
// The guide's data lives in three JSON files under app/data, all fetched
// locally — the app makes no network request at run time:
//   trophies.json       the 55 official trophies (names, descriptions and
//                       grades exactly as PlayStation publishes them) with
//                       this guide's own-words guides, kinds, missable
//                       flags and roadmap stages
//   trophy-notes.json   per-trophy difficulty (1–5), time estimate, a
//                       concrete tip, an avoid line for missables, and the
//                       roadmap stage the trophy belongs to
//   reference.json      the collectibles, activities and money reference
//
// The roadmap and the missable groups below are drawn from the official
// descriptions alone: which story chapters and missions, which collectibles
// and counts, in what order. Where a description leaves a place or a step
// unpinned, the guides say so instead of inventing one.

const DATA_DIR = 'data';

async function loadJsonFile(name) {
  const reply = await fetch(`${DATA_DIR}/${name}`);
  if (!reply.ok) throw new Error(`Could not load ${DATA_DIR}/${name} (${reply.status})`);
  return reply.json();
}

function trophyArray(doc) {
  return Array.isArray(doc) ? doc : doc.trophies;
}

// Fold the per-trophy notes into the trophy objects so the views only ever
// deal with one list. A note that is missing (or a notes file that fails to
// load) leaves the trophy usable — the guide, kind and stage all come from
// trophies.json, and only the estimates and tips come from the notes.
function attachNotes(trophies, notesDoc) {
  const byId = new Map((notesDoc?.notes ?? []).map((note) => [note.id, note]));
  for (const trophy of trophies) {
    const note = byId.get(trophy.id);
    if (!note) continue;
    trophy.difficulty = note.difficulty;
    trophy.time = note.time;
    trophy.tip = note.tip;
    trophy.avoid = note.avoid ?? null;
    trophy.noteStage = note.stage ?? null;
  }
}

export async function loadGuide() {
  const doc = await loadJsonFile('trophies.json');
  const trophies = trophyArray(doc);

  let notesDoc = { notes: [] };
  try {
    notesDoc = await loadJsonFile('trophy-notes.json');
  } catch {
    notesDoc = { notes: [] };
  }
  attachNotes(trophies, notesDoc);

  let reference = { sections: [] };
  try {
    reference = await loadJsonFile('reference.json');
  } catch {
    reference = { sections: [] };
  }

  return {
    trophies,
    sources: doc.sources ?? {},
    reference,
    meta: doc.meta ?? null,
  };
}

// Trophy points follow the usual weighting — platinum most, then gold,
// silver, bronze — and the whole set adds up to 1,230.
export const GRADE_SCORE = { platinum: 180, gold: 90, silver: 30, bronze: 15 };

export function scoreOf(trophy) {
  return GRADE_SCORE[trophy.grade] ?? 0;
}

export const DIFFICULTY_WORDS = {
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
export const ROADMAP = [
  {
    stage: 1,
    title: 'Stage 1 — Play the story through',
    hours: '25–30 hours',
    blurb:
      'Chapters 1 to 4 and the final mission, played in order. Every chapter trophy and every named-mission trophy lands here, and so do the one-shot story missables — take each named mission the moment the story offers it and see it through to the end.',
  },
  {
    stage: 2,
    title: 'Stage 2 — Strangers and 100%',
    hours: '8–10 hours',
    blurb:
      'Every stranger strand played to its final mission — the eight strands feed the Strangers & Freaks silver — and then the push toward 100% completion for the A Long Road gold. A strand left half-done stalls both.',
  },
  {
    stage: 3,
    title: 'Stage 3 — The counted activities',
    hours: '10–14 hours',
    blurb:
      'Stunts, the Shooting Range, races, drone races, fishing, the arcade, meditation spots and the hunt. The 42 gold medals at the range are the hardest ask in the set; take them one weapon at a time.',
  },
  {
    stage: 4,
    title: 'Stage 4 — Collectibles and the map',
    hours: '8–10 hours',
    blurb:
      'Card sets, WAiNK It locations, vehicle discovery and exploring every corner of Leonida. One long road trip across the state moves all of these at once — sweep one region at a time and check the collection menu as you go.',
  },
  {
    stage: 5,
    title: 'Stage 5 — Money and mayhem',
    hours: '8–10 hours',
    blurb:
      'Partner robberies, bank vaults and armored trucks, the one-off moments around Leonida (Ocean Beach, the showroom, the bowling alley), laundering Marked Bills, spending big, and buying garages and Scooter Bros registrations.',
  },
  {
    stage: 6,
    title: 'Stage 6 — Platinum',
    hours: 'Pops with the rest',
    blurb:
      'Vice Got a Price! pops the moment the other 54 are earned. Nothing extra is needed for it — just the checklist, finished.',
  },
];

// The named stage a trophy belongs to, from the notes file when it is there
// and from the roadmap table when it is not.
export function stageNameOf(trophy) {
  if (trophy.noteStage) return trophy.noteStage;
  const entry = ROADMAP.find((row) => row.stage === trophy.stage);
  return entry ? entry.title : `Stage ${trophy.stage}`;
}

// Missable trophies grouped by the kind of one-time moment they hang on, so
// a player can see at a glance which moments to protect on a first run.
export const MISSABLE_SETS = [
  {
    title: 'Story chapters and named missions',
    ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 48],
    blurb:
      'Chapter trophies and one-shot named missions. Each fires once, on that mission or chapter — take the mission when the story offers it and play it through to the end.',
  },
  {
    title: 'Stranger strand finales',
    ids: [22, 23, 24, 26, 27],
    blurb:
      'The final mission of a stranger strand. Play each strand to its end before the endgame — a strand left half-done also stalls the Strangers & Freaks silver.',
  },
  {
    title: 'One-off free-roam moments',
    ids: [33, 34, 37, 44, 45, 46, 49, 50],
    blurb:
      'Single moments in free roam that do not come back as missions: a partner escape, a robbery streak, a take-off, a cocktail, a showroom smash, a bowling game, a second attempt, a strange event. Do them while you are passing, not after the story.',
  },
];

export function trophiesInStage(trophies, stage) {
  return trophies.filter((trophy) => trophy.stage === stage);
}

export function stageProgress(trophies, store, stage) {
  const items = trophiesInStage(trophies, stage);
  const done = items.filter((trophy) => store.earned(trophy.name)).length;
  return { done, total: items.length };
}

// The first trophy the player has not earned yet, in roadmap order — the
// "next up" answer for the header card and the N key. Null once the list
// is finished.
export function nextUnearned(trophies, store) {
  const ordered = [...trophies].sort(
    (a, b) => a.stage - b.stage || a.id - b.id,
  );
  return ordered.find((trophy) => !store.earned(trophy.name)) ?? null;
}

// Earned counts per kind, for the header and the kind filter labels.
export function kindTotals(trophies, store) {
  const totals = {};
  for (const trophy of trophies) {
    totals[trophy.kind] = totals[trophy.kind] ?? { done: 0, total: 0 };
    totals[trophy.kind].total += 1;
    if (store.earned(trophy.name)) totals[trophy.kind].done += 1;
  }
  return totals;
}

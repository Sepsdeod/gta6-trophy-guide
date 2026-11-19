// Data loading and the guide's fixed tables.
//
// Three JSON files make up the guide's data, all inside app/ and fetched with
// no network at run time:
//   data/trophies.json      the 55 official trophies (names, descriptions and
//                           grades exactly as PlayStation publishes them) plus
//                           this guide's own-words guides, kinds, missable
//                           flags and roadmap stages
//   data/trophy-notes.json  per-trophy difficulty (1–5), time estimate, pro
//                           tip and "how not to miss it" line
//   data/reference.json     the collectibles / activities / money reference
//
// The roadmap stages and the missable groups below are built from the
// official descriptions alone: which story chapters and missions, which
// collectibles and counts, in what order. Where a description does not pin
// down a place or a step, the guides say so instead of inventing one.

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path} (${response.status})`);
  }
  return response.json();
}

export async function loadGuide() {
  const doc = await fetchJson('data/trophies.json');
  const trophies = Array.isArray(doc) ? doc : doc.trophies;
  const sources = doc.sources ?? {};
  const meta = doc.meta ?? null;

  let notes = [];
  try {
    const notesDoc = await fetchJson('data/trophy-notes.json');
    notes = notesDoc.notes ?? [];
  } catch {
    notes = [];
  }
  const noteById = new Map(notes.map((note) => [note.id, note]));
  for (const trophy of trophies) {
    const note = noteById.get(trophy.id);
    if (!note) continue;
    trophy.difficulty = note.difficulty;
    trophy.time = note.time;
    trophy.tip = note.tip;
    trophy.avoid = note.avoid ?? null;
  }

  let reference = { sections: [] };
  try {
    reference = await fetchJson('data/reference.json');
  } catch {
    reference = { sections: [] };
  }

  return { trophies, sources, reference, meta };
}

// Points follow the usual trophy weighting: the platinum is worth the most,
// then gold, silver, bronze. The total across all 55 is 1,230.
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
// ranges are this guide's own estimates, built from what the official
// descriptions ask for — the story is most of the time, and the clean-up
// stages are the long tail after it.
export const ROADMAP = [
  {
    stage: 1,
    title: 'Stage 1 — Play the story through',
    hours: '25–30 hours',
    blurb:
      'Chapters 1 to 4 and the final mission, in order. Every chapter trophy and every named-mission trophy lands here, and so do the one-shot story missables — take each named mission the moment the story offers it and play it to the end.',
  },
  {
    stage: 2,
    title: 'Stage 2 — Strangers and 100%',
    hours: '8–10 hours',
    blurb:
      'Finish every stranger strand to its final mission — the eight strands feed the Strangers & Freaks silver — then push the game toward 100% completion for the A Long Road gold. A strand left half-done stalls both.',
  },
  {
    stage: 3,
    title: 'Stage 3 — The counted activities',
    hours: '10–14 hours',
    blurb:
      'Stunts, the Shooting Range, races, drone races, fishing, the arcade, meditation spots and the hunt. The 42 gold medals at the range are the hardest ask in the set; work them one weapon at a time.',
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
      'Vice Got a Price! pops the moment the other 54 are earned. There is nothing extra to do for it — just the checklist, finished.',
  },
];

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

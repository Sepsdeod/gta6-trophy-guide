// loadTrophies fetches the official trophy list (names, descriptions, grades) plus
// this guide's own-words guides, kinds, missable flags and roadmap stages.
// It loads only data/trophies.json, a file inside app/ — no network at run time.
// loadNotes fetches data/trophy-notes.json (difficulty, time estimate, tip and
// missable-avoid line per trophy) and merges it onto the trophies by id.
// loadReference fetches data/reference.json (collectibles / activities / money).
export async function loadTrophies() {
  const response = await fetch('data/trophies.json');
  if (!response.ok) throw new Error('Could not load data/trophies.json');
  const doc = await response.json();
  const trophies = Array.isArray(doc) ? doc : doc.trophies;
  const sources = doc.sources ?? {};
  const notes = await loadNotes();
  const byId = new Map(notes.map((n) => [n.id, n]));
  for (const trophy of trophies) {
    const note = byId.get(trophy.id);
    if (note) {
      trophy.difficulty = note.difficulty;
      trophy.time = note.time;
      trophy.tip = note.tip;
      trophy.avoid = note.avoid ?? null;
    }
  }
  return { trophies, sources };
}

export async function loadNotes() {
  const response = await fetch('data/trophy-notes.json');
  if (!response.ok) return [];
  const doc = await response.json();
  return doc.notes ?? [];
}

export async function loadReference() {
  const response = await fetch('data/reference.json');
  if (!response.ok) return { sections: [] };
  return response.json();
}

export const DIFFICULTY_LABEL = { 1: 'Very easy', 2: 'Easy', 3: 'Moderate', 4: 'Hard', 5: 'Very hard' };

export const GRADE_POINTS = { platinum: 180, gold: 90, silver: 30, bronze: 15 };

export function trophyPoints(trophy) {
  return GRADE_POINTS[trophy.grade] ?? 0;
}

export const ROADMAP_STAGES = [
  { stage: 1, title: 'Stage 1 — Story first', hours: '25–30 hours', text: 'Play Chapters 1–4 and the final mission in order. Every chapter and named-mission trophy lands here, and so do the one-shot story missables — take each named mission when it is offered.' },
  { stage: 2, title: 'Stage 2 — Strangers & 100%', hours: '8–10 hours', text: 'Finish the stranger mission strands (Andy, Kenton, Billy, Randy, Tyrone and three more) to unlock the Strangers & Freaks silver, then push toward 100% completion for the A Long Road gold.' },
  { stage: 3, title: 'Stage 3 — Activities', hours: '10–14 hours', text: 'Stunts, the Shooting Range, races, drone races, fishing, the arcade, meditation spots and the hunt — the counted activity trophies. The 42 gold medals at the range are the hardest of the set.' },
  { stage: 4, title: 'Stage 4 — Collectibles & Leonida', hours: '8–10 hours', text: 'Card sets, WAiNK It locations, vehicle discovery and exploring all of Leonida. One long road trip across the state moves all of these at once.' },
  { stage: 5, title: 'Stage 5 — Money & mayhem', hours: '8–10 hours', text: 'Partner robberies, vaults and armored trucks, the one-off moments (Ocean Beach, the showroom, the bowling alley), laundering Marked Bills, spending, garages and Scooter Bros registrations.' },
  { stage: 6, title: 'Stage 6 — Platinum', hours: 'Pops with the rest', text: 'Vice Got a Price! pops the moment the other 54 are earned. Nothing extra — just the checklist, finished.' },
];

// Missable trophies grouped by the one-time moment that can pass them by, so a
// player sees at a glance which kind of moment each one hangs on.
export const MISSABLE_GROUPS = [
  { title: 'Story chapters & named missions', ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 48], text: 'Chapter trophies and one-shot named missions. Each fires once, on that mission or chapter — take the mission when the story offers it and play it to the end.' },
  { title: 'Stranger strand finales', ids: [22, 23, 24, 26, 27], text: 'The final mission of a stranger strand. Play each strand to its end before the endgame — a strand left half-done also stalls the Strangers & Freaks silver.' },
  { title: 'One-off free-roam moments', ids: [33, 34, 37, 44, 45, 46, 49, 50], text: 'Single moments in free roam that do not come back as missions: a partner escape, a robbery streak, a take-off, a cocktail, a showroom smash, a bowling game, a second attempt, a strange event. Do them while you are passing, not after the story.' },
];

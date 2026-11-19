// loadTrophies fetches the official trophy list (names, descriptions, grades) plus
// this guide's own-words guides, kinds, missable flags and roadmap stages.
// It loads only data/trophies.json, a file inside app/ — no network at run time.
export async function loadTrophies() {
  const response = await fetch('data/trophies.json');
  if (!response.ok) throw new Error('Could not load data/trophies.json');
  const doc = await response.json();
  const trophies = Array.isArray(doc) ? doc : doc.trophies;
  const sources = doc.sources ?? {};
  return { trophies, sources };
}

export const GRADE_POINTS = { platinum: 180, gold: 90, silver: 30, bronze: 15 };

export function trophyPoints(trophy) {
  return GRADE_POINTS[trophy.grade] ?? 0;
}

export const ROADMAP_STAGES = [
  { stage: 1, title: 'Stage 1 — Story first', text: 'Play Chapters 1–4 and the final mission in order. Every chapter and named-mission trophy lands here, and so do the one-shot story missables — take each named mission when it is offered.' },
  { stage: 2, title: 'Stage 2 — Strangers & 100%', text: 'Finish the stranger mission strands (Andy, Kenton, Billy, Randy, Tyrone and three more) to unlock the Strangers & Freaks silver, then push toward 100% completion for the A Long Road gold.' },
  { stage: 3, title: 'Stage 3 — Activities', text: 'Stunts, the Shooting Range, races, drone races, fishing, the arcade, meditation spots and the hunt — the counted activity trophies. The 42 gold medals at the range are the hardest of the set.' },
  { stage: 4, title: 'Stage 4 — Collectibles & Leonida', text: 'Card sets, WAiNK It locations, vehicle discovery and exploring all of Leonida. One long road trip across the state moves all of these at once.' },
  { stage: 5, title: 'Stage 5 — Money & mayhem', text: 'Partner robberies, vaults and armored trucks, the one-off moments (Ocean Beach, the showroom, the bowling alley), laundering Marked Bills, spending, garages and Scooter Bros registrations.' },
  { stage: 6, title: 'Stage 6 — Platinum', text: 'Vice Got a Price! pops the moment the other 54 are earned. Nothing extra — just the checklist, finished.' },
];

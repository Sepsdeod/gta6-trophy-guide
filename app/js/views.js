// All rendering: the checklist, the trophy detail pane, the roadmap, the
// missables page and the collectibles reference.
//
// Every renderer takes the pieces it needs and rebuilds its pane from
// scratch, so the app never has to track which bit of the DOM is stale —
// state changes (a tick, a filter, a tab) just re-render. Text is always set
// with textContent, never innerHTML, so trophy names and guide text can
// never inject markup.

import {
  DIFFICULTY_WORDS,
  MISSABLE_SETS,
  ROADMAP,
  scoreOf,
  stageNameOf,
  stageProgress,
  trophiesInStage,
} from './data.js';
import {
  countKind,
  earnedInView,
  passesFilters,
  shownDescription,
  shownName,
  sortTrophies,
  spoilerHidden,
} from './filters.js';

const GRADE_WORD = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};
const GRADE_INITIAL = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };

function h(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function medalBadge(trophy) {
  return h('span', `medal ${trophy.grade}`, GRADE_INITIAL[trophy.grade]);
}

function flagChips(trophy) {
  const row = h('div', 'trophy-flags');
  row.append(h('span', 'flag grade', GRADE_WORD[trophy.grade]));
  if (trophy.hidden) row.append(h('span', 'flag hidden', 'Hidden'));
  if (trophy.missable) row.append(h('span', 'flag missable', 'Missable'));
  if (trophy.target) {
    row.append(h('span', 'flag', `Target: ${trophy.target.toLocaleString()}`));
  }
  return row;
}

function tickBox(trophy, store, onChange) {
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = store.earned(trophy.name);
  box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
  box.addEventListener('change', () => {
    store.set(trophy.name, box.checked);
    onChange(trophy.name);
  });
  box.addEventListener('click', (event) => event.stopPropagation());
  return box;
}

// ---- Header: progress card -------------------------------------------------

export function renderHeader(trophies, store, refs) {
  const total = trophies.length;
  const earned = store.total();
  const points = trophies
    .filter((t) => store.earned(t.name))
    .reduce((sum, t) => sum + scoreOf(t), 0);
  const maxPoints = trophies.reduce((sum, t) => sum + scoreOf(t), 0);
  const percent = total ? Math.round((earned / total) * 100) : 0;

  refs.earnedCount.textContent = String(earned);
  refs.progressFill.style.width = `${percent}%`;
  refs.progressBar.setAttribute('aria-valuenow', String(earned));
  refs.earnedPoints.textContent = String(points);
  refs.earnedPercent.textContent = `${percent}%`;

  const next = sortTrophies(
    trophies.filter((t) => !store.earned(t.name)),
    'roadmap',
  )[0];
  refs.nextUp.replaceChildren();
  refs.nextUp.append('Next up: ');
  if (next) {
    refs.nextUp.append(
      h('strong', null, `${next.name} — ${GRADE_WORD[next.grade]}`),
    );
  } else {
    refs.nextUp.append(h('strong', null, 'Platinum earned — Leonida Legend!'));
  }
  // The points line also carries the maximum, so the card reads as a whole.
  refs.earnedPoints.parentElement?.setAttribute(
    'data-max-points',
    String(maxPoints),
  );
}

export function renderKindCounts(trophies, refs) {
  refs.countStory.textContent = String(countKind(trophies, 'story'));
  refs.countMissable.textContent = String(countKind(trophies, 'missable'));
  refs.countCollectibles.textContent = String(
    countKind(trophies, 'collectibles'),
  );
  refs.countActivities.textContent = String(countKind(trophies, 'activities'));
  refs.missableCount.textContent = String(countKind(trophies, 'missable'));
}

// ---- Checklist --------------------------------------------------------------

export function renderChecklist(
  trophies,
  store,
  filters,
  selectedName,
  onPick,
  refs,
) {
  const list = refs.trophyList;
  list.replaceChildren();
  const shown = sortTrophies(
    trophies.filter((t) => passesFilters(t, filters, store.earned(t.name))),
    filters.sort,
  );
  refs.listMeta.textContent =
    `Showing ${shown.length} of ${trophies.length} trophies · ` +
    `${store.total()} earned · ${earnedInView(shown, store)} earned in view · ${shown.filter((t) => t.missable).length} missable in view`;
  refs.emptyState.hidden = shown.length > 0;

  for (const trophy of shown) {
    const earned = store.earned(trophy.name);
    const li = h(
      'li',
      `trophy-row${earned ? ' earned' : ''}${
        selectedName === trophy.name ? ' selected' : ''
      }`,
    );
    const box = tickBox(trophy, store, (name) => onPick(name, true));
    const text = h('div');
    text.append(
      h('div', 'trophy-name', shownName(trophy, filters, earned)),
      h('div', 'trophy-desc', shownDescription(trophy, filters, earned)),
      flagChips(trophy),
    );
    li.append(box, medalBadge(trophy), text, h('span', 'flag grade', GRADE_WORD[trophy.grade]));
    li.addEventListener('click', () => onPick(trophy.name, false));
    list.append(li);
  }
  return shown;
}

// ---- Detail pane ------------------------------------------------------------

export function renderDetail(
  trophy,
  sources,
  store,
  filters,
  onToggle,
  onStep,
  refs,
) {
  const pane = refs.detailPane;
  pane.replaceChildren();
  if (!trophy) {
    pane.append(
      h('p', 'detail-empty', 'Select a trophy to read its guide and sources.'),
    );
    return;
  }
  const earned = store.earned(trophy.name);
  const masked = spoilerHidden(trophy, filters, earned);

  pane.append(
    h(
      'p',
      `detail-grade ${trophy.grade}`,
      `${GRADE_WORD[trophy.grade]} trophy · ${scoreOf(trophy)} points`,
    ),
  );
  pane.append(h('h2', null, masked ? 'Hidden story trophy' : trophy.name));
  pane.append(
    h(
      'p',
      'detail-desc',
      masked
        ? 'Spoilers hidden — earn this trophy to reveal its name and description.'
        : trophy.description,
    ),
  );

  if (masked) {
    pane.append(
      h(
        'p',
        'spoiler-mask',
        'Its guide and sources stay hidden too, until the trophy is earned. Tick it off in the checklist to reveal the guide.',
      ),
    );
  } else {
    if (trophy.target) {
      pane.append(
        h('p', 'detail-target', `PSN target: ${trophy.target.toLocaleString()}`),
      );
    }
    if (trophy.missable) {
      pane.append(
        h(
          'p',
          'detail-target',
          '⚠ Missable — tied to a one-time story moment. See the Missables page.',
        ),
      );
    }
    const stage = ROADMAP.find((entry) => entry.stage === trophy.stage);
    if (stage) {
      pane.append(
        h(
          'p',
          'detail-stage',
          `${stageNameOf(trophy)} · estimated ${stage.hours}`,
        ),
      );
    }
    if (trophy.difficulty) {
      const chips = h('div', 'detail-chips');
      chips.append(
        h(
          'span',
          'chip',
          `Difficulty: ${DIFFICULTY_WORDS[trophy.difficulty] ?? trophy.difficulty} (${trophy.difficulty}/5)`,
        ),
      );
      if (trophy.time) chips.append(h('span', 'chip', `Time: ${trophy.time}`));
      pane.append(chips);
      pane.append(
        h(
          'p',
          'chip-note',
          'Difficulty and time are this guide’s own estimates from the official description.',
        ),
      );
    }
    pane.append(h('p', 'detail-guide', trophy.guide));
    if (trophy.tip) {
      const tipBox = h('div', 'tip-box');
      tipBox.append(h('strong', null, 'Pro tip: '));
      tipBox.append(document.createTextNode(trophy.tip));
      pane.append(tipBox);
    }
    if (trophy.avoid) {
      const avoidBox = h('div', 'avoid-box');
      avoidBox.append(h('strong', null, 'How not to miss it: '));
      avoidBox.append(document.createTextNode(trophy.avoid));
      pane.append(avoidBox);
    }
    const srcBox = h('div', 'detail-sources');
    srcBox.append(h('h3', null, 'Sources'));
    const list = h('ul');
    for (const key of trophy.sources ?? []) {
      const src = sources[key];
      if (!src) continue;
      const item = h('li');
      const link = document.createElement('a');
      link.href = src.url;
      link.textContent = src.name;
      link.target = '_blank';
      link.rel = 'noopener';
      item.append(link);
      list.append(item);
    }
    list.append(
      h('li', null, 'Guide text: our own words from the official description.'),
    );
    srcBox.append(list);
    pane.append(srcBox);
  }

  const nav = h('div', 'detail-nav');
  const prev = h('button', null, '← Previous trophy');
  prev.type = 'button';
  prev.addEventListener('click', () => onStep(-1));
  const next = h('button', null, 'Next trophy →');
  next.type = 'button';
  next.addEventListener('click', () => onStep(1));
  nav.append(prev, next);
  pane.append(nav);

  const earnBox = h('div', 'detail-earn');
  const btn = h(
    'button',
    earned ? 'earned' : null,
    earned ? '✓ Earned — tap to unmark' : 'Mark as earned',
  );
  btn.type = 'button';
  btn.addEventListener('click', () => onToggle(trophy.name));
  earnBox.append(btn);
  if (earned) {
    const when = store.earnedAt ? store.earnedAt(trophy.name) : null;
    earnBox.append(
      h(
        'p',
        'earned-date',
        when
          ? `Earned on ${when} — recorded in this browser.`
          : 'Earned — ticked in an earlier save, before dates were recorded.',
      ),
    );
  }
  pane.append(earnBox);
}

// ---- Roadmap ----------------------------------------------------------------

export function renderRoadmap(trophies, store, onToggle, refs) {
  const pane = refs.roadmapPane;
  pane.replaceChildren();
  pane.append(
    h(
      'p',
      'roadmap-total',
      'About 60–75 hours in all, our estimate — the story is most of it. ' +
        'Each stage lists the trophies it unlocks; tick them off here or in the checklist, it is the same progress.',
    ),
  );
  for (const stage of ROADMAP) {
    const items = trophiesInStage(trophies, stage.stage);
    const { done, total } = stageProgress(trophies, store, stage.stage);
    const box = h('section', 'stage');
    box.append(h('h2', null, stage.title));
    const meta = h('p', 'stage-meta');
    meta.append(h('span', 'stage-hours', `Estimated: ${stage.hours}`));
    meta.append(document.createTextNode(' · '));
    meta.append(
      h('span', 'stage-progress', `${done} / ${total} earned in this stage`),
    );
    box.append(meta);
    const bar = h('div', 'stage-bar');
    const fill = h('span');
    fill.style.width = total ? `${Math.round((done / total) * 100)}%` : '0%';
    bar.append(fill);
    box.append(bar);
    box.append(h('p', null, stage.blurb));
    const list = h('ul', 'stage-checklist');
    for (const trophy of items) {
      const earned = store.earned(trophy.name);
      const li = h('li', earned ? 'earned' : null);
      li.append(tickBox(trophy, store, onToggle));
      li.append(
        h(
          'span',
          null,
          `${trophy.name} — ${GRADE_WORD[trophy.grade]}${
            trophy.missable ? ' · Missable' : ''
          }`,
        ),
      );
      list.append(li);
    }
    box.append(list);
    pane.append(box);
  }
}

// ---- Missables ---------------------------------------------------------------

export function renderMissables(trophies, store, refs) {
  const pane = refs.missablesPane;
  pane.replaceChildren();
  const missableTotal = trophies.filter((t) => t.missable).length;
  const intro = h('div', 'missable-intro');
  intro.append(h('h2', null, 'Missable trophies — built from the official descriptions'));
  intro.append(
    h(
      'p',
      null,
      'A trophy is flagged missable when its official description ties it to one named mission or one-time moment: a chapter, a named story mission, a stranger strand finale, or a single event that does not come back in free roam. Earn these during the moment itself — afterwards the only way back is a mission replay or a new playthrough.',
    ),
  );
  intro.append(
    h(
      'p',
      null,
      `${missableTotal} of the 55 trophies are flagged missable. Do the story missables on your first playthrough, in stage order, and check them off here as you go.`,
    ),
  );
  pane.append(intro);

  const byId = new Map(trophies.map((t) => [t.id, t]));
  for (const group of MISSABLE_SETS) {
    const groupBox = h('section', 'missable-group');
    groupBox.append(h('h2', null, group.title));
    groupBox.append(h('p', null, group.blurb));
    const list = h('ul', 'trophy-list');
    for (const id of group.ids) {
      const trophy = byId.get(id);
      if (!trophy) continue;
      const earned = store.earned(trophy.name);
      const li = h('li', `trophy-row${earned ? ' earned' : ''}`);
      const text = h('div');
      text.append(h('div', 'trophy-name', trophy.name));
      text.append(h('div', 'trophy-desc', trophy.description));
      if (trophy.avoid) {
        const avoid = h('div', 'avoid-note');
        avoid.append(h('strong', null, 'How not to miss it: '));
        avoid.append(document.createTextNode(trophy.avoid));
        text.append(avoid);
      }
      text.append(flagChips(trophy));
      li.append(h('span'), medalBadge(trophy), text, h('span', 'flag grade', GRADE_WORD[trophy.grade]));
      list.append(li);
    }
    groupBox.append(list);
    pane.append(groupBox);
  }
}

// ---- Reference ---------------------------------------------------------------

export function renderReference(reference, refs) {
  const pane = refs.referencePane;
  pane.replaceChildren();
  const intro = h('div', 'missable-intro');
  intro.append(h('h2', null, 'Collectibles & activities reference'));
  intro.append(
    h(
      'p',
      null,
      'What to find, how much of it, and where it counts — built only from the official trophy descriptions. Where a description does not pin down a count or a place, the entry says so instead of inventing one.',
    ),
  );
  pane.append(intro);
  for (const section of reference.sections ?? []) {
    const box = h('section', 'stage');
    box.append(h('h2', null, section.title));
    if (section.intro) box.append(h('p', null, section.intro));
    for (const item of section.items ?? []) {
      const entry = h('div', 'ref-item');
      entry.append(h('h3', null, item.title));
      if (item.counts) entry.append(h('p', 'ref-counts', item.counts));
      entry.append(h('p', null, item.tip));
      if (item.source) entry.append(h('p', 'ref-source', `Source: ${item.source}`));
      box.append(entry);
    }
    pane.append(box);
  }
}

// ---- Footer source links ------------------------------------------------------

export function renderSourceLinks(sources, refs) {
  const holder = refs.sourceLinks;
  holder.replaceChildren();
  const keys = Object.keys(sources);
  keys.forEach((key, index) => {
    if (index > 0) holder.append(', ');
    const link = document.createElement('a');
    link.href = sources[key].url;
    link.textContent = sources[key].name;
    link.target = '_blank';
    link.rel = 'noopener';
    holder.append(link);
  });
}

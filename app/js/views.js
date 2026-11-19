// trophyViews renders the checklist, the trophy detail pane (guide + sources),
// the roadmap to the platinum and the missables page from the loaded data.
import { ROADMAP_STAGES, trophyPoints } from './data.js';
import { displayDescription, displayName, isSpoilerMasked, trophyMatches } from './filters.js';

const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const GRADE_LETTER = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function medal(trophy) {
  return el('span', `medal ${trophy.grade}`, GRADE_LETTER[trophy.grade]);
}

function flagRow(trophy) {
  const row = el('div', 'trophy-flags');
  row.append(el('span', 'flag grade', GRADE_LABEL[trophy.grade]));
  if (trophy.hidden) row.append(el('span', 'flag hidden', 'Hidden'));
  if (trophy.missable) row.append(el('span', 'flag missable', 'Missable'));
  if (trophy.target) row.append(el('span', 'flag', `Target: ${trophy.target.toLocaleString()}`));
  return row;
}

export function renderProgress(trophies, store, refs) {
  const total = trophies.length;
  const earned = store.earnedCount();
  const points = trophies.filter((t) => store.isEarned(t.name)).reduce((sum, t) => sum + trophyPoints(t), 0);
  const maxPoints = trophies.reduce((sum, t) => sum + trophyPoints(t), 0);
  const percent = total ? Math.round((earned / total) * 100) : 0;
  refs.earnedCount.textContent = String(earned);
  refs.progressFill.style.width = `${percent}%`;
  refs.progressBar.setAttribute('aria-valuenow', String(earned));
  refs.earnedPoints.textContent = String(points);
  refs.earnedPercent.textContent = `${percent}%`;
  const next = trophies
    .filter((t) => !store.isEarned(t.name))
    .sort((a, b) => a.stage - b.stage || a.id - b.id)[0];
  refs.nextUp.replaceChildren();
  if (next) {
    refs.nextUp.append('Next up: ');
    refs.nextUp.append(el('strong', null, `${next.name} — ${GRADE_LABEL[next.grade]}`));
  } else {
    refs.nextUp.append('Next up: ');
    refs.nextUp.append(el('strong', null, 'Platinum earned — Leonida Legend!'));
  }
}

export function renderCounts(trophies, refs) {
  const count = (fn) => trophies.filter(fn).length;
  refs.countStory.textContent = String(count((t) => t.kind === 'story'));
  refs.countMissable.textContent = String(count((t) => t.missable));
  refs.countCollectibles.textContent = String(count((t) => t.kind === 'collectibles'));
  refs.countActivities.textContent = String(count((t) => t.kind === 'activities'));
  refs.missableCount.textContent = String(count((t) => t.missable));
}

export function renderChecklist(trophies, store, filters, selectedName, onSelect, refs) {
  const list = refs.trophyList;
  list.replaceChildren();
  const shown = trophies.filter((t) => trophyMatches(t, filters, store.isEarned(t.name)));
  refs.listMeta.textContent = `Showing ${shown.length} of ${trophies.length} trophies · ${store.earnedCount()} earned`;
  refs.emptyState.hidden = shown.length > 0;
  for (const trophy of shown) {
    const earned = store.isEarned(trophy.name);
    const li = el('li', `trophy-row${earned ? ' earned' : ''}${selectedName === trophy.name ? ' selected' : ''}`);
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned;
    box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
    box.addEventListener('change', () => {
      store.setEarned(trophy.name, box.checked);
      onSelect(trophy.name, true);
    });
    box.addEventListener('click', (event) => event.stopPropagation());
    const name = el('div', 'trophy-name', displayName(trophy, filters, earned));
    const desc = el('div', 'trophy-desc', displayDescription(trophy, filters, earned));
    const text = el('div');
    text.append(name, desc, flagRow(trophy));
    li.append(box, medal(trophy), text, el('span', 'flag grade', GRADE_LABEL[trophy.grade]));
    li.addEventListener('click', () => onSelect(trophy.name, false));
    list.append(li);
  }
}

export function renderDetail(trophy, sources, store, filters, onToggle, refs) {
  const pane = refs.detailPane;
  pane.replaceChildren();
  if (!trophy) {
    pane.append(el('p', 'detail-empty', 'Select a trophy to read its guide and sources.'));
    return;
  }
  const earned = store.isEarned(trophy.name);
  const masked = isSpoilerMasked(trophy, filters, earned);
  pane.append(el('p', `detail-grade ${trophy.grade}`, `${GRADE_LABEL[trophy.grade]} trophy · ${trophyPoints(trophy)} points`));
  pane.append(el('h2', null, masked ? 'Hidden story trophy' : trophy.name));
  pane.append(el('p', 'detail-desc', masked ? 'Spoilers hidden — earn this trophy to reveal its name and description.' : trophy.description));
  if (masked) {
    pane.append(el('p', 'spoiler-mask', 'Its guide and sources stay hidden too, until the trophy is earned. Tick it off in the checklist to reveal the guide.'));
  } else {
    if (trophy.target) pane.append(el('p', 'detail-target', `PSN target: ${trophy.target.toLocaleString()}`));
    if (trophy.missable) pane.append(el('p', 'detail-target', '⚠ Missable — tied to a one-time story moment. See the Missables page.'));
    pane.append(el('p', 'detail-guide', trophy.guide));
    const srcBox = el('div', 'detail-sources');
    srcBox.append(el('h3', null, 'Sources'));
    const list = el('ul');
    for (const key of trophy.sources ?? []) {
      const src = sources[key];
      if (!src) continue;
      const item = el('li');
      const link = document.createElement('a');
      link.href = src.url;
      link.textContent = src.name;
      link.target = '_blank';
      link.rel = 'noopener';
      item.append(link);
      list.append(item);
    }
    const note = el('li', null, 'Guide text: our own words from the official description.');
    list.append(note);
    srcBox.append(list);
    pane.append(srcBox);
  }
  const earnBox = el('div', 'detail-earn');
  const btn = el('button', earned ? 'earned' : null, earned ? '✓ Earned — tap to unmark' : 'Mark as earned');
  btn.type = 'button';
  btn.addEventListener('click', () => onToggle(trophy.name));
  earnBox.append(btn);
  pane.append(earnBox);
}

export function renderRoadmap(trophies, store, refs) {
  const pane = refs.roadmapPane;
  pane.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const items = trophies.filter((t) => t.stage === stage.stage);
    const done = items.filter((t) => store.isEarned(t.name)).length;
    const box = el('section', 'stage');
    box.append(el('h2', null, stage.title));
    const progress = el('p', null, '');
    progress.append(el('span', 'stage-progress', `${done} / ${items.length} earned in this stage`));
    box.append(progress);
    box.append(el('p', null, stage.text));
    const list = el('ul');
    for (const t of items) {
      const li = el('li', store.isEarned(t.name) ? 'earned' : null, `${t.name} — ${GRADE_LABEL[t.grade]}${t.missable ? ' · Missable' : ''}`);
      list.append(li);
    }
    box.append(list);
    pane.append(box);
  }
}

export function renderMissables(trophies, store, refs) {
  const pane = refs.missablesPane;
  pane.replaceChildren();
  const intro = el('div', 'missable-intro');
  intro.append(el('h2', null, 'Missable trophies — built from the official descriptions'));
  intro.append(el('p', null, 'A trophy is flagged missable when its official description ties it to one named mission or one-time moment: a chapter, a named story mission, a stranger strand finale, or a single event that does not come back in free roam. Earn these during the moment itself — afterwards the only way back is a mission replay or a new playthrough.'));
  intro.append(el('p', null, `${trophies.filter((t) => t.missable).length} of the 55 trophies are flagged missable. Do the story missables on your first playthrough, in stage order, and check them off here as you go.`));
  pane.append(intro);
  const list = el('ul', 'trophy-list');
  for (const trophy of trophies.filter((t) => t.missable)) {
    const earned = store.isEarned(trophy.name);
    const li = el('li', `trophy-row${earned ? ' earned' : ''}`);
    const text = el('div');
    text.append(el('div', 'trophy-name', trophy.name));
    text.append(el('div', 'trophy-desc', trophy.description));
    text.append(flagRow(trophy));
    li.append(el('span'), medal(trophy), text, el('span', 'flag grade', GRADE_LABEL[trophy.grade]));
    list.append(li);
  }
  pane.append(list);
}

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

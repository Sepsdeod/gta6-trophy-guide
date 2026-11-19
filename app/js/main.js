// Leonida Ledger v3 boot: load the guide data, wire the toolbar, the tabs,
// the save controls and the keyboard, and keep every view in sync.
//
// The app holds one small state object — the loaded data, the active view,
// the selected trophy and the last list the checklist showed — and re-renders
// from it on every change. Nothing is cached in the DOM: a tick, a filter
// or a tab switch just renders again from the same state.
//
// Keyboard (ignored while typing in a field):
//   ↑ / ↓  move the selection through the visible checklist
//   E      mark the selected trophy earned / unmark it
//   /      jump to the search box
//   1–4    switch tab (checklist, roadmap, missables, reference)

import { loadGuide } from './data.js';
import { blankFilters } from './filters.js';
import { openTrophyStore } from './store.js';
import {
  renderChecklist,
  renderDetail,
  renderHeader,
  renderKindCounts,
  renderMissables,
  renderReference,
  renderRoadmap,
  renderSourceLinks,
} from './views.js';

function grab(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

const refs = {
  earnedCount: grab('earnedCount'),
  progressFill: grab('progressFill'),
  progressBar: grab('progressBar'),
  earnedPoints: grab('earnedPoints'),
  earnedPercent: grab('earnedPercent'),
  nextUp: grab('nextUp'),
  countStory: grab('countStory'),
  countMissable: grab('countMissable'),
  countCollectibles: grab('countCollectibles'),
  countActivities: grab('countActivities'),
  missableCount: grab('missableCount'),
  trophyList: grab('trophyList'),
  listMeta: grab('listMeta'),
  emptyState: grab('emptyState'),
  detailPane: grab('detailPane'),
  roadmapPane: grab('roadmapPane'),
  missablesPane: grab('missablesPane'),
  referencePane: grab('referencePane'),
  sourceLinks: grab('sourceLinks'),
  onlineNote: grab('onlineNote'),
  searchBox: grab('search'),
  gradeSelect: grab('gradeFilter'),
  sortSelect: grab('sortOrder'),
  spoilerBox: grab('spoilerToggle'),
  hideEarnedBox: grab('hideEarned'),
  saveNote: grab('saveNote'),
};

const store = openTrophyStore();
const filters = blankFilters();
const state = {
  trophies: [],
  sources: {},
  reference: { sections: [] },
  selected: null,
  view: 'checklist',
  shown: [],
};

function selectedTrophy() {
  return state.trophies.find((t) => t.name === state.selected) ?? null;
}

function renderEverything() {
  renderHeader(state.trophies, store, refs);
  renderKindCounts(state.trophies, refs);
  state.shown = renderChecklist(
    state.trophies,
    store,
    filters,
    state.selected,
    pickTrophy,
    refs,
  );
  renderDetail(
    selectedTrophy(),
    state.sources,
    store,
    filters,
    flipTrophy,
    stepSelection,
    refs,
  );
  renderRoadmap(state.trophies, store, flipTrophy, refs);
  renderMissables(state.trophies, store, refs);
  renderReference(state.reference, refs);
}

function pickTrophy(name, keepDetail) {
  state.selected = name;
  if (!keepDetail) switchView('checklist');
  renderEverything();
  const wanted = `#trophy-${encodeURIComponent(name)}`;
  if (location.hash !== wanted) history.replaceState(null, '', wanted);
}

function flipTrophy(name) {
  store.toggle(name);
  renderEverything();
}

function stepSelection(delta) {
  const order = state.shown.length > 0 ? state.shown : state.trophies;
  if (order.length === 0) return;
  const at = order.findIndex((t) => t.name === state.selected);
  const next = order[(at + delta + order.length) % order.length];
  pickTrophy(next.name, true);
}

const VIEWS = ['checklist', 'roadmap', 'missables', 'reference'];

function switchView(view) {
  state.view = view;
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });
  const onChecklist = view === 'checklist';
  document.querySelector('.layout').hidden = !onChecklist;
  document.querySelector('.toolbar').style.display = onChecklist ? '' : 'none';
  refs.roadmapPane.hidden = view !== 'roadmap';
  refs.missablesPane.hidden = view !== 'missables';
  refs.referencePane.hidden = view !== 'reference';
  refs.onlineNote.hidden = filters.kind !== 'online';
  if (view !== 'checklist') history.replaceState(null, '', `#${view}`);
}

function syncKindButtons() {
  document.querySelectorAll('#kindFilters .kind').forEach((button) => {
    button.classList.toggle('active', button.dataset.kind === filters.kind);
  });
  refs.onlineNote.hidden = filters.kind !== 'online';
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => switchView(tab.dataset.view));
});

document.querySelectorAll('#kindFilters .kind').forEach((button) => {
  button.addEventListener('click', () => {
    filters.kind = button.dataset.kind;
    syncKindButtons();
    renderEverything();
  });
});

refs.gradeSelect.addEventListener('change', (event) => {
  filters.grade = event.target.value;
  renderEverything();
});

refs.sortSelect.addEventListener('change', (event) => {
  filters.sort = event.target.value;
  renderEverything();
});

refs.searchBox.addEventListener('input', (event) => {
  filters.query = event.target.value.trim();
  renderEverything();
});

refs.spoilerBox.addEventListener('change', (event) => {
  filters.spoilersHidden = event.target.checked;
  renderEverything();
});

refs.hideEarnedBox.addEventListener('change', (event) => {
  filters.hideEarned = event.target.checked;
  renderEverything();
});

grab('exportBtn').addEventListener('click', () => {
  const count = store.download();
  refs.saveNote.textContent = `Exported ${count} earned trophies — keep the file to import it back later.`;
});

grab('importFile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const raw = Array.isArray(parsed) ? parsed : parsed.earned ?? [];
    const known = new Set(state.trophies.map((t) => t.name));
    const wanted = raw.filter((name) => typeof name === 'string');
    const kept = wanted.filter((name) => known.has(name));
    const unknown = wanted.length - kept.length;
    store.restore(kept);
    refs.saveNote.textContent =
      `Imported ${kept.length} earned trophies` +
      (unknown > 0 ? ` (${unknown} unknown names skipped).` : '.');
  } catch {
    refs.saveNote.textContent =
      'That file could not be imported — it is not a progress export from this guide.';
  }
  event.target.value = '';
  renderEverything();
});

grab('resetBtn').addEventListener('click', () => {
  if (
    window.confirm(
      'Clear all earned trophies? Export first if you want to keep them.',
    )
  ) {
    store.wipe();
    renderEverything();
  }
});

document.addEventListener('keydown', (event) => {
  const target = event.target;
  const typing =
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement;
  if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    stepSelection(event.key === 'ArrowDown' ? 1 : -1);
  } else if (event.key === 'e' || event.key === 'E') {
    if (state.selected) flipTrophy(state.selected);
  } else if (event.key === '/') {
    event.preventDefault();
    switchView('checklist');
    refs.searchBox.focus();
  } else if (['1', '2', '3', '4'].includes(event.key)) {
    switchView(VIEWS[Number(event.key) - 1]);
  }
});

function readHash() {
  const hash = decodeURIComponent(location.hash);
  if (VIEWS.includes(hash.slice(1))) {
    switchView(hash.slice(1));
  } else if (hash.startsWith('#trophy-')) {
    const name = hash.slice('#trophy-'.length);
    if (state.trophies.some((t) => t.name === name)) {
      state.selected = name;
      switchView('checklist');
      renderEverything();
    }
  }
}

window.addEventListener('hashchange', readHash);

try {
  const guide = await loadGuide();
  state.trophies = guide.trophies;
  state.sources = guide.sources;
  state.reference = guide.reference;
  renderSourceLinks(state.sources, refs);
  if (store.migratedCount > 0) {
    refs.saveNote.textContent =
      `Carried ${store.migratedCount} earned trophies over from the earlier save format.`;
  }
  renderEverything();
  readHash();
} catch (error) {
  refs.trophyList.replaceChildren();
  const item = document.createElement('li');
  item.textContent =
    'The trophy list could not be loaded. Reload the page — the guide works offline from its own files.';
  refs.trophyList.append(item);
}

// Leonida Ledger v5 boot: load the guide data, wire the toolbar, the tabs,
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
//   N      jump to the next trophy not earned yet, in roadmap order
//   S      toggle the story-spoiler setting
//   /      jump to the search box
//   1–4    switch tab (checklist, roadmap, missables, reference)

import { loadCatalog, nextPending } from './data.js';
import { freshQuery } from './filters.js';
import { openLedger } from './store.js';
import {
  paintDetail,
  paintKindTallies,
  paintPlan,
  paintProgress,
  paintReference,
  paintRisks,
  paintRoster,
  paintSources,
} from './views.js';

function elById(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

const refs = {
  earnedTotal: elById('earnedTotal'),
  barFill: elById('barFill'),
  barTrack: elById('barTrack'),
  pointsEarned: elById('pointsEarned'),
  pctLabel: elById('pctLabel'),
  gradeStrip: elById('gradeStrip'),
  nextTarget: elById('nextTarget'),
  tallyStory: elById('tallyStory'),
  tallyMissable: elById('tallyMissable'),
  tallyCollectibles: elById('tallyCollectibles'),
  tallyActivities: elById('tallyActivities'),
  riskTotal: elById('riskTotal'),
  rosterList: elById('rosterList'),
  rosterMeta: elById('rosterMeta'),
  noResults: elById('noResults'),
  detailCard: elById('detailCard'),
  planView: elById('planView'),
  riskView: elById('riskView'),
  refView: elById('refView'),
  sourceList: elById('sourceList'),
  onlineCallout: elById('onlineCallout'),
  queryBox: elById('queryBox'),
  gradePick: elById('gradePick'),
  diffPick: elById('diffPick'),
  sortPick: elById('sortPick'),
  spoilerSwitch: elById('spoilerSwitch'),
  earnedSwitch: elById('earnedSwitch'),
  saveStatus: elById('saveStatus'),
};

const ledger = openLedger();
const query = freshQuery();
const app = {
  trophies: [],
  sources: {},
  reference: { sections: [] },
  selected: null,
  view: 'roster',
  shown: [],
};

function selectedTrophy() {
  return app.trophies.find((t) => t.name === app.selected) ?? null;
}

function renderAll() {
  paintProgress(app.trophies, ledger, refs);
  paintKindTallies(app.trophies, refs);
  app.shown = paintRoster(
    app.trophies,
    ledger,
    query,
    app.selected,
    choose,
    refs,
  );
  paintDetail(
    selectedTrophy(),
    app.sources,
    ledger,
    query,
    flipDone,
    advance,
    refs,
  );
  paintPlan(app.trophies, ledger, flipDone, refs);
  paintRisks(app.trophies, ledger, refs);
  paintReference(app.reference, refs);
}

function choose(name, keepDetail) {
  app.selected = name;
  if (!keepDetail) showView('roster');
  renderAll();
  const wanted = `#trophy-${encodeURIComponent(name)}`;
  if (location.hash !== wanted) history.replaceState(null, '', wanted);
}

function flipDone(name) {
  ledger.flip(name);
  renderAll();
}

function jumpNext() {
  const next = nextPending(app.trophies, ledger);
  if (!next) {
    refs.saveStatus.textContent =
      'Every trophy is earned — the platinum is yours, Leonida Legend!';
    return;
  }
  choose(next.name, true);
}

function advance(delta) {
  const order = app.shown.length > 0 ? app.shown : app.trophies;
  if (order.length === 0) return;
  const at = order.findIndex((t) => t.name === app.selected);
  const next = order[(at + delta + order.length) % order.length];
  choose(next.name, true);
}

const VIEWS = ['roster', 'plan', 'risks', 'ref'];

function showView(view) {
  app.view = view;
  document.querySelectorAll('.view-tab').forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.view === view);
  });
  const onRoster = view === 'roster';
  document.querySelector('.board').hidden = !onRoster;
  document.querySelector('.toolstrip').style.display = onRoster ? '' : 'none';
  refs.planView.hidden = view !== 'plan';
  refs.riskView.hidden = view !== 'risks';
  refs.refView.hidden = view !== 'ref';
  refs.onlineCallout.hidden = query.kind !== 'online';
  if (view !== 'roster') history.replaceState(null, '', `#${view}`);
}

function syncChips() {
  document.querySelectorAll('#kindChips .kind-chip').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.kind === query.kind);
  });
  refs.onlineCallout.hidden = query.kind !== 'online';
}

document.querySelectorAll('.view-tab').forEach((tab) => {
  tab.addEventListener('click', () => showView(tab.dataset.view));
});

document.querySelectorAll('#kindChips .kind-chip').forEach((button) => {
  button.addEventListener('click', () => {
    query.kind = button.dataset.kind;
    syncChips();
    renderAll();
  });
});

refs.gradePick.addEventListener('change', (event) => {
  query.grade = event.target.value;
  renderAll();
});

refs.diffPick.addEventListener('change', (event) => {
  query.difficulty = event.target.value;
  renderAll();
});

refs.sortPick.addEventListener('change', (event) => {
  query.sort = event.target.value;
  renderAll();
});

refs.queryBox.addEventListener('input', (event) => {
  query.search = event.target.value.trim();
  renderAll();
});

refs.spoilerSwitch.addEventListener('change', (event) => {
  query.spoilersHidden = event.target.checked;
  renderAll();
});

refs.earnedSwitch.addEventListener('change', (event) => {
  query.hideEarned = event.target.checked;
  renderAll();
});

elById('exportBtn').addEventListener('click', () => {
  const count = ledger.saveFile();
  refs.saveStatus.textContent = `Exported ${count} earned trophies — keep the file to import it back later.`;
});

elById('importInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const earnedField = Array.isArray(parsed) ? parsed : parsed.earned ?? [];
    // A v5 export keeps earned as { name: date }; older exports keep it as
    // a plain list of names. Both normalise to a list here.
    const raw = Array.isArray(earnedField)
      ? earnedField
      : Object.keys(earnedField);
    const known = new Set(app.trophies.map((t) => t.name));
    const wanted = raw.filter((name) => typeof name === 'string');
    const result = ledger.loadNames(wanted, known);
    refs.saveStatus.textContent =
      `Imported ${result.kept} earned trophies` +
      (result.unknown > 0 ? ` (${result.unknown} unknown names skipped).` : '.');
  } catch {
    refs.saveStatus.textContent =
      'That file could not be imported — it is not a progress export from this guide.';
  }
  event.target.value = '';
  renderAll();
});

elById('resetBtn').addEventListener('click', () => {
  if (
    window.confirm(
      'Clear all earned trophies? Export first if you want to keep them.',
    )
  ) {
    ledger.reset();
    renderAll();
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
    advance(event.key === 'ArrowDown' ? 1 : -1);
  } else if (event.key === 'e' || event.key === 'E') {
    if (app.selected) flipDone(app.selected);
  } else if (event.key === 'n' || event.key === 'N') {
    jumpNext();
  } else if (event.key === 's' || event.key === 'S') {
    refs.spoilerSwitch.checked = !refs.spoilerSwitch.checked;
    query.spoilersHidden = refs.spoilerSwitch.checked;
    renderAll();
  } else if (event.key === '/') {
    event.preventDefault();
    showView('roster');
    refs.queryBox.focus();
  } else if (['1', '2', '3', '4'].includes(event.key)) {
    showView(VIEWS[Number(event.key) - 1]);
  }
});

function routeFromHash() {
  const hash = decodeURIComponent(location.hash);
  if (VIEWS.includes(hash.slice(1))) {
    showView(hash.slice(1));
  } else if (hash.startsWith('#trophy-')) {
    const name = hash.slice('#trophy-'.length);
    if (app.trophies.some((t) => t.name === name)) {
      app.selected = name;
      showView('roster');
      renderAll();
    }
  }
}

window.addEventListener('hashchange', routeFromHash);

try {
  const catalog = await loadCatalog();
  app.trophies = catalog.trophies;
  app.sources = catalog.sources;
  app.reference = catalog.reference;
  paintSources(app.sources, refs);
  if (ledger.migrated > 0) {
    refs.saveStatus.textContent =
      `Carried ${ledger.migrated} earned trophies over from the earlier save format.`;
  }
  renderAll();
  routeFromHash();
} catch (error) {
  refs.rosterList.replaceChildren();
  const item = document.createElement('li');
  item.textContent =
    'The trophy list could not be loaded. Reload the page — the guide works offline from its own files.';
  refs.rosterList.append(item);
}

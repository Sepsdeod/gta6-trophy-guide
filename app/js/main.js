// main boots the Leonida Ledger: loads the trophy data, wires the checklist,
// filters, spoiler setting, roadmap and missables views, and the save controls.
import { loadReference, loadTrophies } from './data.js';
import { createFilters } from './filters.js';
import { createProgressStore } from './store.js';
import {
  renderChecklist,
  renderCounts,
  renderDetail,
  renderMissables,
  renderProgress,
  renderReference,
  renderRoadmap,
  renderSourceLinks,
} from './views.js';

const refs = {
  earnedCount: document.getElementById('earnedCount'),
  progressFill: document.getElementById('progressFill'),
  progressBar: document.getElementById('progressBar'),
  earnedPoints: document.getElementById('earnedPoints'),
  earnedPercent: document.getElementById('earnedPercent'),
  nextUp: document.getElementById('nextUp'),
  countStory: document.getElementById('countStory'),
  countMissable: document.getElementById('countMissable'),
  countCollectibles: document.getElementById('countCollectibles'),
  countActivities: document.getElementById('countActivities'),
  missableCount: document.getElementById('missableCount'),
  trophyList: document.getElementById('trophyList'),
  listMeta: document.getElementById('listMeta'),
  emptyState: document.getElementById('emptyState'),
  detailPane: document.getElementById('detailPane'),
  roadmapPane: document.getElementById('roadmapPane'),
  missablesPane: document.getElementById('missablesPane'),
  referencePane: document.getElementById('referencePane'),
  sourceLinks: document.getElementById('sourceLinks'),
  onlineNote: document.getElementById('onlineNote'),
};

const store = createProgressStore();
const filters = createFilters();
let trophies = [];
let sources = {};
let reference = { sections: [] };
let selectedName = null;
let currentView = 'checklist';

function selectedTrophy() {
  return trophies.find((t) => t.name === selectedName) ?? null;
}

function renderAll() {
  renderProgress(trophies, store, refs);
  renderCounts(trophies, refs);
  renderChecklist(trophies, store, filters, selectedName, selectTrophy, refs);
  renderDetail(selectedTrophy(), sources, store, filters, toggleTrophy, refs);
  renderRoadmap(trophies, store, toggleTrophy, refs);
  renderMissables(trophies, store, refs);
  renderReference(reference, refs);
}

function selectTrophy(name, keepDetail) {
  selectedName = name;
  if (!keepDetail) showView('checklist');
  renderAll();
  if (location.hash !== `#trophy-${encodeURIComponent(name)}`) {
    history.replaceState(null, '', `#trophy-${encodeURIComponent(name)}`);
  }
}

function toggleTrophy(name) {
  store.toggle(name);
  renderAll();
}

function showView(view) {
  currentView = view;
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });
  const checklistVisible = view === 'checklist';
  document.querySelector('.layout').hidden = !checklistVisible;
  document.querySelector('.toolbar').style.display = checklistVisible ? '' : 'none';
  refs.roadmapPane.hidden = view !== 'roadmap';
  refs.missablesPane.hidden = view !== 'missables';
  refs.referencePane.hidden = view !== 'reference';
  refs.onlineNote.hidden = filters.kind !== 'online';
  if (view !== 'checklist') history.replaceState(null, '', `#${view}`);
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => showView(tab.dataset.view));
});

document.querySelectorAll('#kindFilters .kind').forEach((button) => {
  button.addEventListener('click', () => {
    filters.kind = button.dataset.kind;
    document.querySelectorAll('#kindFilters .kind').forEach((b) => {
      b.classList.toggle('active', b === button);
    });
    refs.onlineNote.hidden = filters.kind !== 'online';
    renderAll();
  });
});

document.getElementById('gradeFilter').addEventListener('change', (event) => {
  filters.grade = event.target.value;
  renderAll();
});

document.getElementById('search').addEventListener('input', (event) => {
  filters.search = event.target.value.trim();
  renderAll();
});

document.getElementById('spoilerToggle').addEventListener('change', (event) => {
  filters.hideSpoilers = event.target.checked;
  renderAll();
});

document.getElementById('hideEarned').addEventListener('change', (event) => {
  filters.hideEarned = event.target.checked;
  renderAll();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  store.exportFile();
  document.getElementById('saveNote').textContent = 'Progress exported — keep the file to import it back later.';
});

document.getElementById('importFile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const names = Array.isArray(parsed) ? parsed : parsed.earned ?? [];
    const known = new Set(trophies.map((t) => t.name));
    const kept = names.filter((n) => known.has(n));
    store.importNames(kept);
    document.getElementById('saveNote').textContent = `Imported ${kept.length} earned trophies.`;
  } catch {
    document.getElementById('saveNote').textContent = 'That file could not be imported — it is not a progress export from this guide.';
  }
  event.target.value = '';
  renderAll();
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (window.confirm('Clear all earned trophies? Export first if you want to keep them.')) {
    store.reset();
    renderAll();
  }
});

function applyHash() {
  const hash = decodeURIComponent(location.hash);
  if (hash === '#roadmap' || hash === '#missables' || hash === '#reference') {
    showView(hash.slice(1));
  } else if (hash.startsWith('#trophy-')) {
    const name = hash.slice('#trophy-'.length);
    if (trophies.some((t) => t.name === name)) {
      selectedName = name;
      showView('checklist');
      renderAll();
    }
  }
}

window.addEventListener('hashchange', applyHash);

try {
  const doc = await loadTrophies();
  trophies = doc.trophies;
  sources = doc.sources;
  reference = await loadReference();
  renderSourceLinks(sources, refs);
  renderAll();
  applyHash();
} catch (error) {
  refs.trophyList.replaceChildren();
  const item = document.createElement('li');
  item.textContent = 'The trophy list could not be loaded. Reload the page — the guide works offline from its own files.';
  refs.trophyList.append(item);
}

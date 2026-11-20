// All rendering: the checklist, the trophy detail card, the roadmap, the
// missables page and the collectibles reference.
//
// Every renderer takes the pieces it needs and rebuilds its pane from
// scratch, so the app never has to track which bit of the DOM is stale —
// state changes (a tick, a filter, a tab) just re-render. Text is always set
// with textContent, never innerHTML, so trophy names and guide text can
// never inject markup.

import {
  DIFFICULTY_LABELS,
  PLAN_STAGES,
  RISK_GROUPS,
  gradeBreakdown,
  pointsFor,
  stageDone,
  stageLabelFor,
  stageMembers,
} from './data.js';
import {
  displayDesc,
  displayName,
  earnedAmong,
  isConcealed,
  isVisible,
  orderList,
  tallyKind,
} from './filters.js';

const GRADE_LABEL = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};
const GRADE_LETTER = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };
const GRADE_SEQUENCE = ['platinum', 'gold', 'silver', 'bronze'];

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function gradeDisc(trophy) {
  return el('span', `grade-disc ${trophy.grade}`, GRADE_LETTER[trophy.grade]);
}

function tagRow(trophy) {
  const row = el('div', 'trophy-tags');
  row.append(el('span', 'tag is-grade', GRADE_LABEL[trophy.grade]));
  if (trophy.hidden) row.append(el('span', 'tag is-hidden', 'Hidden'));
  if (trophy.missable) row.append(el('span', 'tag is-missable', 'Missable'));
  if (trophy.target) {
    row.append(
      el('span', 'tag', `Target: ${trophy.target.toLocaleString()}`),
    );
  }
  row.append(el('span', 'tag is-stage', stageLabelFor(trophy)));
  return row;
}

function tickControl(trophy, ledger, onChange) {
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = ledger.has(trophy.name);
  box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) ledger.mark(trophy.name);
    else ledger.unmark(trophy.name);
    onChange(trophy.name);
  });
  box.addEventListener('click', (event) => event.stopPropagation());
  return box;
}

// ---- Header: progress panel -----------------------------------------------

export function paintProgress(trophies, ledger, refs) {
  const total = trophies.length;
  const done = ledger.count();
  const points = trophies
    .filter((t) => ledger.has(t.name))
    .reduce((sum, t) => sum + pointsFor(t), 0);
  const maxPoints = trophies.reduce((sum, t) => sum + pointsFor(t), 0);
  const percent = total ? Math.round((done / total) * 100) : 0;

  refs.earnedTotal.textContent = String(done);
  refs.barFill.style.width = `${percent}%`;
  refs.barTrack.setAttribute('aria-valuenow', String(done));
  refs.pointsEarned.textContent = String(points);
  refs.pctLabel.textContent = `${percent}%`;

  const byGrade = gradeBreakdown(trophies, ledger);
  refs.gradeStrip.replaceChildren();
  for (const grade of GRADE_SEQUENCE) {
    const cell = byGrade[grade] ?? { done: 0, total: 0 };
    const bit = el('span', 'grade-bit');
    bit.append(
      el('b', null, `${cell.done}/${cell.total}`),
      document.createTextNode(` ${GRADE_LABEL[grade]}`),
    );
    refs.gradeStrip.append(bit);
  }

  const next = orderList(
    trophies.filter((t) => !ledger.has(t.name)),
    'roadmap',
  )[0];
  refs.nextTarget.replaceChildren();
  refs.nextTarget.append('Next target: ');
  if (next) {
    refs.nextTarget.append(
      el('strong', null, `${next.name} — ${GRADE_LABEL[next.grade]}`),
    );
  } else {
    refs.nextTarget.append(
      el('strong', null, 'Platinum earned — Leonida Legend!'),
    );
  }
  // The points line also carries the maximum, so the panel reads as a whole.
  refs.pointsEarned.parentElement?.setAttribute(
    'data-max-points',
    String(maxPoints),
  );
}

export function paintKindTallies(trophies, refs) {
  refs.tallyStory.textContent = String(tallyKind(trophies, 'story'));
  refs.tallyMissable.textContent = String(tallyKind(trophies, 'missable'));
  refs.tallyCollectibles.textContent = String(
    tallyKind(trophies, 'collectibles'),
  );
  refs.tallyActivities.textContent = String(
    tallyKind(trophies, 'activities'),
  );
  refs.riskTotal.textContent = String(tallyKind(trophies, 'missable'));
}

// ---- Checklist ------------------------------------------------------------

export function paintRoster(
  trophies,
  ledger,
  query,
  selectedName,
  onPick,
  refs,
) {
  const list = refs.rosterList;
  list.replaceChildren();
  const shown = orderList(
    trophies.filter((t) => isVisible(t, query, ledger.has(t.name))),
    query.sort,
  );
  refs.rosterMeta.textContent =
    `Showing ${shown.length} of ${trophies.length} trophies · ` +
    `${ledger.count()} earned · ${earnedAmong(shown, ledger)} earned in view · ${shown.filter((t) => t.missable).length} missable in view`;
  refs.noResults.hidden = shown.length > 0;

  for (const trophy of shown) {
    const done = ledger.has(trophy.name);
    const li = el(
      'li',
      `trophy-card${done ? ' is-earned' : ''}${
        selectedName === trophy.name ? ' is-selected' : ''
      }`,
    );
    const box = tickControl(trophy, ledger, (name) => onPick(name, true));
    const text = el('div');
    text.append(
      el('div', 'trophy-title', displayName(trophy, query, done)),
      el('div', 'trophy-blurb', displayDesc(trophy, query, done)),
      tagRow(trophy),
    );
    li.append(
      box,
      gradeDisc(trophy),
      text,
      el('span', 'tag is-grade', GRADE_LABEL[trophy.grade]),
    );
    li.addEventListener('click', () => onPick(trophy.name, false));
    list.append(li);
  }
  return shown;
}

// ---- Detail card ----------------------------------------------------------

export function paintDetail(
  trophy,
  sources,
  ledger,
  query,
  onFlip,
  onStep,
  refs,
) {
  const card = refs.detailCard;
  card.replaceChildren();
  if (!trophy) {
    card.append(
      el('p', 'detail-empty', 'Pick a trophy to read its guide and sources.'),
    );
    return;
  }
  const done = ledger.has(trophy.name);
  const masked = isConcealed(trophy, query, done);

  card.append(
    el(
      'p',
      `detail-grade-line ${trophy.grade}`,
      `${GRADE_LABEL[trophy.grade]} trophy · ${pointsFor(trophy)} points`,
    ),
  );
  card.append(el('h2', null, masked ? 'Hidden story trophy' : trophy.name));
  card.append(
    el(
      'p',
      'detail-official',
      masked
        ? 'Spoilers hidden — earn this trophy to reveal its name and description.'
        : trophy.description,
    ),
  );

  if (masked) {
    card.append(
      el(
        'p',
        'spoiler-note',
        'Its guide and sources stay hidden too, until the trophy is earned. Tick it off in the checklist to reveal the guide.',
      ),
    );
  } else {
    if (trophy.target) {
      card.append(
        el(
          'p',
          'detail-fact',
          `PSN target: ${trophy.target.toLocaleString()}`,
        ),
      );
    }
    if (trophy.missable) {
      card.append(
        el(
          'p',
          'detail-fact',
          'Missable — tied to a one-time story moment. See the Missables tab.',
        ),
      );
    }
    const stage = PLAN_STAGES.find((entry) => entry.key === trophy.stage);
    if (stage) {
      card.append(
        el(
          'p',
          'detail-stage-line',
          `${stageLabelFor(trophy)} · estimated ${stage.estimate}`,
        ),
      );
    }
    if (trophy.hardness) {
      const chips = el('div', 'detail-chips');
      chips.append(
        el(
          'span',
          'mini-chip',
          `Difficulty: ${DIFFICULTY_LABELS[trophy.hardness] ?? trophy.hardness} (${trophy.hardness}/5)`,
        ),
      );
      if (trophy.duration) {
        chips.append(el('span', 'mini-chip', `Time: ${trophy.duration}`));
      }
      card.append(chips);
      card.append(
        el(
          'p',
          'chip-footnote',
          'Difficulty and time are this guide’s own estimates from the official description.',
        ),
      );
    }
    card.append(el('p', 'detail-body', trophy.guide));
    if (trophy.advice) {
      const tipBox = el('div', 'tip-callout');
      tipBox.append(el('strong', null, 'Pro tip: '));
      tipBox.append(document.createTextNode(trophy.advice));
      card.append(tipBox);
    }
    if (trophy.caution) {
      const avoidBox = el('div', 'avoid-callout');
      avoidBox.append(el('strong', null, 'How not to miss it: '));
      avoidBox.append(document.createTextNode(trophy.caution));
      card.append(avoidBox);
    }
    const srcBox = el('div', 'detail-source-list');
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
    list.append(
      el('li', null, 'Guide text: our own words from the official description.'),
    );
    srcBox.append(list);
    card.append(srcBox);
  }

  const stepper = el('div', 'detail-stepper');
  const prev = el('button', null, '← Previous trophy');
  prev.type = 'button';
  prev.addEventListener('click', () => onStep(-1));
  const next = el('button', null, 'Next trophy →');
  next.type = 'button';
  next.addEventListener('click', () => onStep(1));
  stepper.append(prev, next);
  card.append(stepper);

  const earnBox = el('div', 'detail-earn');
  const btn = el(
    'button',
    done ? 'is-earned' : null,
    done ? '✓ Earned — tap to unmark' : 'Mark as earned',
  );
  btn.type = 'button';
  btn.addEventListener('click', () => onFlip(trophy.name));
  earnBox.append(btn);
  if (done) {
    const when = ledger.when ? ledger.when(trophy.name) : null;
    earnBox.append(
      el(
        'p',
        'earned-on',
        when
          ? `Earned on ${when} — recorded in this browser.`
          : 'Earned — ticked in an earlier save, before dates were recorded.',
      ),
    );
  }
  card.append(earnBox);
}

// ---- Roadmap --------------------------------------------------------------

export function paintPlan(trophies, ledger, onFlip, refs) {
  const pane = refs.planView;
  pane.replaceChildren();
  pane.append(
    el(
      'p',
      'plan-lede',
      'About 60–75 hours in all, our estimate — the story is most of it. ' +
        'Each stage lists the trophies it unlocks; tick them off here or in the checklist, it is the same progress. ' +
        'Use "Mark all" to tick a finished stage in one go.',
    ),
  );
  for (const stage of PLAN_STAGES) {
    const members = stageMembers(trophies, stage.key);
    const { done, total } = stageDone(trophies, ledger, stage.key);
    const box = el('section', 'plan-stage');
    const head = el('div', 'stage-head');
    head.append(el('h2', null, stage.name));
    const count = el('span', 'stage-count', `${done} / ${total} earned`);
    head.append(count);
    box.append(head);
    const meta = el('p', null);
    meta.append(el('span', 'stage-hours', `Estimated: ${stage.estimate}`));
    meta.append(document.createTextNode(' · '));
    meta.append(document.createTextNode(`${done} / ${total} earned in this stage`));
    box.append(meta);
    const track = el('div', 'stage-track');
    const fill = el('span');
    fill.style.width = total ? `${Math.round((done / total) * 100)}%` : '0%';
    track.append(fill);
    box.append(track);
    box.append(el('p', null, stage.summary));
    const allBtn = el(
      'button',
      'stage-all',
      done === total && total > 0 ? 'Unmark all in this stage' : 'Mark all in this stage',
    );
    allBtn.type = 'button';
    allBtn.addEventListener('click', () => {
      const markAll = done !== total;
      for (const trophy of members) {
        if (markAll) ledger.mark(trophy.name);
        else ledger.unmark(trophy.name);
      }
      onFlip(members[0]?.name ?? '');
    });
    box.append(allBtn);
    const list = el('ul', 'stage-list');
    for (const trophy of members) {
      const earned = ledger.has(trophy.name);
      const li = el('li', earned ? 'is-earned' : null);
      li.append(tickControl(trophy, ledger, onFlip));
      li.append(
        el(
          'span',
          null,
          `${trophy.name} — ${GRADE_LABEL[trophy.grade]}${
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

// ---- Missables -------------------------------------------------------------

export function paintRisks(trophies, ledger, refs) {
  const pane = refs.riskView;
  pane.replaceChildren();
  const riskTotal = trophies.filter((t) => t.missable).length;
  const intro = el('div', 'section-intro');
  intro.append(
    el('h2', null, 'Missable trophies — built from the official descriptions'),
  );
  intro.append(
    el(
      'p',
      null,
      'A trophy is flagged missable when its official description ties it to one named mission or one-time moment: a chapter, a named story mission, a stranger strand finale, or a single event that does not come back in free roam. Earn these during the moment itself — afterwards the only way back is a mission replay or a new playthrough.',
    ),
  );
  intro.append(
    el(
      'p',
      null,
      `${riskTotal} of the 55 trophies are flagged missable. Do the story missables on your first playthrough, in stage order, and check them off here as you go.`,
    ),
  );
  pane.append(intro);

  const byId = new Map(trophies.map((t) => [t.id, t]));
  for (const group of RISK_GROUPS) {
    const groupBox = el('section', 'risk-group');
    groupBox.append(el('h2', null, group.heading));
    groupBox.append(el('p', null, group.summary));
    const list = el('ul', 'roster');
    for (const id of group.ids) {
      const trophy = byId.get(id);
      if (!trophy) continue;
      const earned = ledger.has(trophy.name);
      const li = el('li', `trophy-card${earned ? ' is-earned' : ''}`);
      const text = el('div');
      text.append(el('div', 'trophy-title', trophy.name));
      text.append(el('div', 'trophy-blurb', trophy.description));
      if (trophy.caution) {
        const caution = el('div', 'avoid-note');
        caution.append(el('strong', null, 'How not to miss it: '));
        caution.append(document.createTextNode(trophy.caution));
        text.append(caution);
      }
      text.append(tagRow(trophy));
      li.append(
        el('span'),
        gradeDisc(trophy),
        text,
        el('span', 'tag is-grade', GRADE_LABEL[trophy.grade]),
      );
      list.append(li);
    }
    groupBox.append(list);
    pane.append(groupBox);
  }
}

// ---- Reference -------------------------------------------------------------

export function paintReference(reference, refs) {
  const pane = refs.refView;
  pane.replaceChildren();
  const intro = el('div', 'section-intro');
  intro.append(el('h2', null, 'Collectibles & activities reference'));
  intro.append(
    el(
      'p',
      null,
      'What to find, how much of it, and where it counts — built only from the official trophy descriptions. Where a description does not pin down a count or a place, the entry says so instead of inventing one.',
    ),
  );
  pane.append(intro);
  for (const section of reference.sections ?? []) {
    const box = el('section', 'plan-stage');
    box.append(el('h2', null, section.title));
    if (section.intro) box.append(el('p', null, section.intro));
    for (const item of section.items ?? []) {
      const entry = el('div', 'ref-entry');
      entry.append(el('h3', null, item.title));
      if (item.counts) entry.append(el('p', 'ref-counts', item.counts));
      entry.append(el('p', null, item.tip));
      if (item.source) {
        entry.append(el('p', 'ref-origin', `Source: ${item.source}`));
      }
      box.append(entry);
    }
    pane.append(box);
  }
}

// ---- Footer source links ----------------------------------------------------

export function paintSources(sources, refs) {
  const holder = refs.sourceList;
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

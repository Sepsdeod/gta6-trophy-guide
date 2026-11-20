# gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Sepsdeod/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Sepsdeod/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Leonida Ledger — an offline guide and tracker for all 55 GTA 6 PlayStation 5 trophies. Every trophy is shown with its official name, description and grade exactly as PlayStation publishes them, beside a guide written for this entry in our own words that names its sources. A six-stage roadmap leads to the platinum, 26 missable trophies are flagged with how not to miss each one, and the tracker saves your progress in the browser with export and import. Static files only; it works with the network off.

## How to use the tracker

1. Open the guide and work the **Roadmap to Platinum** tab in order — story first, then strangers and 100%, then activities, collectibles, and the money clean-up. Each stage has a "Mark all" button for a finished stage.
2. Tick a trophy off as you earn it. Progress saves in the browser automatically (localStorage); **Export progress** downloads a `.json` backup you can **Import** back on any browser.
3. Use the kind filters (Story, Missable, Collectibles, Activities), the grade and difficulty filters, and the search box to find one trophy fast; sort by roadmap order, name, grade or difficulty.
4. Turn on **Hide story spoilers** before a first playthrough: story trophies you have not earned yet show a mask instead of their names, descriptions and guides.
5. Check the **Missables** tab before each story session — 26 trophies hang on one-time moments, and the tab says how not to miss each one.
6. Keyboard: ↑ / ↓ moves between trophies, E marks the selected trophy earned, / focuses search, 1–4 switches tab.
7. Press N to jump straight to your next unearned trophy in roadmap order, and S to hide or show story spoilers — both work from anywhere in the guide, without touching the mouse.

## What changed in v5

- The whole guide was rebuilt in this session: a dark Vice-neon look, a new code layout with the data, filters, save ledger and views split into clear modules, and a save format now at v5 (it still carries v4, v3 and v1 saves forward, and records the date each trophy was earned).
- Every trophy's guide and note were written fresh in this session — new wording throughout, with two honest "the description does not pin this down" guides for the two trophies whose official descriptions name no concrete step (Challenging Tank, Personal Best).
- New in this version: a difficulty filter beside the grade filter, a per-grade earned strip in the progress panel (platinum / gold / silver / bronze counts), and a "Mark all in this stage" button on every roadmap stage.
- The reference grew to 35 entries: a melee drive-by entry for Ten Pin, a Rhino tank entry for Challenging Tank, and a gang-operations entry for Pest Control.
- The trophy data file is now pretty-printed so the 55 guides are readable in the repository, and the save export is named `leonida-ledger-v5-progress.json`.

## What changed in v4

- Every trophy's note was rewritten in that session with a deeper tip — a concrete "do this" action per trophy — plus a named roadmap stage, so the detail card says exactly where each trophy sits on the road to the platinum.
- The tracker's save format moved to v4: it records the date each trophy was earned (shown under the earn button) and carries v3 and v1 saves forward. Import reports how many names it kept and how many it skipped as unknown, and reads both the new `{ name: date }` export and older plain-list exports.
- Two keyboard shortcuts arrived: N jumps to the next unearned trophy in roadmap order, S toggles the story-spoiler setting. The checklist header counts how many earned trophies are in the current view, and the search matches tips and difficulty words as well as names and descriptions.
- The reference gained new entries and two fixes: the showroom-smash and robbery-streak items now name the right trophies, and the money section gained a laundering-route entry.
- The guide is easier to drive by keyboard: every control shows a visible focus ring.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7nvvsk82&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>

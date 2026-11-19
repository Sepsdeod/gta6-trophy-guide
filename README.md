# gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Sepsdeod/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Sepsdeod/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Leonida Ledger — an offline guide and tracker for all 55 GTA 6 PlayStation 5 trophies: official names, descriptions and grades, a cited guide for every trophy in our own words, a roadmap to the platinum, missable flags built from the official descriptions, saved progress with export and import, kind filters and a spoiler setting. Static files only; it works with the network off.

## How to use the tracker

1. Open the guide and work the **Roadmap to Platinum** tab in order — story first, then strangers and 100%, then activities, collectibles, and the money clean-up.
2. Tick a trophy off as you earn it. Progress saves in the browser automatically (localStorage); **Export progress** downloads a `.json` backup you can **Import** back on any browser.
3. Use the kind filters (Story, Missable, Collectibles, Activities) and the search box to find one trophy fast; sort by roadmap order, name, grade or difficulty.
4. Turn on **Hide story spoilers** before a first playthrough: story trophies you have not earned yet show a mask instead of their names, descriptions and guides.
5. Check the **Missables** tab before each story session — 26 trophies hang on one-time moments, and the tab says how not to miss each one.
6. Keyboard: ↑ / ↓ moves between trophies, E marks the selected trophy earned, / focuses search, 1–4 switches tab.

## What changed in v3

- Rebuilt the tracker's code from scratch in this session: a versioned save format (`leonida-ledger-progress-v3`) that carries earlier saves forward, an export file that names its format and version, and an import that reports unknown names instead of swallowing them.
- The detail pane now shows which roadmap stage a trophy belongs to, and steps to the previous / next trophy without going back to the list.
- The checklist can be sorted (roadmap order, name, grade, difficulty) and the search now matches guide text as well as names and descriptions.
- The Collectibles & Activities reference grew to four sections, including a one-off moments section for the free-roam trophies that do not come back as missions.
- The trophy data file now carries a `meta` block (guide version, grade counts, sources) so the file's own header says what it holds.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7nvvsk82&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>

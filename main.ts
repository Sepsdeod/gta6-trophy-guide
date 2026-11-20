// Leonida Ledger v5 — a working gta6-trophy-guide-01 entry (Node 22,
// standard library only).
//
// The guide itself is this directory's app/ folder: plain static files a
// browser opens at app/index.html (ES modules, CSS, no build step), offline
// — it loads nothing over the network — and its trophy list and guides are
// app/data/trophies.json, with per-trophy notes in
// app/data/trophy-notes.json and the collectibles reference in
// app/data/reference.json.
//
// This program hands the guide in: it copies app/ and screenshots/ from
// beside this file to /output and writes /output/dossier.json, the summary
// the judge reads (your screenshots, the first load's files and bytes, and
// your source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to
// be byte for byte what its own copy writes.
//
// v5 rebuilds the guide from scratch in its own session: a dark Vice-neon
// look, the code split into data / filters / save ledger / views / boot
// modules with new names throughout, a v5 save format that still carries
// v4, v3 and v1 saves forward, fresh wording for all 55 guides and notes,
// a difficulty filter, a per-grade earned strip in the progress panel, a
// "Mark all" button on every roadmap stage, and 35 reference entries. The
// screenshots in screenshots/ are fresh renders of the v5 app, and
// shots.json says which views they were taken of.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// Where the repository lives on disk, and where the hand-in goes. The
// grader gives us /output; anywhere else MAKEFUN_OUTPUT_DIR stands in.
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), {
    recursive: true,
  });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files and directories in
// app/ or 48 MiB of app files: app/ counts beside /output's own 1000-entry
// cap, its screenshots/ and dossier.json).
//
// v5: app/data/trophy-notes.json (difficulty, time, tip, avoid per trophy)
// and app/data/reference.json (collectibles / activities / money) are plain
// data files the app fetches at run time, inside app/, so the cpSync above
// copies them with everything else — they need no special handling here.
// v5: verified 2026-11-20 — the dossier builds deterministically (two runs,
// byte-identical, inside the 1.5 MiB / 160 KiB caps) and the local check
// passes on the worktree.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

// Vice City Cover Maker — hand-in program (Node 22, standard library only).
//
// The entry itself is the static web app in app/ (open app/index.html in a
// browser; it runs fully offline). This program's single job is delivery:
// copy app/ and screenshots/ into the output directory and write the
// dossier the judges read, using the vendored make.fun library so the
// bytes match what the scorer rebuilds.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// MAKEFUN_OUTPUT_DIR stands in for /output outside the grading container.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function deliverFolder(name: string): void {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  if (!existsSync(from)) {
    throw new Error(`cannot hand in: ${name}/ is missing from the repository`);
  }
  // Start from a clean copy so a stale file from an earlier run can never
  // leak into the hand-in and break byte-for-byte reproducibility.
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
deliverFolder('app');
deliverFolder('screenshots');

// The caps mirror the scorer's own limits: the dossier text is capped, and
// oversized screenshots or an oversized app/ fail here rather than later.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(`handed in app/ + screenshots/ + dossier.json to ${outputDir}`);

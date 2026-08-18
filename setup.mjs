#!/usr/bin/env node
/**
 * One-shot Cloudflare provisioning for the Torch.
 *
 * Run it after `wrangler login`:   npm run setup
 *
 * Creates the D1 database and R2 bucket, writes the database id into
 * wrangler.jsonc, applies the schema, seeds the August 2026 issue, and
 * deploys. Safe to re-run: every step checks for what already exists.
 *
 * It deliberately stops short of the Access application. That one is created
 * in the dashboard, and until it exists the admin page refuses everyone.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const WRANGLER = 'node_modules/wrangler/bin/wrangler.js';
const DB_NAME = 'roanoke-torch';
const BUCKET = 'roanoke-torch-files';
const CONFIG = 'wrangler.jsonc';

const c = { dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', bold: '\x1b[1m', off: '\x1b[0m' };
const say = (m) => console.log(m);
const step = (m) => console.log(`\n${c.bold}==> ${m}${c.off}`);
const die = (m) => { console.error(`\n${c.red}${m}${c.off}\n`); process.exit(1); };

function wrangler(args, { capture = false, allowFail = false } = {}) {
  const r = spawnSync(process.execPath, [WRANGLER, ...args], {
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    shell: false,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  if (r.status !== 0 && !allowFail) {
    if (capture) console.error(out);
    die(`wrangler ${args.join(' ')} failed.`);
  }
  return { ok: r.status === 0, out };
}

if (!existsSync(WRANGLER)) die('Run "npm install" first.');

step('Checking you are signed in to Cloudflare');
const who = wrangler(['whoami'], { capture: true, allowFail: true });
if (!who.ok || /Not logged in/i.test(who.out)) {
  die([
    'Not signed in to Cloudflare.',
    '',
    'Run this in a normal terminal window (it opens a browser):',
    '',
    '    node node_modules/wrangler/bin/wrangler.js login',
    '',
    'Use that exact form rather than "npx wrangler login". On this machine the',
    'npm and npx shims resolve into another user profile and fail with EPERM.',
    '',
    'Then run "node setup.mjs" again.',
  ].join('\n'));
}
const account = who.out.match(/│\s*([^│]+?)\s*│\s*([0-9a-f]{32})\s*│/);
say(account ? `${c.green}Signed in.${c.off} Account: ${account[1].trim()} (${account[2]})`
            : `${c.green}Signed in.${c.off}`);
say(`${c.dim}If that is not the right Cloudflare account, stop now and switch before continuing.${c.off}`);

step(`Database "${DB_NAME}"`);
let list = wrangler(['d1', 'list', '--json'], { capture: true, allowFail: true });
let dbs = [];
try { dbs = JSON.parse(list.out.slice(list.out.indexOf('['))); } catch { /* first run, none yet */ }
let db = dbs.find((d) => d.name === DB_NAME);
if (db) {
  say(`Already exists (${db.uuid}).`);
} else {
  // -y stops wrangler offering to append a second binding of its own
  // choosing; this config already declares the DB binding the worker uses.
  wrangler(['d1', 'create', DB_NAME, '-y'], { allowFail: true });
  list = wrangler(['d1', 'list', '--json'], { capture: true });
  dbs = JSON.parse(list.out.slice(list.out.indexOf('[')));
  db = dbs.find((d) => d.name === DB_NAME);
  if (!db) die(`Created the database but could not find its id. Add it to ${CONFIG} by hand.`);
  say(`${c.green}Created${c.off} (${db.uuid}).`);
}

step(`Writing the database id into ${CONFIG}`);
const before = readFileSync(CONFIG, 'utf8');
const after = before.replace(/("database_id":\s*")[^"]*(")/, `$1${db.uuid}$2`);
if (after === before && !before.includes(db.uuid)) {
  die(`Could not find the database_id line in ${CONFIG}. Set it to ${db.uuid} by hand.`);
}
// Wrangler sometimes appends a binding of its own naming. The worker only
// ever reads env.DB, so drop any extra entry pointing at the same database.
const DUPE = new RegExp(',\s*\{\s*"binding":\s*"(?!DB")[^"]*",\s*'
  + '"database_name":\s*"' + DB_NAME + '",\s*"database_id":\s*"[^"]*"\s*\}', 'g');
const deduped = after.replace(DUPE, '');
if (deduped !== after) say('Removed a duplicate D1 binding that wrangler added.');
writeFileSync(CONFIG, deduped);
say(before.includes(db.uuid) ? 'Already set.' : `${c.green}Set.${c.off}`);

step(`Bucket "${BUCKET}"`);
const mk = wrangler(['r2', 'bucket', 'create', BUCKET], { capture: true, allowFail: true });
if (mk.ok) {
  say(`${c.green}Created.${c.off}`);
} else if (/already (exists|owned)/i.test(mk.out)) {
  say('Already exists.');
} else if (/10042|enable R2/i.test(mk.out)) {
  die([
    'R2 is not switched on for this Cloudflare account yet.',
    '',
    'Open the Cloudflare dashboard, choose R2 in the sidebar, and enable it.',
    'It is a one-time step: accept the R2 terms, with a billing method on the',
    'account. Usage here stays well inside the free tier, since one newsletter',
    'PDF a month is a few megabytes a year against 10 GB free.',
    '',
    'Everything before this step is already done. Re-run "node setup.mjs"',
    'afterwards and it will carry on from here.',
  ].join('\n'));
} else {
  die(`Could not create the bucket:\n${mk.out}`);
}

step('Applying the database schema');
wrangler(['d1', 'execute', DB_NAME, '--remote', '--yes', '--file=./schema.sql']);

step('Seeding the August 2026 issue');
wrangler(['d1', 'execute', DB_NAME, '--remote', '--yes', '--file=./seed-2026-08.sql']);

step('Deploying');
wrangler(['deploy']);

const cfg = readFileSync(CONFIG, 'utf8');
const accessReady = !/PASTE_YOUR_TEAM_NAME|PASTE_ACCESS_AUD_TAG/.test(cfg);

console.log(`\n${c.green}${c.bold}Done.${c.off} The site and the Torch are live on the worker.\n`);
if (!accessReady) {
  console.log(`${c.bold}One thing left, and the editor stays locked until it is done:${c.off}

  1. Cloudflare dashboard, Zero Trust > Access > Applications > Add.
     Self-hosted. Cover these two paths on your domain:
         <your-domain>/admin
         <your-domain>/api/admin
  2. Policy: Allow, and list the staff email addresses. A Gmail address is
     fine. One-time PIN emails them a code, so there is no password.
  3. Copy the application's AUD tag and your Zero Trust team name into
     ACCESS_TEAM_DOMAIN and ACCESS_AUD in ${CONFIG}, then run:
         node node_modules/wrangler/bin/wrangler.js deploy
  4. Turn OFF the workers.dev route for this worker, so the editor is only
     reachable through the domain Access protects.

  Until then /admin answers "sign in required" to everyone, which is correct.
`);
}

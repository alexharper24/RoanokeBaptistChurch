#!/usr/bin/env node
/**
 * Post-deploy smoke test. Run it against whatever URL the site is on:
 *
 *   node verify.mjs https://roanoke-baptist.alexharper.workers.dev
 *   node verify.mjs https://roanokebaptistonline.com
 *
 * Checks the pages answer, the editor is locked, nothing that is not web
 * content is being served, and no member birthdays reached the public page.
 * Exits non-zero if anything is wrong, so it can gate a deploy.
 */
const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) {
  console.error('Usage: node verify.mjs <site url>');
  process.exit(2);
}

const c = { red: '\x1b[31m', green: '\x1b[32m', bold: '\x1b[1m', dim: '\x1b[2m', off: '\x1b[0m' };
let pass = 0;
const failures = [];

async function check(label, path, want, follow = false) {
  let got, body = '';
  try {
    // Pages are checked with redirect:manual, because a redirect in front of a
    // page is itself the bug. Private paths are followed to their end, since a
    // 307 that normalises punctuation and lands on 404 is not a leak.
    const r = await fetch(base + path, { redirect: follow ? 'follow' : 'manual' });
    got = r.status;
    if (r.headers.get('content-type')?.includes('text/html')) body = await r.text();
  } catch (e) {
    got = `error: ${e.message}`;
  }
  const ok = got === want;
  if (ok) { pass++; console.log(`  ${c.green}ok${c.off}   ${String(want).padEnd(3)} ${path}`); }
  else { failures.push(`${path} returned ${got}, expected ${want}`); console.log(`  ${c.red}FAIL${c.off} ${String(got).padEnd(3)} ${path} ${c.dim}(wanted ${want})${c.off}`); }
  return body;
}

console.log(`\n${c.bold}Pages answer, and without a redirect${c.off}`);
for (const p of ['/', '/index.html', '/our-church.html', '/beliefs.html', '/gospel.html',
                 '/ministries.html', '/torch.html', '/style.css', '/main.js',
                 '/sitemap.xml', '/robots.txt', '/img/roanoke-baptist-church-logo.png']) {
  await check('page', p, 200);
}
await check('missing page', '/no-such-page.html', 404);

console.log(`\n${c.bold}The editor is locked${c.off}`);
for (const p of ['/admin', '/admin/', '/admin/index.html', '/admin/admin.js', '/admin/admin.css',
                 '/api/admin/issues', '/api/admin/whoami']) {
  await check('admin', p, 403);
}

console.log(`\n${c.bold}Nothing that is not web content is served${c.off}`);
for (const p of ['/wrangler.jsonc', '/package.json', '/package-lock.json', '/schema.sql',
                 '/seed-2026-08.sql', '/setup.mjs', '/verify.mjs', '/README.md', '/CLAUDE.md',
                 '/.gitignore', '/.assetsignore', '/.dev.vars', '/.env',
                 '/worker/index.js', '/worker/access.js', '/worker/torch.js',
                 '/node_modules/wrangler/package.json',
                 '/The%20Torch;%20August%202026.pdf']) {
  await check('private', p, 404, true);
}

console.log(`\n${c.bold}The Torch page${c.off}`);
const torch = await check('torch', '/torch.html', 200);
const say = (ok, msg) => { if (ok) { pass++; console.log(`  ${c.green}ok${c.off}   ${msg}`); } else { failures.push(msg); console.log(`  ${c.red}FAIL${c.off} ${msg}`); } };
say(/Issue<\/span>/.test(torch), 'an issue is rendered into the page');
say(!/torchContent"><\/div>/.test(torch), 'the content container is not empty');

// The important one. Member birthdays must never reach a public page.
const personal = [/HAPPY\s+BIRTHDAY/i, /HAPPY\s+ANNIVERSARY/i,
                  /\b[A-Z][a-z]+\s+[A-Z][a-z]+\s*[—–-]\s*\d{1,2}\/\d{1,2}\b/];
const hit = personal.find((re) => re.test(torch));
say(!hit, `no member birthdays or anniversaries on the public page${hit ? ` (matched ${hit})` : ''}`);

console.log(`\n${failures.length ? c.red : c.green}${c.bold}${pass} passed, ${failures.length} failed${c.off}`);
if (failures.length) { failures.forEach((f) => console.log(`  - ${f}`)); process.exit(1); }

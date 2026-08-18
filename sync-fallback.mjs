#!/usr/bin/env node
/**
 * Rewrites the copy of the newsletter baked into torch.html, using the same
 * renderer the worker uses.
 *
 *   node sync-fallback.mjs                 # from seed-2026-08.sql
 *   node sync-fallback.mjs <site url>      # from a live site's current issue
 *
 * That baked-in copy is what GitHub Pages serves before the DNS cutover, and
 * what the worker falls back to if the database is ever unreachable. It drifts
 * as soon as someone publishes a new issue, so re-run this and commit when you
 * want the fallback to catch up.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { renderIssue } from './worker/torch.js';

const START = '<div id="torchContent">';
const END = '\n      </div>\n    </div>\n  </section>';

async function loadIssue(url) {
  if (url) {
    const r = await fetch(url.replace(/\/$/, '') + '/api/torch/current');
    if (!r.ok) throw new Error(`Could not read the current issue: HTTP ${r.status}`);
    return (await r.json()).issue;
  }
  // Pull the seeded issue straight out of the SQL rather than duplicating it.
  const sql = readFileSync('seed-2026-08.sql', 'utf8');
  const val = (re) => (sql.match(re) || [])[1]?.replace(/''/g, "'") ?? null;
  return {
    issue_label: val(/\n  '(\w+ \d{4})',/),
    verse_text: val(/'(Rooted and built up[^']*(?:''[^']*)*)'/),
    verse_ref: 'Colossians 2:7',
    feature_kicker: 'Missions Conference',
    feature_title: 'Heart For His Harvest',
    feature_when: val(/'(August 2-5, 2026[^']*)'/),
    feature_body: val(/'(Welcome the Chadwick[^']*(?:''[^']*)*)'/),
    feature_image: 'img/torch-2026-08-missions-conference.jpg',
    events: JSON.parse(val(/'(\[\{"date".*?\}\])'/s)),
    cards: JSON.parse(val(/'(\[\{"heading": "RBC Teens".*?\}\])'/s)),
    pdf_public: false,
  };
}

const issue = await loadIssue(process.argv[2]);
if (!issue) throw new Error('No published issue to copy.');

const html = readFileSync('torch.html', 'utf8');
const a = html.indexOf(START);
const b = html.indexOf(END, a);
if (a === -1 || b === -1) throw new Error('Could not find the #torchContent block in torch.html.');

const body = renderIssue(issue)
  .split('\n')
  .map((l) => (l.trim() ? '      ' + l.trim() : ''))
  .join('\n');

writeFileSync('torch.html', html.slice(0, a + START.length) + '\n' + body + html.slice(b));
console.log(`torch.html fallback updated from ${issue.issue_label}.`);

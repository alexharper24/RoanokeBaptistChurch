#!/usr/bin/env node
/**
 * Unit tests for the Torch logic that has no business breaking quietly:
 * the privacy guard, the dash rule, HTML escaping, the column balancer, and
 * the newsletter parser.
 *
 *   node test.mjs
 *
 * Companion to verify.mjs, which checks a deployed site over HTTP. This one
 * needs nothing running.
 */
import { readFileSync } from 'node:fs';
import {
  findPrivacyWarnings, renderIssue, tidyCopy, bodyPoints,
  balanceColumns, estimateCardHeight,
} from './worker/torch.js';
import './admin/parse-torch.js';

const P = globalThis.TorchParse;
let pass = 0;
const fails = [];
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fails.push(name); console.log('  FAIL ' + name + (extra !== undefined ? '  => ' + JSON.stringify(extra) : '')); }
};

// ---------------------------------------------------------------- privacy
console.log('\nPrivacy guard');
const birthdays = ['Charlotte Pfeiffer—8/3', 'Havannah Lambert—8/5', 'Isabella Stidd—8/8'].join('\n');
ok('flags a Happy Birthday heading',
  findPrivacyWarnings({ cards: [{ heading: 'HAPPY BIRTHDAY!', body: birthdays }] }).length > 0);
ok('flags a name-and-date list under an innocent heading',
  findPrivacyWarnings({ cards: [{ heading: 'Church Family', body: birthdays }] }).length > 0);
for (const [label, sep] of [['em dash', '—'], ['en dash', '–'], ['hyphen', '-'],
                            ['colon', ':'], ['space', ' '], ['comma', ', ']]) {
  const body = ['Charlotte Pfeiffer', 'Havannah Lambert', 'Isabella Stidd']
    .map((n, i) => n + sep + (i + 3) + '/' + (i + 4)).join('\n');
  ok('catches personal dates separated by a ' + label,
    findPrivacyWarnings({ cards: [{ heading: 'Notes', body }] }).length > 0);
}
ok('does not flag ordinary section copy',
  findPrivacyWarnings({ cards: [{ heading: 'School News',
    body: 'School starts on Thursday, August 20.\n\nA parent-teacher meeting is on Sunday at 5:00 PM.' }] }).length === 0);
ok('two stray name-dates stay under the threshold',
  findPrivacyWarnings({ cards: [{ heading: 'Notes', body: 'Jane Doe—8/3\nJohn Roe—8/5' }] }).length === 0);

// ------------------------------------------------------------- dash rule
console.log('\nDash rule');
ok('full stop before a capital', tidyCopy('at 5:30pm— Men pray') === 'at 5:30pm. Men pray');
ok('comma before anything else', tidyCopy('Prayer—9:00am') === 'Prayer, 9:00am');
ok('a clock range survives', tidyCopy('Office 8am–6pm') === 'Office 8am–6pm');
ok('a year range survives', tidyCopy('Serving 2020–2024') === 'Serving 2020–2024');
ok('plain hyphens are untouched', tidyCopy('August 7-8') === 'August 7-8');

// -------------------------------------------------------------- rendering
console.log('\nRendering');
const issue = {
  issue_label: 'August 2026', verse_text: 'Rooted and built up in him', verse_ref: 'Colossians 2:7',
  feature_title: 'Heart For His Harvest', feature_image: 'img/torch-2026-08-missions-conference.jpg',
  events: [{ date: 'August 20', name: 'First Day of School', detail: 'half day' }],
  cards: [{ heading: 'RBC Teens', accent: 'accent-crimson', body: '- one\n- two', rows: [] }],
  pdf_key: 'issues/2026-08.pdf', pdf_public: false,
};
let html = renderIssue(issue);
ok('renders the event', html.includes('First Day of School'));
ok('honours the accent', html.includes('torch-card accent-crimson'));
ok('uses a committed image path directly', html.includes('src="img/torch-2026-08-missions-conference.jpg"'));
ok('two points become a list', html.includes('<ul class="torch-points">'));
ok('one point stays a paragraph', renderIssue({ ...issue, cards: [{ heading: 'x', body: 'just one', rows: [] }] }).includes('<p>just one</p>'));
ok('a private PDF is not linked', !html.includes('issues/2026-08.pdf'));
ok('a public PDF is linked', renderIssue({ ...issue, pdf_public: true }).includes('issues/2026-08.pdf'));
ok('the birthdays-are-in-print note is always there', html.includes('printed Torch available at the church'));
ok('the staff strip carries photos', html.includes('staff-avatar') && html.includes('Mike Tarr'));
ok('a friendly message when nothing is published', renderIssue(null).includes('not posted yet'));

const nasty = renderIssue({
  issue_label: '<script>alert(1)</script>',
  events: [{ date: '"><img src=x onerror=alert(1)>', name: 'x' }],
  cards: [{ heading: '<b>bold</b>', body: 'a<script>alert(2)</script>b', rows: [] }],
});
ok('escapes markup in the label', !nasty.includes('<script>alert(1)'));
ok('escapes markup in a body', !nasty.includes('<script>alert(2)'));
ok('escapes a heading', nasty.includes('&lt;b&gt;bold&lt;/b&gt;'));
const dateCell = nasty.match(/<div class="ev-date">[\s\S]*?<\/div>/)[0];
ok('neutralises markup in a date', !/<img/.test(dateCell) && !/"/.test(dateCell.replace('class="ev-date"', '')));

// -------------------------------------------------------------- balancing
console.log('\nColumn balancing');
ok('splits a point list correctly', bodyPoints('- a\n- b\n- c').length === 3);
ok('a single block is one point', bodyPoints('one paragraph only').length === 1);
const many = Array.from({ length: 6 }, (_, i) => ({ heading: 'S' + i, body: 'x'.repeat(120 * (i + 1)), rows: [] }));
const bal = balanceColumns(many);
ok('every card is placed exactly once', bal.left.length + bal.right.length === many.length);
ok('the split is close to even', Math.abs(bal.leftHeight - bal.rightHeight) / Math.max(bal.leftHeight, bal.rightHeight) < 0.15,
  { l: bal.leftHeight, r: bal.rightHeight });
ok('image dimensions change the estimate',
  estimateCardHeight({ image: 'x', image_w: 540, image_h: 296, body: '', rows: [] }, 95, 532) >
  estimateCardHeight({ image: 'x', image_w: 184, image_h: 162, body: '', rows: [] }, 95, 532));
const t0 = Date.now();
balanceColumns(Array.from({ length: 12 }, (_, i) => ({ heading: 'S' + i, body: 'x'.repeat(200), rows: [] })));
ok('twelve sections balance quickly', Date.now() - t0 < 500);

// ----------------------------------------------------------------- parser
console.log('\nNewsletter parser');
const sample = [
  'AUGUST 2026', 'The Torch',
  'Rooted and built up in him, and stablished in the faith, as ye have been',
  'taught, abounding therein with thanksgiving.     Colossians 2:7',
  'UPCOMING EVENTS', '', 'July 31', 'North of 62—Dixie Boat Ride', '',
  'August 20', 'RBS First Day', '',
  'RBC TEENS', 'August 19   Truth and Training  7:00pm',
  'HAPPY BIRTHDAY!', 'Charlotte Pfeiffer—8/3', 'Havannah Lambert—8/5',
  'HAPPY ANNIVERSARY!', 'Stan & Melanie Harper—8/3',
].join('\n');
const r = P.parse(sample);
ok('finds the month', r.issue_label === 'August 2026', r.issue_label);
ok('derives the slug', r.slug === '2026-08', r.slug);
ok('finds the verse reference', r.verse_ref === 'Colossians 2:7', r.verse_ref);
ok('the verse does not swallow the heading above it', !/UPCOMING/i.test(r.verse_text), r.verse_text);
ok('picks up the dated events', r.events.length >= 2, r.events);
ok('splits a time out of a row',
  (r.cards.find((c) => /Teens/.test(c.heading)) || { rows: [] }).rows.some((x) => /7:00pm/.test(x.detail)));
ok('reports the personal sections it dropped', r.skipped.length === 2, r.skipped);
ok('imports no birthdays or anniversaries',
  !/Pfeiffer|Havannah|Melanie/.test(JSON.stringify({ e: r.events, c: r.cards })));
ok('leaves no clause dashes in imported copy',
  !/[—–]/.test(JSON.stringify({ e: r.events, c: r.cards })));

// Symbol-font bullets arrive as Private Use Area characters and are not
// whitespace, which used to weld a date to its description.
const pua = P.parse('RBC TEENS\nAugust 7-8  Soulwinning Marathon  10am-2pm');
ok('strips private-use characters from a row',
  pua.cards[0].rows[0] && pua.cards[0].rows[0].name === 'Soulwinning Marathon',
  pua.cards[0].rows[0]);

// The committed fallback must never carry member data.
const fallback = readFileSync('torch.html', 'utf8');
ok('the baked-in fallback has no personal dates',
  !/HAPPY\s+BIRTHDAY|HAPPY\s+ANNIVERSARY/i.test(fallback) &&
  !/\b[A-Z][a-z]+\s+[A-Z][a-z]+\s*[—–-]\s*\d{1,2}\/\d{1,2}\b/.test(fallback));

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) process.exit(1);

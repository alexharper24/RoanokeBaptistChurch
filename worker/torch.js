// The Torch: rendering and the admin API.

const ACCENTS = new Set(['', 'accent-crimson', 'accent-teal']);
const MAX_PDF_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nowIso() {
  return new Date().toISOString();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// ---------------------------------------------------------------------------
// Privacy guard
//
// The printed Torch lists member birthdays and anniversaries. Those must not
// reach the public site. This looks for the shape of such a list rather than
// for particular names, and reports it back so the admin UI can refuse to
// publish until a human has looked.
// ---------------------------------------------------------------------------

const PERSONAL_HEADINGS = /\b(happy\s+)?(birthday|anniversar(y|ies))\b/i;
// 'Charlotte Pfeiffer—8/3', 'Stan & Melanie Harper - 8/3', 'Mary Owen 8/25'.
// The separator is deliberately loose: text pasted out of Word or a PDF arrives
// with em dashes, en dashes, hyphens, colons, or nothing at all, and a detector
// that only knew one of them would wave the others straight through.
const NAME_DATE_LINE =
  /^[A-Z][A-Za-z.'-]+(?:\s+[&A-Z][A-Za-z.'-]*){1,4}\s*[—–‒―~:,-]?\s*\d{1,2}\/\d{1,2}\s*$/;

export function findPrivacyWarnings(issue) {
  const warnings = [];
  const blocks = [];
  for (const c of issue.cards || []) {
    blocks.push({ where: c.heading || 'a card', text: `${c.heading || ''}\n${c.body || ''}` });
  }
  blocks.push({ where: 'the feature block', text: `${issue.feature_title || ''}\n${issue.feature_body || ''}` });

  for (const b of blocks) {
    if (PERSONAL_HEADINGS.test(b.text)) {
      warnings.push(`${b.where} mentions birthdays or anniversaries.`);
      continue;
    }
    const hits = b.text.split(/\r?\n/).filter((l) => NAME_DATE_LINE.test(l.trim())).length;
    if (hits >= 3) {
      warnings.push(`${b.where} looks like a list of ${hits} personal dates (name plus a day).`);
    }
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderRows(rows) {
  return (rows || [])
    .filter((r) => r && (r.date || r.name))
    .map(
      (r) =>
        `<div class="event-row"><div class="ev-date">${esc(r.date)}</div>` +
        `<div class="ev-name">${esc(r.name)}` +
        (r.detail ? ` <span class="ev-time">&middot; ${esc(r.detail)}</span>` : '') +
        `</div></div>`
    )
    .join('\n');
}

function renderCard(card) {
  const accent = ACCENTS.has(card.accent || '') ? card.accent || '' : '';
  const body = (card.body || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
  return (
    `<div class="torch-card${accent ? ' ' + accent : ''}">` +
    (card.heading ? `<h4>${esc(card.heading)}</h4>` : '') +
    renderRows(card.rows) +
    body +
    `</div>`
  );
}

/** Full inner HTML for the #torchContent container. */
export function renderIssue(issue, opts = {}) {
  if (!issue) {
    return (
      `<div class="torch-empty"><p>The current issue is not posted yet. ` +
      `Printed copies are available at the church, and you are always welcome to ` +
      `<a href="tel:2604785500">call the office</a>.</p></div>`
    );
  }

  const cards = issue.cards || [];
  const half = Math.ceil(cards.length / 2);
  const left = cards.slice(0, half).map(renderCard).join('\n');
  const right = cards.slice(half).map(renderCard).join('\n');

  // A feature image is either an R2 key uploaded through the admin, or a plain
  // path to a committed file under img/ for artwork placed by the developer.
  const featureSrc = issue.feature_image
    ? /^(img\/|\/)/.test(issue.feature_image)
      ? issue.feature_image.replace(/^\//, '')
      : `/api/torch/file/${encodeURIComponent(issue.feature_image)}`
    : null;

  const feature = issue.feature_title
    ? `<div class="torch-feature">` +
      (featureSrc
        ? `<img class="torch-feature-img" src="${esc(featureSrc)}" alt="${esc(
            issue.feature_title
          )}" loading="lazy">`
        : '') +
      (issue.feature_kicker ? `<span class="section-label">${esc(issue.feature_kicker)}</span>` : '') +
      `<h3>${esc(issue.feature_title)}</h3>` +
      (issue.feature_when ? `<p class="when">${esc(issue.feature_when)}</p>` : '') +
      (issue.feature_body ? `<p>${esc(issue.feature_body)}</p>` : '') +
      `</div>`
    : '';

  const events = (issue.events || []).length
    ? `<div class="torch-card"><h4>Upcoming Events</h4>${renderRows(issue.events)}</div>`
    : '';

  const pdf =
    issue.pdf_public && issue.pdf_key
      ? `<p class="torch-pdf"><a href="/api/torch/file/${esc(issue.pdf_key)}">Download the printed edition (PDF)</a></p>`
      : '';

  return `
  <div class="torch-mast">
    <svg class="torch-flame" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="flameG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e2c47b"/>
          <stop offset="55%" stop-color="#c9a24a"/>
          <stop offset="100%" stop-color="#8c0104"/>
        </linearGradient>
      </defs>
      <path d="M12 2c.4 3.2-1.8 4.6-3.1 6.4C7.4 10.1 6.5 11.9 6.5 14a5.5 5.5 0 0 0 11 0c0-2.3-1.1-4-2.4-5.6-.7.9-1.3 1.7-2.3 1.9.9-2.6.8-5.6-.8-8.3z" fill="url(#flameG)"/>
      <path d="M12 12c.2 1.5-.9 2.1-1.5 3-.5.7-.9 1.5-.9 2.4a2.4 2.4 0 0 0 4.8 0c0-1.2-.7-2-1.4-2.8-.4.4-.7.8-1.2.9.5-1.2.5-2.4.2-3.5z" fill="#fbf6f4" opacity="0.85"/>
    </svg>
    <span class="torch-issue">${esc(issue.issue_label)} Issue</span>
    ${issue.verse_text ? `<p class="torch-verse">"${esc(issue.verse_text)}" <span class="r">${esc(issue.verse_ref)}</span></p>` : ''}
    <hr class="torch-rule">
  </div>

  <div class="torch-staff torch-card" style="justify-content:center;text-align:center;padding-top:22px;">
    <div><span class="nm">Mike Tarr</span><br><span class="rl">Pastor</span></div>
    <div><span class="nm">James Bradley</span><br><span class="rl">Outreach Director</span></div>
    <div><span class="nm">Jon Lakie</span><br><span class="rl">Youth Pastor</span></div>
    <div><span class="nm">Jason Tarr</span><br><span class="rl">Assistant Pastor</span></div>
  </div>

  ${feature}

  <div class="torch-grid" style="margin-top:8px;">
    <div>${events}${left}</div>
    <div>${right}</div>
  </div>

  <div class="torch-card" style="margin-top:0;">
    <h4>Church Family</h4>
    <p>Birthdays and anniversaries for the month are shared with our church family in the printed Torch available at the church.</p>
  </div>

  ${pdf}

  <div class="torch-give">
    <p style="margin-bottom:6px;">Zelle Electronic Giving</p>
    <p class="zelle">rbczelle@gmail.com</p>
  </div>
  ${opts.archive || ''}`;
}

export function renderArchive(issues, currentSlug) {
  const others = (issues || []).filter((i) => i.slug !== currentSlug);
  if (!others.length) return '';
  return (
    `<div class="torch-archive"><h4>Past Issues</h4><ul>` +
    others
      .map((i) => `<li><a href="/torch.html?issue=${esc(i.slug)}">${esc(i.issue_label)}</a></li>`)
      .join('') +
    `</ul></div>`
  );
}

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

function rowToIssue(row) {
  if (!row) return null;
  let events = [];
  let cards = [];
  try { events = JSON.parse(row.events_json || '[]'); } catch { events = []; }
  try { cards = JSON.parse(row.cards_json || '[]'); } catch { cards = []; }
  return { ...row, events, cards, pdf_public: !!row.pdf_public };
}

export async function getPublishedIssue(env, slug) {
  const sql = slug
    ? `SELECT * FROM torch_issues WHERE status='published' AND slug=?1`
    : `SELECT * FROM torch_issues WHERE status='published' ORDER BY issue_date DESC LIMIT 1`;
  const stmt = slug ? env.DB.prepare(sql).bind(slug) : env.DB.prepare(sql);
  return rowToIssue(await stmt.first());
}

export async function listPublished(env) {
  const { results } = await env.DB.prepare(
    `SELECT slug, issue_label, issue_date FROM torch_issues WHERE status='published' ORDER BY issue_date DESC LIMIT 60`
  ).all();
  return results || [];
}

async function audit(env, slug, action, actor, detail) {
  await env.DB.prepare(
    `INSERT INTO torch_audit (slug, action, actor, detail, created_at) VALUES (?1,?2,?3,?4,?5)`
  )
    .bind(slug, action, actor, detail || null, nowIso())
    .run();
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export async function handlePublicApi(request, env, url) {
  if (url.pathname === '/api/torch/current') {
    const issue = await getPublishedIssue(env, url.searchParams.get('issue') || null);
    if (!issue) return json({ issue: null }, 404);
    return new Response(JSON.stringify({ issue, archive: await listPublished(env) }), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  // Serve an R2 object. Only files belonging to a published issue, and only a
  // PDF that has been explicitly marked public, are reachable here.
  const m = url.pathname.match(/^\/api\/torch\/file\/(.+)$/);
  if (m) {
    const key = decodeURIComponent(m[1]);
    const row = await env.DB.prepare(
      `SELECT pdf_key, pdf_public, feature_image FROM torch_issues
        WHERE status='published' AND (feature_image=?1 OR (pdf_key=?1 AND pdf_public=1))`
    )
      .bind(key)
      .first();
    if (!row) return new Response('Not found', { status: 404 });

    const obj = await env.FILES.get(key);
    if (!obj) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    headers.set('Cache-Control', 'public, max-age=86400');
    return new Response(obj.body, { headers });
  }

  return null;
}

export async function handleAdminApi(request, env, url, actor) {
  const path = url.pathname;

  if (path === '/api/admin/whoami') {
    return json({ email: actor });
  }

  if (path === '/api/admin/issues' && request.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT slug, issue_label, issue_date, status, updated_at, updated_by
         FROM torch_issues ORDER BY issue_date DESC LIMIT 60`
    ).all();
    return json({ issues: results || [] });
  }

  const one = path.match(/^\/api\/admin\/issue\/([A-Za-z0-9-]+)$/);
  if (one && request.method === 'GET') {
    const row = await env.DB.prepare(`SELECT * FROM torch_issues WHERE slug=?1`).bind(one[1]).first();
    if (!row) return json({ error: 'No such issue.' }, 404);
    return json({ issue: rowToIssue(row) });
  }

  if (path === '/api/admin/issue' && request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Could not read the submitted issue.' }, 400);
    }

    const slug = String(body.slug || '').trim();
    if (!/^\d{4}-\d{2}$/.test(slug)) {
      return json({ error: 'Pick a month and year for this issue.' }, 400);
    }
    const label = String(body.issue_label || '').trim();
    if (!label) return json({ error: 'The issue needs a name, for example "August 2026".' }, 400);

    const warnings = findPrivacyWarnings(body);
    if (warnings.length && !body.acknowledge_privacy) {
      return json({ error: 'privacy_check', warnings }, 409);
    }

    const publish = body.status === 'published';
    const now = nowIso();
    const events = JSON.stringify(Array.isArray(body.events) ? body.events : []);
    const cards = JSON.stringify(Array.isArray(body.cards) ? body.cards : []);

    await env.DB.prepare(
      `INSERT INTO torch_issues
         (slug, issue_label, issue_date, verse_text, verse_ref,
          feature_kicker, feature_title, feature_when, feature_body, feature_image,
          events_json, cards_json, pdf_key, pdf_public, status,
          created_at, updated_at, updated_by)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?16,?17)
       ON CONFLICT(slug) DO UPDATE SET
         issue_label=excluded.issue_label, issue_date=excluded.issue_date,
         verse_text=excluded.verse_text, verse_ref=excluded.verse_ref,
         feature_kicker=excluded.feature_kicker, feature_title=excluded.feature_title,
         feature_when=excluded.feature_when, feature_body=excluded.feature_body,
         feature_image=excluded.feature_image,
         events_json=excluded.events_json, cards_json=excluded.cards_json,
         pdf_key=COALESCE(excluded.pdf_key, torch_issues.pdf_key),
         pdf_public=excluded.pdf_public, status=excluded.status,
         updated_at=excluded.updated_at, updated_by=excluded.updated_by`
    )
      .bind(
        slug,
        label,
        `${slug}-01`,
        body.verse_text || null,
        body.verse_ref || null,
        body.feature_kicker || null,
        body.feature_title || null,
        body.feature_when || null,
        body.feature_body || null,
        body.feature_image || null,
        events,
        cards,
        body.pdf_key || null,
        body.pdf_public ? 1 : 0,
        publish ? 'published' : 'draft',
        now,
        actor
      )
      .run();

    await audit(env, slug, publish ? 'publish' : 'save', actor, warnings.length ? `acknowledged: ${warnings.join(' ')}` : null);
    return json({ ok: true, slug, status: publish ? 'published' : 'draft' });
  }

  if (path === '/api/admin/upload' && request.method === 'POST') {
    const form = await request.formData();
    const file = form.get('file');
    const kind = String(form.get('kind') || 'pdf');
    const slug = String(form.get('slug') || 'misc');
    if (!file || typeof file === 'string') return json({ error: 'No file was attached.' }, 400);

    const isPdf = kind === 'pdf';
    const limit = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
    if (file.size > limit) {
      return json({ error: `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${limit / 1048576} MB.` }, 413);
    }
    const okType = isPdf
      ? file.type === 'application/pdf'
      : ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!okType) {
      return json({ error: isPdf ? 'That is not a PDF.' : 'Use a JPG, PNG, or WEBP image.' }, 415);
    }

    const ext = isPdf ? 'pdf' : (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const key = `${isPdf ? 'issues' : 'features'}/${slug}.${ext}`;
    await env.FILES.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });
    await audit(env, slug, 'upload', actor, key);
    return json({ ok: true, key });
  }

  // Admin-side file read: an editor can always see what they uploaded, even
  // for a draft or a PDF that is not public.
  const fm = path.match(/^\/api\/admin\/file\/(.+)$/);
  if (fm && request.method === 'GET') {
    const obj = await env.FILES.get(decodeURIComponent(fm[1]));
    if (!obj) return json({ error: 'Not found' }, 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'private, no-store');
    return new Response(obj.body, { headers });
  }

  if (path === '/api/admin/preview' && request.method === 'POST') {
    const body = await request.json();
    return json({ html: renderIssue({ ...body, pdf_public: !!body.pdf_public }) });
  }

  return json({ error: 'Unknown endpoint.' }, 404);
}

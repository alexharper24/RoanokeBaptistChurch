/* Editor for The Torch. Plain JS, no dependencies, same as the rest of the site. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  var state = { featureImageKey: null, pdfKey: null, dirty: false };

  // ---------------------------------------------------------------- helpers
  function banner(msg, kind) {
    var b = $('banner');
    if (!msg) { b.hidden = true; return; }
    b.hidden = false;
    b.textContent = msg;
    b.className = 'banner ' + (kind || 'ok');
  }

  function note(el, msg, kind) {
    el.textContent = msg || '';
    el.className = 'note' + (kind ? ' ' + kind : '');
  }

  function api(path, opts) {
    return fetch(path, Object.assign({ credentials: 'same-origin' }, opts)).then(function (r) {
      var ct = r.headers.get('Content-Type') || '';
      if (ct.indexOf('application/json') === -1) {
        return r.text().then(function (t) { throw new Error(t.slice(0, 200) || ('HTTP ' + r.status)); });
      }
      return r.json().then(function (data) {
        if (!r.ok) { var e = new Error(data.error || ('HTTP ' + r.status)); e.data = data; e.status = r.status; throw e; }
        return data;
      });
    });
  }

  function markDirty() { state.dirty = true; }
  document.addEventListener('input', markDirty);
  window.addEventListener('beforeunload', function (e) {
    if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // ------------------------------------------------------------ event rows
  function eventRow(v) {
    v = v || {};
    var wrap = document.createElement('div');
    wrap.className = 'line';
    wrap.innerHTML =
      '<input class="d" type="text" placeholder="August 20" aria-label="Date">' +
      '<input class="n" type="text" placeholder="What is happening" aria-label="Event">' +
      '<input class="t" type="text" placeholder="7:00 PM" aria-label="Time or detail">' +
      '<button type="button" class="btn btn-x" aria-label="Remove this event">Remove</button>';
    wrap.querySelector('.d').value = v.date || '';
    wrap.querySelector('.n').value = v.name || '';
    wrap.querySelector('.t').value = v.detail || '';
    wrap.querySelector('button').onclick = function () { wrap.remove(); markDirty(); };
    return wrap;
  }

  function readRows(container) {
    return Array.prototype.map.call(container.querySelectorAll('.line'), function (l) {
      return {
        date: l.querySelector('.d').value.trim(),
        name: l.querySelector('.n').value.trim(),
        detail: l.querySelector('.t').value.trim(),
      };
    }).filter(function (r) { return r.date || r.name; });
  }

  $('addEvent').onclick = function () { $('eventRows').appendChild(eventRow()); markDirty(); };

  // ----------------------------------------------------------------- cards
  function cardEditor(c) {
    c = c || {};
    var box = document.createElement('div');
    box.className = 'card-edit';
    box.innerHTML =
      '<div class="card-head">' +
        '<input class="h" type="text" placeholder="Section heading, for example RBC Teens" aria-label="Section heading">' +
        '<select class="a" aria-label="Colour">' +
          '<option value="">Standard</option>' +
          '<option value="accent-crimson">Crimson</option>' +
          '<option value="accent-teal">Teal</option>' +
        '</select>' +
        '<button type="button" class="btn btn-x" aria-label="Remove this section">Remove section</button>' +
      '</div>' +
      '<div class="rows"></div>' +
      '<div class="actions" style="margin-bottom:10px"><button type="button" class="btn add-row">Add a dated line</button></div>' +
      '<label class="field grow"><span>Paragraph text</span>' +
        '<textarea class="b" rows="3" placeholder="Anything that is not a dated line. Leave a blank line between paragraphs."></textarea></label>';

    box.querySelector('.h').value = c.heading || '';
    box.querySelector('.a').value = c.accent || '';
    box.querySelector('.b').value = c.body || '';
    var rows = box.querySelector('.rows');
    (c.rows || []).forEach(function (r) { rows.appendChild(eventRow(r)); });
    box.querySelector('.add-row').onclick = function () { rows.appendChild(eventRow()); markDirty(); };
    box.querySelector('.card-head button').onclick = function () { box.remove(); markDirty(); };
    return box;
  }

  $('addCard').onclick = function () { $('cardList').appendChild(cardEditor()); markDirty(); };

  function readCards() {
    return Array.prototype.map.call($('cardList').children, function (box) {
      return {
        heading: box.querySelector('.h').value.trim(),
        accent: box.querySelector('.a').value,
        body: box.querySelector('.b').value.trim(),
        rows: readRows(box.querySelector('.rows')),
      };
    }).filter(function (c) { return c.heading || c.body || c.rows.length; });
  }

  // ----------------------------------------------------------- paste parser
  // The newsletter alternates a date line and a name line, and sometimes puts
  // both on one line. Anything under a birthday or anniversary heading is
  // skipped on purpose: those do not belong on a public page.
  var MONTH_RE = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?';
  var DATE_ONLY = new RegExp('^(' + MONTH_RE + '\\s+\\d{1,2}(?:\\s*[-–—]\\s*\\d{1,2})?)$', 'i');
  var DATE_LEAD = new RegExp('^(' + MONTH_RE + '\\s+\\d{1,2}(?:\\s*[-–—]\\s*\\d{1,2})?)\\s+(.{2,})$', 'i');
  var PERSONAL = /\b(happy\s+)?(birthday|anniversar(y|ies))\b/i;
  var TIME_TAIL = /\s{2,}((?:\d{1,2}(:\d{2})?\s*(am|pm))(\s*[-–—]\s*\d{1,2}(:\d{2})?\s*(am|pm))?)\s*$/i;

  function parsePaste(text) {
    var lines = text.split(/\r?\n/).map(function (l) { return l.replace(/\s+$/, '').trim(); });
    var events = [];
    var skipped = 0;
    var inPersonal = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line) continue;

      if (PERSONAL.test(line)) { inPersonal = true; skipped++; continue; }
      // A personal block ends at the next ALL CAPS heading.
      if (inPersonal) {
        if (/^[A-Z][A-Z\s&'.]{6,}$/.test(line) && !PERSONAL.test(line)) inPersonal = false;
        else { skipped++; continue; }
      }

      var detail = '';
      var m = line.match(TIME_TAIL);
      if (m) { detail = m[1].trim(); line = line.replace(TIME_TAIL, '').trim(); }

      var lead = line.match(DATE_LEAD);
      if (lead) {
        events.push({ date: lead[1], name: lead[2].replace(/[–—]/g, ': ').trim(), detail: detail });
        continue;
      }
      if (DATE_ONLY.test(line)) {
        var next = '';
        for (var j = i + 1; j < lines.length; j++) { if (lines[j]) { next = lines[j]; i = j; break; } }
        if (next && !DATE_ONLY.test(next)) {
          var d2 = '';
          var m2 = next.match(TIME_TAIL);
          if (m2) { d2 = m2[1].trim(); next = next.replace(TIME_TAIL, '').trim(); }
          events.push({ date: line, name: next.replace(/[–—]/g, ': ').trim(), detail: detail || d2 });
        }
      }
    }
    // De-duplicate identical date + name pairs.
    var seen = {};
    events = events.filter(function (e) {
      var k = (e.date + '|' + e.name).toLowerCase();
      if (seen[k]) return false;
      seen[k] = 1;
      return true;
    });
    return { events: events, skipped: skipped };
  }

  $('parseBtn').onclick = function () {
    var text = $('pasteBox').value;
    if (!text.trim()) { note($('parseNote'), 'Paste the newsletter text first.', 'bad'); return; }
    var out = parsePaste(text);
    if (!out.events.length) {
      note($('parseNote'), 'No dated events found. You can still add them by hand below.', 'bad');
      return;
    }
    $('eventRows').innerHTML = '';
    out.events.forEach(function (e) { $('eventRows').appendChild(eventRow(e)); });
    var msg = 'Filled in ' + out.events.length + ' event' + (out.events.length === 1 ? '' : 's') + '. Please check them.';
    if (out.skipped) msg += ' ' + out.skipped + ' line' + (out.skipped === 1 ? '' : 's') + ' of birthdays or anniversaries were left out on purpose.';
    note($('parseNote'), msg, 'ok');
    markDirty();
  };

  // ----------------------------------------------------------------- month
  $('issueMonth').onchange = function () {
    var v = this.value;
    if (!v) return;
    var p = v.split('-');
    var label = MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0];
    if (!$('issueLabel').value.trim()) $('issueLabel').value = label;
  };

  // --------------------------------------------------------------- uploads
  function upload(file, kind) {
    var slug = $('issueMonth').value;
    if (!slug) return Promise.reject(new Error('Choose the month first.'));
    var fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);
    fd.append('slug', slug);
    return api('/api/admin/upload', { method: 'POST', body: fd });
  }

  $('featImage').onchange = function () {
    var f = this.files[0];
    if (!f) return;
    banner('Uploading the artwork...', 'ok');
    upload(f, 'image').then(function (r) {
      state.featureImageKey = r.key;
      var img = $('featPreview');
      img.src = '/api/admin/file/' + encodeURIComponent(r.key) + '#' + Date.now();
      img.hidden = false;
      banner('Artwork uploaded.', 'ok');
      markDirty();
    }).catch(function (e) { banner(e.message, 'bad'); });
  };

  $('pdfFile').onchange = function () {
    var f = this.files[0];
    if (!f) return;
    banner('Uploading the PDF...', 'ok');
    upload(f, 'pdf').then(function (r) {
      state.pdfKey = r.key;
      $('pdfCurrent').textContent = 'Uploaded.';
      banner('PDF uploaded and kept on file.', 'ok');
      markDirty();
    }).catch(function (e) { banner(e.message, 'bad'); });
  };

  // ------------------------------------------------------------ gather/save
  function gather(status) {
    return {
      slug: $('issueMonth').value,
      issue_label: $('issueLabel').value.trim(),
      verse_text: $('verseText').value.trim(),
      verse_ref: $('verseRef').value.trim(),
      feature_kicker: $('featKicker').value.trim(),
      feature_title: $('featTitle').value.trim(),
      feature_when: $('featWhen').value.trim(),
      feature_body: $('featBody').value.trim(),
      feature_image: state.featureImageKey,
      events: readRows($('eventRows')),
      cards: readCards(),
      pdf_key: state.pdfKey,
      pdf_public: $('pdfPublic').checked,
      status: status,
    };
  }

  function save(status, acknowledged) {
    var payload = gather(status);
    if (!payload.slug) { note($('saveNote'), 'Choose the month first.', 'bad'); return; }
    if (!payload.issue_label) { note($('saveNote'), 'Give the issue a name.', 'bad'); return; }
    if (acknowledged) payload.acknowledge_privacy = true;

    note($('saveNote'), 'Saving...');
    api('/api/admin/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (r) {
      state.dirty = false;
      note($('saveNote'), r.status === 'published' ? 'Published. The website is updated.' : 'Draft saved.', 'ok');
      banner('');
      loadIssueList();
    }).catch(function (e) {
      if (e.status === 409 && e.data && e.data.warnings) { showPrivacy(e.data.warnings, status); return; }
      note($('saveNote'), e.message, 'bad');
    });
  }

  $('draftBtn').onclick = function () { save('draft'); };
  $('publishBtn').onclick = function () { save('published'); };

  $('previewBtn').onclick = function () {
    api('/api/admin/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gather('draft')),
    }).then(function (r) {
      $('previewPanel').hidden = false;
      var doc = $('previewFrame').contentDocument;
      doc.open();
      doc.write('<!doctype html><html lang="en"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        '<link rel="stylesheet" href="/style.css"></head>' +
        '<body><main><div id="torchPage"><section class="section"><div class="container">' +
        r.html + '</div></section></div></main></body></html>');
      doc.close();
      $('previewPanel').scrollIntoView({ behavior: 'smooth' });
    }).catch(function (e) { banner(e.message, 'bad'); });
  };

  // -------------------------------------------------------------- privacy
  var pendingStatus = null;
  function showPrivacy(warnings, status) {
    pendingStatus = status;
    $('privacyList').innerHTML = '';
    warnings.forEach(function (w) {
      var li = document.createElement('li');
      li.textContent = w;
      $('privacyList').appendChild(li);
    });
    $('privacyModal').hidden = false;
  }
  $('privacyBack').onclick = function () { $('privacyModal').hidden = true; note($('saveNote'), 'Nothing was saved.', ''); };
  $('privacyGo').onclick = function () { $('privacyModal').hidden = true; save(pendingStatus, true); };

  // ---------------------------------------------------------------- loading
  function fill(issue) {
    $('issueMonth').value = issue.slug;
    $('issueLabel').value = issue.issue_label || '';
    $('verseText').value = issue.verse_text || '';
    $('verseRef').value = issue.verse_ref || '';
    $('featKicker').value = issue.feature_kicker || '';
    $('featTitle').value = issue.feature_title || '';
    $('featWhen').value = issue.feature_when || '';
    $('featBody').value = issue.feature_body || '';
    state.featureImageKey = issue.feature_image || null;
    state.pdfKey = issue.pdf_key || null;
    $('pdfPublic').checked = !!issue.pdf_public;
    $('pdfCurrent').textContent = issue.pdf_key ? 'A PDF is already on file.' : '';
    if (issue.feature_image) {
      var img = $('featPreview');
      img.src = '/api/admin/file/' + encodeURIComponent(issue.feature_image);
      img.hidden = false;
    }
    $('eventRows').innerHTML = '';
    (issue.events || []).forEach(function (e) { $('eventRows').appendChild(eventRow(e)); });
    $('cardList').innerHTML = '';
    (issue.cards || []).forEach(function (c) { $('cardList').appendChild(cardEditor(c)); });
    state.dirty = false;
  }

  function loadIssueList() {
    return api('/api/admin/issues').then(function (r) {
      var sel = $('issueList');
      var current = sel.value;
      sel.innerHTML = '<option value="">Start a new issue</option>';
      (r.issues || []).forEach(function (i) {
        var o = document.createElement('option');
        o.value = i.slug;
        o.textContent = i.issue_label + (i.status === 'draft' ? '  (draft)' : '');
        sel.appendChild(o);
      });
      sel.value = current;
    });
  }

  $('issueList').onchange = function () {
    var slug = this.value;
    if (!slug) return;
    if (state.dirty && !confirm('You have unsaved changes. Load the other issue anyway?')) { this.value = ''; return; }
    api('/api/admin/issue/' + slug).then(function (r) {
      fill(r.issue);
      banner('Loaded ' + r.issue.issue_label + '.', 'ok');
    }).catch(function (e) { banner(e.message, 'bad'); });
  };

  // ------------------------------------------------------------------ start
  api('/api/admin/whoami')
    .then(function (r) { $('whoami').textContent = 'Signed in as ' + r.email; })
    .catch(function (e) { $('whoami').textContent = 'Not signed in'; banner(e.message, 'bad'); });

  loadIssueList().catch(function () {});

  // A sensible default: this month, and one empty event row to start from.
  (function () {
    var d = new Date();
    $('issueMonth').value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    $('issueLabel').value = MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    $('eventRows').appendChild(eventRow());
    state.dirty = false;
  })();
})();

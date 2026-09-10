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
        '<button type="button" class="btn btn-x mv" data-dir="-1" aria-label="Move this section up" title="Move up">&#9650;</button>' +
        '<button type="button" class="btn btn-x mv" data-dir="1" aria-label="Move this section down" title="Move down">&#9660;</button>' +
        '<button type="button" class="btn btn-x" aria-label="Remove this section">Remove section</button>' +
      '</div>' +
      '<div class="rows"></div>' +
      '<div class="actions" style="margin-bottom:10px"><button type="button" class="btn add-row">Add a dated line</button></div>' +
      '<label class="field grow"><span>Paragraph text</span>' +
        '<textarea class="b" rows="4" placeholder="One point per line, starting each with a dash:\n- School starts on Thursday, August 20\n- Parent-teacher meeting on Sunday at 5:00 PM"></textarea>' +
        '<small>Start each line with a dash and it becomes its own bulleted point. A single point with no dash shows as a plain paragraph.</small></label>' +
      '<div class="row"><label class="field"><span>Picture for this section <em>optional</em></span>' +
        '<input class="i" type="file" accept="image/jpeg,image/png,image/webp">' +
        '<small class="istatus"></small></label>' +
        '<div class="field"><span>&nbsp;</span><img class="ipreview thumb" alt="" hidden></div></div>' +
      '<div class="row"><label class="field"><span>Second picture <em>optional, shown beside the first</em></span>' +
        '<input class="i2" type="file" accept="image/jpeg,image/png,image/webp">' +
        '<small class="istatus2"></small></label>' +
        '<div class="field"><span>&nbsp;</span><img class="ipreview2 thumb" alt="" hidden></div></div>';

    box.querySelector('.h').value = c.heading || '';
    box.querySelector('.a').value = c.accent || '';
    box.querySelector('.b').value = c.body || '';
    var rows = box.querySelector('.rows');
    (c.rows || []).forEach(function (r) { rows.appendChild(eventRow(r)); });
    box.querySelector('.add-row').onclick = function () { rows.appendChild(eventRow()); markDirty(); };
    box.dataset.image = c.image || '';
    if (c.image_w) box.dataset.imageW = c.image_w;
    if (c.image_h) box.dataset.imageH = c.image_h;
    if (c.image) {
      var pv = box.querySelector('.ipreview');
      pv.src = /^img\//.test(c.image) ? '/' + c.image : '/api/admin/file/' + encodeURIComponent(c.image);
      pv.hidden = false;
    }
    box.dataset.image2 = c.image2 || '';
    if (c.image2_w) box.dataset.imageW2 = c.image2_w;
    if (c.image2_h) box.dataset.imageH2 = c.image2_h;
    if (c.image2) {
      var pv2 = box.querySelector('.ipreview2');
      pv2.src = /^img\//.test(c.image2) ? '/' + c.image2 : '/api/admin/file/' + encodeURIComponent(c.image2);
      pv2.hidden = false;
    }
    box.querySelector('.i2').onchange = function () {
      var f = this.files[0];
      if (!f) return;
      var status = box.querySelector('.istatus2');
      status.textContent = 'Uploading...';
      upload(f, 'image', 'sec' + (Array.prototype.indexOf.call($('cardList').children, box) + 1) + 'b')
        .then(function (r) {
          box.dataset.image2 = r.key;
          var pv = box.querySelector('.ipreview2');
          pv.onload = function () {
            box.dataset.imageW2 = pv.naturalWidth;
            box.dataset.imageH2 = pv.naturalHeight;
            schedulePreview();
          };
          pv.src = '/api/admin/file/' + encodeURIComponent(r.key) + '#' + Date.now();
          pv.hidden = false;
          status.textContent = 'Uploaded.';
          markDirty();
        })
        .catch(function (e) { status.textContent = e.message; });
    };
    // Order here is order on the page. Which column each lands in is still
    // chosen automatically so the two columns stay level.
    Array.prototype.forEach.call(box.querySelectorAll('.mv'), function (btn) {
      btn.onclick = function () {
        var list = $('cardList');
        if (btn.dataset.dir === '-1' && box.previousElementSibling) list.insertBefore(box, box.previousElementSibling);
        else if (btn.dataset.dir === '1' && box.nextElementSibling) list.insertBefore(box.nextElementSibling, box);
        else return;
        markDirty();
        schedulePreview();
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
    });
    box.querySelector('.i').onchange = function () {
      var f = this.files[0];
      if (!f) return;
      var status = box.querySelector('.istatus');
      status.textContent = 'Uploading...';
      // The slot name keeps each section's picture in its own object, so two
      // sections in the same issue cannot overwrite one another.
      upload(f, 'image', 'sec' + (Array.prototype.indexOf.call($('cardList').children, box) + 1))
        .then(function (r) {
          box.dataset.image = r.key;
          var pv = box.querySelector('.ipreview');
          // The renderer needs the real dimensions to work out how tall this
          // card will be, which is what keeps the two columns level.
          pv.onload = function () {
            box.dataset.imageW = pv.naturalWidth;
            box.dataset.imageH = pv.naturalHeight;
            schedulePreview();
          };
          pv.src = '/api/admin/file/' + encodeURIComponent(r.key) + '#' + Date.now();
          pv.hidden = false;
          status.textContent = 'Added.';
          markDirty();
        })
        .catch(function (e) { status.textContent = e.message; });
    };
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
        image: box.dataset.image || null,
        image_w: box.dataset.imageW ? Number(box.dataset.imageW) : null,
        image_h: box.dataset.imageH ? Number(box.dataset.imageH) : null,
        image2: box.dataset.image2 || null,
        image2_w: box.dataset.imageW2 ? Number(box.dataset.imageW2) : null,
        image2_h: box.dataset.imageH2 ? Number(box.dataset.imageH2) : null,
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

  // ------------------------------------------------------------------ import
  // Fills the whole form from a newsletter. Two ways in: the PDF, or pasted
  // text if the PDF will not read. Both end up in the same parser.

  function applyParsed(r, sourceLabel) {
    if (r.slug) $('issueMonth').value = r.slug;
    if (r.issue_label) $('issueLabel').value = r.issue_label;
    if (r.verse_text) $('verseText').value = r.verse_text;
    if (r.verse_ref) $('verseRef').value = r.verse_ref;

    $('eventRows').innerHTML = '';
    (r.events.length ? r.events : [{}]).forEach(function (e) { $('eventRows').appendChild(eventRow(e)); });
    $('cardList').innerHTML = '';
    r.cards.forEach(function (c) { $('cardList').appendChild(cardEditor(c)); });

    var box = $('importSummary');
    var html = '<h3>Filled in from ' + sourceLabel + '</h3>' +
      '<p class="facts">' + esc(r.issue_label || 'month not found') +
      ' &middot; ' + r.events.length + ' event' + (r.events.length === 1 ? '' : 's') +
      ' &middot; ' + r.cards.length + ' section' + (r.cards.length === 1 ? '' : 's') +
      (r.skipped.length ? ' &middot; birthdays and anniversaries left out' : '') + '</p>';
    box.innerHTML = html;
    box.hidden = false;
    markDirty();
    schedulePreview();
  }

  $('parseBtn').onclick = function () {
    var text = $('pasteBox').value;
    if (!text.trim()) { note($('parseNote'), 'Paste the newsletter text first.', 'bad'); return; }
    var r = window.TorchParse.parse(text);
    if (!r.events.length && !r.cards.length) {
      note($('parseNote'), 'Nothing recognisable found in that text.', 'bad');
      return;
    }
    applyParsed(r, 'the pasted text');
    note($('parseNote'), 'Done. See the summary above.', 'ok');
  };

  // pdf.js is vendored under /admin/vendor rather than loaded from a CDN, and
  // is only fetched when someone actually imports a PDF.
  var pdfjs = null;
  function loadPdfJs() {
    if (pdfjs) return Promise.resolve(pdfjs);
    return import('/admin/vendor/pdf.min.js').then(function (mod) {
      mod.GlobalWorkerOptions.workerSrc = '/admin/vendor/pdf.worker.min.js';
      pdfjs = mod;
      return mod;
    });
  }

  function readPdf(file) {
    var lib = null;
    return loadPdfJs()
      .then(function (mod) { lib = mod; return file.arrayBuffer(); })
      .then(function (buf) { return lib.getDocument({ data: buf }).promise; })
      .then(function (doc) {
        return readPdfText(doc).then(function (text) {
          return readPdfImages(lib, doc).then(function (images) { return { text: text, images: images }; });
        });
      });
  }

  function readPdfText(doc) {
    return Promise.resolve(doc).then(function (doc) {
        var pages = [];
        for (var n = 1; n <= doc.numPages; n++) pages.push(n);
        return Promise.all(pages.map(function (n) {
          return doc.getPage(n).then(function (page) { return page.getTextContent(); }).then(function (tc) {
            // Rebuild lines from the positioned text runs: pdf.js gives items,
            // not lines, and a newsletter is laid out in columns.
            // pdf.js hands back positioned runs, not lines. Group runs by
            // baseline, and insert a space where there is a horizontal gap:
            // without that, drop caps and kerned headings run together as
            // "ROANOKEBAPTIST SCHOOLNEWS".
            var lines = [];
            var y = null;
            var endX = null;
            var buf = '';
            tc.items.forEach(function (it) {
              if (!it.str) return;
              var ty = it.transform[5];
              var tx = it.transform[4];
              if (y !== null && Math.abs(ty - y) >= 3) { lines.push(buf); buf = ''; endX = null; }
              if (buf && endX !== null && tx - endX > 0.9 && !/\s$/.test(buf) && !/^\s/.test(it.str)) buf += ' ';
              buf += it.str;
              y = ty;
              endX = tx + (it.width || 0);
              if (it.hasEOL) { lines.push(buf); buf = ''; y = null; endX = null; }
            });
            if (buf) lines.push(buf);
            return lines.join('\n');
          });
        })).then(function (texts) { return texts.join('\n'); });
      });
  }

  // A section laid out as a picture has no text layer at all, so the parser
  // above cannot see it. The September 2026 issue lost two whole sections that
  // way, the Kid's Choir and the Fall Program, because both were artwork. Pull
  // the embedded pictures out too and let the editor place them.
  //
  // Anything under 60px on a side is page furniture: the staff name bars in the
  // printed Torch measure about 100 by 32. Size cannot tell a QR code from a
  // product photo, so everything above that is offered rather than guessed at,
  // biggest first.
  var MIN_PIC = 60;

  // The church logo and the two QR codes are in every issue and are never what
  // anyone wants to place, but they are the same size as real content: the QR
  // codes measure 116 and 150 square, the gel-pen photo 109 by 126. Size cannot
  // separate them. Colour can. Measured across the September issue, the logo
  // and both QR codes are pure greyscale, every sampled pixel with its three
  // channels equal, while the least colourful real picture still reads 0.098
  // mean saturation. So: no colour anywhere means page furniture.
  function isGreyscale(cv) {
    var ctx = cv.getContext('2d');
    var d;
    try { d = ctx.getImageData(0, 0, cv.width, cv.height).data; } catch (e) { return false; }
    var checked = 0;
    var coloured = 0;
    var step = 4 * Math.max(1, Math.floor((cv.width * cv.height) / 4000));
    for (var i = 0; i < d.length; i += step) {
      if (d[i + 3] < 8) continue;
      var mx = Math.max(d[i], d[i + 1], d[i + 2]);
      var mn = Math.min(d[i], d[i + 1], d[i + 2]);
      if (mx - mn > 10) coloured++;
      checked++;
    }
    return checked > 0 && (coloured / checked) < 0.01;
  }

  // Where an image sits on the page, so it can be captioned with the words
  // printed nearest to it. pdf.js hands back a flat operator list, so the
  // current transform has to be tracked by hand through save/restore.
  function mul(m, n) {
    return [
      m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
    ];
  }

  function boxOf(m) {
    var xs = [m[4], m[0] + m[4], m[2] + m[4], m[0] + m[2] + m[4]];
    var ys = [m[5], m[1] + m[5], m[3] + m[5], m[1] + m[3] + m[5]];
    return {
      x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs),
      y0: Math.min.apply(null, ys), y1: Math.max.apply(null, ys),
    };
  }

  // Caption an image with the printed words directly above it, but only when
  // those words are plainly a label for it.
  //
  // This is deliberately conservative, because a confident wrong caption is
  // worse than none. Most of the artwork in this newsletter carries its own
  // title inside the picture: the Ladies' Conference poster says LADIES'
  // CONFERENCE in the image, and the words above it in the layout belong to
  // the school news in the next column. A first attempt captioned that poster
  // "Happy Anniversary" off the nearest heading. So a candidate has to sit
  // right on top of the image, overlap it horizontally, read like a label
  // rather than a sentence, and never be a line from the birthday or
  // anniversary lists.
  var CAPTION_GAP = 42;
  var PERSONAL_LINE = /\b(happy\s+)?(birthday|anniversar(y|ies))\b|[A-Za-z].*\d{1,2}\s*\/\s*\d{1,2}\s*$/i;

  function captionFor(box, lines) {
    var TP = window.TorchParse;
    var best = null;
    lines.forEach(function (ln) {
      var t = (ln.text || '').trim();
      if (t.length < 4 || t.length > 45) return;
      if (Math.min(ln.x1, box.x1) - Math.max(ln.x, box.x0) <= 0) return;  // must sit over it
      var gap = ln.y - box.y1;                                            // PDF y grows upward
      if (gap < -2 || gap > CAPTION_GAP) return;
      if (/[.!?]$/.test(t)) return;                    // a sentence is body copy, not a label
      // A line starting lower case is the middle of a wrapped sentence in the
      // next column, not a title. This is what stopped the Kid's Choir panel
      // being captioned "the Blazers volleyball schedule and come out".
      if (!/^[A-Z0-9]/.test(t)) return;
      if (PERSONAL_LINE.test(t)) return;               // never lift a member's name and date
      var heading = TP && TP.isHeading ? TP.isHeading(t) : false;
      var score = gap - (heading ? 60 : 0);
      if (!best || score < best.score) best = { score: score, text: t, heading: heading };
    });
    if (!best) return '';
    var out = best.heading && TP && TP.tidyHeading ? TP.tidyHeading(best.text) : best.text;
    return out.replace(/\s+/g, ' ').replace(/[:\u2014\u2013-]\s*$/, '').trim();
  }

  // Rebuild page text as positioned lines, for captioning.
  function linesOf(tc) {
    var lines = [];
    var cur = null;
    tc.items.forEach(function (it) {
      if (!it.str || !it.str.trim()) return;
      var x = it.transform[4];
      var y = it.transform[5];
      if (cur && Math.abs(y - cur.y) < 3) {
        cur.text += (x - cur.x1 > 0.9 ? ' ' : '') + it.str;
        cur.x1 = x + (it.width || 0);
      } else {
        cur = { text: it.str, x: x, x1: x + (it.width || 0), y: y };
        lines.push(cur);
      }
    });
    lines.forEach(function (l) { l.text = l.text.replace(/\s+/g, ' ').trim(); });
    return lines;
  }

  function drawImage(img) {
    var cv = document.createElement('canvas');
    cv.width = img.width;
    cv.height = img.height;
    var ctx = cv.getContext('2d');
    if (img.bitmap) {
      ctx.drawImage(img.bitmap, 0, 0);
      return cv;
    }
    if (!img.data) return null;
    // kind 1 = grey 1bpp, 2 = RGB 24bpp, 3 = RGBA 32bpp.
    var out = ctx.createImageData(img.width, img.height);
    var d = img.data;
    var i, q;
    if (img.kind === 3) {
      out.data.set(d);
    } else if (img.kind === 2) {
      for (i = 0, q = 0; q + 2 < d.length; q += 3, i += 4) {
        out.data[i] = d[q];
        out.data[i + 1] = d[q + 1];
        out.data[i + 2] = d[q + 2];
        out.data[i + 3] = 255;
      }
    } else {
      var rowBytes = (img.width + 7) >> 3;
      for (var y = 0; y < img.height; y++) {
        for (var x = 0; x < img.width; x++) {
          var v = (d[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0;
          i = (y * img.width + x) * 4;
          out.data[i] = v;
          out.data[i + 1] = v;
          out.data[i + 2] = v;
          out.data[i + 3] = 255;
        }
      }
    }
    ctx.putImageData(out, 0, 0);
    return cv;
  }

  function readPdfImages(lib, doc) {
    var pages = [];
    for (var n = 1; n <= doc.numPages; n++) pages.push(n);
    return Promise.all(pages.map(function (n) {
      return doc.getPage(n).then(function (page) {
        return Promise.all([page.getOperatorList(), page.getTextContent()]).then(function (both) {
          var ops = both[0];
          var lines = linesOf(both[1]);
          var wanted = [];
          var seenId = {};
          var ctm = [1, 0, 0, 1, 0, 0];
          var stack = [];
          for (var i = 0; i < ops.fnArray.length; i++) {
            var fn = ops.fnArray[i];
            if (fn === lib.OPS.save) { stack.push(ctm.slice()); continue; }
            if (fn === lib.OPS.restore) { ctm = stack.pop() || [1, 0, 0, 1, 0, 0]; continue; }
            if (fn === lib.OPS.transform) { ctm = mul(ctm, ops.argsArray[i]); continue; }
            if (fn !== lib.OPS.paintImageXObject && fn !== lib.OPS.paintJpegXObject) continue;
            var id = ops.argsArray[i][0];
            if (typeof id !== 'string' || seenId[id]) continue;
            seenId[id] = true;
            wanted.push({ id: id, box: boxOf(ctm) });
          }
          return Promise.all(wanted.map(function (w) {
            var id = w.id;
            return new Promise(function (res) {
              try {
                if (page.objs.has(id)) res(page.objs.get(id));
                else page.objs.get(id, res);
              } catch (e) { res(null); }
            }).then(function (img) {
              if (!img || !img.width || img.width < MIN_PIC || img.height < MIN_PIC) return null;
              var cv = drawImage(img);
              if (!cv) return null;
              if (isGreyscale(cv)) return { furniture: true };
              var caption = captionFor(w.box, lines);
              return new Promise(function (res) {
                cv.toBlob(function (blob) {
                  res(blob ? { blob: blob, url: URL.createObjectURL(blob), w: img.width, h: img.height, page: n, caption: caption } : null);
                }, 'image/png');
              });
            }).catch(function () { return null; });
          }));
        });
      }).catch(function () { return []; });
    })).then(function (perPage) {
      var all = [];
      var furniture = 0;
      perPage.forEach(function (list) {
        list.forEach(function (x) {
          if (!x) return;
          if (x.furniture) { furniture++; return; }
          all.push(x);
        });
      });
      all.sort(function (a, b) { return (b.w * b.h) - (a.w * a.h); });
      all.furniture = furniture;
      return all;
    });
  }

  // Thumbnails plus a destination for each. Nothing is attached until the
  // button is pressed, so a wrong guess here costs nothing.
  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderPicturePicker(images) {
    if (!images.length) return '';
    var opts = '<option value="">Skip</option>' +
      '<option value="new">New section from this picture</option>' +
      '<option value="feature">Featured item</option>';
    Array.prototype.forEach.call($('cardList').children, function (box, i) {
      var h = box.querySelector('.h').value || ('Section ' + (i + 1));
      opts += '<option value="' + i + '">' + esc(h) + '</option>';
    });
    var html = '<div class="picfound"><h3>' + images.length + ' picture' +
      (images.length === 1 ? '' : 's') + ' found in the PDF</h3>' +
      '<p>Placed for you where the home is clear. Anything with a dropdown needs a choice. ' +
      'Amber sections were read off a picture: check dates and times against the print.</p>' +
      '<div class="picgrid">';
    var unplaced = 0;
    images.forEach(function (im, i) {
      var label = im.caption || (im.ocr && im.ocr.heading) || 'Not named in the text';
      var named = !!(im.caption || (im.ocr && im.ocr.heading));
      html += '<div class="pic' + (im.placed ? ' placed' : '') + '" data-pic-tile="' + i + '">' +
              '<img src="' + im.url + '" alt="' + esc(label) + '">' +
              '<strong' + (named ? '' : ' class="unnamed"') + '>' + esc(label) + '</strong>' +
              '<small>' + im.w + ' by ' + im.h + ', page ' + im.page + '</small>';
      if (im.placed) {
        html += '<span class="placed-in">Placed in <b>' + esc(im.placed) + '</b></span>';
      } else {
        unplaced++;
        html += '<select data-pic="' + i + '">' + opts + '</select>';
      }
      html += '</div>';
    });
    html += '</div>';
    if (unplaced) {
      html += '<div class="actions">' +
        '<button type="button" class="btn" id="attachPics">Attach the chosen pictures</button>' +
        '<span id="attachNote" class="note"></span></div>';
    } else {
      html += '<div class="actions"><span id="attachNote" class="note ok">Every picture has a home. ' +
        'To move one, remove it from its section and choose again here.</span></div>';
    }
    return html + '</div>';
  }

  // Have the words read off each picture. The text layer cannot name most of
  // this artwork, because the title is printed inside it, so this is what turns
  // a picture into a section without anyone typing. Runs after the picker is on
  // screen and fills the labels in as each one lands, so nobody waits on it.
  function readPictures(images) {
    var left = images.length;
    var settle = function () {
      left--;
      if (left === 0) autoPlace(images);
      else next();
    };
    // Two pictures at a time. Five at once made the model time out on two of
    // them even with a retry; two keeps every one under its limit, and the
    // labels still fill in as they land.
    var queue = images.map(function (im, i) { return { im: im, i: i }; });
    var next = function () { var q = queue.shift(); if (q) readOne(q.im, q.i); };
    var readOne = function (im, i) {
      var tile = document.querySelector('#importSummary .pic[data-pic-tile="' + i + '"]');
      var label = tile ? tile.querySelector('strong') : null;
      if (label && !im.caption) { label.textContent = 'Reading the words...'; label.className = 'reading'; }
      var fd = new FormData();
      fd.append('file', new File([im.blob], 'picture.png', { type: 'image/png' }));
      // The model takes 20 to 30 seconds a picture and the first call of the
      // day can time out while it warms up, so one failure gets one retry.
      var ask = function () { return api('/api/admin/ocr', { method: 'POST', body: fd }); };
      ask().catch(ask)
        .then(function (r) {
          im.ocr = r;
          if (!label) return;
          // A caption off the text layer is the printed word for word, so it
          // wins. OCR fills the gap where there was no caption at all.
          var shown = im.caption || r.heading;
          if (shown) { label.textContent = shown; label.className = ''; }
          else { label.textContent = 'No words found'; label.className = 'unnamed'; }
        })
        .catch(function () {
          if (!label) return;
          label.textContent = im.caption || 'Not named in the text';
          label.className = im.caption ? '' : 'unnamed';
        })
        .then(settle);
    };
    next();
    next();
  }

  function attachPictures(images) {
    var picks = [];
    Array.prototype.forEach.call(document.querySelectorAll('#importSummary select[data-pic]'), function (sel) {
      if (sel.value !== '') picks.push({ im: images[Number(sel.getAttribute('data-pic'))], to: sel.value });
    });
    if (!picks.length) { note($('attachNote'), 'Nothing chosen yet.', 'bad'); return; }
    if (!$('issueMonth').value) { note($('attachNote'), 'Choose the month first, then attach.', 'bad'); return; }
    // A section shows two pictures side by side at most; the feature shows one.
    var clash = null;
    var count = {};
    picks.forEach(function (pick) {
      if (pick.to === 'new') return;
      if (count[pick.to] === undefined) count[pick.to] = pick.to === 'feature' ? 0 : picturesIn(Number(pick.to));
      count[pick.to]++;
      if (count[pick.to] > (pick.to === 'feature' ? 1 : 2)) clash = pick.to;
    });
    if (clash !== null) {
      var where = clash === 'feature' ? 'the featured item'
        : ($('cardList').children[Number(clash)].querySelector('.h').value || 'that section');
      note($('attachNote'), 'Too many pictures for ' + where + ': a section shows two at most, ' +
        'the featured item one. Send the rest to a new section instead.', 'bad');
      return;
    }
    return placePicks(picks, images, $('attachNote'));
  }

  // Upload each picked picture and put it where it goes. `to` is 'feature',
  // 'new', or a section index as a string.
  function picturesIn(i) {
    var box = $('cardList').children[i];
    return box ? (box.dataset.image ? 1 : 0) + (box.dataset.image2 ? 1 : 0) : 0;
  }

  function placePicks(picks, images, noteEl) {
    note(noteEl, 'Uploading ' + picks.length + '...');
    var done = 0;
    var made = 0;
    var readCount = 0;
    return picks.reduce(function (chain, pick) {
      return chain.then(function () {
        var file = new File([pick.im.blob], 'pdf-picture-' + (done + 1) + '.png', { type: 'image/png' });
        var target = pick.to;
        // A new section has to exist before the upload, so the slot name matches
        // the position the renderer will read it back from.
        if (target === 'new') {
          var read = pick.im.ocr || {};
          var fresh = cardEditor({
            heading: pick.im.caption || read.heading || '',
            // The sentence form, written to read like the rest of the page.
            body: read.body || '',
          });
          $('cardList').appendChild(fresh);
          if (read.heading || read.body) { fresh.classList.add('needs-check'); readCount++; }
          else { fresh.classList.add('needs-text'); }
          target = String($('cardList').children.length - 1);
          made++;
        }
        pick.im.placed = target === 'feature' ? 'the featured item'
          : ($('cardList').children[Number(target)].querySelector('.h').value || ('section ' + (Number(target) + 1)));
        var second = target !== 'feature' && !!($('cardList').children[Number(target)] || {}).dataset.image;
        var slot = target === 'feature' ? null : 'sec' + (Number(target) + 1) + (second ? 'b' : '');
        return upload(file, 'image', slot).then(function (r) {
          if (target === 'feature') {
            state.featureImageKey = r.key;
            var fp = $('featPreview');
            if (fp) {
              fp.src = '/api/admin/file/' + encodeURIComponent(r.key) + '#' + Date.now();
              fp.hidden = false;
            }
          } else {
            var box = $('cardList').children[Number(target)];
            if (box) {
              var k = second ? 'image2' : 'image';
              box.dataset[k] = r.key;
              // The renderer needs real dimensions to keep the columns level.
              box.dataset[second ? 'imageW2' : 'imageW'] = pick.im.w;
              box.dataset[second ? 'imageH2' : 'imageH'] = pick.im.h;
              var pv = box.querySelector(second ? '.ipreview2' : '.ipreview');
              if (pv) {
                pv.src = '/api/admin/file/' + encodeURIComponent(r.key) + '#' + Date.now();
                pv.hidden = false;
              }
            }
          }
          done++;
        });
      });
    }, Promise.resolve()).then(function () {
      var msg = 'Attached ' + done + '.';
      if (made) {
        msg += ' ' + made + ' new section' + (made === 1 ? '' : 's') + ' added at the bottom' +
               (readCount ? ', filled in from the words on the picture' + (readCount === 1 ? '' : 's') +
                 '. Check every date and time against the print before publishing.'
                     : '. Type the heading and wording off each picture.');
      }
      note(noteEl, msg + ' Check the preview.', 'ok');
      markDirty();
      schedulePreview();
      // Redraw so placed pictures say where they went and lose their dropdown.
      var picker = document.querySelector('#importSummary .picfound');
      if (picker) {
        picker.outerHTML = renderPicturePicker(images);
        var btn = $('attachPics');
        if (btn) btn.onclick = function () { attachPictures(images); };
        var n = $('attachNote');
        if (n) note(n, msg, 'ok');
      }
    }).catch(function (e) {
      note(noteEl, e.message, 'bad');
    });
  }

  // Once every picture has been read, place the ones whose home is obvious,
  // so a normal month needs no choosing at all:
  //   - a caption off the text layer that names an existing section, or sits
  //     inside its wording, goes to that section (the packet photos land in
  //     Missions Spotlight this way);
  //   - artwork with a transcribed heading and nothing to match becomes its
  //     own section, heading and lines filled in;
  //   - anything else is left in the picker with a dropdown.
  // A section holds one picture, so the largest claimant wins and the rest
  // stay in the picker rather than overwrite it.
  function autoPlace(images) {
    if (!$('issueMonth').value) return Promise.resolve();
    var boxes = Array.prototype.slice.call($('cardList').children);
    var taken = {};
    boxes.forEach(function (b, i) { taken[i] = picturesIn(i); });
    var picks = [];
    images.forEach(function (im) {
      if (im.placed) return;
      var cap = (im.caption || '').trim().toLowerCase();
      if (cap) {
        var hit = -1;
        boxes.forEach(function (b, i) {
          if (hit !== -1) return;
          var h = (b.querySelector('.h').value || '').trim().toLowerCase();
          var body = (b.querySelector('.b').value || '').toLowerCase();
          if (h === cap || (cap.length >= 6 && body.indexOf(cap) !== -1)) hit = i;
        });
        if (hit !== -1 && taken[hit] < 2) { taken[hit]++; picks.push({ im: im, to: String(hit) }); return; }
        // Captioned means the text above it describes it, so it belongs inside
        // existing wording, never as a section of its own. If its section is
        // already full, or nothing matched, a human decides.
        return;
      }
      if (im.ocr && im.ocr.heading) picks.push({ im: im, to: 'new' });
    });
    if (!picks.length) return Promise.resolve();
    return placePicks(picks, images, $('attachNote') || $('importNote'));
  }

  // The one thing the month is about goes in the wide block at the top. The
  // print does not mark it, but it is the section that is new this month and
  // has the most to say. Recurring sections are learned from the most recent
  // saved issue, so this stays right as the newsletter changes shape.
  var STANDING = ['rbcteens', 'roanokebaptistschoolnews', 'soulwinningprayer', 'missionsspotlight', 'upcomingevents'];
  function norm(t) { return String(t || '').toLowerCase().replace(/[^a-z]/g, ''); }

  function autoFeature(r) {
    if ($('featTitle').value.trim()) return Promise.resolve(null);
    return api('/api/admin/issues').then(function (list) {
      var prev = ((list && list.issues) || []).filter(function (i) { return i.slug !== r.slug; })[0];
      return prev ? api('/api/admin/issue/' + prev.slug).then(function (x) { return x.issue; }).catch(function () { return null; }) : null;
    }).catch(function () { return null; }).then(function (prevIssue) {
      var stems = STANDING.slice();
      ((prevIssue && prevIssue.cards) || []).forEach(function (c) { if (c.heading) stems.push(norm(c.heading)); });
      var isRecurring = function (h) {
        var k = norm(h);
        return stems.some(function (st) { return st && (k.indexOf(st) === 0 || st.indexOf(k) === 0); });
      };
      var boxes = Array.prototype.slice.call($('cardList').children);
      var best = null;
      boxes.forEach(function (box) {
        var h = box.querySelector('.h').value;
        if (!h || isRecurring(h)) return;
        // A section read off a picture is already a picture. The feature is
        // for the month's headline item as the newsletter wrote it up.
        if (box.classList.contains('needs-check') || box.classList.contains('needs-text')) return;
        // Weight of what it has to say: body plus its dated lines.
        var weight = box.querySelector('.b').value.length + box.querySelectorAll('.rows .line').length * 40;
        if (weight < 60) return;
        if (!best || weight > best.weight) best = { box: box, weight: weight, heading: h };
      });
      if (!best) return null;
      var box = best.box;
      var body = box.querySelector('.b').value.trim();
      var rows = readRows(box.querySelector('.rows'));
      // Just the date. What follows it belongs in the body, not in "when":
      // the old pattern ran forty characters past the date and dragged the
      // next clause along with it.
      var when = rows.length ? rows[0].date + (rows[0].detail ? ', ' + rows[0].detail : '')
        : ((body.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*(?:-|and|&)\s*\d{1,2}(?:st|nd|rd|th)?)?(?:,\s*\d{4})?/) || [''])[0]);
      $('featKicker').value = 'This Month';
      $('featTitle').value = best.heading;
      $('featWhen').value = when.trim();
      $('featBody').value = body || rows.map(function (x) { return x.date + ': ' + x.name + (x.detail ? ', ' + x.detail : ''); }).join('\n');
      box.remove();
      markDirty();
      return best.heading;
    });
  }

  $('importPdf').onchange = function () {
    var file = this.files[0];
    if (!file) return;
    note($('importNote'), 'Reading the PDF...');
    $('importSummary').hidden = true;
    readPdf(file)
      .then(function (got) {
        var text = got.text;
        if (!text || text.replace(/\s/g, '').length < 50) {
          throw new Error('No text found in that PDF. It may be a scan rather than a document. Use the paste box instead.');
        }
        var r = window.TorchParse.parse(text);
        applyParsed(r, 'the PDF');
        autoFeature(r).then(function (title) {
          if (!title) return;
          var facts = document.querySelector('#importSummary .facts');
          if (facts) facts.innerHTML += ' &middot; featured: ' + esc(title);
          schedulePreview();
        });
        if (got.images.length) {
          $('importSummary').innerHTML += renderPicturePicker(got.images);
          $('attachPics').onclick = function () { attachPictures(got.images); };
          readPictures(got.images);
        }
        note($('importNote'), 'Read the PDF. Now saving a copy...');
        // Keep the PDF on file too, so this is one step rather than two.
        var slug = $('issueMonth').value || r.slug;
        if (!slug) { note($('importNote'), 'Imported. Set the month, then upload the PDF below to keep a copy.', 'ok'); return; }
        return upload(file, 'pdf').then(function (up) {
          state.pdfKey = up.key;
          $('pdfCurrent').textContent = 'A PDF is already on file.';
          note($('importNote'), 'Imported, and the PDF is on file.', 'ok');
        });
      })
      .catch(function (e) { note($('importNote'), e.message, 'bad'); });
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
function upload(file, kind, slot) {
    var slug = $('issueMonth').value;
    if (!slug) return Promise.reject(new Error('Choose the month first.'));
    var fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);
    fd.append('slug', slug);
    if (slot) fd.append('name', slot);
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

  // ------------------------------------------------------------- live preview
  // Rendered by the same worker function that renders the real page, so what
  // the editor sees is what visitors get. That is a small request per update,
  // hence a debounce rather than rendering on every keystroke.
  var previewTimer = null, previewBusy = false, previewAgain = false;

  function schedulePreview() {
    if ($('previewPanel').hidden || !$('previewLive').checked) return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 500);
  }

  function renderPreview() {
    if (previewBusy) { previewAgain = true; return; }
    previewBusy = true;
    note($('previewNote'), 'Updating...');
    return api('/api/admin/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gather('draft')),
    }).then(function (r) {
      var frame = $('previewFrame');
      // Hold the reader's place, or the panel jumps to the top on every
      // keystroke and becomes impossible to work against.
      var scroll = 0;
      try { scroll = frame.contentWindow.scrollY || 0; } catch (e) {}
      var doc = frame.contentDocument;
      doc.open();
      doc.write('<!doctype html><html lang="en"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">' +
        // Always the current stylesheet. A pinned number here drifted from the
        // site's own within a week; the preview is admin-only, so no caching.
        '<link rel="stylesheet" href="/style.css?v=' + Date.now() + '"></head>' +
        '<body><main><div id="torchPage"><section class="section"><div class="container">' +
        r.html + '</div></section></div></main></body></html>');
      doc.close();
      var grow = function () {
        try {
          var h = doc.documentElement.scrollHeight;
          if (h > 200) frame.style.height = (h + 24) + 'px';
        } catch (e) {}
      };
      setTimeout(grow, 150);
      setTimeout(grow, 900);
      if (scroll) setTimeout(function () { try { frame.contentWindow.scrollTo(0, scroll); } catch (e) {} }, 60);
      note($('previewNote'), 'Up to date.', 'ok');
    }).catch(function (e) {
      note($('previewNote'), e.message, 'bad');
    }).then(function () {
      previewBusy = false;
      if (previewAgain) { previewAgain = false; schedulePreview(); }
    });
  }

  $('previewBtn').onclick = function () {
    var panel = $('previewPanel');
    panel.hidden = !panel.hidden;
    this.textContent = panel.hidden ? 'Show preview' : 'Hide preview';
    if (!panel.hidden) renderPreview();
  };

  // Desktop preview: the site's layout switches to one column under 900px,
  // and the right-hand column is narrower than that. Draw the page at its
  // real 1180px and scale it to fit, so what is shown is the desktop layout.
  function fitPreview() {
    var wrap = $('frameWrap');
    var frame = $('previewFrame');
    if (!wrap || !frame) return;
    if (wrap.classList.contains('phone')) { frame.style.zoom = ''; return; }
    var avail = wrap.clientWidth;
    frame.style.zoom = avail > 0 && avail < 1180 ? String(avail / 1180) : '';
  }
  if (window.ResizeObserver) new ResizeObserver(fitPreview).observe($('frameWrap'));
  window.addEventListener('resize', fitPreview);
  $('previewLive').onchange = function () { if (this.checked) renderPreview(); };
  $('previewRefresh').onclick = function () { renderPreview(); };

  // Desktop / phone. Without this the preview is stuck below the site's 900px
  // breakpoint and always shows the single-column phone layout.
  function setWidth(phone) {
    $('frameWrap').className = 'frame-wrap' + (phone ? ' phone' : '');
    $('previewPhone').classList.toggle('active', phone);
    $('previewDesktop').classList.toggle('active', !phone);
    fitPreview();
    renderPreview();
  }
  fitPreview();
  $('previewDesktop').onclick = function () { setWidth(false); };
  $('previewPhone').onclick = function () { setWidth(true); };

  // Typing, picking a colour, adding or removing a row all feed the preview.
  document.addEventListener('input', schedulePreview);
  document.addEventListener('change', schedulePreview);

  // -------------------------------------------------------------- privacy
  var pendingStatus = null;
  function closePrivacy() {
    $('privacyModal').hidden = true;
  }
  function showPrivacy(warnings, status) {
    // Never open with nothing to show. An empty dialog is just a trap.
    if (!warnings || !warnings.length) {
      note($('saveNote'), 'Could not save. Please try again.', 'bad');
      return;
    }
    pendingStatus = status;
    $('privacyList').innerHTML = '';
    warnings.forEach(function (w) {
      var li = document.createElement('li');
      li.textContent = w;
      $('privacyList').appendChild(li);
    });
    $('privacyModal').hidden = false;
  }
  $('privacyBack').onclick = function () { closePrivacy(); note($('saveNote'), 'Nothing was saved.', ''); };
  $('privacyGo').onclick = function () { closePrivacy(); save(pendingStatus, true); };
  // Escape, and a click on the backdrop, both close it.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('privacyModal').hidden) { closePrivacy(); note($('saveNote'), 'Nothing was saved.', ''); }
  });
  $('privacyModal').addEventListener('click', function (e) {
    if (e.target === this) { closePrivacy(); note($('saveNote'), 'Nothing was saved.', ''); }
  });

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

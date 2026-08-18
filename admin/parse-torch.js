/*
 * Turns the text of a Torch newsletter into a draft issue.
 *
 * Used for both routes into the editor: text pasted into the box, and text
 * pulled out of an uploaded PDF. It is a best effort on a document laid out
 * for print, so everything it produces is a starting point the editor is
 * expected to correct.
 *
 * Two rules it does not bend:
 *   - Anything under a birthday or anniversary heading is dropped, and the
 *     drop is reported rather than done silently.
 *   - Boilerplate that already appears elsewhere on the website (address,
 *     phone, staff list, Zelle details) is left out.
 *
 * Attaches to window.TorchParse in the browser, module.exports under node.
 */
(function (root) {
  'use strict';

  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MONTH_RE = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?';

  var PERSONAL = /\b(happy\s+)?(birthday|anniversar(y|ies))\b/i;
  var ISSUE_LINE = new RegExp('^(' + MONTHS.join('|') + ')\\s+(\\d{4})$', 'i');
  var SCRIPTURE = /((?:[1-3]\s?)?[A-Z][a-z]+\.?\s+\d{1,3}:\d{1,3}(?:-\d{1,3})?)\s*$/;
  var DATE_ONLY = new RegExp('^(' + MONTH_RE + '\\s+\\d{1,2}(?:\\s*[-–—]\\s*\\d{1,2})?)$', 'i');
  var DATE_LEAD = new RegExp('^(' + MONTH_RE + '\\s+\\d{1,2}(?:\\s*[-–—]\\s*\\d{1,2})?)\\s+(.{2,})$', 'i');
  var TIME_TAIL = /\s{2,}((?:\d{1,2}(?::\d{2})?\s*(?:am|pm))(?:\s*[-–—]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))?)\s*$/i;

  // Lines that are already on the website or are print-only furniture.
  var BOILERPLATE = [
    /^roanoke baptist church$/i,
    /^\d+\s+lafayette/i,
    /^roanoke,?\s+in\b/i,
    /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/,
    /^www\./i,
    /^the church that ministers!?$/i,
    /^the torch$/i,
    /^zelle/i,
    /^rbczelle@/i,
    /^check out our church website/i,
    /^[••]\s*/,           // the staff bullet list
    /^(pastor|youth pastor|assistant pastor|outreach director)$/i,
  ];

  function isBoilerplate(line) {
    for (var i = 0; i < BOILERPLATE.length; i++) if (BOILERPLATE[i].test(line)) return true;
    return false;
  }

  // A heading is a line in capitals. Title Case was tried and produced six
  // invented sections on the August issue ("Sunday, August 2", "Ladies in the
  // Multi-Purpose Room"), which is worse to clean up than a missed heading:
  // text left in the wrong card can be split, but a bogus card has to be
  // deleted and its contents moved.
  function isHeading(line) {
    if (!line || line.length > 60) return false;
    if (DATE_ONLY.test(line) || DATE_LEAD.test(line)) return false;
    var letters = line.replace(/[^A-Za-z]/g, '');
    if (letters.length < 4) return false;
    if (letters !== letters.toUpperCase()) return false;
    return /[A-Z]{2,}/.test(line);
  }

  // Multi-column print text often arrives with a heading welded onto the end
  // of the previous column's last sentence:
  //   "...out for a meal. UPCOMING EVENTS"
  // Split those out, or the heading is never seen and its whole section is
  // swallowed by the one before it.
  var TRAILING_HEADING = /^(.*?[a-z.!?,)])\s{1,}([A-Z][A-Z&'’]*(?:\s+[A-Z&'’]{2,})+!?)\s*$/;
  var LEADING_HEADING = /^([A-Z][A-Z&'’]*(?:\s+[A-Z&'’]{2,})+!?)\s{2,}(.*[a-z].*)$/;

  function splitWeldedHeadings(lines) {
    var out = [];
    lines.forEach(function (line) {
      var m = line.match(TRAILING_HEADING);
      if (m && isHeading(m[2])) { out.push(m[1].trim(), m[2].trim()); return; }
      m = line.match(LEADING_HEADING);
      if (m && isHeading(m[1])) { out.push(m[1].trim(), m[2].trim()); return; }
      out.push(line);
    });
    return out;
  }

  /**
   * Print layouts split drop caps onto their own line, so "ROANOKE BAPTIST
   * SCHOOL NEWS" arrives as R / OANOKE / B / APTIST / ... Rejoin those.
   */
  function mendDropCaps(lines) {
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      if (/^[A-Z]$/.test(lines[i]) && i + 1 < lines.length && /^[A-Z]{2,}/.test(lines[i + 1])) {
        var word = lines[i] + lines[i + 1];
        i++;
        while (i + 2 < lines.length && /^[A-Z]$/.test(lines[i + 1]) && /^[A-Z]{2,}/.test(lines[i + 2])) {
          word += ' ' + lines[i + 1] + lines[i + 2];
          i += 2;
        }
        out.push(word);
      } else {
        out.push(lines[i]);
      }
    }
    return out;
  }

  function clean(text) {
    var lines = String(text || '')
      .replace(/\r/g, '')
      // Symbol fonts (Wingdings bullets and the like) arrive as Private Use
      // Area characters. They are invisible but they are not whitespace, so they
      // sit between a date and its description and stop the two being told apart.
      .replace(/[\ue000-\uf8ff]/g, ' ')
      .replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, ' ')
      .split('\n')
      .map(function (l) { return l.replace(/\s+$/, '').replace(/^\s+/, '').replace(/\s{3,}/g, '  '); });
    return splitWeldedHeadings(mendDropCaps(lines));
  }

  function splitRow(line) {
    var detail = '';
    var m = line.match(TIME_TAIL);
    if (m) { detail = m[1].trim(); line = line.replace(TIME_TAIL, '').trim(); }
    var lead = line.match(DATE_LEAD);
    if (lead) {
      return { date: lead[1], name: lead[2].replace(/[–—]/g, ': ').replace(/\s{2,}/g, ' ').trim(), detail: detail };
    }
    return null;
  }

  function parse(text) {
    var lines = clean(text);
    var result = {
      issue_label: '', verse_text: '', verse_ref: '',
      events: [], cards: [], skipped: [], notes: [],
    };

    // ---- masthead ---------------------------------------------------------
    for (var i = 0; i < lines.length; i++) {
      var im = lines[i].match(ISSUE_LINE);
      if (im) {
        var month = im[1][0].toUpperCase() + im[1].slice(1).toLowerCase();
        result.issue_label = month + ' ' + im[2];
        result.slug = im[2] + '-' + String(MONTHS.indexOf(month) + 1).padStart(2, '0');
        break;
      }
    }

    // ---- verse ------------------------------------------------------------
    // Find the scripture reference, then walk backwards over the lines that
    // lead into it. Matching forwards greedily pulled in whatever happened to
    // sit above the verse in the other column ("August 5, 12, 19, 26 @ 3:30pm
    // Rooted and built up in him...").
    var best = null;
    for (var v = 0; v < lines.length; v++) {
      var refM = lines[v].match(SCRIPTURE);
      if (!refM) continue;
      var head = lines[v].slice(0, lines[v].length - refM[0].length).trim();
      var parts = head ? [head] : [];
      for (var b = v - 1; b >= 0 && parts.join(' ').length < 240; b--) {
        var prev = lines[b].trim();
        // Stop at anything that is plainly not part of a verse.
        if (!prev || isHeading(prev) || isBoilerplate(prev)) break;
        if (DATE_ONLY.test(prev) || DATE_LEAD.test(prev)) break;
        if (/\d{1,2}\s*(?::\d{2})?\s*(?:am|pm)/i.test(prev)) break;
        if (/[.!?]$/.test(prev) && parts.length) break;
        parts.unshift(prev);
      }
      var text = parts.join(' ').replace(/\s{2,}/g, ' ').trim();
      // A verse runs to a sentence end; drop anything before the last one.
      var cut = text.search(/[.!?]\s+[A-Z]/);
      while (cut !== -1 && text.length - cut > 40) {
        text = text.slice(cut + 1).trim();
        cut = text.search(/[.!?]\s+[A-Z]/);
      }
      if (text.length > 40 && (!best || text.length > best.text.length)) {
        best = { text: text, ref: refM[1].trim(), line: v, from: b + 1 };
      }
    }
    // Remember which lines the verse used, so the same words are not also
    // dropped into whichever section happens to precede it in the file.
    var verseLines = [];
    if (best) {
      result.verse_text = best.text.replace(/^["“]|["”]$/g, '').trim();
      result.verse_ref = best.ref;
      for (var q = best.from; q <= best.line; q++) verseLines.push(q);
    }

    // ---- sections ---------------------------------------------------------
    var sections = [];
    var current = null;
    for (var j = 0; j < lines.length; j++) {
      var line = lines[j];
      if (!line || isBoilerplate(line)) continue;
      if (ISSUE_LINE.test(line)) continue;
      if (best && line.indexOf(best.ref) !== -1) continue;
      if (verseLines.indexOf(j) !== -1) continue;

      if (isHeading(line)) {
        // A heading set over two lines ("SOULWINNING &" / "PRAYER
        // OPPORTUNITIES") arrives as two, and the first would be thrown away.
        var full = line;
        while (j + 1 < lines.length && isHeading(lines[j + 1]) &&
               (/[&+]$/.test(full.trim()) || full.trim().split(/\s+/).length < 3)) {
          full += ' ' + lines[j + 1];
          j++;
        }
        current = { heading: tidyHeading(full.replace(/\s{2,}/g, ' ')), rows: [], body: [] };
        sections.push(current);
        continue;
      }
      if (!current) continue;

      var row = splitRow(line);
      if (row) { current.rows.push(row); continue; }

      // A bare date on its own line takes the next line as its description.
      if (DATE_ONLY.test(line)) {
        var next = '';
        for (var k = j + 1; k < lines.length; k++) {
          if (lines[k] && !isBoilerplate(lines[k])) { next = lines[k]; j = k; break; }
        }
        if (next && !DATE_ONLY.test(next) && !isHeading(next)) {
          var d2 = '';
          var m2 = next.match(TIME_TAIL);
          if (m2) { d2 = m2[1].trim(); next = next.replace(TIME_TAIL, '').trim(); }
          current.rows.push({
            date: line,
            name: next.replace(/[–—]/g, ': ').replace(/\s{2,}/g, ' ').trim(),
            detail: d2,
          });
          continue;
        }
      }
      current.body.push(line.replace(/^[→>\-•]\s*/, ''));
    }

    // ---- assemble ---------------------------------------------------------
    sections.forEach(function (s) {
      if (PERSONAL.test(s.heading)) {
        result.skipped.push(s.heading);
        return;
      }
      if (/^upcoming events$/i.test(s.heading)) {
        result.events = s.rows;
        if (s.body.length) result.notes.push('Some lines under "Upcoming Events" were not dated and were left out.');
        return;
      }
      if (!s.rows.length && !s.body.length) return;
      result.cards.push({
        heading: s.heading,
        accent: '',
        rows: s.rows,
        body: joinBody(s.body),
        image: null,
      });
    });

    // Fall back to the largest dated section if there was no explicit list.
    if (!result.events.length && result.cards.length) {
      var biggest = result.cards.reduce(function (a, b) { return b.rows.length > a.rows.length ? b : a; });
      if (biggest.rows.length >= 4) {
        result.events = biggest.rows;
        result.cards = result.cards.filter(function (c) { return c !== biggest; });
        result.notes.push('No "Upcoming Events" heading was found, so "' + biggest.heading + '" was used for the dated list.');
      }
    }

    if (!result.issue_label) result.notes.push('Could not find the month, so please set it yourself.');
    if (!result.verse_text) result.notes.push('Could not find the masthead verse.');
    result.notes.push('The featured item is not filled in automatically. Set it if you want one.');

    return result;
  }

  // "SOULWINNING & PRAYER OPPORTUNITIES" reads better as normal case.
  function tidyHeading(h) {
    var t = h.replace(/[:!]+$/, '').trim();
    var letters = t.replace(/[^A-Za-z]/g, '');
    if (letters && letters === letters.toUpperCase() && letters.length > 3) {
      t = t.toLowerCase().replace(/\b([a-z])/g, function (_, c) { return c.toUpperCase(); });
      t = t.replace(/\bRbc\b/g, 'RBC').replace(/\bAnd\b/g, 'and').replace(/\bOf\b/g, 'of').replace(/\bThe\b/g, 'the');
      t = t.charAt(0).toUpperCase() + t.slice(1);
    }
    return t;
  }

  function joinBody(arr) {
    // Print wraps mid-sentence, so rejoin lines that do not end a sentence.
    var out = [];
    arr.forEach(function (line) {
      if (out.length && !/[.!?:]$/.test(out[out.length - 1])) out[out.length - 1] += ' ' + line;
      else out.push(line);
    });
    return out.map(function (l) { return l.replace(/\s{2,}/g, ' ').trim(); }).join('\n\n');
  }

  var api = { parse: parse, isHeading: isHeading, tidyHeading: tidyHeading };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TorchParse = api;
})(typeof window !== 'undefined' ? window : globalThis);

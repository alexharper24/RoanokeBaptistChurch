// Roanoke Baptist Church - shared site script

function closeMobile() {
  var m = document.getElementById('mobileNav');
  if (m) m.style.display = 'none';
}
function openGive() {
  var m = document.getElementById('giveModal');
  if (m) m.style.display = 'flex';
}

// Expandable Scripture references
function toggleVerse(el) {
  var expanded = el.nextElementSibling;
  if (expanded && expanded.classList.contains('verse-expanded')) {
    expanded.remove(); el.classList.remove('verse-active'); return;
  }
  // .sof-item is the Statement of Faith card. It was missing here, so opening a
  // second verse inside one article left the first one expanded.
  var card = el.closest('.belief-section') || el.closest('.gospel-section') || el.closest('.sof-item');
  if (card) {
    card.querySelectorAll('.verse-expanded').forEach(function(v){ v.remove(); });
    card.querySelectorAll('.verse-active').forEach(function(v){ v.classList.remove('verse-active'); });
  }
  var text = el.getAttribute('data-verse'); if (!text) return;
  var div = document.createElement('div');
  div.className = 'verse-expanded';
  div.innerHTML = '<strong>' + el.textContent + '</strong><br>' + text;
  el.parentNode.insertBefore(div, el.nextSibling);
  el.classList.add('verse-active');
}

// Statement of Faith: open or shut all sixteen articles at once.
function toggleAllBeliefs(btn) {
  var items = document.querySelectorAll('.sof-list details.sof-item');
  if (!items.length) return;
  var opening = btn.getAttribute('aria-expanded') !== 'true';
  items.forEach(function(d){ d.open = opening; });
  btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
  btn.textContent = opening ? 'Collapse all articles' : 'Expand all articles';
}

// Keep that button honest when articles are opened one at a time.
document.querySelectorAll('.sof-list details.sof-item').forEach(function(d){
  d.addEventListener('toggle', function(){
    var btn = document.getElementById('sofToggleAll');
    if (!btn) return;
    var all = document.querySelectorAll('.sof-list details.sof-item');
    var open = document.querySelectorAll('.sof-list details.sof-item[open]');
    var allOpen = open.length === all.length;
    btn.setAttribute('aria-expanded', allOpen ? 'true' : 'false');
    btn.textContent = allOpen ? 'Collapse all articles' : 'Expand all articles';
  });
});

// Fade-in on scroll
var io = new IntersectionObserver(function(entries) {
  entries.forEach(function(e){ if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-up').forEach(function(el){ io.observe(el); });

// Close the Give modal on backdrop click
var give = document.getElementById('giveModal');
if (give) {
  give.addEventListener('click', function(e){ if (e.target === this) this.style.display = 'none'; });
}

// Escape key closes the mobile menu and the Give modal
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape') { closeMobile(); if (give) give.style.display = 'none'; }
});


/* ---------- footer column folds on a phone ----------
   At 390px wide the footer ran 912px. Explore folds behind its own heading
   below 900px, which is where .footer-grid already collapses to one column.

   ONLY Explore folds. Service Times ends with the church phone number, and the
   always-visible bottom bar carries the street address but not the number, so
   folding that column would put the phone behind a tap. If the number is ever
   moved down to the bottom bar beside the address, mark Service Times with
   class="footer-col" in the six pages and it will fold too. Nothing else has
   to change.

   The toggle and the panel are built here rather than written into the pages,
   which carry only class="footer-col". The heading text is then written once,
   so renaming the column cannot leave the phone and the desktop disagreeing,
   and a footer whose script never loaded keeps a plain heading with every link
   visible, because the elements that do the folding never come into being.
   Hiding links behind a control that cannot open them is the one failure this
   pattern must not have. */
(function () {
  var cols = document.querySelectorAll('.footer-col');
  var foot = document.querySelector('.site-footer');
  if (!cols.length || !foot) return;

  var CHEVRON = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"' +
    ' focusable="false"><path d="M2 4.5L6 8.5L10 4.5" fill="none" stroke="currentColor"' +
    ' stroke-width="1.8" stroke-linecap="square"></path></svg>';

  Array.prototype.forEach.call(cols, function (col) {
    var heading = col.querySelector('h3, h4');
    if (!heading) return;

    var label = heading.textContent.trim();
    if (!label) return;
    var id = 'footer-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    var panel = document.createElement('div');
    panel.className = 'footer-col-panel';
    panel.id = id;
    var clip = document.createElement('div');
    var node = heading.nextSibling;
    while (node) { var next = node.nextSibling; clip.appendChild(node); node = next; }
    panel.appendChild(clip);
    col.appendChild(panel);

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'footer-col-toggle';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', id);
    button.appendChild(document.createTextNode(label));
    button.insertAdjacentHTML('beforeend', CHEVRON);

    var text = document.createElement('span');
    text.className = 'footer-col-label';
    text.textContent = label;
    heading.textContent = '';
    heading.appendChild(text);
    heading.appendChild(button);

    button.addEventListener('click', function () {
      var open = !col.classList.contains('open');
      col.classList.toggle('open', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  foot.classList.add('footer-accordion-ready');
})();

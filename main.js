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

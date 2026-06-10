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
  var card = el.closest('.belief-section') || el.closest('.gospel-section');
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

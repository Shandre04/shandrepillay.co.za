(function () {
  var body = document.body;

  // Theme: saved choice, else OS preference
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (saved === null && prefersDark)) body.classList.add('dark-mode');

  requestAnimationFrame(function () { requestAnimationFrame(function () { body.classList.add('ready'); }); });

  // Page transitions: a soft curved veil sweeps up as you leave a page and lifts away on the next
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var veilIn = root.classList.contains('veil-in');
  var veil = null;
  var makeVeil = function () { veil = document.createElement('div'); veil.className = 'veil'; body.appendChild(veil); return veil; };
  if (veilIn) {
    var arriving = makeVeil();
    arriving.style.transform = 'translateY(-14vh)';   // fully covering, exactly where the last page left it
    root.classList.remove('veil-in');
    if (calm) { arriving.remove(); }
    else {
      setTimeout(function () {
        var lift = arriving.animate(
          [{ transform: 'translateY(-14vh)' }, { transform: 'translateY(-155vh)' }],
          { duration: 560, easing: 'cubic-bezier(.65,0,.3,1)', fill: 'forwards' }
        );
        lift.onfinish = function () { arriving.remove(); };
      }, 40);
    }
  }
  var norm = function (p) { return p.replace(/index\.html$/, ''); };
  document.addEventListener('click', function (e) {
    if (calm || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    if (a.origin !== location.origin || !/(\.html|\/)$/.test(a.pathname)) return;
    if (norm(a.pathname) === norm(location.pathname)) return;   // same page: let hash links and replays work
    e.preventDefault();
    try { sessionStorage.setItem('veil', '1'); } catch (err) {}
    var v = veil || makeVeil();
    var go = function () { location.href = a.href; };
    var cover = v.animate(
      [{ transform: 'translateY(100vh)' }, { transform: 'translateY(-14vh)' }],
      { duration: 380, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }
    );
    cover.onfinish = go;
    setTimeout(go, 800);   // safety net
  });
  window.addEventListener('pageshow', function (e) {   // back/forward cache: never come back to a covered page
    if (e.persisted) { var old = document.querySelector('.veil'); if (old) old.remove(); veil = null; }
  });

  var sw = document.querySelector('.theme-switch');
  if (sw) {
    sw.setAttribute('aria-checked', body.classList.contains('dark-mode'));
    sw.addEventListener('click', function () {
      var dark = body.classList.toggle('dark-mode');
      sw.setAttribute('aria-checked', dark);
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
    });
  }

  // Tabs: slide out on every page open, with an underline that glides between tabs
  var navList = document.querySelector('.nav-list');
  if (navList) {
    var items = navList.querySelectorAll('li');
    for (var ni = 0; ni < items.length; ni++) {
      items[ni].style.setProperty('--i', ni);
      items[ni].style.setProperty('--r', items.length - 1 - ni);
    }
    var slider = document.createElement('span');
    slider.className = 'nav-slider';
    navList.appendChild(slider);
    navList.classList.add('has-slider');

    var rest = navList.querySelector('.nav-link.active');
    var moveTo = function (link, animate) {
      if (!link) { slider.style.opacity = 0; return; }
      if (!animate) slider.style.transition = 'none';
      var lr = link.getBoundingClientRect(), nr = navList.getBoundingClientRect();
      slider.style.left = (lr.left - nr.left) + 'px';
      slider.style.width = lr.width + 'px';
      slider.style.top = (lr.bottom - nr.top) + 'px';
      slider.style.bottom = 'auto';
      slider.style.opacity = 1;
      if (!animate) { void slider.offsetWidth; slider.style.transition = ''; }
    };
    var hoverOK = false;   // tabs sliding past a resting pointer must not count as hovers
    navList.querySelectorAll('.nav-link').forEach(function (a) {
      a.addEventListener('mouseenter', function () { if (hoverOK) moveTo(a, true); });
      a.addEventListener('focus', function () { if (hoverOK) moveTo(a, true); });
    });
    navList.addEventListener('mouseleave', function () { if (hoverOK) moveTo(rest, true); });
    window.addEventListener('resize', function () { moveTo(rest, false); });

    var slideNav = function () {
      hoverOK = false;
      navList.classList.remove('sliding');
      slider.style.opacity = 0;
      void navList.offsetWidth;
      navList.classList.add('sliding');
      // Place the underline once the last tab has landed (not on a guess at the timing)
      var done = false;
      var landed = function () {
        if (done) return;
        done = true; moveTo(rest, false); hoverOK = true;
        var mtn = navList.querySelector('.mtn-link');   // the mountain sketches itself once as the tabs land
        if (mtn && !mtn.classList.contains('mtn-text')) { mtn.classList.add('sketching'); setTimeout(function () { mtn.classList.remove('sketching'); }, 2200); }
      };
      items[0].addEventListener('animationend', landed, { once: true });
      var still = matchMedia('(prefers-reduced-motion: reduce), (max-width: 54rem)').matches;
      setTimeout(landed, still ? 50 : 2500);
    };
    window.__slideNav = slideNav;
    if (veilIn && !calm) setTimeout(slideNav, 250); else slideNav();
  }

  // Mobile menu: a frosted panel that slides in from the side
  var toggle = document.querySelector('.menu-toggle');
  var list = document.querySelector('.nav-list');
  if (toggle && list) {
    var icon = toggle.querySelector('path');
    var setMenu = function (open) {
      list.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open);
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (icon) icon.setAttribute('d', open ? 'M6 6l12 12M18 6L6 18' : 'M3 6h18M3 12h18M3 18h18');
    };
    toggle.setAttribute('aria-label', 'Open menu');
    toggle.addEventListener('click', function () { setMenu(!list.classList.contains('open')); });
    document.addEventListener('click', function (e) {   // tap outside the panel closes it
      if (list.classList.contains('open') && !list.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && list.classList.contains('open')) { setMenu(false); toggle.focus(); }
    });
    list.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  }

  // Profile photo: use assets/img/profile.jpg if present, else keep initials
  var photo = document.querySelector('.hero-photo');
  var placeholder = document.querySelector('.hero-photo-placeholder');
  if (photo && placeholder) {
    var showPhoto = function () { placeholder.style.display = 'none'; photo.style.display = 'block'; };
    var showInitials = function () { photo.style.display = 'none'; placeholder.style.display = 'flex'; };
    photo.addEventListener('error', showInitials);
    photo.addEventListener('load', showPhoto);
    // A cached image can finish loading before these listeners exist, so check now too
    if (photo.complete) { if (photo.naturalWidth > 0) showPhoto(); else showInitials(); }
  }

  // Logo: draw on load, redraw on hover / focus / click
  var mark = document.querySelector('.logo-mark');
  var brand = document.querySelector('.brand');
  if (mark && brand) {
    var replay = function () {
      mark.classList.remove('draw');
      void mark.getBoundingClientRect();
      mark.classList.add('draw');
    };
    if (veilIn && !calm) setTimeout(replay, 200); else replay();
    window.__replayLogo = replay;
    var busy = false;
    var guarded = function () {
      if (busy) return;
      busy = true;
      replay();
      setTimeout(function () { busy = false; }, 1500);
    };
    brand.addEventListener('mouseenter', guarded);
    brand.addEventListener('focus', guarded);
    brand.addEventListener('click', replay);
  }

  // Carousel
  var track = document.querySelector('.carousel-track');
  var slidesFound = track ? track.querySelectorAll('.slide').length : 0;
  if (track && slidesFound < 2) {   // nothing to page through: hide the controls
    var ctr = document.querySelector('.carousel-controls');
    if (ctr) ctr.hidden = true;
  }
  if (track && slidesFound >= 2) {
    var slides = track.querySelectorAll('.slide');
    var dotsBox = document.querySelector('.car-dots');
    var count = document.querySelector('.car-count');
    var current = 0;
    var dots = [];
    for (var si = 0; si < slides.length; si++) {
      (function (i) {
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'car-dot';
        d.setAttribute('role', 'tab');
        d.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        d.addEventListener('click', function () { go(i); });
        dotsBox.appendChild(d);
        dots.push(d);
        slides[i].setAttribute('aria-label', (i + 1) + ' of ' + slides.length);
      })(si);
    }
    var markDot = function (i) {
      current = i;
      dots.forEach(function (d, n) { d.classList.toggle('active', n === i); d.setAttribute('aria-selected', n === i); });
      if (count) count.textContent = (i + 1) + ' / ' + slides.length;
    };
    var go = function (i) {
      i = (i + slides.length) % slides.length;   // wraps round at either end
      track.scrollTo({ left: slides[i].offsetLeft - (parseFloat(getComputedStyle(track).paddingLeft) || 0), behavior: calm ? 'auto' : 'smooth' });
      markDot(i);
    };
    var ticking = false;
    track.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var step = slides[0].offsetWidth + 16;
        var i = Math.min(slides.length - 1, Math.max(0, Math.round(track.scrollLeft / step)));
        if (i !== current) markDot(i);
      });
    }, { passive: true });
    document.querySelector('.car-prev').addEventListener('click', function () { go(current - 1); });
    document.querySelector('.car-next').addEventListener('click', function () { go(current + 1); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
    });
    markDot(0);
  }

  // Scroll reveal: sections ease in as they come into view
  if (!calm && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll(
      '.hero, .strip-label, .strip-item, .callout, main .section, .page-title, .page-lede, .eyebrow + .page-title, ' +
      '.entry, .cv-bar, .cv-sheet, .two-col > div, .two-col > aside'
    );
    var seen = new Set();
    var io = new IntersectionObserver(function (entries) {
      var base = veilIn ? 300 : 0;
      entries
        .filter(function (en) { return en.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; })
        .forEach(function (en, order) {
        var el = en.target;
        io.unobserve(el);
        var delay = base + order * 65;
        setTimeout(function () {
          el.classList.add('in');
          setTimeout(function () { el.classList.remove('reveal', 'in'); }, 700);   // hand hover transitions back
        }, delay);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    Array.prototype.forEach.call(targets, function (el, n) {
      if (seen.has(el)) return;
      seen.add(el);
      // a gentle stagger for siblings that appear together, like the four focus tiles
      var sibs = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, function (c) { return c.className === el.className; }) : [];
      var idx = sibs.indexOf(el);
      if (idx > 0 && (el.classList.contains('strip-item'))) el.setAttribute('data-delay', idx * 90);
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  // Expandable entries (Experience and CV): click a role to drop its details down
  var accMain = document.querySelector('main[data-accordion]');
  if (/[?&]print\b/.test(location.search)) accMain = null;   // ?print: plain, fully visible page (used to build the PDF)
  if (accMain) {
    var accItems = [];
    var accUid = 0;
    var chevron = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

    // content: element whose children are [heading parts..., details...]; heads: the parts that stay visible
    var makeAcc = function (item, content, heads) {
      var rest = Array.prototype.filter.call(content.children, function (c) { return heads.indexOf(c) < 0; });
      if (!rest.length) return;
      var id = 'acc-' + (++accUid);
      var head = document.createElement('div');
      head.className = 'acc-head';
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');
      head.setAttribute('aria-expanded', 'false');
      head.setAttribute('aria-controls', id);
      var title = document.createElement('div');
      title.className = 'acc-title';
      heads.forEach(function (h) { title.appendChild(h); });
      var chev = document.createElement('span');
      chev.className = 'acc-chev';
      chev.setAttribute('aria-hidden', 'true');
      chev.innerHTML = chevron;
      head.appendChild(title);
      head.appendChild(chev);
      var body = document.createElement('div');
      body.className = 'acc-body';
      body.id = id;
      var inner = document.createElement('div');
      inner.className = 'acc-inner';
      rest.forEach(function (r) { inner.appendChild(r); });
      body.appendChild(inner);
      content.insertBefore(body, content.firstChild);
      content.insertBefore(head, body);
      item.classList.add('acc-item');
      var toggle = function (force) {
        var open = typeof force === 'boolean' ? force : !item.classList.contains('acc-open');
        item.classList.toggle('acc-open', open);
        head.setAttribute('aria-expanded', open);
      };
      head.addEventListener('click', function () { toggle(); });
      head.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
      var meta = item.querySelector('.entry-meta');
      if (meta) { meta.classList.add('acc-meta'); meta.addEventListener('click', function () { toggle(); }); }
      accItems.push({ item: item, toggle: toggle });
      return toggle;
    };

    var firstOpen = [];
    // Experience page: each .entry is [meta | content]
    accMain.querySelectorAll('.entry').forEach(function (entry, n) {
      var content = entry.children[1];
      if (!content) return;
      var t = makeAcc(entry, content, [content.querySelector('h2, h3'), content.querySelector('.org')].filter(Boolean));
      if (t && n === 0) firstOpen.push(t);
    });
    // CV page: each .cv-item is [row, sub, details...]; the first of each section starts open
    var seenInSection = false;
    var sheet = accMain.querySelector('.cv-sheet');
    if (sheet) {
      Array.prototype.forEach.call(sheet.children, function (el) {
        if (el.tagName === 'H2') { seenInSection = false; return; }
        if (!el.classList.contains('cv-item')) return;
        var row = el.querySelector('.cv-row'), sub = el.querySelector('.cv-sub');
        if (!row || !sub) return;
        var t = makeAcc(el, el, [row, sub]);
        if (t && !seenInSection) { firstOpen.push(t); seenInSection = true; }
      });
    }
    firstOpen.forEach(function (t) { t(true); });

    // Expand all / collapse all
    if (accItems.length > 1) {
      var tools = document.createElement('div');
      tools.className = 'acc-tools';
      var allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = 'acc-all';
      var refresh = function () {
        var allOpen = accItems.every(function (a) { return a.item.classList.contains('acc-open'); });
        allBtn.textContent = allOpen ? 'Collapse all' : 'Expand all';
      };
      allBtn.addEventListener('click', function () {
        var allOpen = accItems.every(function (a) { return a.item.classList.contains('acc-open'); });
        accItems.forEach(function (a) { a.toggle(!allOpen); });
        refresh();
      });
      accItems.forEach(function (a) { a.item.addEventListener('click', function () { setTimeout(refresh, 0); }); });
      refresh();
      tools.appendChild(allBtn);
      var anchor = sheet ? sheet.firstElementChild : accMain.querySelector('.entry');
      (sheet || accMain).insertBefore(tools, anchor);
    }
  }

  // Save7 mark: assemble when the card scrolls into view
  var s7 = document.querySelector('.save7-mark');
  if (s7) {
    if (calm || !('IntersectionObserver' in window)) { s7.classList.add('play'); }
    else {
      var s7io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { setTimeout(function () { s7.classList.add('play'); }, veilIn ? 650 : 250); s7io.disconnect(); }
      }, { threshold: 0.6 });
      s7io.observe(s7);
    }
  }

  // Focus icons replay once per hover-in: alternate between two copies of each animation
  if (!calm && window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.strip-item').forEach(function (row) {
      row.addEventListener('mouseenter', function () { row.classList.toggle('alt'); });
    });
  }
  // Back to top
  var btt = document.querySelector('.back-to-top');
  if (btt) {
    window.addEventListener('scroll', function () {
      btt.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
    btt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' }); });
  }
})();

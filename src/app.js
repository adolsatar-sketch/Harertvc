/* استوديو دقيقة — سلوك العرض التفاعلي. بلا مكتبات خارجية. */
(function () {
  'use strict';

  var doc = document, root = doc.documentElement;
  window.__smReady = true;
  var calm = false;
  try { calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var DATA = JSON.parse(doc.getElementById('sb-data').textContent);
  var SHOTS = DATA.shots;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ------------------------------------------------------------------ الانترو */
  var intro = $('#intro'), skipBtn = $('#intro-skip'), introTimer = null, introDone = false;
  function endIntro(fast) {
    if (introDone || !root.classList.contains('has-intro')) return;
    introDone = true;
    clearTimeout(introTimer);
    try { sessionStorage.setItem('sm-intro', '1'); } catch (e) {}
    intro.classList.add('is-out');
    if (fast) intro.classList.add('is-fast');
    var finish = function () {
      root.classList.remove('has-intro');
      intro.classList.remove('is-out', 'is-fast');
    };
    intro.addEventListener('animationend', function h(e) {
      if (e.target !== intro) return;
      intro.removeEventListener('animationend', h);
      finish();
    });
    setTimeout(finish, 800); // احتياط إذا لم تُطلق الحركة حدثها
  }
  function startIntro() {
    introDone = false;
    root.classList.add('has-intro');
    introTimer = setTimeout(function () { endIntro(false); }, 2800);
  }
  if (root.classList.contains('has-intro')) {
    introTimer = setTimeout(function () { endIntro(false); }, 2800);
  }
  skipBtn.addEventListener('click', function () { endIntro(true); });
  doc.addEventListener('keydown', function (e) {
    if (root.classList.contains('has-intro') && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); endIntro(true);
    }
  });
  var replay = $('#replay-intro');
  if (replay) replay.addEventListener('click', function () {
    if (calm) return;
    window.scrollTo(0, 0);
    root.classList.remove('has-intro');
    void intro.offsetWidth; // إعادة تشغيل الحركات
    startIntro();
  });
  if (calm && replay) replay.hidden = true;

  /* --------------------------------------------------------- تمرير لعنصر */
  function goTo(id, opts) {
    var t = doc.getElementById(id);
    if (!t) return;
    t.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    if (history.pushState) history.pushState(null, '', '#' + id); else location.hash = id;
    if (!opts || opts.focus !== false) {
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); }
    }
  }

  /* -------------------------------------------------------- القوائم المنبثقة */
  function wireDialog(dlg) {
    dlg.addEventListener('click', function (e) {
      if (e.target !== dlg) return;
      var r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
    });
    $$('[data-close]', dlg).forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
    $$('a[href^="#"]', dlg).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var id = a.getAttribute('href').slice(1);
        dlg.close();
        setTimeout(function () { goTo(id); }, 10);
      });
    });
  }
  var idxDlg = $('#index-dlg'), menuDlg = $('#menu-dlg');
  [idxDlg, menuDlg].forEach(function (d) { if (d) wireDialog(d); });
  $$('[data-open="index"]').forEach(function (b) {
    b.addEventListener('click', function () {
      idxDlg.showModal();
      var cur = $('a[aria-current="true"]', idxDlg);
      if (cur) cur.scrollIntoView({ block: 'center' });
    });
  });
  $$('[data-open="menu"]').forEach(function (b) { b.addEventListener('click', function () { menuDlg.showModal(); }); });

  /* ------------------------------------------------------------- المكبّر */
  var lb = $('#lightbox'), lbImg = $('#lb-img'), lbTitle = $('#lb-title'), lbSub = $('#lb-sub'),
      lbCount = $('#lb-count'), lbLink = $('#lb-link');
  var gallery = [], gi = 0;
  function collect(name) {
    return $$('.zoom[data-gallery="' + name + '"]:not([data-alias])').map(function (b) {
      var t = b.querySelector('img');
      return { src: b.getAttribute('data-full'), alt: (t || {}).alt || '',
               ar: t && t.getAttribute('width') ? (+t.getAttribute('width') / +t.getAttribute('height')) : 1.78,
               title: b.getAttribute('data-title') || '', sub: b.getAttribute('data-sub') || '',
               href: b.getAttribute('data-href') || '' };
    });
  }
  function showLb(i) {
    gi = (i + gallery.length) % gallery.length;
    var it = gallery[gi];
    lbImg.style.setProperty('--ar', it.ar);
    lbImg.src = it.src; lbImg.alt = it.alt;
    lbTitle.textContent = it.title; lbSub.textContent = it.sub;
    lbCount.textContent = (gi + 1) + ' / ' + gallery.length;
    if (it.href) { lbLink.hidden = false; lbLink.setAttribute('href', it.href); } else { lbLink.hidden = true; }
    var multi = gallery.length > 1;
    $$('.lb__nav', lb).forEach(function (n) { n.hidden = !multi; });
    // تحميل مسبق للمجاور
    [gi + 1, gi - 1].forEach(function (k) {
      var n = gallery[(k + gallery.length) % gallery.length]; if (n) { var im = new Image(); im.src = n.src; }
    });
  }
  function openLb(name, i) {
    gallery = collect(name);
    if (!gallery.length) return;
    showLb(i);
    lb.showModal();
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.zoom[data-gallery]');
    if (!b) return;
    e.preventDefault();
    var name = b.getAttribute('data-gallery');
    // صور الواجهة (data-alias) تفتح المعرض نفسه عند رقم اللقطة المقابلة
    var list = $$('.zoom[data-gallery="' + name + '"]:not([data-alias])');
    openLb(name, b.hasAttribute('data-alias') ? +b.getAttribute('data-alias') : list.indexOf(b));
  });
  $('#lb-next').addEventListener('click', function () { showLb(gi + 1); });
  $('#lb-prev').addEventListener('click', function () { showLb(gi - 1); });
  $$('[data-close]', lb).forEach(function (b) { b.addEventListener('click', function () { lb.close(); }); });
  lbLink.addEventListener('click', function (e) {
    e.preventDefault(); var id = lbLink.getAttribute('href').slice(1); lb.close(); setTimeout(function () { goTo(id); }, 10);
  });
  lb.addEventListener('keydown', function (e) {
    // اتجاه القراءة من اليمين لليسار: السهم الأيسر = التالي
    if (e.key === 'ArrowLeft') { e.preventDefault(); showLb(gi + 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); showLb(gi - 1); }
  });
  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target.classList.contains('lb__stage')) lb.close();
  });
  var tx = null, ty = null;
  lb.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; tx = ty = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.3 && gallery.length > 1) showLb(dx > 0 ? gi + 1 : gi - 1);
  }, { passive: true });

  /* --------------------------------------------- القسم الحالي في الهيدر */
  var navLinks = $$('.nav a');
  if ('IntersectionObserver' in window) {
    var secIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        navLinks.forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('href') === '#' + id ? 'true' : 'false'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = doc.getElementById(a.getAttribute('href').slice(1)); if (s) secIO.observe(s); });
  }

  /* ------------------------------------------- اللقطة الحالية والفهرس */
  function markShot(n) {
    var id = 'shot-' + pad2(n);
    $$('.sb-index__chips a, .idx a').forEach(function (a) {
      a.setAttribute('aria-current', a.getAttribute('href') === '#' + id ? 'true' : 'false');
    });
  }
  if ('IntersectionObserver' in window) {
    var shotIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) markShot(+en.target.getAttribute('data-n')); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('.shot').forEach(function (s) { shotIO.observe(s); });
  }

  /* --------------------------------------------- فلتر المؤديات */
  var chips = $$('.filters .chip'), roles = $$('.role');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var who = c.getAttribute('data-performer');
      var on = c.getAttribute('aria-pressed') !== 'true' && who !== '*';
      chips.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      if (on) c.setAttribute('aria-pressed', 'true'); else $('.filters .chip[data-performer="*"]').setAttribute('aria-pressed', 'true');
      roles.forEach(function (r) {
        var hit = on && r.getAttribute('data-performer') === who;
        r.classList.toggle('is-hit', hit);
        r.classList.toggle('is-dim', on && !hit);
      });
      var live = $('#filter-live');
      if (live) live.textContent = on ? ('أدوار ' + who + ': ' + roles.filter(function (r) { return r.getAttribute('data-performer') === who; }).map(function (r) { return r.getAttribute('data-role'); }).join('، ')) : 'كل الأدوار';
    });
  });

  /* --------------------------------------------- معاينة الإيقاع (أنيماتيك) */
  var P = $('#player');
  if (P) (function () {
    var img = $('#pl-img'), num = $('#pl-num'), dur = $('#pl-dur'), tc = $('#pl-tc'), sub = $('#pl-sub'),
        title = $('#pl-title'), group = $('#pl-group'), frame = $('#pl-frame'), lens = $('#pl-lens'), sound = $('#pl-sound'),
        go = $('#pl-go'), playBtn = $('#pl-play'), segs = $$('.tl__seg', P), live = $('#pl-live');
    var starts = [], total = 0;
    SHOTS.forEach(function (s) { starts.push(total); total += s.seconds; });
    var idx = 0, el = 0, playing = false, last = 0, raf = 0, preloaded = false;

    function fmt(sec) {
      var m = Math.floor(sec / 60), s = sec - m * 60;
      return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
    }
    function lineHTML(s) {
      if (!s.dialogue.length) return '<small>— بدون حوار —</small>';
      return s.dialogue.map(function (d) {
        return '<small>' + esc(d.speaker) + '</small><p>' + esc(d.line) + '</p>';
      }).join('');
    }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function render(announce) {
      var s = SHOTS[idx];
      img.src = s.image; img.alt = s.alt;
      num.textContent = pad2(s.n); dur.textContent = s.durationLabel;
      title.textContent = s.title; group.textContent = s.group;
      frame.innerHTML = s.frameHTML; lens.innerHTML = s.lensHTML; sound.innerHTML = s.soundHTML;
      sub.innerHTML = lineHTML(s);
      go.setAttribute('href', '#shot-' + pad2(s.n));
      segs.forEach(function (g, i) {
        g.setAttribute('aria-current', i === idx ? 'true' : 'false');
        g.querySelector('.fill').style.width = i < idx ? '100%' : '0%';
      });
      tick();
      if (announce && live) live.textContent = 'اللقطة ' + pad2(s.n) + ': ' + s.title;
    }
    function tick() {
      var s = SHOTS[idx];
      tc.textContent = fmt(starts[idx] + el) + ' / ' + fmt(total);
      var f = segs[idx] && segs[idx].querySelector('.fill');
      if (f) f.style.width = Math.min(100, (el / s.seconds) * 100) + '%';
    }
    function setPlaying(v) {
      playing = v;
      playBtn.setAttribute('aria-pressed', v ? 'true' : 'false');
      playBtn.setAttribute('aria-label', v ? 'إيقاف مؤقت' : 'تشغيل معاينة الإيقاع');
      $('.i-play', playBtn).style.display = v ? 'none' : '';
      $('.i-pause', playBtn).style.display = v ? '' : 'none';
      if (v) {
        if (!preloaded) { SHOTS.forEach(function (s) { var im = new Image(); im.src = s.image; }); preloaded = true; }
        last = performance.now(); raf = requestAnimationFrame(loop);
      } else cancelAnimationFrame(raf);
    }
    function loop(now) {
      var dt = Math.min(0.25, (now - last) / 1000); last = now;
      el += dt;
      if (el >= SHOTS[idx].seconds) {
        if (idx < SHOTS.length - 1) { el = 0; idx++; render(false); }
        else { el = SHOTS[idx].seconds; tick(); setPlaying(false); return; }
      } else tick();
      if (playing) raf = requestAnimationFrame(loop);
    }
    function jump(i, keep) {
      idx = Math.max(0, Math.min(SHOTS.length - 1, i)); el = 0; render(!playing);
      if (!keep && playing) { last = performance.now(); }
    }
    playBtn.addEventListener('click', function () {
      if (!playing && idx === SHOTS.length - 1 && el >= SHOTS[idx].seconds - 0.01) { idx = 0; el = 0; render(false); }
      setPlaying(!playing);
    });
    $('#pl-next').addEventListener('click', function () { jump(idx + 1); });
    $('#pl-prev').addEventListener('click', function () { jump(el > 0.6 ? idx : idx - 1); });
    segs.forEach(function (g, i) { g.addEventListener('click', function () { jump(i); }); });
    go.addEventListener('click', function (e) { e.preventDefault(); setPlaying(false); goTo(go.getAttribute('href').slice(1)); });
    doc.addEventListener('visibilitychange', function () { if (doc.hidden && playing) setPlaying(false); });
    render(false);
  })();

  /* --------------------------------------------- الأصول المعتمدة (config.js) */
  var A = window.STORYBOARD_ASSETS || {};
  $$('[data-slot]').forEach(function (s) {
    var key = s.getAttribute('data-slot'), v = A[key];
    if (Array.isArray(v)) v = v[0];
    if (!v || typeof v !== 'string') return;
    var label = (s.querySelector('b') || {}).textContent || '';
    s.classList.add('is-filled');
    s.innerHTML = '';
    var im = new Image(); im.src = v; im.alt = label; im.loading = 'lazy';
    s.appendChild(im);
  });
  if (A.harirLogo) {
    var lock = $('#harir-lockup');
    if (lock) { var li = new Image(); li.src = A.harirLogo; li.alt = 'شعار حرير'; lock.appendChild(li); lock.hidden = false; }
  }

  /* --------------------------------------------- ظهور تدريجي عند التمرير */
  if (root.classList.contains('motion') && 'IntersectionObserver' in window) {
    var rv = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); rv.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.rv').forEach(function (el) { rv.observe(el); });
  } else {
    $$('.rv').forEach(function (el) { el.classList.add('is-in'); });
  }
})();

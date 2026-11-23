// فحص آلي للعرض: الصور، الحوار، الروابط الداخلية، الانترو، المكبّر، الفهرس، المعاينة، والتجاوب.
// التشغيل: node src/verify.cjs [url]   (يتطلب Playwright و Chromium)
// بدون url يُفتح index.html مباشرة من القرص.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const URL = process.argv[2] || 'file://' + path.join(ROOT, 'index.html');
const C = JSON.parse(fs.readFileSync(path.join(__dirname, 'content.json'), 'utf8'));
const norm = s => String(s).replace(/[ً-ْـ]/g, '').replace(/\s+/g, ' ').trim();

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) fails++; };

(async () => {
  const b = await chromium.launch();
  const errors = [];
  const watch = p => {
    p.on('pageerror', e => errors.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    p.on('requestfailed', r => errors.push('requestfailed: ' + r.url()));
  };

  console.log('المحتوى والصور');
  let ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  let p = await ctx.newPage(); watch(p);
  await p.goto(URL, { waitUntil: 'load' });
  await p.evaluate(() => document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; }));
  await p.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 20000 });
  const dom = await p.evaluate(() => ({
    shots: [...document.querySelectorAll('article.shot')].map(a => ({
      n: +a.dataset.n, id: a.id, img: a.querySelector('.shot__media img').getAttribute('src'),
      w: a.querySelector('.shot__media img').naturalWidth, text: a.innerText,
    })),
    broken: [...document.images].filter(i => !i.naturalWidth && i.getAttribute('src')).map(i => i.getAttribute('src')),
    anchors: [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.getElementById(h.slice(1))),
    ext: [...document.querySelectorAll('a[href^="http"]')].map(a => a.href),
    body: document.body.innerText,
    hasIntro: document.documentElement.classList.contains('has-intro'),
  }));
  ok(dom.shots.length === 29, `29 بطاقة لقطة (وُجد ${dom.shots.length})`);
  ok(dom.shots.every((s, i) => s.n === i + 1 && s.id === `shot-${String(i + 1).padStart(2, '0')}`), 'الترقيم 01–29 متسلسل');
  ok(new Set(dom.shots.map(s => s.img)).size === 29, 'لكل لقطة صورة مستقلة غير مكررة');
  const hashes = new Set(C.shots.map(s => require('crypto').createHash('md5').update(fs.readFileSync(path.join(ROOT, s.image))).digest('hex')));
  ok(hashes.size === 29, 'ملفات صور اللقطات مختلفة بالمحتوى (لا تكرار بايت ببايت)');
  ok(dom.shots.every(s => s.w > 0), 'كل صور اللقطات حُمّلت');
  ok(dom.broken.length === 0, 'لا صور مكسورة' + (dom.broken.length ? ': ' + dom.broken.join(', ') : ''));
  ok(dom.anchors.length === 0, 'كل الروابط الداخلية تشير إلى عناصر موجودة' + (dom.anchors.length ? ': ' + dom.anchors.join(', ') : ''));
  ok(!dom.hasIntro, 'مع Reduce Motion لا يظهر الانترو');

  let missing = [];
  C.shots.forEach((s, i) => {
    const t = norm(dom.shots[i].text);
    [s.title, s.frame, s.lens, s.sound, s.function].forEach(f => { if (!t.includes(norm(f))) missing.push(`${s.n}: ${f.slice(0, 40)}`); });
    if (s.dialogue.length) s.dialogue.forEach(d => { if (!t.includes(norm(d.line)) || !t.includes(norm(d.speaker))) missing.push(`${s.n} حوار: ${d.line.slice(0, 40)}`); });
    else if (!t.includes(norm(s.dialogueRaw))) missing.push(`${s.n}: ${s.dialogueRaw}`);
  });
  ok(missing.length === 0, 'كل حقول اللقطات وسطور الحوار ظاهرة حرفياً' + (missing.length ? '\n      ' + missing.join('\n      ') : ''));
  const body = norm(dom.body);
  const front = [C.idea.text, ...C.style.bullets, ...C.treatment.paragraphs, ...C.treatment.bullets.map(b => b.replace(/^[^:]+:\s*/, '')), C.continuity.text, C.wardrobe.intro, C.wardrobe.footnote,
    ...C.wardrobe.rows.map(r => r.look), C.location.text, C.location.caption, C.board.text, C.board.caption, C.breakdown.note, ...C.breakdown.rows.flatMap(r => [r.part, r.rhythm]),
    C.storyboard.intro, ...C.soundEdit.bullets, ...C.delivery.bullets, ...C.approvals.bullets, C.references.text];
  const miss2 = front.filter(t => !body.includes(norm(t)));
  ok(miss2.length === 0, 'كل نصوص التريتمنت ظاهرة حرفياً' + (miss2.length ? '\n      ' + miss2.map(t => t.slice(0, 60)).join('\n      ') : ''));
  ok(['https://vt.tiktok.com/ZSsLxqmXm/', 'https://www.instagram.com/mrcoo_56/'].every(u => dom.ext.includes(u)), 'روابط المراجع الخارجية موجودة');

  console.log('التفاعل');
  await p.click('#shot-07 .zoom');
  ok(await p.evaluate(() => document.getElementById('lightbox').open), 'المكبّر يفتح من بطاقة اللقطة');
  ok((await p.textContent('#lb-count')).trim() === '7 / 29', 'المكبّر يبدأ من الصورة الصحيحة');
  await p.keyboard.press('ArrowLeft');
  ok((await p.textContent('#lb-count')).trim() === '8 / 29', 'السهم الأيسر ينتقل للتالي (اتجاه RTL)');
  await p.keyboard.press('Escape');
  ok(!(await p.evaluate(() => document.getElementById('lightbox').open)), 'Esc يغلق المكبّر');
  await p.click('.bar [data-open="index"]');
  ok(await p.evaluate(() => document.getElementById('index-dlg').open), 'فهرس المشاهد يفتح');
  await p.click('#index-dlg a[href="#shot-23"]');
  await p.waitForTimeout(400);
  ok(!(await p.evaluate(() => document.getElementById('index-dlg').open)) && (await p.evaluate(() => location.hash)) === '#shot-23', 'الضغط على لقطة في الفهرس ينقل إليها ويغلقه');
  const top = await p.evaluate(() => document.getElementById('shot-23').getBoundingClientRect().top);
  ok(top >= 0 && top < 200, `بطاقة اللقطة ظاهرة أسفل الهيدر (top=${Math.round(top)})`);
  await p.click('.tl__seg:nth-child(10)');
  ok((await p.textContent('#pl-num')).trim() === '10', 'الخط الزمني ينقل المعاينة للقطة المختارة');
  await p.click('#pl-play');
  await p.waitForTimeout(2800);
  ok((await p.textContent('#pl-num')).trim() === '11', 'المعاينة تتقدم حسب مدة اللقطة (2.5ث)');
  await p.click('#pl-play');
  await p.click('.filters .chip[data-performer="غادة"]');
  ok(await p.evaluate(() => [...document.querySelectorAll('.role.is-hit')].map(r => r.dataset.role).join(',')) === '1,8', 'فلتر غادة يبرز الدورين 1 و8');
  await ctx.close();

  console.log('الانترو');
  ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  p = await ctx.newPage(); watch(p);
  await p.goto(URL);
  ok(await p.evaluate(() => document.documentElement.classList.contains('has-intro')), 'الانترو يظهر عند السماح بالحركة');
  await p.waitForTimeout(3600);
  ok(!(await p.evaluate(() => document.documentElement.classList.contains('has-intro'))), 'الانترو ينتهي تلقائياً بعد 2.8ث');
  await p.evaluate(() => sessionStorage.clear());
  await p.reload();
  await p.click('#intro-skip');
  await p.waitForTimeout(500);
  ok(!(await p.evaluate(() => document.documentElement.classList.contains('has-intro'))), 'زر التخطي ينهي الانترو فوراً');
  await ctx.close();

  console.log('التجاوب');
  for (const w of [320, 375, 390, 768, 1024, 1440]) {
    ctx = await b.newContext({ viewport: { width: w, height: 800 }, reducedMotion: 'reduce' });
    p = await ctx.newPage(); watch(p);
    await p.goto(URL, { waitUntil: 'load' });
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(sw <= w, `لا تمرير أفقي عند ${w}px (scrollWidth=${sw})`);
    await ctx.close();
  }

  const real = errors.filter(e => !/favicon/.test(e));
  ok(real.length === 0, 'لا أخطاء في الكونسول أو طلبات فاشلة' + (real.length ? '\n      ' + [...new Set(real)].join('\n      ') : ''));
  await b.close();
  console.log(fails ? `\n${fails} فحص فشل` : '\nكل الفحوص نجحت');
  process.exit(fails ? 1 : 0);
})();

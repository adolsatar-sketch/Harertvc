// يبني index.html من src/content.json + src/styles.css + src/app.js
// التشغيل:  node src/build.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SRC, '..');
const C = JSON.parse(readFileSync(join(SRC, 'content.json'), 'utf8'));
// الخطوط تُضمَّن داخل الصفحة (data URI) حتى تعمل عند فتح الملف مباشرة من القرص أيضاً
const CSS = readFileSync(join(SRC, 'styles.css'), 'utf8').replace(/url\("(assets\/fonts\/[^"]+\.woff2)"\)/g,
  (m, p) => `url(data:font/woff2;base64,${readFileSync(join(ROOT, p)).toString('base64')})`);
const JS = readFileSync(join(SRC, 'app.js'), 'utf8');

/* ------------------------------------------------------------ أدوات النص */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad2 = n => String(n).padStart(2, '0');
const secLabel = n => `${Number.isInteger(n) ? n : n.toFixed(1)}ث`;
const fmtTC = sec => { const m = Math.floor(sec / 60), s = sec - m * 60; return `${m}:${String(Math.floor(s)).padStart(2, '0')}`; };

// نص غني: روابط، خانات ناقصة [..]، وعزل المقاطع اللاتينية التقنية باتجاه LTR
const LTR_RUN = /[A-Za-z0-9][A-Za-z0-9 .:;\/|×+\-–%°()'’&]*[A-Za-z0-9)%]|[A-Za-z]/g;
function ltrWrap(plain) {
  let out = '', last = 0;
  plain.replace(LTR_RUN, (m, off) => {
    if (!/[A-Za-z]/.test(m)) return m;
    out += esc(plain.slice(last, off)) + `<bdi dir="ltr">${esc(m)}</bdi>`;
    last = off + m.length;
    return m;
  });
  return out + esc(plain.slice(last));
}
function rich(s) {
  const parts = String(s ?? '').split(/(https?:\/\/[^\s،]+|instagram\.com\/[A-Za-z0-9_.\/]+|\[[^\]]+\])/g);
  return parts.map(p => {
    if (!p) return '';
    if (/^https?:\/\//.test(p) || /^instagram\.com\//.test(p)) {
      const clean = p.replace(/[.،]+$/, '');
      const tail = p.slice(clean.length);
      const href = clean.startsWith('http') ? clean : `https://www.${clean}`;
      return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" dir="ltr">${esc(clean)}</a>${esc(tail)}`;
    }
    if (/^\[[^\]]+\]$/.test(p)) return `<span class="ph" title="معلومة بانتظار الاعتماد">${esc(p)}</span>`;
    return ltrWrap(p);
  }).join('');
}
const splitLabel = t => { const m = String(t).match(/^([^:：]{2,24})[:：]\s*(.+)$/s); return m ? [m[1].trim(), m[2].trim()] : [null, t]; };

const ICON = {
  zoom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8.5v5M8.5 11h5"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  play: '<svg class="i-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg>',
  pause: '<svg class="i-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="display:none"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
  // في واجهة RTL: «التالي» يشير لليسار و«السابق» لليمين
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  asset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 15l4.5-4.5 4 4 3-3 5.5 5.5"/><circle cx="15.5" cy="9" r="1.6"/></svg>',
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 6h14M12 6v13M8.5 19h7"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg>',
};

/* ------------------------------------------------------------ بيانات مشتقة */
const SHOTS = C.shots.slice().sort((a, b) => a.n - b.n);
if (SHOTS.length !== 29 || SHOTS.some((s, i) => s.n !== i + 1)) throw new Error('expected shots 1..29');
const imgSet = new Set();
SHOTS.forEach(s => {
  if (!s.image) throw new Error(`shot ${s.n} has no image`);
  if (imgSet.has(s.image)) throw new Error(`image reused: ${s.image}`);
  imgSet.add(s.image);
  if (!existsSync(join(ROOT, s.image))) throw new Error(`missing file ${s.image}`);
});
const GROUPS = C.storyboard.groups.map((g, i) => ({ ...g, i: i + 1, shots: SHOTS.filter(s => s.n >= g.from && s.n <= g.to) }));
GROUPS.forEach(g => { g.seconds = g.shots.reduce((a, s) => a + s.seconds, 0); });
const groupOf = n => GROUPS.find(g => n >= g.from && n <= g.to);
let acc = 0;
SHOTS.forEach(s => { s.start = acc; acc += s.seconds; });
const TOTAL = acc;

// من يتكلم في أي لقطة (الأدوار من خريطة الملابس)
const roleShots = {};
const marcoShots = [];
SHOTS.forEach(s => (s.dialogue || []).forEach(d => {
  const m = d.speaker.match(/البنت\s*(\d+)/);
  if (m) (roleShots[m[1]] ||= new Set()).add(s.n);
  if (/ماركو/.test(d.speaker)) marcoShots.push(s.n);
}));
const performers = [];
C.wardrobe.rows.forEach(r => { if (!performers.includes(r.performer)) performers.push(r.performer); });

const shotLinks = ns => [...new Set(ns)].sort((a, b) => a - b).map(n => `<a class="shot-link" href="#shot-${pad2(n)}" aria-label="اللقطة ${pad2(n)}">${pad2(n)}</a>`).join('');

/* ------------------------------------------------------------ أجزاء الصفحة */
const navItems = [
  ['idea', 'الفكرة'], ['treatment', 'المعالجة'], ['cast', 'الشخصيات'], ['location', 'القاعة'],
  ['rhythm', 'الإيقاع'], ['storyboard', 'الستوري بورد'], ['post', 'الصوت والتسليم'], ['approvals', 'الاعتمادات'],
];

const hero = () => {
  const [pre, main] = (() => { const t = C.meta.title; const i = t.indexOf('إعلان'); return i > 0 ? [t.slice(0, i).trim(), t.slice(i).trim()] : ['', t]; })();
  const pick = [2, 8, 27].map(n => SHOTS[n - 1]);
  return `
<section class="hero on-dark" id="top" aria-labelledby="t-hero">
  <div class="wrap hero__grid">
    <div>
      <p class="hero__studio"><i aria-hidden="true"></i>${esc(C.meta.studio)}</p>
      <h1 id="t-hero"><span class="pre">${esc(pre)}</span><em>${esc(main)}</em></h1>
      <p class="hero__sub">${esc(C.meta.subtitle)}</p>
      <ul class="hero__meta">${C.meta.line1.split('|').map(x => `<li>${rich(x.trim())}</li>`).join('')}</ul>
      <ul class="hero__meta">${C.meta.line2.split('|').map(x => `<li>${rich(x.trim())}</li>`).join('')}</ul>
      <p class="hero__credit">${(() => { const [a, b] = splitLabel(C.meta.credit); return a ? `${esc(a)}: <b>${esc(b)}</b>` : esc(C.meta.credit); })()}</p>
      <div class="hero__lockup" id="harir-lockup" hidden><span class="muted">×</span></div>
      <div class="facts" role="list">
        <div role="listitem"><b>${SHOTS.length}</b><span>لقطة في الستوري بورد</span></div>
        <div role="listitem"><b>بين 60 و70 ث</b><span>الهدف بعد بروفة الأداء</span></div>
        <div role="listitem"><b><bdi dir="ltr">9:16</bdi></b><span>تصوير عمودي لريلز إنستغرام</span></div>
        <div role="listitem"><b>قاعة واحدة</b><span>كل التصوير الحي داخل قاعة الاجتماعات</span></div>
      </div>
      <div class="hero__cta">
        <a class="btn btn--red" href="#storyboard">افتح الستوري بورد</a>
        <a class="btn btn--ghost" href="#rhythm">معاينة الإيقاع</a>
      </div>
    </div>
    <div class="mosaic">
      ${pick.map(s => `<figure>
        <button class="zoom" type="button" data-gallery="shots" data-alias="${s.n - 1}" data-full="${esc(s.image)}" aria-label="تكبير صورة اللقطة ${pad2(s.n)}: ${esc(s.title)}"><img src="${esc(s.image)}" alt="${esc(s.alt)}" width="${s.w}" height="${s.h}" ${s.n === 2 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></button>
        <a class="tag" href="#shot-${pad2(s.n)}" aria-label="انتقل إلى اللقطة ${pad2(s.n)}">${pad2(s.n)}</a>
        <figcaption>${esc(s.title)}</figcaption>
      </figure>`).join('')}
      <p class="mosaic__note">صور مرجعية توضيحية للتكوين واللبس والموقع، وليست صوراً نهائية للكاست أو للسيارة أو لواجهة حرير.</p>
    </div>
  </div>
</section>`;
};

const ideaSec = () => {
  const text = C.idea.text;
  const cut = text.indexOf('.') + 1;
  const first = text.slice(0, cut), rest = text.slice(cut).trim();
  return `
<section class="sec on-ivory" id="idea" aria-labelledby="t-idea">
  <div class="wrap split">
    <div class="rv">
      <p class="kicker"><span class="no">01</span></p>
      <h2 class="h2" id="t-idea">${esc(C.idea.heading)}</h2>
      <p class="idea-quote">${rich(first)}</p>
    </div>
    <div class="prose idea-body rv"><p>${rich(rest)}</p></div>
  </div>
</section>`;
};

const treatmentSec = () => {
  const specs = ['Sony FX6 / FX3', '9:16', '4K · 24fps', 'Shutter 1/48', 'S-Log3 / S-Gamut3.Cine', '3200K–4300K'];
  return `
<section class="sec on-white" id="treatment" aria-labelledby="t-style">
  <div class="wrap">
    <div class="split">
      <div class="rv">
        <p class="kicker"><span class="no">02</span></p>
        <h2 class="h2" id="t-style">${esc(C.style.heading)}</h2>
      </div>
      <div class="cards rv">
        ${C.style.bullets.map((b, i) => `<div class="card"><span class="card__no">${pad2(i + 1)}</span><p>${rich(b)}</p></div>`).join('')}
      </div>
    </div>
    <div class="split" style="margin-top:clamp(56px,8vw,96px)">
      <div class="rv">
        <p class="kicker"><span class="no">03</span></p>
        <h2 class="h2" id="t-treat">${esc(C.treatment.heading)}</h2>
        <ul class="specs" aria-label="ملخص المواصفات التقنية">${specs.map(s => `<li><bdi dir="ltr">${esc(s)}</bdi></li>`).join('')}</ul>
      </div>
      <div class="rv">
        <div class="prose">${C.treatment.paragraphs.map(p => `<p>${rich(p)}</p>`).join('')}</div>
        <div class="treat-list">
          ${C.treatment.bullets.map(b => { const [l, t] = splitLabel(b); return `<div class="treat-item"><h3>${esc(l || '')}</h3><p>${rich(t)}</p></div>`; }).join('')}
        </div>
      </div>
    </div>
  </div>
</section>`;
};

const castSec = () => {
  const marcoText = C.style.bullets.find(b => /^ماركو/.test(b)) || '';
  return `
<section class="sec on-ivory" id="cast" aria-labelledby="t-cast">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="kicker"><span class="no">04</span></p>
      <h2 class="h2" id="t-cast">${esc(C.continuity.heading)}</h2>
    </div>
    <div class="continuity rv"><p style="margin:0">${rich(C.continuity.text)}</p></div>

    <div class="marco rv">
      <div class="slot" data-slot="marcoPhoto">${ICON.asset}<b>صورة ماركو الأصلية</b><small>مكان مخصص للصورة المرجعية المعتمدة؛ لا تُولَّد صورة بديلة</small></div>
      <div>
        <h3 class="h3">ماركو</h3>
        <p>${rich(marcoText)}</p>
        <div class="role__shots" style="color:var(--on-dark-2)">يتكلم في اللقطات: ${shotLinks(marcoShots)}</div>
      </div>
    </div>

    <h3 class="h3 rv" id="t-wardrobe" style="margin-top:8px">${esc(C.wardrobe.heading)}</h3>
    <p class="rv" style="max-width:80ch;margin:0 0 18px">${rich(C.wardrobe.intro)}</p>
    <div class="filters rv" role="group" aria-label="تمييز أدوار مؤدية">
      <button class="chip" type="button" data-performer="*" aria-pressed="true">كل الأدوار</button>
      ${performers.map(p => `<button class="chip" type="button" data-performer="${esc(p)}" aria-pressed="false">${esc(p)}</button>`).join('')}
    </div>
    <p class="sr" aria-live="polite" id="filter-live"></p>
    <div class="roles">
      ${C.wardrobe.rows.map(r => `<article class="role rv" data-performer="${esc(r.performer)}" data-role="${esc(r.role)}" aria-labelledby="role-${esc(r.role)}">
        <div class="role__head"><span class="role__no" aria-hidden="true">${esc(r.role)}</span><div class="role__who"><small>${esc(C.wardrobe.headers[0])} ${esc(r.role)}</small><b id="role-${esc(r.role)}">${esc(r.performer)}</b></div></div>
        <p><span class="sr">${esc(C.wardrobe.headers[2])}: </span>${rich(r.look)}</p>
        ${roleShots[r.role] ? `<div class="role__shots">تتكلم في اللقطة: ${shotLinks([...roleShots[r.role]])}</div>` : ''}
      </article>`).join('')}
    </div>
    <p class="note rv">${rich(C.wardrobe.footnote)}</p>
  </div>
</section>`;
};

const locationSec = () => `
<section class="sec on-dark" id="location" aria-labelledby="t-room">
  <div class="wrap">
    <div class="room">
      <div class="rv">
        <p class="kicker"><span class="no">05</span></p>
        <h2 class="h2" id="t-room">${esc(C.location.heading)}</h2>
        <p class="lede">${rich(C.location.text)}</p>
      </div>
      <figure class="rv">
        <button class="zoom" type="button" data-gallery="location" data-full="assets/location/meeting-room.jpg" data-title="${esc(C.location.caption)}" data-sub="${esc(C.location.heading)}" aria-label="تكبير صورة ${esc(C.location.caption)}">
          <img src="assets/location/meeting-room.jpg" alt="${esc(C.location.caption)}: طاولة اجتماعات طويلة، كراسي جلدية بنية، وإنارة سقفية حلقية" width="651" height="726" loading="lazy" decoding="async">
          <span class="zoom__icon">${ICON.zoom}</span>
        </button>
        <figcaption>${esc(C.location.caption)}</figcaption>
      </figure>
    </div>

    <div class="board">
      <div class="split">
        <div class="rv">
          <p class="kicker"><span class="no">06</span></p>
          <h2 class="h2" id="t-board">${esc(C.board.heading)}</h2>
        </div>
        <p class="lede rv">${rich(C.board.text)}</p>
      </div>
      <figure style="margin:24px 0 0">
        <ul class="board__grid">
          ${C.board.tiles.map((t, i) => `<li class="rv"><button class="zoom" type="button" data-gallery="board" data-full="assets/board/board-${i + 1}.jpg" data-title="${esc(`اللوحة المرجعية · ${i + 1}/9 · ${t}`)}" data-sub="${esc(C.board.caption)}" aria-label="تكبير الإطار ${i + 1} من اللوحة المرجعية: ${esc(t)}"><img src="assets/board/board-${i + 1}.jpg" alt="${esc(`إطار مرجعي ${i + 1}: ${t}`)}" width="507" height="337" loading="lazy" decoding="async"><span class="n">${i + 1}</span><span class="zoom__icon">${ICON.zoom}</span></button></li>`).join('')}
        </ul>
        <figcaption>${rich(C.board.caption)}</figcaption>
      </figure>
    </div>
  </div>
</section>`;

const rhythmSec = () => {
  const partOf = (i) => GROUPS[i];
  return `
<section class="sec on-ivory" id="rhythm" aria-labelledby="t-rhythm">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="kicker"><span class="no">07</span></p>
      <h2 class="h2" id="t-rhythm">${esc(C.breakdown.heading)}</h2>
    </div>
    <ol class="parts">
      ${C.breakdown.rows.map((r, i) => { const g = partOf(i); return `<li class="part rv">
        <span class="part__time"><bdi dir="ltr">${esc(r.time)}</bdi></span>
        <h3>${esc(r.part)}</h3>
        <p>${rich(r.rhythm)}</p>
        ${g ? `<span class="part__shots">${esc(g.title)} · اللقطات <bdi dir="ltr">${pad2(g.from)}–${pad2(g.to)}</bdi></span>` : ''}
      </li>`; }).join('')}
    </ol>
    <p class="note rv">${rich(C.breakdown.note)}</p>

    <div class="player rv" id="player" aria-labelledby="t-player">
      <div class="player__grid">
        <div class="player__screen">
          <img id="pl-img" src="${esc(SHOTS[0].image)}" alt="${esc(SHOTS[0].alt)}" width="${SHOTS[0].w}" height="${SHOTS[0].h}" loading="lazy" decoding="async">
          <div class="player__badge"><b id="pl-num">01</b><span id="pl-dur">${esc(SHOTS[0].durationLabel)}</span></div>
          <div class="player__tc" id="pl-tc" aria-hidden="true">0:00.0 / ${fmtTC(TOTAL)}</div>
          <div class="player__sub" id="pl-sub"></div>
        </div>
        <div class="player__side">
          <h3 id="t-player" class="sr">معاينة الإيقاع بالمدد التقديرية</h3>
          <span class="group" id="pl-group"></span>
          <h3 id="pl-title" aria-live="off"></h3>
          <dl>
            <dt>الكادر / الزاوية</dt><dd id="pl-frame"></dd>
            <dt>العدسة / الحركة</dt><dd id="pl-lens"></dd>
            <dt>الصوت</dt><dd id="pl-sound"></dd>
          </dl>
        </div>
      </div>
      <div class="player__ctrls">
        <button class="icon-btn icon-btn--play" id="pl-play" type="button" aria-pressed="false" aria-label="تشغيل معاينة الإيقاع">${ICON.play}${ICON.pause}</button>
        <button class="icon-btn" id="pl-prev" type="button" aria-label="اللقطة السابقة">${ICON.prev}</button>
        <button class="icon-btn" id="pl-next" type="button" aria-label="اللقطة التالية">${ICON.next}</button>
        <a class="btn btn--ghost" id="pl-go" href="#shot-01">افتح بطاقة اللقطة</a>
        <span class="player__total">مجموع مدد اللقطات التقديرية: <b>${String(TOTAL).replace(/\.0$/, '')} ث</b></span>
      </div>
      <div class="tl" aria-label="الخط الزمني للقطات">
        <div class="tl__track">
          ${SHOTS.map((s, i) => `<button class="tl__seg" type="button" style="--w:${s.seconds}" data-g="${groupOf(s.n).i}" aria-label="اللقطة ${pad2(s.n)}: ${esc(s.title)}، ${esc(s.durationLabel)}" aria-current="${i === 0}"><span class="fill"></span><span class="num">${s.n}</span></button>`).join('')}
        </div>
        <div class="tl__groups" aria-hidden="true">${GROUPS.map(g => `<span style="--w:${g.seconds}">${esc(g.title)}</span>`).join('')}</div>
        <div class="tl__scale" aria-hidden="true"><span>0:00</span><span>${fmtTC(TOTAL / 2)}</span><span>${fmtTC(TOTAL)}</span></div>
      </div>
      <p class="sr" aria-live="polite" id="pl-live"></p>
    </div>
  </div>
</section>`;
};

const fieldsHTML = s => {
  const lines = (s.dialogue || []).length
    ? s.dialogue.map(d => `<p class="line${/نص الشاشة/.test(d.speaker) ? ' line--screen' : ''}"><span class="who">${esc(d.speaker)}</span><q>${rich(d.line)}</q></p>`).join('')
    : `<p class="line line--none">${rich(s.dialogueRaw)}</p>`;
  return `<dl class="fields">
    <div class="field"><dt>الكادر / الزاوية</dt><dd>${rich(s.frame)}</dd></div>
    <div class="field"><dt>العدسة / الحركة</dt><dd>${rich(s.lens)}</dd></div>
    <div class="field field--dialogue"><dt>المتحدث / الحوار</dt><dd>${lines}</dd></div>
    <div class="field"><dt>الصوت</dt><dd>${rich(s.sound)}</dd></div>
    <div class="field"><dt>وظيفة اللقطة</dt><dd>${rich(s.function)}</dd></div>
  </dl>`;
};

const storyboardSec = () => `
<section class="sec on-ivory" id="storyboard" aria-labelledby="t-sb" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head rv" style="padding-top:clamp(56px,9vw,112px);border-top:1px solid var(--line)">
      <p class="kicker"><span class="no">08</span></p>
      <h2 class="h2" id="t-sb">${esc(C.storyboard.heading)}</h2>
    </div>
    <div class="sb-intro rv"><p>${rich(C.storyboard.intro)}</p></div>

    <nav class="sb-index rv" aria-label="فهرس المشاهد السريع">
      ${GROUPS.map(g => `<div class="sb-index__group"><h3>${esc(g.title)}</h3><div class="sb-index__chips">${g.shots.map(s => `<a class="shot-link" href="#shot-${pad2(s.n)}" title="${esc(s.title)}" aria-label="اللقطة ${pad2(s.n)}: ${esc(s.title)}">${pad2(s.n)}</a>`).join('')}</div></div>`).join('')}
    </nav>

    <div class="shots-wrap">
    ${GROUPS.map(g => `
      <div class="group-head" id="group-${g.i}"><span class="gno">${pad2(g.i)}</span><h3>${esc(g.title)}</h3><span class="range">اللقطات <bdi dir="ltr">${pad2(g.from)}–${pad2(g.to)}</bdi></span></div>
      <div class="shots">
      ${g.shots.map(s => `
        <article class="shot rv" id="shot-${pad2(s.n)}" data-n="${s.n}" aria-labelledby="shot-${pad2(s.n)}-t">
          <div class="shot__rail">
            <a class="shot__no" href="#shot-${pad2(s.n)}" aria-label="رابط اللقطة ${pad2(s.n)}">${pad2(s.n)}</a>
            <span class="shot__dur"><span class="sr">المدة: </span>${esc(s.durationLabel)}</span>
            <span class="shot__tc" title="بداية تقديرية من مجموع المدد">${fmtTC(s.start)}</span>
          </div>
          <div class="shot__media">
            <button class="zoom" type="button" data-gallery="shots" data-full="${esc(s.image)}" data-title="${esc(`اللقطة ${pad2(s.n)} · ${s.title} · ${s.durationLabel}`)}" data-sub="${esc(s.frame)}" data-href="#shot-${pad2(s.n)}" aria-label="تكبير صورة اللقطة ${pad2(s.n)}">
              <img src="${esc(s.image)}" alt="${esc(s.alt)}" width="${s.w}" height="${s.h}" loading="lazy" decoding="async">
              <span class="zoom__icon">${ICON.zoom}</span>
            </button>
          </div>
          <div class="shot__body">
            <h4 class="shot__title" id="shot-${pad2(s.n)}-t"><span class="sr">اللقطة ${pad2(s.n)}: </span>${esc(s.title)}</h4>
            ${fieldsHTML(s)}
            ${(s.needs || []).length ? `<div class="needs" aria-label="أصول أو معلومات بانتظار الاعتماد">${s.needs.map(n => `<span>${ICON.pin}${esc(n)}</span>`).join('')}</div>` : ''}
          </div>
        </article>`).join('')}
      </div>`).join('')}
    </div>
  </div>
</section>`;

const postSec = () => `
<section class="sec on-white" id="post" aria-labelledby="t-post">
  <div class="wrap">
    <div class="sec-head rv">
      <p class="kicker"><span class="no">09</span></p>
      <h2 class="h2" id="t-post">الصوت والمونتاج والتسليم</h2>
    </div>
    <div class="cols">
      <div class="panel rv"><h3 class="h3">${esc(C.soundEdit.heading)}</h3><ul class="list">${C.soundEdit.bullets.map(b => `<li>${rich(b)}</li>`).join('')}</ul></div>
      <div class="panel rv"><h3 class="h3">${esc(C.delivery.heading)}</h3><ul class="list">${C.delivery.bullets.map(b => `<li>${rich(b)}</li>`).join('')}</ul></div>
    </div>
  </div>
</section>`;

const ASSET_SLOTS = [
  ['harirLogo', 'شعار حرير', 'من ملفات العميل الرسمية فقط', 'asset'],
  ['appScreens', 'واجهة تطبيق حرير', 'صور الشاشات الرسمية للحجز والدفع والتقسيط', 'asset'],
  ['carImage', 'سيارة شانجان', 'الموديل واللون والصورة أو الفيديو الرسمي لشاشة القاعة', 'asset'],
  ['changanLogo', 'شعار شانجان والمفتاح', 'الشعار الرسمي ومفتاح مطابق للموديل', 'asset'],
  ['marcoPhoto', 'صورة ماركو الأصلية', 'مرجع الوجه فقط', 'asset'],
  ['installment', 'اسم شركة التقسيط', 'الاسم كاملاً وشروط التقسيط', 'text'],
  ['brands', 'البراندات والمتاجر المشاركة', 'الأسماء وشروط الأهلية', 'text'],
  ['drawTerms', 'شروط القرعة', 'السنة والتوقيت والمكان والأهلية وآلية إعلان الفائز', 'text'],
];

const approvalsSec = () => `
<section class="sec on-ivory" id="approvals" aria-labelledby="t-appr">
  <div class="wrap">
    <div class="split">
      <div class="rv">
        <p class="kicker"><span class="no">10</span></p>
        <h2 class="h2" id="t-appr">${esc(C.approvals.heading)}</h2>
        <p class="muted" style="margin:0">الخانات المنقّطة أدناه أماكن محجوزة لأصول ومعلومات العميل الرسمية؛ لا يُخترع محتواها ولا تُستبدل بصور مولّدة.</p>
        <div class="assets">
          ${ASSET_SLOTS.map(([k, t, d, ic]) => `<div class="slot" ${ic === 'asset' ? `data-slot="${k}"` : ''}>${ICON[ic]}<b>${esc(t)}</b><small>${esc(d)}</small></div>`).join('')}
        </div>
      </div>
      <ul class="checklist rv">${C.approvals.bullets.map(b => `<li><span>${rich(b)}</span></li>`).join('')}</ul>
    </div>
  </div>
</section>`;

const refsSec = () => `
<section class="sec on-dark" id="refs" aria-labelledby="t-refs">
  <div class="wrap split">
    <div class="rv">
      <p class="kicker"><span class="no">11</span></p>
      <h2 class="h2" id="t-refs">${esc(C.references.heading)}</h2>
    </div>
    <div class="rv">
      <p class="lede" style="max-width:none">${rich(C.references.text)}</p>
      <div class="refs" style="margin-top:22px">
        ${C.references.links.map(l => `<div class="ref"><a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer" dir="ltr">${esc(l.label)}</a><span>${esc(l.note)}</span></div>`).join('')}
      </div>
    </div>
  </div>
</section>`;

const footer = () => `
<footer class="footer on-red">
  <div class="wrap footer__in">
    <img src="assets/brand/studio-minute-mark-white@3x.png" alt="شعار استوديو دقيقة" width="465" height="197" loading="lazy">
    <p>${esc(C.meta.title)} — ${esc(C.meta.subtitle)}. ${esc(C.meta.credit)}.</p>
    <p class="footer__fine">الصور في هذا العرض رسومات مرجعية للتكوين واللبس والموقع فقط؛ لا تمثّل الممثلات الحقيقيات ولا سيارة شانجان ولا واجهة حرير النهائية. تُضاف الكتابة والشعارات لاحقاً من ملفاتها الأصلية.</p>
    <div class="footer__row">
      <a class="btn btn--ghost" href="#top">العودة للبداية</a>
      <button class="btn btn--ghost" type="button" id="replay-intro">إعادة الانترو</button>
    </div>
  </div>
</footer>`;

const indexDialog = () => `
<dialog class="drawer" id="index-dlg" aria-labelledby="t-index">
  <div class="drawer__head"><h2 id="t-index">فهرس المشاهد</h2><button class="x" type="button" data-close aria-label="إغلاق الفهرس">${ICON.x}</button></div>
  <div class="drawer__body">
    ${GROUPS.map(g => `<p class="drawer__group">${esc(g.title)}</p><ul class="idx">${g.shots.map(s => `<li><a href="#shot-${pad2(s.n)}"><span class="n">${pad2(s.n)}</span><img src="${esc(s.image)}" alt="" width="84" height="47" loading="lazy" decoding="async"><span class="t"><b>${esc(s.title)}</b><small>${esc(s.durationLabel)} · ${esc(s.dialogue.length ? s.dialogue.map(d => d.speaker).join('، ') : 'بدون حوار')}</small></span></a></li>`).join('')}</ul>`).join('')}
  </div>
</dialog>`;

const menuDialog = () => `
<dialog class="drawer" id="menu-dlg" aria-labelledby="t-menu">
  <div class="drawer__head"><h2 id="t-menu">أقسام العرض</h2><button class="x" type="button" data-close aria-label="إغلاق القائمة">${ICON.x}</button></div>
  <ul class="menu-list">${[['top', 'البداية'], ...navItems, ['refs', 'المراجع']].map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ul>
</dialog>`;

const lightbox = () => `
<dialog class="lb" id="lightbox" aria-labelledby="lb-title">
  <div class="lb__top"><span class="lb__count" id="lb-count"></span><button class="x" type="button" data-close aria-label="إغلاق المكبّر">${ICON.x}</button></div>
  <div class="lb__stage">
    <div class="lb__nav lb__nav--prev"><button class="icon-btn" id="lb-prev" type="button" aria-label="الصورة السابقة">${ICON.prev}</button></div>
    <img id="lb-img" alt="">
    <div class="lb__nav lb__nav--next"><button class="icon-btn" id="lb-next" type="button" aria-label="الصورة التالية">${ICON.next}</button></div>
  </div>
  <div class="lb__cap"><b id="lb-title"></b><span id="lb-sub"></span><a id="lb-link" href="#" hidden>افتح بطاقة اللقطة</a></div>
</dialog>`;

/* ------------------------------------------------------------ بيانات JS */
const jsData = {
  shots: SHOTS.map(s => ({
    n: s.n, title: s.title, seconds: s.seconds, durationLabel: s.durationLabel, image: s.image, alt: s.alt,
    group: groupOf(s.n).title, dialogue: s.dialogue,
    frameHTML: rich(s.frame), lensHTML: rich(s.lens), soundHTML: rich(s.sound),
  })),
};

const description = `${C.meta.title} — ${C.meta.subtitle}. ${C.meta.line1}.`;
const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(C.meta.studio)} | ${esc(C.meta.title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#242326">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(C.meta.studio)} | ${esc(C.meta.title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="assets/brand/studio-minute-logo.jpg">
<link rel="icon" type="image/png" href="assets/brand/favicon.png">
<script>
(function(){var d=document.documentElement,calm=false,seen=false;
try{calm=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
try{seen=sessionStorage.getItem('sm-intro')==='1'}catch(e){}
if(!calm&&'IntersectionObserver' in window)d.classList.add('motion');
if(!calm&&!seen&&(!location.hash||location.hash==='#top')){d.classList.add('has-intro');
/* احتياط: لا يبقى الانترو فوق المحتوى إذا تعذّر تحميل السكربت الرئيسي */
setTimeout(function(){if(!window.__smReady)d.classList.remove('has-intro')},4500);}})();
</script>
<style>
${CSS}
</style>
</head>
<body>
<a class="skip" href="#idea">تخطَّ إلى محتوى العرض</a>

<div class="intro" id="intro" aria-hidden="true">
  <div class="intro__ap"><div class="intro__ap-spin"><img src="assets/brand/studio-minute-aperture.png" alt="" width="524" height="524"></div></div>
  <div class="intro__stage">
    <img class="intro__logo" src="assets/brand/studio-minute-mark-white@3x.png" alt="" width="1395" height="591">
    <p class="intro__title"><b>${esc(C.meta.title)}</b>${esc(C.meta.subtitle)}</p>
  </div>
</div>
<button class="intro-skip" id="intro-skip" type="button">تخطي الانترو</button>

<header class="bar">
  <div class="wrap bar__in">
    <a class="brand" href="#top" aria-label="${esc(C.meta.studio)} — العودة إلى بداية العرض"><img src="assets/brand/studio-minute-logo.jpg" alt="" width="734" height="413"><span>${esc(C.meta.title)}</span></a>
    <nav class="nav" aria-label="أقسام العرض">${navItems.map(([id, t]) => `<a href="#${id}" aria-current="false">${esc(t)}</a>`).join('')}</nav>
    <div class="bar__actions">
      <button class="btn btn--red" type="button" data-open="index" aria-haspopup="dialog">${ICON.list}<span class="lbl-long">فهرس المشاهد</span><span class="lbl-short">المشاهد</span></button>
      <button class="btn btn--ghost menu-btn" type="button" data-open="menu" aria-haspopup="dialog" aria-label="أقسام العرض">${ICON.menu}</button>
    </div>
  </div>
</header>

<main id="main">
${hero()}
${ideaSec()}
${treatmentSec()}
${castSec()}
${locationSec()}
${rhythmSec()}
${storyboardSec()}
${postSec()}
${approvalsSec()}
${refsSec()}
</main>
${footer()}

${indexDialog()}
${menuDialog()}
${lightbox()}

<script type="application/json" id="sb-data">${JSON.stringify(jsData).replace(/</g, '\\u003c')}</script>
<script src="config.js"></script>
<script>
${JS}
</script>
</body>
</html>
`;

writeFileSync(join(ROOT, 'index.html'), html);
console.log(`index.html written: ${(html.length / 1024).toFixed(1)} KB, ${SHOTS.length} shots, total ${TOTAL}s`);

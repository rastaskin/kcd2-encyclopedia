/* Богемия 1403 — движок энциклопедии. Данные: window.KCD (data/*.js). */
(function () {
  'use strict';
  const K = window.KCD;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const app = $('#app');

  /* ---------- storage (best effort) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('kcd2.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('kcd2.' + k, JSON.stringify(v)); } catch (e) { } }
  };

  /* ---------- indexes ---------- */
  const A = {}; K.articles.forEach((a, i) => { a._i = i; A[a.id] = a; });
  const IMG = K.images;
  const SECS = K.sections; const SEC = {}; SECS.forEach(s => SEC[s.id] = s);
  const GL = {}; K.glossary.forEach(g => GL[g.id] = g);
  const bySec = id => K.articles.filter(a => a.sec === id);

  /* ---------- spoiler level ---------- */
  const LV = { none: 0, act1: 1, full: 2 };
  const LVNAME = { none: 'без спойлеров', act1: 'до середины игры', full: 'весь сюжет' };
  let spoil = store.get('spoiler', 'none'); if (!(spoil in LV)) spoil = 'none';
  const allowed = sp => LV[sp || 'none'] <= LV[spoil];
  function spWrap(sp, inner, extraCls) {
    if (!sp || sp === 'none') return inner;
    const locked = !allowed(sp);
    return `<div class="sp ${extraCls || ''} ${locked ? 'locked' : ''}" data-sp="${sp}"><div class="sp-gate"><button type="button" data-reveal>Показать спойлер<small>уровень: ${LVNAME[sp]}</small></button></div><div class="sp-c">${inner}</div></div>`;
  }
  function setSpoil(v) {
    spoil = v; store.set('spoiler', v);
    $$('.spoil-ctl button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lv === v)));
    $$('.sp').forEach(el => el.classList.toggle('locked', !allowed(el.dataset.sp)));
  }

  /* ---------- theme ---------- */
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  applyTheme(store.get('theme', null));
  function currentTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  /* ---------- images ---------- */
  const tsrc = id => 'img/t/' + id + '.webp';
  const fsrc = id => 'img/f/' + id + '.webp';
  function credit(id, withLink) {
    const m = IMG[id]; if (!m) return '';
    const parts = [m.by, m.lic].filter(Boolean).join(' · ');
    if (withLink && m.url) return `${esc(parts)} · <a href="${esc(m.url)}" target="_blank" rel="noopener">источник</a>`;
    return esc(parts);
  }
  const imgAlt = id => esc((IMG[id] && IMG[id].cap) || '');

  /* ---------- glossary linking ---------- */
  const glRx = K.glossary.map(g => ({ g, rx: new RegExp('(^|[^\\p{L}])((?:' + g.forms.join('|') + '))(?![\\p{L}])', 'iu') }));
  function linkGlossary(root) {
    const used = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || p.closest('h1,h2,h3,h4,a,figcaption,.gl,.gvh-head,button,blockquote cite,th')) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.trim().length > 2 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = []; let n; while ((n = walker.nextNode())) nodes.push(n);
    for (const node of nodes) {
      let cur = node;
      for (const { g, rx } of glRx) {
        if (used.has(g.id) || !cur || !cur.nodeValue) continue;
        const m = rx.exec(cur.nodeValue); if (!m) continue;
        used.add(g.id);
        const start = m.index + m[1].length, word = m[2];
        const after = cur.splitText(start); const rest = after.splitText(word.length);
        const span = document.createElement('span'); span.className = 'gl'; span.tabIndex = 0; span.dataset.g = g.id; span.textContent = word;
        after.replaceWith(span); cur = rest;
      }
    }
  }
  let tipEl = null;
  function showTip(el) {
    const g = GL[el.dataset.g]; if (!g) return;
    hideTip();
    tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.setAttribute('role', 'tooltip');
    tipEl.innerHTML = `<b>${esc(g.t)}</b>${esc(g.d)}`;
    document.body.appendChild(tipEl);
    const r = el.getBoundingClientRect(), tr = tipEl.getBoundingClientRect();
    let x = Math.min(Math.max(16, r.left + r.width / 2 - tr.width / 2), innerWidth - tr.width - 16);
    let y = r.top - tr.height - 8; if (y < 70) y = r.bottom + 8;
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function hideTip() { if (tipEl) { tipEl.remove(); tipEl = null; } }
  document.addEventListener('mouseover', e => { const t = e.target.closest('.gl'); if (t) showTip(t); });
  document.addEventListener('mouseout', e => { if (e.target.closest('.gl')) hideTip(); });
  document.addEventListener('focusin', e => { const t = e.target.closest('.gl'); if (t) showTip(t); });
  document.addEventListener('focusout', e => { if (e.target.closest('.gl')) hideTip(); });
  addEventListener('scroll', hideTip, { passive: true });

  /* ---------- search ---------- */
  const TR = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'ju', 'я': 'ja' };
  function phon(w) {
    w = w.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    w = w.replace(/[а-яё]/g, c => TR[c] ?? c);
    w = w.replace(/sch/g, 's').replace(/zh/g, 'z').replace(/ch/g, 'c').replace(/sh/g, 's').replace(/tz|ts/g, 'c').replace(/ck/g, 'k').replace(/kh/g, 'h')
      .replace(/w/g, 'v').replace(/y/g, 'i').replace(/j/g, 'i').replace(/x/g, 'ks').replace(/q/g, 'k').replace(/ph/g, 'f').replace(/g/g, 'h')
      .replace(/(.)\1+/g, '$1');
    return w;
  }
  const tokens = s => (String(s || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
  const strip = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const DOCS = [];
  function addDoc(d, fields) {
    d.f = fields.map(([txt, w]) => ({ w, set: new Set(tokens(txt).map(phon)) }));
    DOCS.push(d);
  }
  K.articles.forEach(a => addDoc({ type: 'a', id: a.id, t: a.t, sub: a.lead, img: a.img, sp: a.sp, sec: a.sec, raw: strip(a.lead + ' ' + a.body) },
    [[a.t, 10], [[a.cs, a.de, a.game, (a.aka || []).join(' ')].join(' '), 8], [(a.tags || []).join(' ') + ' ' + SEC[a.sec].t, 4], [a.lead, 2], [strip(a.body) + ' ' + strip(a.later) + ' ' + (a.gm ? strip(a.gm.ok + ' ' + a.gm.simp + ' ' + a.gm.inv) : ''), 1]]));
  K.glossary.forEach(g => addDoc({ type: 'g', id: g.id, t: g.t, sub: g.d, raw: g.d },
    [[g.t, 10], [(g.cs || '') + ' ' + (g.aka || ''), 8], [g.d, 2]]));
  K.timeline.forEach((e, i) => addDoc({ type: 'e', id: i, t: e.y + ' · ' + e.t, sub: e.p, sp: e.sp, raw: e.p },
    [[e.t + ' ' + e.y, 6], [e.p, 2]]));
  const HB = {}; (K.herbs || []).forEach(h => HB[h.id] = h);
  const PT = {}; (K.potions || []).forEach(p => PT[p.id] = p);
  const ingName = k => HB[k] ? HB[k].t : (K.extraIng[k] || k);
  (K.herbs || []).forEach(h => addDoc({ type: 'h', id: h.id, t: h.t, img: h.img, raw: h.hist },
    [[h.t, 10], [h.game + ' ' + h.lat + ' ' + h.cs, 9], [h.where, 2], [h.hist, 1]]));
  (K.potions || []).forEach(p => addDoc({ type: 'p', id: p.id, t: p.t, raw: p.eff },
    [[p.t, 10], [p.game, 9], [p.ing.map(x => ingName(x[0])).join(' '), 3], [p.eff + ' ' + (p.hist || ''), 2]]));
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let best = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1; prev = cur;
    }
    return prev[b.length];
  }
  function matchTok(q, set) {
    if (set.has(q)) return 1;
    let best = 0;
    for (const t of set) {
      if (q.length >= 2 && t.startsWith(q)) { best = Math.max(best, .8); continue; }
      if (q.length >= 4) {
        const max = q.length >= 7 ? 2 : 1;
        const d = lev(q, t.slice(0, q.length + max), max);
        if (d <= max) best = Math.max(best, d === 1 ? .55 : .4);
      }
    }
    return best;
  }
  function search(q) {
    const qt = tokens(q).map(phon).filter(Boolean); if (!qt.length) return [];
    const out = [];
    for (const d of DOCS) {
      let total = 0, hit = 0;
      for (const t of qt) {
        let best = 0;
        for (const f of d.f) { const m = matchTok(t, f.set); if (m) best = Math.max(best, m * f.w); }
        if (best) { hit++; total += best; }
      }
      if (hit === qt.length) out.push({ d, s: total + (d.type === 'a' ? 1 : 0) });
    }
    return out.sort((a, b) => b.s - a.s).slice(0, 30);
  }
  function hl(text, q) {
    const t = esc(text); const words = tokens(q).filter(w => w.length > 1);
    if (!words.length) return t;
    const rx = new RegExp('(' + words.map(w => w.slice(0, Math.max(3, w.length - 2)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'giu');
    return t.replace(rx, '<mark>$1</mark>');
  }
  function snippet(raw, q, len = 150) {
    const w = tokens(q)[0]; if (!w) return raw.slice(0, len);
    const i = raw.toLowerCase().indexOf(w.slice(0, Math.max(3, w.length - 2)));
    if (i < 0) return raw.slice(0, len) + (raw.length > len ? '…' : '');
    const s = Math.max(0, i - 50); return (s ? '…' : '') + raw.slice(s, s + len) + '…';
  }
  const GROUP = { a: 'Статьи', h: 'Травы', p: 'Зелья', g: 'Глоссарий', e: 'Хронология' };
  function openSearch(initial) {
    closeOverlays();
    const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'search-ov';
    ov.innerHTML = `<div class="sbox" role="dialog" aria-modal="true" aria-label="Поиск по энциклопедии">
      <label class="sbox-in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
      <span class="sr">Поиск</span><input id="sq" type="search" autocomplete="off" placeholder="Куттенберг, бригантина, Жижка, грош…" value="${esc(initial || '')}"></label>
      <div class="sres" id="sres" role="listbox"></div>
      <div class="sfoot"><span><kbd>↑</kbd> <kbd>↓</kbd> выбор</span><span><kbd>Enter</kbd> открыть</span><span><kbd>Esc</kbd> закрыть</span><span>понимает латиницу, чешские и немецкие названия, опечатки</span></div></div>`;
    document.body.appendChild(ov);
    const inp = $('#sq', ov), res = $('#sres', ov); let sel = 0;
    const draw = () => {
      const q = inp.value.trim();
      if (!q) {
        const sug = ['Куттенберг', 'Троски', 'Сигизмунд', 'бригантина', 'грош', 'Жижка', 'куманы', 'алхимия', 'Kuttenberg', 'Trosky'];
        res.innerHTML = `<div class="sempty">Начните вводить название места, имя или термин.<div class="chips">${sug.map(s => `<button class="chip" type="button" data-q="${s}">${s}</button>`).join('')}</div></div>`;
        return;
      }
      const ORD = { a: 0, h: 1, p: 2, g: 3, e: 4 }; const r = search(q).sort((x, y) => ORD[x.d.type] - ORD[y.d.type] || y.s - x.s);
      if (!r.length) { res.innerHTML = `<div class="sempty">Ничего не нашлось по запросу «${esc(q)}». Попробуйте другое написание или откройте <a href="#glossary">глоссарий</a>.</div>`; return; }
      let html = '', last = '';
      r.forEach((x, i) => {
        const d = x.d;
        if (d.type !== last) { html += `<h5>${GROUP[d.type]}</h5>`; last = d.type; }
        const href = d.type === 'a' ? '#a-' + d.id : d.type === 'g' ? '#g-' + d.id : d.type === 'h' ? '#herb-' + d.id : d.type === 'p' ? '#potion-' + d.id : '#timeline-' + d.id;
        const locked = d.sp && !allowed(d.sp);
        const img = (d.type === 'a' || d.type === 'h') && d.img ? `<img src="${tsrc(d.img)}" alt="" loading="lazy">` : '';
        html += `<a href="${href}" role="option" class="${img ? '' : 'noimg'}" data-i="${i}">${img}<div><b>${hl(d.t, q)}${d.type === 'a' ? ` <small class="eyebrow">· ${esc(SEC[d.sec].t)}</small>` : ''}</b><span>${locked ? 'Скрыто фильтром спойлеров' : hl(snippet(d.raw, q), q)}</span></div></a>`;
      });
      res.innerHTML = html; sel = 0; mark();
    };
    const mark = () => $$('a', res).forEach((a, i) => a.setAttribute('aria-selected', String(i === sel)));
    inp.addEventListener('input', draw);
    inp.addEventListener('keydown', e => {
      const items = $$('a', res);
      if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); mark(); items[sel] && items[sel].scrollIntoView({ block: 'nearest' }); e.preventDefault(); }
      if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); mark(); items[sel] && items[sel].scrollIntoView({ block: 'nearest' }); e.preventDefault(); }
      if (e.key === 'Enter' && items[sel]) { location.hash = items[sel].getAttribute('href'); closeOverlays(); }
    });
    res.addEventListener('click', e => {
      const c = e.target.closest('[data-q]'); if (c) { inp.value = c.dataset.q; draw(); inp.focus(); return; }
      if (e.target.closest('a')) closeOverlays();
    });
    ov.addEventListener('mousedown', e => { if (e.target === ov) closeOverlays(); });
    draw(); setTimeout(() => inp.focus(), 10);
  }
  function closeOverlays() { $$('.overlay,.lb').forEach(o => o.remove()); document.body.style.overflow = ''; }

  /* ---------- lightbox ---------- */
  let LBL = [], LBI = 0;
  function openLB(list, i) {
    LBL = list.filter(id => IMG[id] && allowed(IMG[id].sp)); LBI = Math.max(0, LBL.indexOf(list[i])); if (!LBL.length) return;
    closeOverlays();
    const lb = document.createElement('div'); lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Просмотр изображения');
    lb.innerHTML = `<div class="lb-stage"><span class="lb-n"></span><img alt=""><button class="lb-btn lb-prev" type="button" aria-label="Предыдущее"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg></button><button class="lb-btn lb-next" type="button" aria-label="Следующее"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></button><button class="lb-btn lb-x" type="button" aria-label="Закрыть"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="lb-cap"></div>`;
    document.body.appendChild(lb); document.body.style.overflow = 'hidden';
    const show = () => {
      const id = LBL[LBI], m = IMG[id];
      $('img', lb).src = fsrc(id); $('img', lb).alt = m.cap;
      $('.lb-cap', lb).innerHTML = `${esc(m.cap)}<span class="cr">${credit(id, true)}</span>`;
      $('.lb-n', lb).textContent = (LBI + 1) + ' / ' + LBL.length;
      $('.lb-prev', lb).hidden = $('.lb-next', lb).hidden = LBL.length < 2;
    };
    const go = d => { LBI = (LBI + d + LBL.length) % LBL.length; show(); };
    $('.lb-prev', lb).onclick = () => go(-1); $('.lb-next', lb).onclick = () => go(1); $('.lb-x', lb).onclick = closeOverlays;
    $('.lb-stage', lb).addEventListener('click', e => { if (e.target.classList.contains('lb-stage')) closeOverlays(); });
    let sx = null;
    lb.addEventListener('pointerdown', e => { sx = e.clientX; });
    lb.addEventListener('pointerup', e => { if (sx != null && Math.abs(e.clientX - sx) > 50) go(e.clientX < sx ? 1 : -1); sx = null; });
    lb._go = go; show(); $('.lb-x', lb).focus();
  }

  /* ---------- toast ---------- */
  function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 1800); }

  /* ---------- read / saved ---------- */
  let READ = new Set(store.get('read', [])), SAVED = store.get('saved', []);
  const markRead = id => { READ.add(id); store.set('read', [...READ]); };
  const toggleSaved = id => { SAVED = SAVED.includes(id) ? SAVED.filter(x => x !== id) : [id, ...SAVED]; store.set('saved', SAVED); return SAVED.includes(id); };

  /* ---------- components ---------- */
  const ORN = `<div class="orn" aria-hidden="true"><svg viewBox="0 0 26 12"><path d="M13 0 19 6 13 12 7 6Z" fill="currentColor"/><circle cx="2" cy="6" r="1.6" fill="currentColor"/><circle cx="24" cy="6" r="1.6" fill="currentColor"/></svg></div>`;
  const KIND = { hist: ['b-hist', 'историческая личность'], fict: ['b-fict', 'вымышленный'], proto: ['b-proto', 'есть прототип'] };
  const badge = k => k && KIND[k] ? `<span class="badge ${KIND[k][0]}">${KIND[k][1]}</span>` : '';
  function card(a) {
    const inner = `<a class="card" href="#a-${a.id}"><div class="ph"><img src="${tsrc(a.img)}" alt="${imgAlt(a.img)}" loading="lazy"></div><div class="bd"><span class="alt">${esc([a.cs, a.de].filter(Boolean).join(' · '))}</span><h3>${esc(a.t)}</h3><p>${esc(a.lead)}</p><div class="meta">${badge(a.kind)}${a.sp && a.sp !== 'none' ? `<span class="badge b-sp">спойлер</span>` : ''}${READ.has(a.id) ? '<span class="read">прочитано</span>' : ''}</div></div></a>`;
    return spWrap(a.sp, inner);
  }
  function figHTML(id, cls) {
    const m = IMG[id]; if (!m) return '';
    return spWrap(m.sp, `<figure class="fig ${cls || ''}"><img src="${fsrc(id)}" alt="${esc(m.cap)}" loading="lazy" data-lb="${id}"><figcaption>${esc(m.cap)} <span class="cr">— ${credit(id)}</span></figcaption></figure>`);
  }
  function galHTML(ids, big) {
    return `<div class="gal ${big ? 'gal-big' : ''}">${ids.filter(id => IMG[id]).map(id => spWrap(IMG[id].sp, `<button type="button" data-lb="${id}" aria-label="${esc(IMG[id].cap)}"><img src="${tsrc(id)}" alt="${esc(IMG[id].cap)}" loading="lazy"></button>`)).join('')}</div>`;
  }

  /* ---------- pages ---------- */
  function setNav(key) { $$('.nav a').forEach(a => { if (a.dataset.k === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
  function setTitle(t) { document.title = t ? t + ' — Богемия 1403' : 'Богемия 1403'; }

  const strip4 = ids => `<div class="mini-strip">${ids.filter(id => IMG[id]).map(id => `<img src="${tsrc(id)}" alt="" loading="lazy">`).join('')}</div>`;
  function pageHome() {
    setNav(''); setTitle('');
    const nImg = Object.keys(IMG).length;
    const last = store.get('last', null); const la = last && A[last.id];
    const locs = K.home.locations.map(id => A[id]).filter(Boolean);
    const ppl = K.home.people.map(id => A[id]).filter(Boolean);
    app.innerHTML = `
    <section class="hero"><div class="hero-img"><img src="${fsrc(K.home.hero)}" alt="${imgAlt(K.home.hero)}"></div>
      <div class="wrap"><span class="eyebrow">энциклопедия эпохи Kingdom Come: Deliverance II</span>
        <h1>Богемия, <em>1403</em></h1>
        <p class="lead">Король Вацлав IV в плену у собственного брата, венгерские наёмники жгут деревни у Кутной Горы, а серебро королевства идёт на чужую войну. Здесь собрано всё, что поможет понять мир игры: места, люди, вещи и события, с разделением на историю и вымысел.</p>
        <form class="hero-search" role="search" id="hero-search"><label class="sr" for="hq">Поиск</label><input id="hq" type="search" placeholder="Что вы ищете? Например: Куттенберг, бацинет, Гус"><button type="submit">Искать</button></form>
        <div class="hero-meta"><span><b>${K.articles.length}</b> статей</span><span><b>${nImg}</b> иллюстраций</span><span><b>${K.glossary.length}</b> терминов</span><span><b>${K.timeline.length}</b> событий</span><span>спойлеры скрыты по умолчанию</span></div>
        ${la ? `<a class="continue" href="#a-${la.id}"><img src="${tsrc(la.img)}" alt=""><span><small>продолжить чтение</small>${esc(la.t)}</span></a>` : ''}
      </div></section>

    <section class="block"><div class="wrap">
      <div class="block-head"><div><span class="eyebrow">разделы</span><h2>С чего начать</h2><p>Пять больших тем. Внутри каждой статьи отмечено, что в игре показано точно, что упрощено и что придумано.</p></div><a class="more" href="#" data-random>Случайная статья →</a></div>
      <div class="sec-grid">${SECS.map(s => `<a class="sec-card" href="#s-${s.id}"><img src="${tsrc(s.img)}" alt="" loading="lazy"><div><span class="count">${bySec(s.id).length} статей</span><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></div></a>`).join('')}</div>
    </div></section>

    <section class="block" style="padding-top:0"><div class="wrap">
      <div class="block-head"><div><span class="eyebrow">места</span><h2>Две земли игры</h2><p>Регион Троски среди песчаниковых скал Богемского рая и серебряный Куттенберг, второй город королевства.</p></div><a class="more" href="#map">Открыть карту →</a></div>
      <div class="loc-row">${locs.map(a => `<a class="loc" href="#a-${a.id}"><img src="${tsrc(a.img).replace('/t/', '/f/')}" alt="${imgAlt(a.img)}" loading="lazy"><div class="in"><span class="alt">${esc([a.cs, a.de].filter(Boolean).join(' · '))}</span><h3>${esc(a.t)}</h3><p>${esc(a.lead)}</p></div></a>`).join('')}</div>
    </div></section>

    <section class="quote-band"><div class="wrap"><blockquote>${esc(K.home.quote.q)}</blockquote><cite>${esc(K.home.quote.c)}</cite></div></section>

    <section class="block"><div class="wrap">
      <div class="block-head"><div><span class="eyebrow">люди</span><h2>Короли, паны и вымышленные герои</h2><p>У каждого героя есть отметка: реальный ли это человек, вымышленный персонаж или персонаж с историческим прототипом.</p></div><a class="more" href="#s-people">Все люди →</a></div>
      <div class="people">${ppl.map(a => spWrap(a.sp, `<a class="person" href="#a-${a.id}"><div class="frame"><img src="${tsrc(a.img)}" alt="${imgAlt(a.img)}" loading="lazy"></div><h3>${esc(a.t)}</h3>${badge(a.kind)}</a>`)).join('')}</div>
    </div></section>

    <section class="block" style="padding-top:0"><div class="wrap split">
      <a class="panel panel-link" href="#herbal"><span class="eyebrow">травник</span><h3>Травы и зелья игры</h3><p>${K.herbs.length} трав с ботаническими гравюрами и средневековыми рецептами, ${K.potions.length} зелий, ядов и духов с порядком варки.</p>${strip4(['h_belladonna', 'h_sage', 'h_stjohn', 'h_poppy'])}</a>
      <a class="panel panel-link" href="#music"><span class="eyebrow">музыка</span><h3>Саундтрек Валты и Спорки</h3><p>Официальный саундтрек KCD II в Spotify и песни, которые звучали в Богемии около 1400 года.</p>${strip4(['m_musicians', 'm_manesse', 'm_jistebnice', 'm_hospodine'])}</a>
    </div></section>

    <section class="block" style="padding-top:0"><div class="wrap split">
      <div class="panel"><span class="eyebrow">хронология</span><h3>Как дошло до 1403 года</h3><p>От смерти Карла IV до пленения Вацлава: ключевые даты, которые объясняют начало игры.</p>
        <div class="tl-teaser">${K.home.years.map(y => `<a href="#timeline-${y.i}"><b>${y.y}</b><span>${esc(y.t)}</span></a>`).join('')}</div>
        <p style="margin-top:14px"><a class="more" href="#timeline">Вся хронология →</a></p></div>
      <div class="panel"><span class="eyebrow">галерея</span><h3>Миниатюры, гравюры, кадры игры</h3><p>Средневековые рукописи, старые гравюры, фотографии мест сегодня и скриншоты игры.</p>
        ${galHTML(K.home.gallery)}
        <p style="margin-top:14px"><a class="more" href="#gallery">Все ${nImg} изображений →</a></p></div>
    </div></section>`;
    $('#hero-search').addEventListener('submit', e => { e.preventDefault(); openSearch($('#hq').value); });
  }

  function pageSection(id) {
    const s = SEC[id]; if (!s) return page404();
    setNav('s-' + id); setTitle(s.t);
    const list = bySec(id);
    const tags = [...new Set(list.flatMap(a => a.tags || []))];
    app.innerHTML = `<div class="wrap"><header class="page-head"><span class="eyebrow">раздел</span><h1>${esc(s.t)}</h1><p>${esc(s.long || s.d)}</p></header>
      ${tags.length > 1 ? `<div class="filters"><div class="chips" id="tagf"><button class="chip" type="button" aria-pressed="true" data-t="">Все</button>${tags.map(t => `<button class="chip" type="button" aria-pressed="false" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>` : ''}
      <div class="cards" id="cards" style="margin-bottom:60px">${list.map(card).join('')}</div></div>`;
    const tf = $('#tagf');
    if (tf) tf.addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      $$('[data-t]', tf).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const t = b.dataset.t; $('#cards').innerHTML = list.filter(a => !t || (a.tags || []).includes(t)).map(card).join('');
    });
  }

  function pageArticle(id) {
    const a = A[id]; if (!a) return page404();
    const s = SEC[a.sec]; setNav('s-' + a.sec); setTitle(a.t);
    let body = a.body.replace(/<fig ([\w-]+)( half)?\s*\/?>/g, (m, iid, half) => figHTML(iid, half ? 'half' : ''));
    body = body.replace(/<sp (act1|full)>([\s\S]*?)<\/sp>/g, (m, lv, inner) => spWrap(lv, inner));
    body = body.replace(/<fact( t="([^"]*)")?>([\s\S]*?)<\/fact>/g, (m, _, t, inner) => `<aside class="fact"><b class="t">${esc(t || 'Интересный факт')}</b><p>${inner}</p></aside>`);
    const heads = []; body = body.replace(/<h2>(.*?)<\/h2>/g, (m, h) => { const hid = 'h-' + heads.length; heads.push([hid, h.replace(/<[^>]+>/g, '')]); return `<h2 id="${hid}">${h}</h2>`; });
    const gm = a.gm ? spWrap(a.gm.sp, `<section class="gvh" aria-label="В игре и в истории"><div class="gvh-head"><h3>В игре / В истории</h3></div><div class="gvh-grid">
      <div class="gvh-col k-ok"><h4><i></i>Передано точно</h4><p>${a.gm.ok}</p></div>
      <div class="gvh-col k-simp"><h4><i></i>Упрощено</h4><p>${a.gm.simp}</p></div>
      <div class="gvh-col k-inv"><h4><i></i>Придумано или сдвинуто</h4><p>${a.gm.inv}</p></div></div></section>`) : '';
    const later = a.later ? spWrap(a.laterSp || 'none', `<section class="later"><h3>Что было дальше</h3><p>${a.later}</p><span class="note">История после 1403 года. Игру это не раскрывает, если не отмечено иначе.</span></section>`) : '';
    const gal = (a.gal || []).filter(x => IMG[x]);
    const rel = (a.rel || []).map(r => A[r]).filter(Boolean);
    const list = bySec(a.sec), idx = list.indexOf(a), prev = list[idx - 1], next = list[idx + 1];
    const facts = a.facts && a.facts.length ? `<div class="toc-box"><h4>коротко</h4><dl class="facts-mini">${a.facts.map(f => `<div><dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd></div>`).join('')}</dl></div>` : '';
    const saved = SAVED.includes(a.id);
    const html = `
      <header class="art-hero"><img src="${fsrc(a.img)}" alt="${imgAlt(a.img)}" data-lb="${a.img}">
        <div class="wrap"><nav class="crumbs" aria-label="Навигация"><a href="#home">Главная</a><span>/</span><a href="#s-${s.id}">${esc(s.t)}</a></nav>
          <h1>${esc(a.t)}</h1>
          <div class="names">${a.game ? `<span><b>в игре</b>${esc(a.game)}</span>` : ''}${a.cs ? `<span><b>чеш.</b>${esc(a.cs)}</span>` : ''}${a.de ? `<span><b>нем.</b>${esc(a.de)}</span>` : ''}</div>
          <div class="art-tools">${badge(a.kind)}
            <button class="btn" type="button" id="b-save" aria-pressed="${saved}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4z"/></svg><span>${saved ? 'В закладках' : 'В закладки'}</span></button>
            <button class="btn" type="button" id="b-read" aria-pressed="${READ.has(a.id)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 5 5 9-10"/></svg><span>${READ.has(a.id) ? 'Прочитано' : 'Отметить прочитанным'}</span></button>
            <button class="btn" type="button" id="b-copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg><span>Ссылка</span></button>
          </div></div></header>
      <div class="wrap art-layout">
        <article class="prose" id="prose">
          <p class="lede">${a.lead}</p>
          ${body}
          ${gm}
          ${later}
          ${gal.length ? `<h2 id="h-gal">Галерея</h2>${galHTML(gal)}` : ''}
          ${rel.length ? `<section class="related"><h2>Связанные статьи</h2><div class="cards">${rel.map(card).join('')}</div></section>` : ''}
          ${a.src && a.src.length ? `<section class="srcs"><h2>Источники</h2><ol>${a.src.map(x => `<li>${x[1] ? `<a href="${esc(x[1])}" target="_blank" rel="noopener">${esc(x[0])}</a>` : esc(x[0])}</li>`).join('')}</ol></section>` : ''}
          <nav class="prev-next" aria-label="Соседние статьи">${prev ? `<a href="#a-${prev.id}"><small>← назад</small>${esc(prev.t)}</a>` : '<span></span>'}${next ? `<a class="nx" href="#a-${next.id}"><small>дальше →</small>${esc(next.t)}</a>` : '<span></span>'}</nav>
        </article>
        <aside class="toc">${heads.length > 1 ? `<div class="toc-box"><h4>содержание</h4><ol id="toc">${heads.map(h => `<li><a href="#a-${a.id}" data-to="${h[0]}">${esc(h[1])}</a></li>`).join('')}${gal.length ? `<li><a href="#a-${a.id}" data-to="h-gal">Галерея</a></li>` : ''}</ol></div>` : ''}${facts}</aside>
      </div>`;
    app.innerHTML = spWrap(a.sp, html);
    linkGlossary($('#prose'));
    const lbList = [a.img, ...((a.body.match(/<fig ([\w-]+)/g) || []).map(x => x.slice(5))), ...gal];
    app._lb = [...new Set(lbList)];
    $('#b-save').onclick = e => { const on = toggleSaved(a.id); const b = e.currentTarget; b.setAttribute('aria-pressed', on); $('span', b).textContent = on ? 'В закладках' : 'В закладки'; toast(on ? 'Добавлено в закладки' : 'Убрано из закладок'); };
    $('#b-read').onclick = e => { const b = e.currentTarget; if (READ.has(a.id)) { READ.delete(a.id); store.set('read', [...READ]); } else markRead(a.id); const on = READ.has(a.id); b.setAttribute('aria-pressed', on); $('span', b).textContent = on ? 'Прочитано' : 'Отметить прочитанным'; };
    $('#b-copy').onclick = () => {
      const url = location.href;
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Ссылка скопирована'), () => toast(url)); else toast(url);
    };
    $$('#toc a').forEach(l => l.addEventListener('click', e => { e.preventDefault(); const t = document.getElementById(l.dataset.to); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    store.set('last', { id: a.id });
    // TOC highlight + auto-read near end
    const hs = heads.map(h => document.getElementById(h[0])).filter(Boolean);
    onScroll = () => {
      let cur = null; for (const h of hs) if (h.getBoundingClientRect().top < 140) cur = h.id;
      $$('#toc a').forEach(l => l.classList.toggle('on', l.dataset.to === cur));
      const p = $('#prose'); if (p && p.getBoundingClientRect().bottom < innerHeight + 200 && !READ.has(a.id)) { markRead(a.id); const b = $('#b-read'); if (b) { b.setAttribute('aria-pressed', 'true'); $('span', b).textContent = 'Прочитано'; } }
    };
  }

  function pageGlossary(focusId) {
    setNav('glossary'); setTitle('Глоссарий');
    const items = [...K.glossary].sort((x, y) => x.t.localeCompare(y.t, 'ru'));
    const groups = {}; items.forEach(g => { const L = g.t[0].toUpperCase(); (groups[L] = groups[L] || []).push(g); });
    const letters = Object.keys(groups);
    app.innerHTML = `<div class="wrap" style="padding-bottom:60px"><header class="page-head"><span class="eyebrow">словарь эпохи</span><h1>Глоссарий</h1><p>${items.length} терминов: титулы, деньги, доспехи, церковь, право. В статьях эти слова подчёркнуты пунктиром, при наведении всплывает определение.</p></header>
      <div class="gl-filter"><label class="sr" for="glq">Фильтр терминов</label><input id="glq" type="search" placeholder="Фильтр: начните вводить термин"></div>
      <nav class="gl-letters" aria-label="Буквы">${letters.map(L => `<a href="#glossary" data-L="${L}">${L}</a>`).join('')}</nav>
      <div id="gl-body">${letters.map(L => `<section class="gl-group" data-L="${L}"><h2 id="L-${L}">${L}</h2><dl class="gl-list">${groups[L].map(g => `<div class="gl-item" id="g-${g.id}" data-s="${esc((g.t + ' ' + (g.cs || '') + ' ' + (g.aka || '') + ' ' + g.d).toLowerCase())}"><dt>${esc(g.t)}${g.cs ? `<small>${esc(g.cs)}</small>` : ''}</dt><dd>${esc(g.d)}${g.a && A[g.a] ? ` <a href="#a-${g.a}">Статья →</a>` : ''}</dd></div>`).join('')}</dl></section>`).join('')}</div></div>`;
    $('.gl-letters').addEventListener('click', e => { const l = e.target.closest('[data-L]'); if (!l) return; e.preventDefault(); document.getElementById('L-' + l.dataset.L).scrollIntoView({ behavior: 'smooth' }); });
    $('#glq').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      $$('.gl-item').forEach(it => it.hidden = q && !it.dataset.s.includes(q));
      $$('.gl-group').forEach(g => g.hidden = !$$('.gl-item', g).some(i => !i.hidden));
    });
    if (focusId) { const el = document.getElementById('g-' + focusId); if (el) { el.classList.add('hl'); setTimeout(() => el.scrollIntoView({ block: 'center' }), 30); } }
  }

  const TLC = { pol: 'Политика', war: 'Война', church: 'Церковь', cult: 'Культура', game: 'Игра' };
  function pageTimeline(focus) {
    setNav('timeline'); setTitle('Хронология');
    let filt = '';
    const years = [...new Set(K.timeline.map(e => e.y))];
    app.innerHTML = `<div class="wrap"><header class="page-head"><span class="eyebrow">1346 — 1437</span><h1>Хронология</h1><p>Лента событий от коронации Карла IV до смерти Сигизмунда. Самая плотная часть приходится на 1400–1403 годы: это фон, на котором начинается игра. Листайте мышью, колесом или стрелками.</p></header>
      <div class="tl-ctl"><div class="chips" id="tlf"><button class="chip" type="button" aria-pressed="true" data-c="">Все</button>${Object.entries(TLC).map(([k, v]) => `<button class="chip" type="button" aria-pressed="false" data-c="${k}">${v}</button>`).join('')}</div>
      <div class="tl-nav"><button class="iconbtn" type="button" id="tl-l" aria-label="Назад по ленте"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg></button><button class="iconbtn" type="button" id="tl-r" aria-label="Вперёд по ленте"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></button></div></div>
      <div class="tl-years" id="tl-years">${years.filter((y, i) => i === 0 || y - years[i - 1] > 2 || y >= 1400 && y <= 1410 || y % 10 === 0).map(y => `<button type="button" data-y="${y}">${y}</button>`).join('')}</div></div>
      <div class="tl" id="tl" tabindex="0" aria-label="Лента событий"><div class="tl-track" id="tl-track"></div></div>
      <div class="wrap" style="padding-bottom:50px"><p class="eyebrow" style="margin-top:6px">цвет верхней кромки карточки: золото — политика, красный — война, лиловый — церковь, синий — культура, зелёный — события игры</p></div>`;
    const draw = () => {
      $('#tl-track').innerHTML = K.timeline.map((e, i) => (filt && e.c !== filt) ? '' : `<div class="ev c-${e.c}" id="ev-${i}" data-y="${e.y}"><div class="yr">${e.y}</div>${spWrap(e.sp, `<div class="box"><span class="d">${esc(e.d || '')}${e.d ? ' · ' : ''}${TLC[e.c]}</span><h4>${esc(e.t)}</h4><p>${esc(e.p)}</p>${e.a && A[e.a] ? `<a class="go" href="#a-${e.a}">Подробнее →</a>` : ''}</div>`)}</div>`).join('');
    };
    draw();
    const tl = $('#tl');
    $('#tlf').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; filt = b.dataset.c; $$('#tlf .chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); tl.scrollLeft = 0; });
    $('#tl-l').onclick = () => tl.scrollBy({ left: -560, behavior: 'smooth' });
    $('#tl-r').onclick = () => tl.scrollBy({ left: 560, behavior: 'smooth' });
    $('#tl-years').addEventListener('click', e => { const b = e.target.closest('[data-y]'); if (!b) return; const ev = $(`.ev[data-y="${b.dataset.y}"]`, tl); if (ev) tl.scrollTo({ left: ev.offsetLeft - 20, behavior: 'smooth' }); });
    tl.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { tl.scrollBy({ left: 280, behavior: 'smooth' }); e.preventDefault(); } if (e.key === 'ArrowLeft') { tl.scrollBy({ left: -280, behavior: 'smooth' }); e.preventDefault(); } });
    tl.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { tl.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    let down = null;
    tl.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.target.closest('a,button')) return; down = { x: e.clientX, s: tl.scrollLeft }; tl.classList.add('drag'); });
    addEventListener('pointermove', e => { if (down) tl.scrollLeft = down.s - (e.clientX - down.x); });
    addEventListener('pointerup', () => { down = null; tl.classList.remove('drag'); });
    const f = focus != null ? document.getElementById('ev-' + focus) : $('.ev[data-y="1400"]', tl);
    if (f) { setTimeout(() => { tl.scrollLeft = f.offsetLeft - 20; }, 20); if (focus != null) f.classList.add('focus'); }
  }

  /* ---------- map ---------- */
  const PC = { game: ['#c9a45c', 'Места игры'], kcd1: ['#8a74b8', 'Места первой части'], city: ['#5e8fb8', 'Города'], hist: ['#a33a32', 'Исторические места'] };
  function pageMap() {
    setNav('map'); setTitle('Карта');
    const M = K.map; const lat0 = 49.8 * Math.PI / 180, S = 100;
    const P = ([lon, lat]) => [((lon - M.lon0) * Math.cos(lat0) * S), ((M.lat0 - lat) * S)];
    const path = (pts, close) => 'M' + pts.map(p => P(p).map(v => v.toFixed(1)).join(',')).join('L') + (close ? 'Z' : '');
    const all = M.land.map(P); const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    const full = { x: Math.min(...xs) - 12, y: Math.min(...ys) - 12, w: Math.max(...xs) - Math.min(...xs) + 24, h: Math.max(...ys) - Math.min(...ys) + 24 };
    let vb = { ...full }; let active = null; const cats = new Set(Object.keys(PC));
    app.innerHTML = `<div class="wrap" style="padding-bottom:60px"><header class="page-head"><span class="eyebrow">география</span><h1>Карта Богемии</h1><p>Реальная география: границы современной Чехии, главные реки и места, о которых идёт речь в энциклопедии. Колесо мыши или щипок приближают, перетаскивание двигает карту. Граница Богемии и Моравии показана приблизительно.</p></header>
      <div class="filters"><div class="chips" id="mapf">${Object.entries(PC).map(([k, v]) => `<button class="chip" type="button" aria-pressed="true" data-c="${k}"><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${v[0]};margin-right:6px"></i>${v[1]}</button>`).join('')}</div>
        <div class="chips"><button class="chip" type="button" data-zoom="trosky">Регион Троски</button><button class="chip" type="button" data-zoom="kutna">Куттенберг</button><button class="chip" type="button" data-zoom="all">Вся Богемия</button></div></div>
      <div class="map-wrap"><div class="map-box" id="mapbox"><svg id="bmap" role="img" aria-label="Карта Богемии с отмеченными местами"><g id="mg"></g><g id="mp"></g></svg>
        <div class="map-ctl"><button class="iconbtn" type="button" id="zin" aria-label="Приблизить"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></button><button class="iconbtn" type="button" id="zout" aria-label="Отдалить"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg></button></div>
        <div class="map-legend">${Object.values(PC).map(v => `<span><i style="background:${v[0]}"></i>${v[1]}</span>`).join('')}<span><i style="background:#5e8fb8;border-radius:0;height:2px;width:14px"></i>реки</span></div></div>
        <div class="map-side"><div id="pop" class="pop" hidden></div><div class="pin-list" id="pinlist"></div></div></div></div>`;
    const svg = $('#bmap'), mg = $('#mg'), mp = $('#mp');
    mg.innerHTML = `<path class="map-land" d="${path(M.land, true)}"/>${M.regions.map(r => `<path class="map-region" d="${path(r.pts, true)}"><title>${esc(r.n)}</title></path>`).join('')}<path class="map-border" d="${path(M.border)}"/>${M.rivers.map(r => `<path class="map-river" d="${path(r.pts)}"/>`).join('')}
      ${M.labels.map(l => { const [x, y] = P(l.p); return `<text class="${l.r ? 'map-rlbl' : 'map-lbl'}" data-fs="${l.s || 1}" x="${x}" y="${y}" text-anchor="middle">${esc(l.n)}</text>`; }).join('')}`;
    const pins = M.pins;
    const drawPins = () => {
      const k = vb.w / full.w; const r = 3.4 * k + 0.6, fs = 9.5 * Math.max(k, .25);
      $$('text[data-fs]', mg).forEach(t => t.setAttribute('font-size', (t.dataset.fs * (t.classList.contains('map-rlbl') ? 6 : 8) * Math.max(k, .3)).toFixed(2)));
      mp.innerHTML = pins.map((p, i) => {
        if (!cats.has(p.cat)) return ''; if (p.sp && !allowed(p.sp)) return '';
        const [x, y] = P(p.p); const showLbl = k < .45 || p.big;
        return `<g class="pin ${active === i ? 'on' : ''}" data-i="${i}" tabindex="0" role="button" aria-label="${esc(p.n)}"><circle class="o" cx="${x}" cy="${y}" r="${(p.big ? r * 1.35 : r).toFixed(2)}" fill="${PC[p.cat][0]}"/>${showLbl ? `<text x="${(x + r * 1.6).toFixed(1)}" y="${(y + fs * .35).toFixed(1)}" font-size="${fs.toFixed(2)}">${esc(p.n)}</text>` : ''}</g>`;
      }).join('');
      svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    };
    const list = () => {
      $('#pinlist').innerHTML = pins.map((p, i) => (!cats.has(p.cat) || (p.sp && !allowed(p.sp))) ? '' : `<button type="button" data-i="${i}" class="${active === i ? 'on' : ''}"><i style="background:${PC[p.cat][0]}"></i>${esc(p.n)}</button>`).join('');
    };
    const select = i => {
      active = i; const p = pins[i]; const a = p.a && A[p.a];
      const pop = $('#pop'); pop.hidden = false;
      pop.innerHTML = `${p.img && IMG[p.img] ? `<img src="${tsrc(p.img)}" alt="${imgAlt(p.img)}">` : ''}<div class="bd"><span class="eyebrow">${PC[p.cat][1]}</span><h3>${esc(p.n)}</h3>${p.alt ? `<span class="eyebrow" style="color:var(--muted)">${esc(p.alt)}</span>` : ''}<p>${esc(p.d)}</p>${a ? `<a class="more" href="#a-${a.id}">Статья: ${esc(a.t)} →</a>` : ''}</div>`;
      drawPins(); list();
    };
    const zoomTo = (cx, cy, f) => {
      const nw = Math.min(full.w * 1.2, Math.max(full.w / 14, vb.w * f)), nh = nw * (vb.h / vb.w);
      vb = { x: cx - (cx - vb.x) * (nw / vb.w), y: cy - (cy - vb.y) * (nh / vb.h), w: nw, h: nh }; drawPins();
    };
    const fitBox = () => { const r = svg.getBoundingClientRect(); const ar = r.height / r.width || .62; const cx = full.x + full.w / 2, cy = full.y + full.h / 2; const w = Math.max(full.w, full.h / ar); vb = { x: cx - w / 2, y: cy - w * ar / 2, w, h: w * ar }; };
    const focusArea = key => {
      const z = M.zooms[key]; if (!z) { fitBox(); drawPins(); return; }
      const [x1, y1] = P([z[0], z[3]]), [x2, y2] = P([z[2], z[1]]);
      const r = svg.getBoundingClientRect(); const ar = r.height / r.width || .62; const w = Math.max(x2 - x1, (y2 - y1) / ar);
      vb = { x: (x1 + x2) / 2 - w / 2, y: (y1 + y2) / 2 - w * ar / 2, w, h: w * ar }; drawPins();
    };
    fitBox(); drawPins(); list();
    const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(); return [vb.x + (cx - r.left) / r.width * vb.w, vb.y + (cy - r.top) / r.height * vb.h]; };
    svg.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = toSvg(e.clientX, e.clientY); zoomTo(x, y, e.deltaY > 0 ? 1.18 : 1 / 1.18); }, { passive: false });
    const ptrs = new Map(); let pan = null, pinch = null, moved = false;
    svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = false; if (ptrs.size === 1) pan = { x: e.clientX, y: e.clientY, vb: { ...vb } }; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), w: vb.w }; pan = null; } svg.classList.add('drag'); });
    svg.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      const r = svg.getBoundingClientRect();
      if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const [x, y] = toSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); zoomTo(x, y, (pinch.w * pinch.d / d) / vb.w); moved = true; return; }
      if (pan) { const dx = e.clientX - pan.x, dy = e.clientY - pan.y; if (Math.abs(dx) + Math.abs(dy) > 4) moved = true; vb = { ...vb, x: pan.vb.x - dx / r.width * vb.w, y: pan.vb.y - dy / r.height * vb.h }; svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); }
    });
    const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { pan = null; svg.classList.remove('drag'); } };
    svg.addEventListener('pointerup', e => { const g = e.target.closest('.pin'); if (g && !moved) select(+g.dataset.i); up(e); });
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('keydown', e => { const g = e.target.closest('.pin'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(+g.dataset.i); } });
    $('#zin').onclick = () => zoomTo(vb.x + vb.w / 2, vb.y + vb.h / 2, 1 / 1.5);
    $('#zout').onclick = () => zoomTo(vb.x + vb.w / 2, vb.y + vb.h / 2, 1.5);
    $('#pinlist').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; const i = +b.dataset.i; const [x, y] = P(pins[i].p); const w = Math.min(vb.w, full.w / 4); vb = { x: x - w / 2, y: y - w * (vb.h / vb.w) / 2, w, h: w * (vb.h / vb.w) }; select(i); });
    $('#mapf').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; const c = b.dataset.c; if (cats.has(c)) cats.delete(c); else cats.add(c); b.setAttribute('aria-pressed', String(cats.has(c))); drawPins(); list(); });
    $$('[data-zoom]').forEach(b => b.onclick = () => focusArea(b.dataset.zoom));
    const start = pins.findIndex(p => p.n === 'Троски'); if (start >= 0) select(start);
  }

  function pageGallery() {
    setNav('gallery'); setTitle('Галерея');
    const ids = Object.keys(IMG);
    const TY = { ms: 'Рукописи и гравюры', photo: 'Фото мест и вещей', game: 'Кадры и арт игры' };
    let f = '';
    app.innerHTML = `<div class="wrap" style="padding-bottom:60px"><header class="page-head"><span class="eyebrow">${ids.length} изображений</span><h1>Галерея</h1><p>Все иллюстрации энциклопедии. Средневековые рукописи и гравюры находятся в общественном достоянии, фотографии распространяются по свободным лицензиям, кадры игры принадлежат Warhorse Studios и Deep Silver и приведены для личного справочного использования.</p></header>
      <div class="filters"><div class="chips" id="galf"><button class="chip" type="button" aria-pressed="true" data-t="">Все</button>${Object.entries(TY).map(([k, v]) => `<button class="chip" type="button" aria-pressed="false" data-t="${k}">${v} · ${ids.filter(i => IMG[i].ty === k).length}</button>`).join('')}</div></div>
      <div id="galbox"></div></div>`;
    const draw = () => { const list = ids.filter(i => !f || IMG[i].ty === f); app._lb = list; $('#galbox').innerHTML = galHTML(list, true); };
    draw();
    $('#galf').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; f = b.dataset.t; $$('#galf .chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); });
  }

  function pageSaved() {
    setNav('saved'); setTitle('Мои закладки');
    const sv = SAVED.map(id => A[id]).filter(Boolean);
    const total = K.articles.length, nr = K.articles.filter(a => READ.has(a.id)).length;
    app.innerHTML = `<div class="wrap" style="padding-bottom:60px"><header class="page-head"><span class="eyebrow">личное</span><h1>Мои закладки</h1><p>Закладки и отметки о прочтении хранятся только в этом браузере. Прочитано статей: <b>${nr}</b> из ${total}.</p></header>
      ${sv.length ? `<div class="cards">${sv.map(card).join('')}</div>` : `<div class="empty">Закладок пока нет. Откройте любую статью и нажмите «В закладки».</div>`}
      <h2 style="font-size:1.8rem;margin:40px 0 14px">Что ещё не прочитано</h2>
      <div class="cards">${K.articles.filter(a => !READ.has(a.id) && allowed(a.sp)).slice(0, 6).map(card).join('')}</div></div>`;
  }

  function pageSources() {
    setNav('sources'); setTitle('Источники');
    const ids = Object.keys(IMG);
    app.innerHTML = `<div class="wrap" style="padding-bottom:60px"><header class="page-head"><span class="eyebrow">откуда всё это</span><h1>Источники и права</h1><p>Тексты энциклопедии написаны по научно-популярной и справочной литературе и сверены с несколькими источниками. Где факты расходятся или неизвестны, это сказано прямо. Ниже список литературы и атрибуция каждого изображения.</p></header>
      <h2 style="font-size:1.8rem;margin-bottom:12px">Литература и справочные ресурсы</h2>
      <ol class="lit">${K.lit.map(x => `<li>${x[1] ? `<a href="${esc(x[1])}" target="_blank" rel="noopener">${esc(x[0])}</a>` : esc(x[0])}${x[2] ? ` <span style="color:var(--muted)">— ${esc(x[2])}</span>` : ''}</li>`).join('')}</ol>
      <h2 style="font-size:1.8rem;margin:36px 0 12px">Изображения · ${ids.length}</h2>
      <div class="credits-wrap"><table class="credits"><thead><tr><th></th><th>Подпись</th><th>Автор / правообладатель</th><th>Лицензия</th><th>Источник</th></tr></thead><tbody>
      ${ids.map(id => { const m = IMG[id]; return `<tr><td><img src="${tsrc(id)}" alt="" loading="lazy"></td><td>${esc(m.cap)}</td><td>${esc(m.by)}</td><td>${esc(m.lic)}</td><td>${m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">ссылка</a>` : ''}</td></tr>`; }).join('')}
      </tbody></table></div></div>`;
  }

  /* ---------- herbal ---------- */
  const PTYPE = { potion: ['Зелья', 'зелье'], poison: ['Яды', 'яд'], perfume: ['Духи', 'духи'], other: ['Прочее', 'прочее'], powder: ['Порох', 'порох'] };
  const BASE = { aqua: 'вода (Aqua)', vinum: 'вино (Vinum)', oleum: 'масло (Oleum)', spiritus: 'спирт (Spiritus)' };
  const usedIn = id => K.potions.filter(p => p.ing.some(x => x[0] === id));
  const ingChip = ([k, n]) => HB[k] ? `<a class="chip" href="#herb-${k}">${n > 1 ? n + ' × ' : ''}${esc(HB[k].t)}</a>` : `<span class="chip">${n > 1 ? n + ' × ' : ''}${esc(K.extraIng[k] || k)}</span>`;
  function herbCard(h) {
    const u = usedIn(h.id);
    return `<a class="herb" href="#herb-${h.id}"><div class="herb-ph"><img src="${tsrc(h.img)}" alt="${imgAlt(h.img)}" loading="lazy"></div><div class="bd"><span class="alt">${esc(h.game)}</span><h3>${esc(h.t)}</h3><i class="lat">${esc(h.lat)}</i><div class="meta">${h.tox ? `<span class="badge b-sp">${esc(h.tox)}</span>` : ''}${h.dlc ? `<span class="badge b-proto">${esc(h.dlc)}</span>` : ''}${h.special ? '<span class="badge b-fict">особый ингредиент</span>' : ''}</div><p>${u.length ? 'Входит в: ' + u.map(p => esc(p.t)).join(', ') : 'В рецептах игры не встречается'}</p></div></a>`;
  }
  function potionCard(p) {
    return `<a class="potion t-${p.type}" href="#potion-${p.id}"><div class="pt-head"><span class="badge">${PTYPE[p.type][1]}</span>${p.dlc ? `<span class="badge b-proto">${esc(p.dlc)}</span>` : ''}</div><h3>${esc(p.t)}</h3><span class="alt">${esc(p.game)}</span><p>${esc(p.eff)}</p><div class="pt-ing"><b>${BASE[p.base].split(' ')[0]}</b> + ${p.ing.map(x => esc((x[1] > 1 ? x[1] + '× ' : '') + ingName(x[0]).split(' (')[0].toLowerCase())).join(', ')}</div></a>`;
  }
  function pageHerbal(tab) {
    setNav('herbal'); setTitle('Травник');
    let pf = '';
    const nH = K.herbs.length, nP = K.potions.length;
    app.innerHTML = `<div class="wrap" style="padding-bottom:60px"><header class="page-head"><span class="eyebrow">алхимия KCD II</span><h1>Травник</h1><p>${nH} трав и особых ингредиентов, ${nP} рецептов зелий, ядов, духов и пороха. У каждой травы — где её искать в игре, как ею лечили в Средневековье и в какие рецепты она входит. Названия зелий даны в переводе энциклопедии: в русской версии игры они могут звучать иначе.</p></header>
      <div class="filters"><div class="chips" role="tablist"><a class="chip" role="tab" href="#herbal" aria-pressed="${tab === 'herbs'}">Травы · ${nH}</a><a class="chip" role="tab" href="#herbal-potions" aria-pressed="${tab === 'potions'}">Зелья · ${nP}</a></div>
      ${tab === 'potions' ? `<div class="chips" id="ptf"><button class="chip" type="button" aria-pressed="true" data-t="">Все</button>${Object.entries(PTYPE).map(([k, v]) => `<button class="chip" type="button" aria-pressed="false" data-t="${k}">${v[0]} · ${K.potions.filter(p => p.type === k).length}</button>`).join('')}<button class="chip" type="button" aria-pressed="false" data-t="dlc">Дополнения</button></div>` : ''}</div>
      ${tab === 'herbs' ? `<div class="herbs">${K.herbs.map(herbCard).join('')}</div>
        <h2 class="sub-h">Основы и прочие ингредиенты</h2><dl class="ing-list">${K.ingredients.map(i => `<div><dt>${esc(i[0])}</dt><dd>${esc(i[1])}</dd></div>`).join('')}</dl>`
      : `<section class="brew"><h2 class="sub-h">Как варят зелья</h2><ol class="brew-steps"><li><b>Основа.</b> Наливают воду, вино, масло или спирт — от неё зависит, какие вещества трава отдаст.</li><li><b>Травы.</b> Одни кладут целиком, другие сначала толкут в ступке.</li><li><b>Варка.</b> Время отмеряют песочными часами — «оборотами». Мехи усиливают жар.</li><li><b>Финал.</b> Отвар сливают в склянку или перегоняют через перегонный куб.</li></ol><p class="note">Ошибка в порядке или времени снижает качество зелья. Порядок шагов в рецептах ниже — по гайдам к игре.</p></section><div class="potions" id="potions"></div>`}
    </div>`;
    if (tab === 'potions') {
      const draw = () => { $('#potions').innerHTML = K.potions.filter(p => !pf || (pf === 'dlc' ? p.dlc : p.type === pf)).map(potionCard).join(''); };
      draw();
      $('#ptf').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; pf = b.dataset.t; $$('#ptf .chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); });
    }
  }
  function pageHerb(id) {
    const h = HB[id]; if (!h) return page404();
    setNav('herbal'); setTitle(h.t);
    const u = usedIn(id);
    app.innerHTML = `<div class="wrap herb-page"><nav class="crumbs crumbs-dark" aria-label="Навигация"><a href="#home">Главная</a><span>/</span><a href="#herbal">Травник</a></nav>
      <div class="herb-layout"><figure class="herb-plate"><img src="${fsrc(h.img)}" alt="${imgAlt(h.img)}" data-lb="${h.img}"><figcaption>${esc(IMG[h.img].cap)} <span class="cr">— ${credit(h.img)}</span></figcaption></figure>
      <div class="prose" id="prose"><span class="eyebrow">${h.special ? 'особый ингредиент' : 'трава'}</span><h1 class="herb-title">${esc(h.t)}</h1>
        <div class="names names-dark"><span><b>в игре</b>${esc(h.game)}</span><span><b>лат.</b><i>${esc(h.lat)}</i></span><span><b>чеш.</b>${esc(h.cs)}</span></div>
        <div class="meta" style="margin:10px 0 18px">${h.tox ? `<span class="badge b-sp">${esc(h.tox)}</span>` : ''}${h.dlc ? `<span class="badge b-proto">${esc(h.dlc)}</span>` : ''}</div>
        <h2>Где найти в игре</h2><p>${esc(h.where)}</p>
        <h2>В истории</h2><p>${esc(h.hist)}</p>
        ${h.fact ? `<aside class="fact"><b class="t">Интересный факт</b><p>${esc(h.fact)}</p></aside>` : ''}
        ${h.tox ? `<aside class="fact"><b class="t">Осторожно</b><p>Растение ${esc(h.tox)}. Описание дано для истории и игры, а не как руководство к применению.</p></aside>` : ''}
        <h2>Рецепты с этой травой</h2>${u.length ? `<div class="potions potions-sm">${u.map(potionCard).join('')}</div>` : '<p>В рецептах игры не встречается.</p>'}
        <p style="margin-top:24px"><a class="more" href="#a-medicine">Статья «Медицина, травы и кровопускание» →</a></p>
      </div></div></div>`;
    linkGlossary($('#prose'));
  }
  function pagePotion(id) {
    const p = PT[id]; if (!p) return page404();
    setNav('herbal'); setTitle(p.t);
    const herbs = p.ing.map(x => HB[x[0]]).filter(Boolean);
    app.innerHTML = `<div class="wrap herb-page"><nav class="crumbs crumbs-dark" aria-label="Навигация"><a href="#home">Главная</a><span>/</span><a href="#herbal-potions">Зелья</a></nav>
      <div class="potion-page prose" id="prose"><span class="eyebrow">${PTYPE[p.type][1]}${p.dlc ? ' · дополнение ' + esc(p.dlc) : ''}</span><h1 class="herb-title">${esc(p.t)}</h1>
        <div class="names names-dark"><span><b>в игре</b>${esc(p.game)}</span></div>
        <p class="lede-sm">${esc(p.eff)}</p>
        <h2>Ингредиенты</h2><p><b>Основа:</b> ${BASE[p.base]}</p><div class="chips">${p.ing.map(ingChip).join('')}</div>
        ${p.steps ? `<h2>Порядок варки</h2><ol class="brew-steps">${p.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : '<p class="note">Пошаговый рецепт этого зелья в открытых гайдах не описан; состав указан по списку игры.</p>'}
        ${p.hist ? `<aside class="fact"><b class="t">История</b><p>${esc(p.hist)}</p></aside>` : ''}
        ${herbs.length ? `<h2>Травы</h2><div class="herbs herbs-sm">${herbs.map(herbCard).join('')}</div>` : ''}
        <p style="margin-top:24px"><a class="more" href="#a-alchemy">Статья «Алхимия» →</a></p>
      </div></div>`;
    linkGlossary($('#prose'));
  }

  /* ---------- music ---------- */
  const canEmbed = () => location.protocol === 'file:';
  function pageMusic() {
    setNav('music'); setTitle('Музыка');
    const M = K.music, emb = canEmbed();
    const sp = a => emb
      ? `<div class="player"><iframe title="${esc(a.t)}" src="https://open.spotify.com/embed/album/${a.id}?utm_source=generator&theme=0" width="100%" height="352" frameborder="0" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div><p class="note" style="margin-top:8px">Плеер не появился? <a href="https://open.spotify.com/album/${a.id}" target="_blank" rel="noopener">Откройте альбом в Spotify</a>.</p>`
      : `<a class="player-link" href="https://open.spotify.com/album/${a.id}" target="_blank" rel="noopener"><span class="pl-ico" aria-hidden="true">♪</span><span><b>${esc(a.t)}</b><small>Открыть в Spotify →</small></span></a>`;
    app.innerHTML = `<div class="wrap" style="padding-bottom:60px"><header class="page-head"><span class="eyebrow">саундтрек и музыка эпохи</span><h1>Музыка</h1><p>Музыку обеих частей написали чешские композиторы Ян Валта и Адам Спорка — двоюродные братья, работающие вместе с 2014 года. Ниже официальный саундтрек KCD II и немного о том, как звучала Богемия около 1400 года.</p></header>
      ${emb ? '' : `<p class="note embed-note">${/claude|anthropic/i.test(location.hostname) ? 'Встроенные плееры в этой версии сайта не загружаются: просмотрщик claude.ai запрещает сторонние фреймы.' : 'Spotify не работает в России, поэтому вместо встроенных плееров здесь ссылки.'} Кнопки откроют альбомы в Spotify, а в локальной копии сайта плееры работают прямо на странице.</p>`}
      <div class="music-grid">${M.spotify.map(a => `<section class="panel"><span class="eyebrow">Spotify</span><h3>${esc(a.t)}</h3><p>${esc(a.d)}</p>${sp(a)}</section>`).join('')}</div>
      <section class="panel" style="margin-top:22px"><span class="eyebrow">Яндекс Музыка</span><h3>Официального саундтрека нет</h3><p>Альбомов KCD II в каталоге Яндекс Музыки нет: ни основного, ни расширенного (проверено ${esc(M.yandex.checked)}). Есть только оркестровая версия главной темы первой игры в исполнении ${esc(M.yandex.cover.by)}.</p>
        ${emb ? `<div class="player"><iframe title="${esc(M.yandex.cover.t)}" src="https://music.yandex.ru/iframe/album/${M.yandex.cover.album}/track/${M.yandex.cover.track}" width="100%" height="180" frameborder="0" loading="lazy" allow="clipboard-write"></iframe></div>` : ''}
        <p><a class="more" href="https://music.yandex.ru/album/${M.yandex.cover.album}/track/${M.yandex.cover.track}" target="_blank" rel="noopener">${esc(M.yandex.cover.t)} →</a><br><a class="more" href="${esc(M.yandex.search)}" target="_blank" rel="noopener">Проверить поиск в Яндекс Музыке →</a></p></section>
      <div class="split" style="margin-top:22px">
        <section class="panel"><span class="eyebrow">как устроена музыка игры</span><h3>Атмосферы и лейтмотивы</h3><p>Ещё для первой части Валта и Спорка разделили музыку на три среды: пастораль (поля и леса), город и монастырь. Короткие «атмосферы» привязаны к местам, у героев и событий есть лейтмотивы, а специальный движок плавно переключает фрагменты в зависимости от происходящего.</p><p>В корчмах звучат блокфлейты, шалмеи, лютни, фидели и крумгорны, в монастырях — мужские голоса a cappella, в сюжетных сценах — оркестр.</p></section>
        <section class="panel"><span class="eyebrow">расширенный саундтрек</span><h3>${M.extended.length} альбомов</h3><p>После релиза вышел расширенный саундтрек, разбитый по регионам и ситуациям:</p><ul class="plain">${M.extended.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p>Где ещё слушать: ${M.other.map(o => `<a href="${esc(o[1])}" target="_blank" rel="noopener">${esc(o[0])}</a>`).join(', ')}.</p></section>
      </div>
      <h2 class="sub-h">Как звучала Богемия около 1400 года</h2>
      <div class="split">
        <section class="panel"><h3>«Господи, помилуй нас»</h3><p>«Hospodine, pomiluj ny» — древнейшая известная чешская духовная песня, вероятно X–XI века. Её записали в трактате Яна из Голешова в 1397 году, то есть совсем незадолго до событий игры. Пели её при коронациях и в торжественных случаях.</p>${galHTML(['m_hospodine'])}</section>
        <section class="panel"><h3>«Святой Вацлав»</h3><p>Хорал «Svatý Václave, vévodo české země» XII–XIII века обращается к покровителю страны. Его пели в минуты опасности, и для чехов он был почти гимном.</p></section>
        <section class="panel"><h3>Инструменты</h3><p>Фидель (средневековая скрипка), лютня, арфа, волынка, шалмей, дудки и барабаны. Музыканты-шпильманы играли на свадьбах, ярмарках и в корчмах, при дворах звучали песни миннезингеров.</p>${galHTML(['m_musicians', 'm_manesse'])}</section>
        <section class="panel"><h3>Что будет дальше</h3><p>Через двадцать лет гуситы сделают песню оружием. Йистебницкий канционал (1420-е) сохранил боевой хорал «Ktož jsú boží bojovníci» — «Кто вы, божьи воины». Его мелодию позже процитирует Сметана в цикле «Моя родина».</p>${galHTML(['m_jistebnice'])}</section>
      </div></div>`;
  }

  function page404() { setTitle('Не найдено'); app.innerHTML = `<div class="wrap" style="padding-block:80px"><h1 style="font-size:3rem">Такой страницы нет</h1><p>Вернитесь на <a href="#home">главную</a> или воспользуйтесь поиском.</p></div>`; }

  /* ---------- router ---------- */
  let onScroll = null;
  function route() {
    hideTip(); closeOverlays(); onScroll = null; app._lb = null;
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!h || h === 'home') pageHome();
    else if (h.startsWith('a-')) pageArticle(h.slice(2));
    else if (h.startsWith('s-')) pageSection(h.slice(2));
    else if (h === 'glossary') pageGlossary();
    else if (h.startsWith('g-')) pageGlossary(h.slice(2));
    else if (h === 'timeline') pageTimeline();
    else if (h.startsWith('timeline-')) pageTimeline(+h.slice(9));
    else if (h === 'map') pageMap();
    else if (h === 'gallery') pageGallery();
    else if (h === 'saved') pageSaved();
    else if (h === 'sources') pageSources();
    else if (h === 'herbal') pageHerbal('herbs');
    else if (h === 'herbal-potions') pageHerbal('potions');
    else if (h.startsWith('herb-')) pageHerb(h.slice(5));
    else if (h.startsWith('potion-')) pagePotion(h.slice(7));
    else if (h === 'music') pageMusic();
    else page404();
    window.scrollTo(0, 0);
  }
  addEventListener('hashchange', route);
  addEventListener('scroll', () => { onScroll && onScroll(); const tt = $('#totop'); if (tt) tt.hidden = scrollY < 900; }, { passive: true });

  /* ---------- global events ---------- */
  document.addEventListener('click', e => {
    const rv = e.target.closest('[data-reveal]'); if (rv) { e.preventDefault(); e.stopPropagation(); rv.closest('.sp').classList.remove('locked'); return; }
    const lbEl = e.target.closest('[data-lb]');
    if (lbEl && !lbEl.closest('.sp.locked')) { e.preventDefault(); const id = lbEl.dataset.lb; const list = app._lb && app._lb.includes(id) ? app._lb : $$('[data-lb]', lbEl.closest('.gal, .prose, .panel') || app).map(x => x.dataset.lb); openLB([...new Set(list)], [...new Set(list)].indexOf(id)); return; }
    if (e.target.closest('[data-random]')) { e.preventDefault(); const pool = K.articles.filter(a => allowed(a.sp)); location.hash = 'a-' + pool[Math.floor(Math.random() * pool.length)].id; return; }
    const g = e.target.closest('.gl'); if (g) { if (tipEl) hideTip(); else showTip(g); }
  });
  document.addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if ((e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); openSearch(); return; }
    if (e.key === '/' && !typing) { e.preventDefault(); openSearch(); return; }
    if (e.key === 'Escape') { closeOverlays(); hideTip(); }
    const lb = $('.lb'); if (lb && lb._go) { if (e.key === 'ArrowRight') lb._go(1); if (e.key === 'ArrowLeft') lb._go(-1); }
  });
  $('#open-search').addEventListener('click', () => openSearch());
  $('#theme').addEventListener('click', () => { const t = currentTheme() === 'dark' ? 'light' : 'dark'; applyTheme(t); store.set('theme', t); });
  $$('.spoil-ctl button').forEach(b => b.addEventListener('click', () => setSpoil(b.dataset.lv)));
  $('#totop').addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  setSpoil(spoil);
  route();
})();

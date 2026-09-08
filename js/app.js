/* The Upper Crust Türkiye, v8. Vanilla + GSAP/ScrollTrigger (+ Lenis when available). Every effect degrades to a static page. */
(() => {
    'use strict';

    const ORDER_URL = 'https://uppercrustturkiye.com/online-siparis/';
    const SIZE_CM = { S: 23, L: 37, XXL: 47 };
    const SIZE_ORDER = ['S', 'L', 'XXL'];
    const CATS = ['PIZZAS', 'STARTERS', 'SALADS', 'DESSERTS', 'DRINKS'];
    const LANGS = ['TR', 'EN', 'AR', 'RU', 'DE'];
    const LOCALE = { TR: 'tr-TR', EN: 'en-GB', AR: 'tr-TR', RU: 'ru-RU', DE: 'de-DE' };
    const SIGNATURE_IDS = ['p27', 'p13', 'p4'];
    const SEASON_IMG = 'images/social/ig-1.jpg';

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const SVG = 'http://www.w3.org/2000/svg';
    const data = window.menuData || [];
    const dict = window.translations || {};
    const byId = new Map(data.map(i => [i.id, i]));
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(pointer: fine)');
    const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    const motionOK = () => hasGsap && !reduceMotion.matches;

    const store = {
        get(k, fallback) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } }
    };

    const savedLang = store.get('uc-lang', 'TR');
    const state = {
        lang: LANGS.includes(savedLang) ? savedLang : 'TR',
        cat: 'PIZZAS', size: 'L', diet: new Set(), q: '',
        tray: store.get('uc-tray', {}),
        dish: null, dishSize: 'L', dishQty: 1,
        build: { l: 'p15', r: 'p4', base: 'red', crust: 'white', size: 'L' }
    };

    /* ---------- i18n ---------- */
    const t = (key, vars) => {
        const table = dict[state.lang] || {};
        let s = table[key] ?? (dict.EN || {})[key] ?? key;
        if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
        return s;
    };
    const fmt = n => new Intl.NumberFormat(LOCALE[state.lang]).format(Math.round(n)) + ' ₺';
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function applyI18n() {
        const html = document.documentElement;
        html.lang = state.lang.toLowerCase();
        html.dir = state.lang === 'AR' ? 'rtl' : 'ltr';
        $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
        $$('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
        $$('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
        $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
        renderCats();
        renderMenu();
        renderSignature();
        renderTray();
        renderThumbs();
        renderBuilder(false);
        updateOpenStatus();
        if (state.dish) fillDish();
        splitHeadings();
        if (hasGsap) ScrollTrigger.refresh();
    }

    function setLang(lang) {
        if (!LANGS.includes(lang)) return;
        state.lang = lang;
        store.set('uc-lang', lang);
        applyI18n();
    }

    /* ---------- Header / drawer ---------- */
    function initHeader() {
        const header = $('#header');
        const sentinel = $('#top-sentinel');
        if ('IntersectionObserver' in window && sentinel) {
            new IntersectionObserver(([e]) => header.classList.toggle('is-scrolled', !e.isIntersecting), { rootMargin: '40px 0px 0px 0px' }).observe(sentinel);
        }
        const burger = $('#burger');
        const drawer = $('#drawer');
        const setDrawer = open => {
            burger.setAttribute('aria-expanded', String(open));
            drawer.classList.toggle('is-open', open);
            drawer.setAttribute('aria-hidden', String(!open));
            document.body.classList.toggle('drawer-open', open);
            document.body.style.overflow = open ? 'hidden' : '';
            if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
        };
        burger.addEventListener('click', () => setDrawer(burger.getAttribute('aria-expanded') !== 'true'));
        $$('a', drawer).forEach(a => a.addEventListener('click', () => setDrawer(false)));
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('is-open')) setDrawer(false); });
        $$('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
    }

    /* ---------- Menu ---------- */
    const priceOf = (item, size) => {
        if (item.sizes.ONE_SIZE != null) return item.sizes.ONE_SIZE;
        if (item.sizes[size] != null) return item.sizes[size];
        for (const s of SIZE_ORDER) if (item.sizes[s] != null) return item.sizes[s];
        return null;
    };
    const hasSizes = item => item.sizes.ONE_SIZE == null;

    function filtered() {
        const q = state.q.trim().toLocaleLowerCase(LOCALE[state.lang]);
        return data.filter(i =>
            (q ? true : i.cat === state.cat) &&
            [...state.diet].every(d => i.tags.includes(d)) &&
            (!q || `${i.num} ${i.name} ${i.desc} ${t('menu.cat.' + i.cat)}`.toLocaleLowerCase(LOCALE[state.lang]).includes(q))
        );
    }

    function renderCats() {
        $('#cats').innerHTML = CATS.map(c => {
            const n = data.filter(i => i.cat === c).length;
            return `<button type="button" class="cat-btn" data-cat="${c}" aria-pressed="${c === state.cat && !state.q}">${esc(t('menu.cat.' + c))}<small>${n}</small></button>`;
        }).join('');
    }

    const tagsHtml = item => item.tags.map(tag => `<span class="tag" title="${esc(t('menu.diet.' + tag))}" aria-label="${esc(t('menu.diet.' + tag))}">${tag}</span>`).join('');
    const sizesInline = item => `<span class="row-sizes">${SIZE_ORDER.filter(s => item.sizes[s] != null).map(s =>
        `<span class="${s === state.size ? 'is-on' : ''}">${s} ${fmt(item.sizes[s])}</span>`).join('')}</span>`;

    function renderMenu() {
        const list = $('#rows');
        const items = filtered();
        const searching = state.q.trim().length > 0;
        $('#lens-wrap').hidden = !items.some(hasSizes);
        $('#results').textContent = t('menu.results', { n: items.length });
        $$('.cat-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat && !searching)));

        if (!items.length) {
            list.innerHTML = `<li class="empty"><p>${esc(t('menu.empty'))}</p><button type="button" class="btn btn-ghost" id="clear-filters">${esc(t('menu.clear'))}</button></li>`;
            return;
        }
        list.innerHTML = items.map((item, idx) => {
            const price = priceOf(item, state.size);
            const num = item.num ? `<span class="row-num">${esc(item.num)}</span>` : '';
            const cat = searching ? `<span class="row-cat">${esc(t('menu.cat.' + item.cat))}</span>` : '';
            const desc = item.desc ? `<span class="row-desc">${esc(item.desc)}</span>` : '';
            const meta = (item.tags.length || hasSizes(item)) ? `<span class="row-meta">${tagsHtml(item)}${hasSizes(item) ? sizesInline(item) : ''}</span>` : '';
            return `<li class="row" style="--i:${reduceMotion.matches ? 0 : idx}">
                <button type="button" class="row-btn" data-id="${item.id}" ${item.img ? `data-img="${item.img}"` : ''} aria-haspopup="dialog" aria-label="${esc(item.name)}, ${esc(t('menu.open'))}">
                    <span class="row-head">
                        <span class="row-name">${num}${esc(item.name)}${cat}</span>
                        <span class="leader" aria-hidden="true"></span>
                        <span class="row-price" data-price>${price != null ? fmt(price) : ''}</span>
                    </span>
                    ${desc}${meta}
                </button>
            </li>`;
        }).join('');
    }

    function refreshPrices() {
        $$('.row-btn').forEach(btn => {
            const item = byId.get(btn.dataset.id);
            if (!item || !hasSizes(item)) return;
            const el = $('[data-price]', btn);
            el.classList.remove('flip'); void el.offsetWidth;
            el.textContent = fmt(priceOf(item, state.size));
            el.classList.add('flip');
            $$('.row-sizes span', btn).forEach(s => s.classList.toggle('is-on', s.textContent.startsWith(state.size + ' ')));
        });
    }

    const transition = fn => (document.startViewTransition && !reduceMotion.matches) ? document.startViewTransition(fn) : fn();

    function initMenu() {
        renderCats(); renderMenu();
        $('#cats').addEventListener('click', e => {
            const b = e.target.closest('.cat-btn'); if (!b) return;
            state.cat = b.dataset.cat;
            if (state.q) { state.q = ''; $('#menu-search').value = ''; }
            transition(renderMenu);
        });
        $$('.diet-btn').forEach(b => b.addEventListener('click', () => {
            const d = b.dataset.diet;
            state.diet.has(d) ? state.diet.delete(d) : state.diet.add(d);
            b.setAttribute('aria-pressed', String(state.diet.has(d)));
            renderMenu();
        }));
        const search = $('#menu-search'); let timer;
        search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.q = search.value; renderMenu(); }, 120); });
        document.addEventListener('keydown', e => {
            if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !$('dialog[open]')) {
                e.preventDefault(); search.focus();
                search.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
            }
        });
        $$('.lens button').forEach(b => b.addEventListener('click', () => {
            if (state.size === b.dataset.size) return;
            state.size = b.dataset.size;
            $$('.lens button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
            refreshPrices();
        }));
        $('#rows').addEventListener('click', e => {
            if (e.target.closest('#clear-filters')) {
                state.q = ''; $('#menu-search').value = ''; state.diet.clear();
                $$('.diet-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
                renderMenu(); return;
            }
            const b = e.target.closest('.row-btn'); if (b) openDish(b.dataset.id);
        });
        initPeek();
    }

    /* Floating photo that follows the cursor over rows that have one */
    function initPeek() {
        const peek = $('#peek');
        if (!peek || !finePointer.matches || !motionOK()) return;
        const rows = $('#rows');
        const xTo = gsap.quickTo(peek, 'x', { duration: 0.35, ease: 'power3' });
        const yTo = gsap.quickTo(peek, 'y', { duration: 0.35, ease: 'power3' });
        let shown = false;
        rows.addEventListener('pointerover', e => {
            const b = e.target.closest('.row-btn[data-img]');
            if (!b || b.contains(e.relatedTarget)) return;
            peek.src = b.dataset.img;
            gsap.set(peek, { x: e.clientX, y: e.clientY });
            gsap.to(peek, { opacity: 1, scale: 1, rotate: -2, duration: 0.35, ease: 'power3.out', overwrite: true });
            shown = true;
        });
        rows.addEventListener('pointermove', e => { if (shown) { xTo(e.clientX); yTo(e.clientY); } });
        rows.addEventListener('pointerout', e => {
            const b = e.target.closest('.row-btn[data-img]');
            if (!b || b.contains(e.relatedTarget)) return;
            shown = false;
            gsap.to(peek, { opacity: 0, scale: 0.8, rotate: -6, duration: 0.25, ease: 'power2.in', overwrite: true });
        });
    }

    /* ---------- Signature ---------- */
    function renderSignature() {
        const grid = $('#sig-grid');
        const cards = SIGNATURE_IDS.map((id, i) => {
            const item = byId.get(id); if (!item) return '';
            const from = hasSizes(item) ? SIZE_ORDER.map(s => `${s} ${fmt(item.sizes[s])}`).join('   ') : fmt(item.sizes.ONE_SIZE);
            return `<button type="button" class="sig ${i === 0 ? 'is-feature' : ''}" data-id="${item.id}" aria-haspopup="dialog">
                <span class="sig-media" data-reveal><img src="${item.img}" alt="" loading="lazy" decoding="async"></span>
                <span class="sig-text">
                    <span class="sig-name">${item.num ? esc(item.num) + ' ' : ''}${esc(item.name)}</span>
                    <span class="sig-desc">${esc(item.desc)}</span>
                    <span class="sig-price">${esc(from)}</span>
                </span>
            </button>`;
        });
        cards.push(`<a class="sig is-season" href="https://instagram.com/uppercrusttr" target="_blank" rel="noopener noreferrer">
            <span class="sig-media" data-reveal><img src="${SEASON_IMG}" alt="" loading="lazy" decoding="async" style="object-position:50% 40%"></span>
            <span class="sig-text">
                <span class="sig-kicker">${esc(t('signature.season'))}</span>
                <span class="sig-name">${esc(t('signature.season.name'))}</span>
                <span class="sig-desc">${esc(t('signature.season.desc'))}</span>
            </span>
        </a>`);
        grid.innerHTML = cards.join('');
        grid.onclick = e => { const b = e.target.closest('button.sig'); if (b) openDish(b.dataset.id); };
    }

    /* ---------- Dialog helpers ---------- */
    function closeDialog(d) {
        if (!d.open || d.classList.contains('is-closing')) return;
        if (window.__lenis) window.__lenis.start();
        if (reduceMotion.matches) { d.close(); return; }
        d.classList.add('is-closing');
        const done = () => { d.classList.remove('is-closing'); d.close(); };
        d.addEventListener('animationend', done, { once: true });
        setTimeout(() => { if (d.classList.contains('is-closing')) done(); }, 300);
    }
    function openModal(d) { if (window.__lenis) window.__lenis.stop(); d.showModal(); }
    function wireDialog(d) {
        d.addEventListener('cancel', e => { e.preventDefault(); closeDialog(d); });
        d.addEventListener('click', e => {
            if (e.target === d) { closeDialog(d); return; }
            if (e.target.closest('[data-close]')) closeDialog(d);
        });
    }

    /* ---------- Dish dialog ---------- */
    const dish = $('#dish');
    function openDish(id) {
        const item = byId.get(id); if (!item) return;
        state.dish = item;
        state.dishSize = hasSizes(item) && item.sizes[state.size] != null ? state.size : SIZE_ORDER.find(s => item.sizes[s] != null) || 'S';
        state.dishQty = 1;
        fillDish(); openModal(dish);
        $('.dish-body', dish).scrollTop = 0;
    }
    function fillDish() {
        const item = state.dish;
        $('#dish-visual').innerHTML = item.img
            ? `<img src="${item.img}" alt="">`
            : `<div class="dish-type"><span>${esc(item.num || t('menu.cat.' + item.cat))}</span><strong>${esc(item.name)}</strong></div>`;
        $('#dish-tags').innerHTML = tagsHtml(item);
        $('#dish-title').textContent = `${item.num ? item.num + ' ' : ''}${item.name}`;
        $('#dish-desc').textContent = item.desc || t('menu.cat.' + item.cat);
        const wrap = $('#sizes-wrap');
        if (hasSizes(item)) {
            wrap.hidden = false;
            $('#sizes').innerHTML = SIZE_ORDER.filter(s => item.sizes[s] != null).map(s =>
                `<button type="button" role="radio" class="size-opt" data-size="${s}" aria-checked="${s === state.dishSize}" style="--d:${(SIZE_CM[s] / 47).toFixed(3)}">
                    <span class="size-disc" aria-hidden="true"></span><span class="size-name">${s}</span>
                    <span class="size-cm">${SIZE_CM[s]} ${esc(t('dialog.cm'))}</span><span class="size-price">${fmt(item.sizes[s])}</span>
                </button>`).join('');
        } else wrap.hidden = true;
        $('#dish-qty').value = state.dishQty;
        $('#dish-price').textContent = fmt(priceOf(item, state.dishSize) * state.dishQty);
    }
    function initDish() {
        wireDialog(dish);
        $('#sizes').addEventListener('click', e => {
            const b = e.target.closest('.size-opt'); if (!b) return;
            state.dishSize = b.dataset.size;
            $$('.size-opt').forEach(x => x.setAttribute('aria-checked', String(x === b)));
            $('#dish-price').textContent = fmt(priceOf(state.dish, state.dishSize) * state.dishQty);
        });
        $$('.qty-btn', dish).forEach(b => b.addEventListener('click', () => {
            state.dishQty = Math.min(20, Math.max(1, state.dishQty + Number(b.dataset.qty)));
            $('#dish-qty').value = state.dishQty;
            $('#dish-price').textContent = fmt(priceOf(state.dish, state.dishSize) * state.dishQty);
        }));
        $('#dish-add').addEventListener('click', () => {
            addToTray({ id: state.dish.id, size: hasSizes(state.dish) ? state.dishSize : 'ONE_SIZE', qty: state.dishQty });
            closeDialog(dish); toast(t('tray.added'));
        });
    }

    /* ---------- Tray ---------- */
    const tray = $('#tray');
    const trayCount = () => Object.values(state.tray).reduce((n, l) => n + l.qty, 0);
    /* A line is {id, size, qty} for menu items, plus {custom:{name, sizes}} for built pizzas. */
    const lineItem = l => l.custom ? { name: l.custom.name, num: '', sizes: l.custom.sizes } : byId.get(l.id);

    function addToTray(line) {
        const key = `${line.id}:${line.size}`;
        const cur = state.tray[key] || { ...line, qty: 0 };
        cur.qty = Math.min(50, cur.qty + line.qty);
        state.tray[key] = cur;
        store.set('uc-tray', state.tray);
        renderTray(true);
    }
    function setLineQty(key, qty) {
        if (!state.tray[key]) return;
        if (qty <= 0) delete state.tray[key]; else state.tray[key].qty = Math.min(50, qty);
        store.set('uc-tray', state.tray); renderTray();
    }
    function renderTray(pop = false) {
        const count = trayCount();
        const badge = $('#tray-count');
        badge.hidden = count === 0; badge.textContent = count;
        if (pop && !reduceMotion.matches) { badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop'); }
        const lines = Object.entries(state.tray).map(([key, l]) => ({ key, ...l, item: lineItem(l) })).filter(l => l.item);
        const list = $('#tray-lines'); const foot = $('#tray-foot');
        $('#tray-total-count').textContent = count ? t('tray.items', { n: count }) : '';
        if (!lines.length) { list.innerHTML = `<li class="tray-empty">${esc(t('tray.empty'))}</li>`; foot.hidden = true; return; }
        foot.hidden = false;
        let subtotal = 0;
        list.innerHTML = lines.map(l => {
            const unit = priceOf(l.item, l.size); const total = unit * l.qty; subtotal += total;
            const size = l.size === 'ONE_SIZE' ? t('menu.onesize') : `${l.size}, ${SIZE_CM[l.size]} ${t('dialog.cm')}`;
            return `<li class="line" data-key="${esc(l.key)}">
                <div><div class="line-name">${l.item.num ? esc(l.item.num) + ' ' : ''}${esc(l.item.name)}</div><div class="line-size">${esc(size)}</div></div>
                <div class="line-total">${fmt(total)}</div>
                <div class="line-ctl">
                    <div class="qty" role="group" aria-label="${esc(t('dialog.qty'))}">
                        <button type="button" class="qty-btn" data-delta="-1" aria-label="${esc(t('dialog.decrease'))}">&minus;</button>
                        <output>${l.qty}</output>
                        <button type="button" class="qty-btn" data-delta="1" aria-label="${esc(t('dialog.increase'))}">+</button>
                    </div>
                    <button type="button" class="line-remove" data-remove>${esc(t('tray.remove'))}</button>
                </div>
            </li>`;
        }).join('');
        $('#tray-subtotal').textContent = fmt(subtotal);
    }
    function initTray() {
        wireDialog(tray);
        $('#tray-btn').addEventListener('click', () => { renderTray(); openModal(tray); });
        $('#tray-lines').addEventListener('click', e => {
            const li = e.target.closest('.line'); if (!li) return;
            const key = li.dataset.key;
            if (e.target.closest('[data-remove]')) { setLineQty(key, 0); return; }
            const b = e.target.closest('[data-delta]'); if (b) setLineQty(key, state.tray[key].qty + Number(b.dataset.delta));
        });
        $('#tray-clear').addEventListener('click', () => { state.tray = {}; store.set('uc-tray', state.tray); renderTray(); });
    }

    let toastTimer;
    function toast(msg) {
        const el = $('#toast'); el.textContent = msg; el.classList.add('show');
        clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
    }

    /* ---------- Builder: half and half ---------- */
    const pizzas = () => data.filter(i => i.cat === 'PIZZAS' && hasSizes(i));
    const half = { l: { img: '#half-l-img', txt: '#half-l-txt', nimg: '#half-l-next', ntxt: '#half-l-ntxt', wipe: '#wipeL-c' },
                   r: { img: '#half-r-img', txt: '#half-r-txt', nimg: '#half-r-next', ntxt: '#half-r-ntxt', wipe: '#wipeR-c' } };
    const shortName = item => item.num || item.name.split(' ')[0];

    function renderThumbs() {
        ['l', 'r'].forEach(side => {
            const wrap = $(`#thumbs-${side}`); if (!wrap) return;
            wrap.innerHTML = pizzas().map(p => `<button type="button" role="radio" class="thumb ${p.img ? '' : 'is-text'}" data-id="${p.id}" aria-checked="${p.id === state.build[side]}" title="${esc((p.num ? p.num + ' ' : '') + p.name)}">
                <span class="thumb-disc">${p.img ? `<img src="${p.img}" alt="" loading="lazy" decoding="async">` : `<span>${esc(p.num || p.name.slice(0, 2))}</span>`}</span>
                <span class="thumb-name">${esc(p.name)}</span>
            </button>`).join('');
        });
    }

    function setHalf(side, id, animate) {
        const item = byId.get(id); if (!item) return;
        const h = half[side];
        const put = (imgSel, txtSel) => {
            const img = $(imgSel), txt = $(txtSel);
            if (item.img) { img.setAttribute('href', item.img); img.style.opacity = 1; txt.textContent = ''; }
            else { img.style.opacity = 0; txt.textContent = shortName(item); }
        };
        if (animate && motionOK()) {
            put(h.nimg, h.ntxt);
            gsap.fromTo($(h.wipe), { attr: { r: 0 } }, { attr: { r: 300 }, duration: 0.7, ease: 'power3.inOut', onComplete: () => { put(h.img, h.txt); gsap.set($(h.wipe), { attr: { r: 0 } }); } });
        } else {
            put(h.img, h.txt);
        }
    }

    const buildPrice = () => {
        const a = byId.get(state.build.l), b = byId.get(state.build.r);
        return Math.max(priceOf(a, state.build.size), priceOf(b, state.build.size));
    };
    const priceState = { v: 0 };
    function showPrice(animate) {
        const target = buildPrice(); const el = $('#builder-price'); if (!el) return;
        if (animate && motionOK() && priceState.v) {
            gsap.to(priceState, { v: target, duration: 0.6, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(priceState.v); } });
        } else { priceState.v = target; el.textContent = fmt(target); }
    }

    function renderBuilder(animate = true) {
        const svg = $('#pz'); if (!svg) return;
        setHalf('l', state.build.l, false);
        setHalf('r', state.build.r, false);
        svg.style.setProperty('--sauce', state.build.base === 'red' ? '#B8321F' : '#F3E4C2');
        svg.style.setProperty('--crust', state.build.crust === 'white' ? '#E0B679' : '#8E5B2E');
        const scale = state.build.size === 'L' ? SIZE_CM.L / SIZE_CM.XXL : 1;
        if (motionOK()) gsap.to('#pz-scale', { scale, duration: animate ? 0.7 : 0, ease: 'back.out(1.6)', transformOrigin: '50% 50%' });
        else $('#pz-scale').setAttribute('transform', `translate(200 200) scale(${scale}) translate(-200 -200)`);
        $$('.seg[data-seg] button').forEach(b => b.setAttribute('aria-checked', String(state.build[b.closest('.seg').dataset.seg] === b.dataset.val)));
        ['l', 'r'].forEach(side => $$(`#thumbs-${side} .thumb`).forEach(b => b.setAttribute('aria-checked', String(b.dataset.id === state.build[side]))));
        showPrice(animate);
    }

    /* Drag to spin, with inertia and a slow idle turn */
    function initSpin() {
        const stage = $('#stage'), rot = $('#pz-rot');
        if (!stage || !rot || !motionOK()) return;
        const spin = { a: 0 };
        const apply = () => gsap.set(rot, { rotation: spin.a, transformOrigin: '50% 50%' });
        const idle = gsap.to(spin, { a: '+=360', duration: 140, ease: 'none', repeat: -1, onUpdate: apply });
        let dragging = false, last = 0, lastT = 0, vel = 0, inertia = null;
        const angleAt = e => { const r = stage.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
        stage.addEventListener('pointerdown', e => {
            if (e.target.closest('button')) return;
            dragging = true; idle.pause(); if (inertia) inertia.kill();
            last = angleAt(e); lastT = performance.now(); vel = 0;
            stage.setPointerCapture(e.pointerId); stage.classList.add('is-dragging');
        });
        stage.addEventListener('pointermove', e => {
            if (!dragging) return;
            const a = angleAt(e); let d = a - last; if (d > 180) d -= 360; if (d < -180) d += 360;
            const now = performance.now(); vel = d / Math.max(1, now - lastT); last = a; lastT = now;
            spin.a += d; apply();
        });
        const release = () => {
            if (!dragging) return; dragging = false; stage.classList.remove('is-dragging');
            inertia = gsap.to(spin, { a: spin.a + vel * 700, duration: 1.6, ease: 'power3.out', onUpdate: apply, onComplete: () => idle.play() });
        };
        stage.addEventListener('pointerup', release);
        stage.addEventListener('pointercancel', release);
        $('#pz-spin')?.addEventListener('click', () => { idle.pause(); if (inertia) inertia.kill(); inertia = gsap.to(spin, { a: spin.a + 360, duration: 1.2, ease: 'power3.inOut', onUpdate: apply, onComplete: () => idle.play() }); });
    }

    /* The pizza flies into the tray */
    function flyToTray() {
        const svg = $('#pz'), target = $('#tray-btn');
        if (!svg || !target || !motionOK()) return;
        const from = svg.getBoundingClientRect(), to = target.getBoundingClientRect();
        const ghost = svg.cloneNode(true);
        ghost.removeAttribute('id'); ghost.classList.add('pz-ghost');
        ghost.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        Object.assign(ghost.style, { position: 'fixed', left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px', zIndex: 90, pointerEvents: 'none' });
        document.body.appendChild(ghost);
        gsap.to(ghost, { x: to.left + to.width / 2 - (from.left + from.width / 2), y: to.top + to.height / 2 - (from.top + from.height / 2), scale: 0.06, rotate: 240, duration: 0.9, ease: 'power3.in', onComplete: () => ghost.remove() });
    }

    function initBuilder() {
        if (!$('#pz')) return;
        renderThumbs();
        ['l', 'r'].forEach(side => $(`#thumbs-${side}`).addEventListener('click', e => {
            const b = e.target.closest('.thumb'); if (!b || b.dataset.id === state.build[side]) return;
            state.build[side] = b.dataset.id;
            setHalf(side, b.dataset.id, true);
            $$(`#thumbs-${side} .thumb`).forEach(x => x.setAttribute('aria-checked', String(x === b)));
            b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
            showPrice(true);
        }));
        $$('.seg[data-seg]').forEach(seg => seg.addEventListener('click', e => {
            const b = e.target.closest('button'); if (!b) return;
            const key = seg.dataset.seg;
            if (state.build[key] === b.dataset.val) return;
            state.build[key] = b.dataset.val;
            if (motionOK()) {
                if (key === 'base') gsap.fromTo('.pz-sauce', { scale: 0.9 }, { scale: 1, duration: 0.7, ease: 'back.out(2)', transformOrigin: '50% 50%' });
                if (key === 'crust') gsap.fromTo('.pz-crust', { scale: 0.96 }, { scale: 1, duration: 0.6, ease: 'back.out(2)', transformOrigin: '50% 50%' });
            }
            renderBuilder(true);
        }));
        $('#builder-add').addEventListener('click', () => {
            const a = byId.get(state.build.l), b = byId.get(state.build.r);
            const same = a.id === b.id;
            const name = same ? `${a.num ? a.num + ' ' : ''}${a.name} (${t(state.build.base === 'red' ? 'builder.base.red' : 'builder.base.white')}, ${t(state.build.crust === 'white' ? 'builder.crust.white' : 'builder.crust.wheat')})`
                : `${t('builder.name')}: ${a.name} + ${b.name}`;
            const sizes = { L: Math.max(a.sizes.L, b.sizes.L), XXL: Math.max(a.sizes.XXL, b.sizes.XXL) };
            flyToTray();
            setTimeout(() => {
                addToTray({ id: `half:${a.id}|${b.id}|${state.build.base}|${state.build.crust}`, size: state.build.size, qty: 1, custom: { name, sizes } });
                toast(t('tray.added'));
            }, motionOK() ? 850 : 0);
        });
        initSpin();
    }

    /* ---------- Opening hours (Europe/Istanbul) ---------- */
    function updateOpenStatus() {
        let now;
        try {
            const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
            now = Number(parts.find(p => p.type === 'hour').value) * 60 + Number(parts.find(p => p.type === 'minute').value);
        } catch { return; }
        const mins = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
        $$('.loc[data-open]').forEach(loc => {
            const open = now >= mins(loc.dataset.open) && now < mins(loc.dataset.close);
            const st = $('[data-status]', loc);
            st.classList.toggle('is-open', open);
            $('[data-status-text]', st).textContent = t(open ? 'locations.open' : 'locations.closed');
        });
    }

    /* ---------- Maps ---------- */
    function initMaps() {
        $$('[data-map]').forEach(b => b.addEventListener('click', () => {
            const target = document.getElementById(b.dataset.target); if (!target) return;
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(b.dataset.map)}&output=embed`;
            iframe.title = t('locations.map.title'); iframe.loading = 'lazy'; iframe.referrerPolicy = 'no-referrer-when-downgrade';
            target.replaceChildren(iframe); b.remove();
        }));
    }

    /* ---------- Headings: word split ---------- */
    function splitHeadings() {
        $$('h2[data-split]').forEach(h => {
            const text = h.textContent.trim();
            h.innerHTML = text.split(/\s+/).map(w => `<span class="word">${esc(w)}</span>`).join(' ');
            h.setAttribute('aria-label', text);
        });
    }

    /* ---------- Intro curtain ---------- */
    function initIntro() {
        const intro = $('#intro');
        if (!intro) { document.body.classList.remove('is-intro'); return; }
        let seen = false; try { seen = sessionStorage.getItem('uc-intro') === '1'; } catch { /* ignore */ }
        if (seen || !motionOK()) { intro.remove(); document.body.classList.remove('is-intro'); return; }
        try { sessionStorage.setItem('uc-intro', '1'); } catch { /* ignore */ }
        if (window.__lenis) window.__lenis.stop();
        const tl = gsap.timeline({ onComplete: () => { intro.remove(); document.body.classList.remove('is-intro'); if (window.__lenis) window.__lenis.start(); } });
        tl.from('.intro-center img', { opacity: 0, y: 20, scale: 0.94, duration: 0.7, ease: 'power3.out' }, 0.15)
          .from('.intro-center p', { opacity: 0, y: 10, duration: 0.6, ease: 'power3.out' }, 0.5)
          .to('.intro-center', { opacity: 0, duration: 0.35, ease: 'power2.in' }, 1.5)
          .to('.intro-top', { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, 1.6)
          .to('.intro-bottom', { yPercent: 100, duration: 0.9, ease: 'expo.inOut' }, 1.6)
          .add(() => document.body.classList.remove('is-intro'), 1.7);
    }

    /* ---------- Embers in the hero ---------- */
    function initEmbers() {
        const canvas = $('#embers');
        if (!canvas) return;
        if (!motionOK()) { canvas.remove(); return; }
        const ctx = canvas.getContext('2d'); let w = 0, h = 0, raf = 0, running = false;
        const N = 70; const p = [];
        const reset = (e, fresh) => { e.x = Math.random() * w; e.y = fresh ? Math.random() * h : h + 10; e.r = 0.6 + Math.random() * 1.8; e.vy = 0.15 + Math.random() * 0.45; e.vx = (Math.random() - 0.5) * 0.25; e.life = Math.random(); e.tw = Math.random() * Math.PI * 2; };
        const size = () => { const r = canvas.getBoundingClientRect(); w = canvas.width = Math.max(1, Math.floor(r.width)); h = canvas.height = Math.max(1, Math.floor(r.height)); };
        size(); for (let i = 0; i < N; i++) { const e = {}; reset(e, true); p.push(e); }
        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            for (const e of p) {
                e.y -= e.vy; e.x += e.vx + Math.sin(e.tw += 0.01) * 0.15; e.life += 0.003;
                if (e.y < -10 || e.life > 1) reset(e, false);
                const a = Math.sin(e.life * Math.PI) * 0.7;
                ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, ${150 + Math.floor(60 * Math.sin(e.tw))}, 70, ${a})`; ctx.fill();
            }
            if (running) raf = requestAnimationFrame(draw);
        };
        const start = () => { if (!running) { running = true; raf = requestAnimationFrame(draw); } };
        const stop = () => { running = false; cancelAnimationFrame(raf); };
        new IntersectionObserver(([en]) => en.isIntersecting ? start() : stop()).observe(canvas);
        addEventListener('resize', size);
    }

    /* ---------- Custom cursor ---------- */
    function initCursor() {
        const cur = $('#cursor');
        if (!cur) return;
        if (!finePointer.matches || !motionOK()) { cur.remove(); return; }
        document.documentElement.classList.add('has-cursor');
        const label = $('#cursor-label');
        const xTo = gsap.quickTo(cur, 'x', { duration: 0.22, ease: 'power3' }), yTo = gsap.quickTo(cur, 'y', { duration: 0.22, ease: 'power3' });
        let shown = false;
        addEventListener('pointermove', e => {
            if (!shown) { gsap.set(cur, { x: e.clientX, y: e.clientY }); cur.classList.add('is-on'); shown = true; }
            xTo(e.clientX); yTo(e.clientY);
            const lab = e.target.closest('[data-cursor]');
            const hit = e.target.closest('a, button, [role="radio"], input, select, label, .gallery-track, .thumbs');
            cur.classList.toggle('is-hover', !!hit && !lab);
            cur.classList.toggle('is-label', !!lab && !hit);
            label.textContent = lab ? t(lab.dataset.cursor) : '';
        });
        document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
        document.addEventListener('pointerenter', () => cur.classList.add('is-on'));
        addEventListener('pointerdown', () => cur.classList.add('is-down'));
        addEventListener('pointerup', () => cur.classList.remove('is-down'));
    }

    /* ---------- Smooth scroll (Lenis) ---------- */
    function initLenis() {
        if (typeof window.Lenis === 'undefined' || !motionOK() || !finePointer.matches) return;
        try {
            const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, anchors: true });
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add(time => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
            window.__lenis = lenis;
        } catch { /* fall back to native scrolling */ }
    }

    /* ---------- Motion (GSAP) ---------- */
    function initMotion() {
        if (!motionOK()) { $('#drips')?.remove(); return; }
        gsap.registerPlugin(ScrollTrigger);
        const mm = gsap.matchMedia();

        /* Hero: the slice pull */
        const pie = $('#pie'), slice = $('#pie-slice'), gap = $('.pie-gap'), cheeseG = $('#cheese-g');
        const A = [-0.3827, -0.9239], B = [-0.9239, -0.3827];  // unit vectors of the two cut edges (112.5° and 157.5°): the slice points up-left, toward the headline
        const anchors = [[A, 210], [A, 330], [A, 440], [B, 250], [B, 380], [B, 470]];
        const strings = anchors.map(() => { const p = document.createElementNS(SVG, 'path'); cheeseG.appendChild(p); return p; });
        const blobs = anchors.map(() => { const c = document.createElementNS(SVG, 'circle'); cheeseG.appendChild(c); return c; });
        const PULL = 0.30;
        const drawCheese = p => {
            const dx = -PULL * p * 1000, dy = -PULL * p * 1000;
            const sag = 40 + 170 * p;
            const strand = Math.max(0, 1 - Math.max(0, (p - 0.72) / 0.2));
            anchors.forEach(([u, r], i) => {
                const x1 = 500 + u[0] * r, y1 = 500 + u[1] * r, x2 = x1 + dx, y2 = y1 + dy;
                strings[i].setAttribute('d', `M${x1} ${y1} C${x1 + dx * 0.25} ${y1 + dy * 0.25 + sag * 0.8} ${x1 + dx * 0.75} ${y1 + dy * 0.75 + sag} ${x2} ${y2}`);
                strings[i].setAttribute('stroke-width', (34 - 24 * p) * strand + 0.01);
                strings[i].style.opacity = p < 0.02 ? 0 : strand;
                blobs[i].setAttribute('cx', x1); blobs[i].setAttribute('cy', y1);
                blobs[i].setAttribute('r', (18 - 10 * p) * strand + 0.01);
                blobs[i].style.opacity = p < 0.02 ? 0 : strand;
            });
            const s = pie.getBoundingClientRect().width;
            gsap.set(slice, { x: -PULL * p * s, y: -PULL * p * s, rotate: -7 * p, scale: 1 + 0.05 * p, filter: `drop-shadow(0 ${12 + 30 * p}px ${18 + 30 * p}px rgba(0,0,0,${0.35 * p}))` });
            gsap.set(gap, { opacity: Math.min(1, p * 4) });
        };
        drawCheese(0);
        window.__uc = { drawCheese };

        mm.add('(min-width: 901px)', () => {
            const tl = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=130%', pin: true, scrub: 0.6, anticipatePin: 1 } });
            const prog = { p: 0 };
            tl.to(prog, { p: 1, duration: 0.75, ease: 'none', onUpdate: () => drawCheese(prog.p) }, 0)
              .to('.hero-copy', { y: -60, opacity: 0.15, duration: 0.45, ease: 'power1.in' }, 0.5)
              .to('.hero-bg', { scale: 1.08, y: -40, duration: 1, ease: 'none' }, 0)
              .to('.hero-pie', { y: -80, duration: 1, ease: 'none' }, 0);
            return () => drawCheese(0);
        });
        mm.add('(max-width: 900px)', () => {
            const prog = { p: 0 };
            gsap.to(prog, { p: 1, ease: 'none', onUpdate: () => drawCheese(prog.p), scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 40%', scrub: 0.5 } });
            return () => drawCheese(0);
        });

        /* Cheese drips over the mural band */
        const dripsG = $('#drips-g');
        if (dripsG) {
            [40, 130, 205, 310, 395, 470, 560, 640, 735, 820, 905, 990, 1080, 1160].forEach((x, i) => {
                const w = 26 + ((i * 37) % 30);
                const r = document.createElementNS(SVG, 'rect');
                r.setAttribute('x', x); r.setAttribute('y', 0); r.setAttribute('width', w); r.setAttribute('height', 30); r.setAttribute('rx', w / 2);
                dripsG.appendChild(r);
                gsap.to(r, { attr: { height: 60 + ((i * 53) % 70) }, duration: 3.2 + (i % 5) * 0.7, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: (i % 7) * 0.4 });
            });
        }

        /* Mural marquee */
        const track = $('#marquee-track');
        if (track) {
            const loop = gsap.to(track, { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
            ScrollTrigger.create({ onUpdate: self => { loop.timeScale(Math.min(5, 1 + Math.abs(self.getVelocity()) / 400)); gsap.to(loop, { timeScale: 1, duration: 1.2, overwrite: true, ease: 'power2.out' }); } });
        }

        /* Timeline: pinned horizontal scroll on desktop */
        mm.add('(min-width: 901px)', () => {
            const tlTrack = $('#tl-track'); const viewport = $('.tl-viewport');
            const dist = () => tlTrack.scrollWidth - viewport.clientWidth;
            const tween = gsap.to(tlTrack, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.tl', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
            return () => tween.scrollTrigger && tween.scrollTrigger.kill();
        });
        mm.add('(max-width: 900px)', () => {
            $('#tl-track').style.transform = 'none'; $('.tl-viewport').style.overflowX = 'auto';
            return () => { $('.tl-viewport').style.overflowX = ''; };
        });

        /* Builder assembly: dough, sauce, cheese, then the halves, as the stage scrolls in */
        const stage = $('#stage');
        if (stage) {
            const asm = gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 85%', end: 'top 30%', scrub: 0.8 } });
            asm.from(['.pz-crust', '.pz-shade'], { scale: 0, transformOrigin: '50% 50%', ease: 'back.out(1.4)', duration: 0.5 }, 0)
               .from('.pz-sauce', { scale: 0, transformOrigin: '50% 50%', ease: 'back.out(1.4)', duration: 0.5 }, 0.2)
               .from('.pz-cheese', { opacity: 0, duration: 0.4 }, 0.45)
               .fromTo('#clipDisc-c', { attr: { r: 0 } }, { attr: { r: 172 }, ease: 'power2.out', duration: 0.5 }, 0.6)
               .from('.pz-cut', { opacity: 0, duration: 0.2 }, 1);
        }

        /* Parallax images */
        $$('[data-parallax]').forEach(img => {
            const amt = Number(img.dataset.parallax) || 10;
            gsap.fromTo(img, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
        });

        /* Photos reveal with a wipe when they enter */
        ScrollTrigger.batch('[data-reveal], .story-photo, .tl-media, .loc-media, .statement-media', {
            start: 'top 88%', once: true,
            onEnter: els => els.forEach((el, i) => gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.1, delay: i * 0.08, ease: 'power4.out' }))
        });

        /* Heading words rise once */
        ScrollTrigger.batch('h2[data-split]', {
            start: 'top 85%', once: true,
            onEnter: els => els.forEach(h => gsap.from($$('.word', h), { yPercent: 60, opacity: 0, duration: 0.8, stagger: 0.05, ease: 'power3.out' }))
        });

        /* Catering strip drifts sideways */
        const strip = $('.catering-strip');
        if (strip) gsap.fromTo(strip, { x: 60 }, { x: -120, ease: 'none', scrollTrigger: { trigger: strip, start: 'top bottom', end: 'bottom top', scrub: true } });

        /* Cards lift in */
        ScrollTrigger.batch('.sig, .loc, .social-track a', {
            start: 'top 92%', once: true,
            onEnter: els => gsap.from(els, { y: 32, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out', clearProps: 'transform' })
        });

        /* Pause videos that are off screen */
        $$('video').forEach(v => new IntersectionObserver(([en]) => { en.isIntersecting ? v.play().catch(() => {}) : v.pause(); }).observe(v));
    }

    /* ---------- Boot ---------- */
    document.addEventListener('DOMContentLoaded', () => {
        if (reduceMotion.matches) $$('video[autoplay]').forEach(v => { v.removeAttribute('autoplay'); v.pause(); });
        initHeader();
        initMenu();
        initDish();
        initTray();
        initBuilder();
        initMaps();
        applyI18n();
        initLenis();
        initMotion();
        initEmbers();
        initCursor();
        initIntro();
        $('#year').textContent = new Date().getFullYear();
        setInterval(updateOpenStatus, 60000);
        window.addEventListener('load', () => { if (hasGsap) ScrollTrigger.refresh(); });
    });
})();

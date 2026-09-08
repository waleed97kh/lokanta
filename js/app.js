/* The Upper Crust Türkiye, v6. Vanilla, no build step. */
(() => {
    'use strict';

    const ORDER_URL = 'https://uppercrustturkiye.com/online-siparis/';
    const SIZE_CM = { S: 23, L: 37, XXL: 47 };
    const SIZE_ORDER = ['S', 'L', 'XXL'];
    const CATS = ['PIZZAS', 'STARTERS', 'SALADS', 'DESSERTS', 'DRINKS'];
    const LANGS = ['TR', 'EN', 'AR', 'RU', 'DE'];
    const LOCALE = { TR: 'tr-TR', EN: 'en-GB', AR: 'tr-TR', RU: 'ru-RU', DE: 'de-DE' };
    const SIGNATURE_IDS = ['p27', 'p13', 'p19'];

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const data = window.menuData || [];
    const dict = window.translations || {};
    const byId = new Map(data.map(i => [i.id, i]));
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

    const store = {
        get(k, fallback) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } }
    };

    const savedLang = store.get('uc-lang', 'TR');
    const state = {
        lang: LANGS.includes(savedLang) ? savedLang : 'TR',
        cat: 'PIZZAS',
        size: 'L',
        diet: new Set(),
        q: '',
        tray: store.get('uc-tray', {}),
        dish: null,
        dishSize: 'L',
        dishQty: 1
    };

    /* ---------- i18n ---------- */
    const t = (key, vars) => {
        const table = dict[state.lang] || {};
        let s = table[key] ?? (dict.EN || {})[key] ?? key;
        if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
        return s;
    };
    const fmt = n => new Intl.NumberFormat(LOCALE[state.lang]).format(n) + ' ₺';
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
        if (state.dish) fillDish();
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
        const wrap = $('#cats');
        wrap.innerHTML = CATS.map(c => {
            const n = data.filter(i => i.cat === c).length;
            return `<button type="button" class="cat-btn" data-cat="${c}" aria-pressed="${c === state.cat && !state.q}">${esc(t('menu.cat.' + c))}<small>${n}</small></button>`;
        }).join('');
    }

    function tagsHtml(item) {
        return item.tags.map(tag => `<span class="tag" title="${esc(t('menu.diet.' + tag))}" aria-label="${esc(t('menu.diet.' + tag))}">${tag}</span>`).join('');
    }

    function sizesInline(item) {
        return `<span class="row-sizes">${SIZE_ORDER.filter(s => item.sizes[s] != null).map(s =>
            `<span class="${s === state.size ? 'is-on' : ''}">${s} ${fmt(item.sizes[s])}</span>`).join('')}</span>`;
    }

    function renderMenu() {
        const list = $('#rows');
        const items = filtered();
        const searching = state.q.trim().length > 0;
        const anySizes = items.some(hasSizes);

        $('#lens-wrap').hidden = !anySizes;
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
            const meta = (item.tags.length || hasSizes(item))
                ? `<span class="row-meta">${tagsHtml(item)}${hasSizes(item) ? sizesInline(item) : ''}</span>` : '';
            return `<li class="row" style="--i:${reduceMotion.matches ? 0 : idx}">
                <button type="button" class="row-btn" data-id="${item.id}" aria-haspopup="dialog" aria-label="${esc(item.name)}, ${esc(t('menu.open'))}">
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
            el.classList.remove('flip');
            void el.offsetWidth;
            el.textContent = fmt(priceOf(item, state.size));
            el.classList.add('flip');
            $$('.row-sizes span', btn).forEach(s => s.classList.toggle('is-on', s.textContent.startsWith(state.size + ' ')));
        });
    }

    function transition(fn) {
        if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(fn);
        else fn();
    }

    function initMenu() {
        renderCats();
        renderMenu();

        $('#cats').addEventListener('click', e => {
            const b = e.target.closest('.cat-btn');
            if (!b) return;
            state.cat = b.dataset.cat;
            if (state.q) { state.q = ''; $('#menu-search').value = ''; }
            transition(renderMenu);
        });

        $$('.diet-btn').forEach(b => b.addEventListener('click', () => {
            const d = b.dataset.diet;
            if (state.diet.has(d)) state.diet.delete(d); else state.diet.add(d);
            b.setAttribute('aria-pressed', String(state.diet.has(d)));
            renderMenu();
        }));

        const search = $('#menu-search');
        let timer;
        search.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => { state.q = search.value; renderMenu(); }, 120);
        });
        document.addEventListener('keydown', e => {
            if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) && !$('dialog[open]')) {
                e.preventDefault();
                search.focus();
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
                state.q = ''; $('#menu-search').value = '';
                state.diet.clear();
                $$('.diet-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
                renderMenu();
                return;
            }
            const b = e.target.closest('.row-btn');
            if (b) openDish(b.dataset.id);
        });
    }

    /* ---------- Signature ---------- */
    function renderSignature() {
        const grid = $('#sig-grid');
        grid.innerHTML = SIGNATURE_IDS.map((id, i) => {
            const item = byId.get(id);
            if (!item) return '';
            const from = hasSizes(item) ? `${SIZE_ORDER.map(s => `${s} ${fmt(item.sizes[s])}`).join('   ')}` : fmt(item.sizes.ONE_SIZE);
            return `<button type="button" class="sig ${i === 0 ? 'is-feature' : ''}" data-id="${item.id}" aria-haspopup="dialog">
                <span class="sig-media"><img src="${item.img}" alt="" loading="lazy" decoding="async"></span>
                <span class="sig-text">
                    <span class="sig-name">${item.num ? esc(item.num) + ' ' : ''}${esc(item.name)}</span>
                    <span class="sig-desc">${esc(item.desc)}</span>
                    <span class="sig-price">${esc(from)}</span>
                </span>
            </button>`;
        }).join('');
        grid.onclick = e => { const b = e.target.closest('.sig'); if (b) openDish(b.dataset.id); };
    }

    /* ---------- Dialog helpers ---------- */
    function closeDialog(d) {
        if (!d.open || d.classList.contains('is-closing')) return;
        if (reduceMotion.matches) { d.close(); return; }
        d.classList.add('is-closing');
        const done = () => { d.classList.remove('is-closing'); d.close(); };
        d.addEventListener('animationend', done, { once: true });
        setTimeout(() => { if (d.classList.contains('is-closing')) done(); }, 300);
    }
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
        const item = byId.get(id);
        if (!item) return;
        state.dish = item;
        state.dishSize = hasSizes(item) && item.sizes[state.size] != null ? state.size : SIZE_ORDER.find(s => item.sizes[s] != null) || 'S';
        state.dishQty = 1;
        fillDish();
        dish.showModal();
        $('.dish-body', dish).scrollTop = 0;
    }

    function fillDish() {
        const item = state.dish;
        const visual = $('#dish-visual');
        visual.innerHTML = item.img
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
                    <span class="size-disc" aria-hidden="true"></span>
                    <span class="size-name">${s}</span>
                    <span class="size-cm">${SIZE_CM[s]} ${esc(t('dialog.cm'))}</span>
                    <span class="size-price">${fmt(item.sizes[s])}</span>
                </button>`).join('');
        } else {
            wrap.hidden = true;
        }
        $('#dish-qty').value = state.dishQty;
        $('#dish-price').textContent = fmt(priceOf(item, state.dishSize) * state.dishQty);
    }

    function initDish() {
        wireDialog(dish);
        $('#sizes').addEventListener('click', e => {
            const b = e.target.closest('.size-opt');
            if (!b) return;
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
            addToTray(state.dish, hasSizes(state.dish) ? state.dishSize : 'ONE_SIZE', state.dishQty);
            closeDialog(dish);
            toast(t('tray.added'));
        });
    }

    /* ---------- Tray ---------- */
    const tray = $('#tray');
    const trayCount = () => Object.values(state.tray).reduce((n, l) => n + l.qty, 0);

    function addToTray(item, size, qty) {
        const key = `${item.id}:${size}`;
        const line = state.tray[key] || { id: item.id, size, qty: 0 };
        line.qty = Math.min(50, line.qty + qty);
        state.tray[key] = line;
        store.set('uc-tray', state.tray);
        renderTray(true);
    }

    function setLineQty(key, qty) {
        if (!state.tray[key]) return;
        if (qty <= 0) delete state.tray[key]; else state.tray[key].qty = Math.min(50, qty);
        store.set('uc-tray', state.tray);
        renderTray();
    }

    function renderTray(pop = false) {
        const count = trayCount();
        const badge = $('#tray-count');
        badge.hidden = count === 0;
        badge.textContent = count;
        if (pop && !reduceMotion.matches) { badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop'); }

        const lines = Object.entries(state.tray).map(([key, l]) => ({ key, ...l, item: byId.get(l.id) })).filter(l => l.item);
        const list = $('#tray-lines');
        const foot = $('#tray-foot');
        $('#tray-total-count').textContent = count ? t('tray.items', { n: count }) : '';

        if (!lines.length) {
            list.innerHTML = `<li class="tray-empty">${esc(t('tray.empty'))}</li>`;
            foot.hidden = true;
            return;
        }
        foot.hidden = false;
        let subtotal = 0;
        list.innerHTML = lines.map(l => {
            const unit = priceOf(l.item, l.size);
            const total = unit * l.qty;
            subtotal += total;
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
        $('#tray-btn').addEventListener('click', () => { renderTray(); tray.showModal(); });
        $('#tray-lines').addEventListener('click', e => {
            const li = e.target.closest('.line');
            if (!li) return;
            const key = li.dataset.key;
            if (e.target.closest('[data-remove]')) { setLineQty(key, 0); return; }
            const b = e.target.closest('[data-delta]');
            if (b) setLineQty(key, state.tray[key].qty + Number(b.dataset.delta));
        });
        $('#tray-clear').addEventListener('click', () => { state.tray = {}; store.set('uc-tray', state.tray); renderTray(); });
    }

    /* ---------- Toast ---------- */
    let toastTimer;
    function toast(msg) {
        const el = $('#toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
    }

    /* ---------- Story gallery ---------- */
    function initGallery() {
        const track = $('#gallery-track');
        if (!track) return;
        const step = () => {
            const fig = track.querySelector('figure');
            return fig ? fig.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap || 16) : track.clientWidth;
        };
        const rtl = () => document.documentElement.dir === 'rtl';
        $$('[data-gallery]').forEach(b => b.addEventListener('click', () => {
            const dir = Number(b.dataset.gallery) * (rtl() ? -1 : 1);
            track.scrollBy({ left: dir * step(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        }));
        track.addEventListener('keydown', e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            e.preventDefault();
            track.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * step(), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        });

        let startX = 0, startLeft = 0, dragging = false, moved = false;
        track.addEventListener('pointerdown', e => {
            if (e.pointerType === 'touch') return;
            dragging = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
            track.setPointerCapture(e.pointerId);
        });
        track.addEventListener('pointermove', e => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            if (!moved && Math.abs(dx) > 4) { moved = true; track.classList.add('is-dragging'); }
            if (moved) track.scrollLeft = startLeft - dx;
        });
        const end = () => { if (!dragging) return; dragging = false; track.classList.remove('is-dragging'); };
        track.addEventListener('pointerup', end);
        track.addEventListener('pointercancel', end);
        track.addEventListener('dragstart', e => e.preventDefault());
    }

    /* ---------- Locations ---------- */
    function initMaps() {
        $$('[data-map]').forEach(b => b.addEventListener('click', () => {
            const target = document.getElementById(b.dataset.target);
            if (!target) return;
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(b.dataset.map)}&output=embed`;
            iframe.title = t('locations.map.title');
            iframe.loading = 'lazy';
            iframe.referrerPolicy = 'no-referrer-when-downgrade';
            target.replaceChildren(iframe);
            b.remove();
        }));
    }

    /* ---------- Boot ---------- */
    document.addEventListener('DOMContentLoaded', () => {
        initHeader();
        initMenu();
        initDish();
        initTray();
        initGallery();
        initMaps();
        applyI18n();
        $('#year').textContent = new Date().getFullYear();
        $$('a[href^="http"]').forEach(a => { if (!a.href.startsWith(ORDER_URL) && !a.href.includes('maps.google')) return; a.rel = 'noopener noreferrer'; });
    });
})();

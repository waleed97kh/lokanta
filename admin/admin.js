/* Upper Crust admin. Vanilla JS, hash router, one draft document, draft → publish with versions.
   Works against LocalStore (this browser) or SupabaseStore (client project), see store.js. */
(() => {
    'use strict';
    const CFG = window.SITE_CONFIG || { mode: 'local' };
    const S = window.adminStrings;
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const SIZES = ['S', 'L', 'XXL'];
    const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const TAGS = ['V', 'VG', 'SPICY', 'STAR'];
    const GROUPS = ['MEAT', 'SEA', 'CHEESE', 'VEG', 'SAUCE'];

    const app = $('#app');
    const store = window.createStore(CFG);
    const st = { lang: localStorage.getItem('uc-admin-lang') || 'TR', user: null, draft: null, live: null, versions: [], route: '', saveTimer: null, saving: false, dirty: false };

    const t = (k, vars) => { let s = (S[st.lang] && S[st.lang][k]) ?? S.TR[k] ?? k; if (vars) for (const v in vars) s = s.split(`{${v}}`).join(vars[v]); return s; };
    const fmt = n => new Intl.NumberFormat(st.lang === 'TR' ? 'tr-TR' : 'en-GB').format(Math.round(Number(n) || 0)) + ' ₺';
    const T2 = (obj) => obj ? (st.lang === 'TR' ? (obj.tr || obj.en || '') : (obj.en || obj.tr || '')) : '';
    const ago = iso => { if (!iso) return ''; const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); if (m < 1) return t('time.now'); if (m < 60) return t('time.min', { n: m }); if (m < 1440) return t('time.hour', { n: Math.round(m / 60) }); return t('time.day', { n: Math.round(m / 1440) }); };
    const uid = p => p + '-' + Math.random().toString(36).slice(2, 8);
    const media = p => store.mediaUrl(p);
    const getPath = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
    const setPath = (o, path, v) => { const ks = path.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null) a[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; };
    const clone = o => JSON.parse(JSON.stringify(o));
    const istanbulMidnight = () => { const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const g = x => p.find(y => y.type === x).value; return `${g('year')}-${g('month')}-${g('day')}T23:59`; };

    /* ---------- toast, sheet ---------- */
    let toastTimer;
    const toast = msg => { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200); };
    const sheet = html => { const d = $('#sheet'); d.innerHTML = `<div class="sheet-in">${html}</div>`; if (!d.open) d.showModal(); return d; };
    const closeSheet = () => { const d = $('#sheet'); if (d.open) d.close(); };
    $('#sheet').addEventListener('click', e => { if (e.target === $('#sheet')) closeSheet(); });
    const confirm = (title, text, ok, danger = false) => new Promise(res => {
        const d = sheet(`<h3>${esc(title)}</h3><p class="muted">${esc(text)}</p><div class="btn-row"><button class="btn btn-ghost" data-x="no">${esc(t('common.cancel'))}</button><button class="btn ${danger ? 'btn-primary' : 'btn-primary'}" data-x="yes">${esc(ok)}</button></div>`);
        d.onclick = e => { const b = e.target.closest('[data-x]'); if (b) { closeSheet(); res(b.dataset.x === 'yes'); } else if (e.target === d) res(false); };
    });

    /* ---------- draft persistence ---------- */
    function setSaveState(cls, text) { const el = $('#savestate'); if (!el) return; el.className = 'savestate ' + cls; el.textContent = text; }
    function scheduleSave() {
        st.dirty = true; setSaveState('is-saving', t('common.saving'));
        clearTimeout(st.saveTimer);
        st.saveTimer = setTimeout(async () => {
            try { st.saving = true; await store.saveDraft(st.draft, st.user?.email); st.saving = false; st.dirty = false; setSaveState('', t('common.saved')); updatePendingBadge(); }
            catch (e) { st.saving = false; setSaveState('is-error', navigator.onLine ? t('common.error') : t('common.offline')); }
        }, 600);
    }
    const mutate = fn => { fn(st.draft); scheduleSave(); };

    /* ---------- change summary (draft vs live) ---------- */
    function changes() {
        const out = []; const live = st.live?.content; const d = st.draft; if (!live || !d) return out;
        const lm = new Map((live.items || []).map(i => [i.id, i])), dm = new Map((d.items || []).map(i => [i.id, i]));
        let prices = 0, photos = 0, avail = 0;
        for (const it of d.items || []) {
            const o = lm.get(it.id);
            if (!o) { out.push(t('change.itemAdded', { name: it.name })); continue; }
            if (!o.archived && it.archived) { out.push(t('change.itemRemoved', { name: it.name })); continue; }
            if (JSON.stringify(o.sizes) !== JSON.stringify(it.sizes)) prices++;
            if (JSON.stringify(o.image) !== JSON.stringify(it.image)) photos++;
            if (o.available !== it.available) avail++;
            const rest = k => JSON.stringify({ ...k, sizes: 0, image: 0, available: 0, unavailableUntil: 0, order: 0 });
            if (rest(o) !== rest(it)) out.push(t('change.item', { name: it.name }));
        }
        if (prices) out.push(t('change.price', { n: prices }));
        if (photos) out.push(t('change.photo', { n: photos }));
        if (avail) out.push(t('change.avail', { n: avail }));
        const same = k => JSON.stringify(live[k]) === JSON.stringify(d[k]);
        if (!same('toppings') || !same('toppingGroups')) out.push(t('change.toppings'));
        if (!same('rules')) out.push(t('change.rules'));
        if (!same('branches')) out.push(t('change.branches'));
        if (!same('landing') || !same('meta')) out.push(t('change.landing'));
        if (!same('sliceOfDay')) out.push(t('change.slice'));
        if (!same('categories') || !same('subs')) out.push(t('change.categories'));
        if (!out.length && JSON.stringify({ ...live, updatedAt: 0, updatedBy: 0 }) !== JSON.stringify({ ...d, updatedAt: 0, updatedBy: 0 })) out.push(t('change.other'));
        return out;
    }
    function updatePendingBadge() { const n = changes().length; const b = $('#pending-badge'); if (b) { b.hidden = n === 0; b.textContent = n; } }

    /* ---------- media processing ---------- */
    async function processImage(file, maxEdge = 1600, quality = 0.82) {
        const bmp = await createImageBitmap(file).catch(() => null);
        if (!bmp) return file;
        const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        const blob = await new Promise(res => c.toBlob(res, 'image/webp', quality));
        return blob || file;
    }
    function pickFile(inputId) { return new Promise(res => { const inp = $(inputId); inp.value = ''; inp.onchange = () => res(inp.files[0] || null); inp.click(); }); }
    async function uploadImageTo(prefix, onProgress) {
        const file = await pickFile(onProgress === 'camera' ? '#file-camera' : '#file-image'); if (!file) return null;
        const blob = await processImage(file);
        const path = `${prefix}/${Date.now()}.webp`;
        return { path: await store.uploadMedia(blob, path), focal: { x: 0.5, y: 0.5 } };
    }
    async function uploadVideoTo(prefix) {
        const file = await pickFile('#file-video'); if (!file) return null;
        if (file.size > 30 * 1024 * 1024) { toast(t('video.tooBig')); return null; }
        const path = await store.uploadMedia(file, `${prefix}/${Date.now()}.mp4`);
        const poster = await pickPosterFrame(file, `${prefix}/poster-${Date.now()}.webp`);
        return { path, poster };
    }
    function pickPosterFrame(file, posterPath) {
        return new Promise(res => {
            const url = URL.createObjectURL(file);
            const d = sheet(`<h3>${esc(t('video.pickFrame'))}</h3><div class="video-box"><video src="${url}" muted playsinline preload="auto"></video><input type="range" min="0" max="100" value="10"></div><div class="btn-row"><button class="btn btn-ghost" data-x="skip">${esc(t('common.cancel'))}</button><button class="btn btn-primary" data-x="use">${esc(t('video.useFrame'))}</button></div>`);
            const v = $('video', d), r = $('input[type=range]', d);
            v.addEventListener('loadedmetadata', () => { v.currentTime = Math.min(1, v.duration * 0.1); });
            r.oninput = () => { if (v.duration) v.currentTime = v.duration * (r.value / 100); };
            d.onclick = async e => {
                const b = e.target.closest('[data-x]'); if (!b) return;
                if (b.dataset.x === 'use') {
                    const c = document.createElement('canvas'); c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720;
                    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
                    const blob = await new Promise(r2 => c.toBlob(r2, 'image/webp', 0.82));
                    const p = blob ? await store.uploadMedia(blob, posterPath) : null;
                    closeSheet(); URL.revokeObjectURL(url); res(p);
                } else { closeSheet(); URL.revokeObjectURL(url); res(null); }
            };
        });
    }

    /* photo frame: renders an image with focal-point dragging; returns HTML, binding happens in bindPhotoFrames() */
    const photoFrame = (imageObj, bindPath, opts = {}) => {
        const m = imageObj && imageObj.path ? imageObj : null;
        return `<div class="stack">
            <div class="photo ${m ? '' : 'is-empty'}" data-photo="${esc(bindPath)}" style="${opts.aspect ? `aspect-ratio:${opts.aspect}` : ''}">
                ${m ? `<img src="${esc(media(m.path))}" alt="" style="object-position:${(m.focal?.x ?? 0.5) * 100}% ${(m.focal?.y ?? 0.5) * 100}%" draggable="false">${opts.stock ? `<span class="badge-stock">${esc(t('item.stock'))}</span>` : ''}<span class="hint">${esc(t('item.photoDrag'))}</span>` : `<span>${esc(t('item.photo'))}</span>`}
            </div>
            <div class="photo-actions">
                <button type="button" class="btn btn-ghost" data-photo-take="${esc(bindPath)}" data-prefix="${esc(opts.prefix || 'misc')}">${esc(t('item.photoTake'))}</button>
                <button type="button" class="btn btn-ghost" data-photo-pick="${esc(bindPath)}" data-prefix="${esc(opts.prefix || 'misc')}">${esc(t('item.photoPick'))}</button>
                ${m && opts.removable !== false ? `<button type="button" class="btn btn-quiet" data-photo-remove="${esc(bindPath)}">${esc(t('item.photoRemove'))}</button>` : ''}
            </div>
        </div>`;
    };
    function bindPhotoFrames(rootEl, afterChange) {
        $$('.photo[data-photo]', rootEl).forEach(frame => {
            const img = $('img', frame); if (!img) return;
            let dragging = false, sx = 0, sy = 0, fx = 0.5, fy = 0.5;
            frame.addEventListener('pointerdown', e => { const cur = getPath(st.draft, frame.dataset.photo) || {}; fx = cur.focal?.x ?? 0.5; fy = cur.focal?.y ?? 0.5; dragging = true; sx = e.clientX; sy = e.clientY; frame.setPointerCapture(e.pointerId); });
            frame.addEventListener('pointermove', e => {
                if (!dragging) return; const r = frame.getBoundingClientRect();
                const nx = Math.min(1, Math.max(0, fx - (e.clientX - sx) / r.width)), ny = Math.min(1, Math.max(0, fy - (e.clientY - sy) / r.height));
                img.style.objectPosition = `${nx * 100}% ${ny * 100}%`; frame.dataset.nx = nx; frame.dataset.ny = ny;
            });
            const end = () => { if (!dragging) return; dragging = false; if (frame.dataset.nx != null) { mutate(d => { const cur = getPath(d, frame.dataset.photo); if (cur) cur.focal = { x: Number(frame.dataset.nx), y: Number(frame.dataset.ny) }; }); afterChange && afterChange(); } };
            frame.addEventListener('pointerup', end); frame.addEventListener('pointercancel', end);
        });
        rootEl.addEventListener('click', async e => {
            const take = e.target.closest('[data-photo-take]'), pick = e.target.closest('[data-photo-pick]'), rm = e.target.closest('[data-photo-remove]');
            const b = take || pick; if (b) {
                const path = b.dataset.photoTake || b.dataset.photoPick; const frame = $(`.photo[data-photo="${path}"]`, rootEl);
                if (frame) frame.insertAdjacentHTML('beforeend', `<div class="progress">…</div>`);
                try { const res = await uploadImageTo(b.dataset.prefix, take ? 'camera' : 'pick'); if (res) { mutate(d => { setPath(d, path, res); if (path.startsWith('items.')) { const it = getPath(d, path.replace(/\.image$/, '')); if (it) it.imageIsStock = false; } }); render(); return; } }
                catch (err) { toast(t('common.error')); }
                $('.progress', frame)?.remove();
            }
            if (rm) { mutate(d => setPath(d, rm.dataset.photoRemove, null)); render(); }
        }, { once: false });
    }

    /* ---------- generic form binding ---------- */
    function bindInputs(rootEl, afterChange) {
        rootEl.addEventListener('input', e => {
            const el = e.target; const path = el.dataset.bind; if (!path) return;
            let v = el.value;
            if (el.dataset.type === 'num') v = v === '' ? null : Number(String(v).replace(/[^\d.-]/g, ''));
            if (el.dataset.type === 'list') v = v.split('\n').map(x => x.trim()).filter(Boolean);
            mutate(d => setPath(d, path, v));
            afterChange && afterChange(path, v);
        });
        rootEl.addEventListener('click', e => {
            const sw = e.target.closest('.switch[data-bind]');
            if (sw) { const path = sw.dataset.bind; const v = !(getPath(st.draft, path)); mutate(d => setPath(d, path, v)); sw.setAttribute('aria-checked', String(v)); afterChange && afterChange(path, v); }
            const seg = e.target.closest('.seg[data-bind] button');
            if (seg) { const path = seg.parentElement.dataset.bind; const v = seg.dataset.val; mutate(d => setPath(d, path, v)); $$('button', seg.parentElement).forEach(b => b.setAttribute('aria-checked', String(b === seg))); afterChange && afterChange(path, v); }
        });
    }
    const F = {
        text: (label, path, val, opts = {}) => `<div class="field"><label for="f-${esc(path)}">${esc(label)}</label><input id="f-${esc(path)}" type="${opts.type || 'text'}" data-bind="${esc(path)}" ${opts.num ? 'data-type="num" inputmode="numeric"' : ''} value="${esc(val ?? '')}" placeholder="${esc(opts.ph || '')}"></div>`,
        area: (label, path, val) => `<div class="field"><label for="f-${esc(path)}">${esc(label)}</label><textarea id="f-${esc(path)}" data-bind="${esc(path)}">${esc(val ?? '')}</textarea></div>`,
        text2: (label, path, val, area = false) => `<div class="grid2">${(area ? F.area : F.text)(label + ' (TR)', path + '.tr', val?.tr)}${(area ? F.area : F.text)(label + ' (EN)', path + '.en', val?.en)}</div>`,
        toggle: (label, path, val) => `<button type="button" class="switch" role="switch" data-bind="${esc(path)}" aria-checked="${!!val}"><span>${esc(label)}</span><span class="knob"></span></button>`,
        seg: (label, path, val, options) => `<div class="field"><span class="field-label">${esc(label)}</span><div class="seg ${options.length > 2 ? 'is-3' : ''}" role="radiogroup" data-bind="${esc(path)}">${options.map(([v, l]) => `<button type="button" role="radio" data-val="${esc(v)}" aria-checked="${v === val}">${esc(l)}</button>`).join('')}</div></div>`,
        select: (label, path, val, options) => `<div class="field"><label for="f-${esc(path)}">${esc(label)}</label><select id="f-${esc(path)}" data-bind="${esc(path)}">${options.map(([v, l]) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`
    };

    /* ---------- shell ---------- */
    const ICON = {
        home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
        menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
        builder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 12l6.5-6.5"/></svg>',
        branches: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
        landing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 14h8"/></svg>',
        more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
        back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
        chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
        photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>',
        slice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 4l18 8-9 9z"/></svg>',
        price: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 17l6-6 4 4 6-8"/><path d="M14 7h6v6"/></svg>',
        off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/></svg>'
    };
    const tabs = () => {
        const r = st.route.split('/')[1] || '';
        const map = [['', 'home'], ['menu', 'menu'], ['builder', 'builder'], ['branches', 'branches'], ['landing', 'landing'], ['more', 'more']];
        const active = ['item', 'archive'].includes(r) ? 'menu' : r === 'branch' ? 'branches' : ['versions', 'settings', 'help'].includes(r) ? 'more' : r.startsWith('quick') ? '' : r;
        return `<nav class="tabs" aria-label="Sekmeler">${map.map(([path, key]) => `<a href="#/${path}" class="${active === path ? 'is-active' : ''}">${ICON[key]}<span>${esc(t('nav.' + key))}</span></a>`).join('')}</nav>`;
    };
    const bar = (title, back) => `<header class="abar">${back ? `<a class="back" href="${esc(back)}" aria-label="${esc(t('common.back'))}">${ICON.back}</a>` : `<span class="wordmark"><span>The</span> Upper Crust</span>`}<h1>${esc(title)}</h1><span class="savestate" id="savestate"></span><div class="lang" role="group"><button type="button" data-alang="TR" aria-pressed="${st.lang === 'TR'}">TR</button><button type="button" data-alang="EN" aria-pressed="${st.lang === 'EN'}">EN</button></div></header>`;

    /* ---------- views ---------- */
    const V = {};

    V.home = () => {
        const ch = changes(); const stock = st.draft.items.filter(i => !i.archived && i.imageIsStock).length;
        return `${bar(t('app.title'))}<div class="view">
            <div class="panel ${ch.length ? 'is-status' : ''}">
                <p class="muted">${esc(t('home.hello'))}${st.user?.name ? ', ' + esc(st.user.name.split(' ')[0]) : ''}</p>
                <h2>${ch.length ? esc(t('home.pending', { n: ch.length })) : esc(t('home.clean'))}</h2>
                ${ch.length ? `<ul class="changes">${ch.slice(0, 4).map(c => `<li>${esc(c)}</li>`).join('')}${ch.length > 4 ? `<li>…</li>` : ''}</ul>` : ''}
                <div class="btn-row"><button class="btn btn-ghost" data-act="preview">${esc(t('home.preview'))}</button><button class="btn btn-primary ${ch.length ? 'is-hot' : ''}" data-act="publish" ${ch.length ? '' : 'disabled'}>${esc(t('home.publish'))}</button></div>
                <p class="small">${st.live ? esc(t('home.live', { v: st.live.versionId, when: ago(st.live.publishedAt) })) : esc(t('home.neverLive'))}${st.versions.length > 1 ? ` · <a class="link" href="#" data-act="undo">${esc(t('home.undo'))}</a>` : ''}</p>
            </div>
            <h3>${esc(t('home.quick'))}</h3>
            <div class="quick-grid">
                <a class="quick" href="#/quick/soldout">${ICON.off}<span>${esc(t('home.soldout'))}</span><small>${esc(t('home.soldoutSub'))}</small></a>
                <a class="quick" href="#/quick/slice">${ICON.slice}<span>${esc(t('home.slice'))}</span><small>${esc(t('home.sliceSub'))}</small></a>
                <a class="quick" href="#/quick/prices">${ICON.price}<span>${esc(t('home.prices'))}</span><small>${esc(t('home.pricesSub'))}</small></a>
                <a class="quick" href="#/quick/photos">${ICON.photo}<span>${esc(t('home.photos'))}</span><small>${esc(t('home.photosSub', { n: stock }))}</small></a>
            </div>
        </div>`;
    };

    V.menu = () => {
        const cats = st.draft.categories.slice().sort((a, b) => a.order - b.order);
        const archived = st.draft.items.filter(i => i.archived).length;
        return `${bar(t('menu.title'))}<div class="view">
            <div class="list">${cats.map((c, i) => { const n = st.draft.items.filter(x => x.cat === c.id && !x.archived).length; return `<div class="row-item" style="grid-template-columns: minmax(0,1fr) auto auto">
                <a href="#/menu/${esc(c.id)}" style="min-width:0"><div class="name">${esc(T2(c.name))} ${c.hidden ? `<span class="pill">${esc(t('menu.hidden'))}</span>` : ''}</div><div class="sub">${esc(t('menu.items', { n }))}</div></a>
                <div class="order-ctl"><button data-cat-move="${esc(c.id)}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(t('f.up'))}">▲</button><button data-cat-move="${esc(c.id)}" data-dir="1" ${i === cats.length - 1 ? 'disabled' : ''} aria-label="${esc(t('f.down'))}">▼</button></div>
                <button class="icon-btn" data-cat-edit="${esc(c.id)}" aria-label="${esc(t('cat.edit'))}" style="width:40px;height:40px">✎</button></div>`; }).join('')}</div>
            <div class="btn-row"><a class="btn btn-primary" href="#/item/new">${esc(t('menu.new'))}</a>${archived ? `<a class="btn btn-ghost" href="#/archive">${esc(t('archive.title'))} (${archived})</a>` : ''}</div>
        </div>`;
    };

    const itemRow = (it, extra = '') => {
        const price = it.sizes.ONE_SIZE != null ? fmt(it.sizes.ONE_SIZE) : it.sizes.L != null ? `L ${fmt(it.sizes.L)}` : it.sizes.GLASS != null ? `${fmt(it.sizes.GLASS)} / ${fmt(it.sizes.BOTTLE)}` : '';
        return `<a class="row-item ${it.available === false ? 'is-out' : ''} ${it.archived ? 'is-archived' : ''}" href="#/item/${esc(it.id)}">
            <span class="thumb-disc ${it.image ? '' : 'is-empty'}">${it.image ? `<img src="${esc(media(it.image.path))}" alt="" loading="lazy" style="object-position:${(it.image.focal?.x ?? 0.5) * 100}% ${(it.image.focal?.y ?? 0.5) * 100}%">` : esc(it.num || it.name.slice(0, 1))}</span>
            <span><span class="name">${it.num ? `<span class="row-num">${esc(it.num)}</span>` : ''}${esc(it.name)}</span><span class="sub">${it.tags.map(tg => `<span class="pill ${tg === 'SPICY' ? 'is-red' : tg === 'STAR' ? 'is-gold' : ''}">${tg === 'STAR' ? '★' : tg === 'SPICY' ? esc(t('tag.SPICY')) : tg}</span>`).join('')}${it.available === false ? `<span class="pill is-red">${esc(t('item.available'))}</span>` : ''}${it.imageIsStock ? `<span class="pill is-gold">stok</span>` : ''}${it.sizeLabel ? `<span>${esc(it.sizeLabel)}</span>` : ''}</span></span>
            <span class="price">${price}${extra}</span></a>`;
    };
    V.menuCat = cat => {
        const c = st.draft.categories.find(x => x.id === cat); if (!c) return V.menu();
        const items = st.draft.items.filter(i => i.cat === cat && !i.archived).sort((a, b) => a.order - b.order);
        const q = (st.q || '').toLowerCase();
        const shown = q ? items.filter(i => (i.num + ' ' + i.name + ' ' + (i.desc?.tr || '')).toLowerCase().includes(q)) : items;
        return `${bar(T2(c.name), '#/menu')}<div class="view">
            <div class="rowline"><div class="field" style="flex:1"><input type="search" id="q" placeholder="${esc(t('menu.search'))}" value="${esc(st.q || '')}" style="width:100%;min-height:44px;padding:0 .875rem;border-radius:var(--r);background:var(--ink-3);border:1px solid var(--line-strong);color:var(--chalk);font:inherit"></div><button class="btn btn-ghost" data-act="reorder">${st.reorder ? '✓' : '↕'}</button></div>
            <div class="list">${shown.map((it, i) => st.reorder ? `<div class="row-item" style="grid-template-columns: minmax(0,1fr) auto"><span><span class="name">${esc(it.name)}</span></span><div class="order-ctl"><button data-item-move="${esc(it.id)}" data-dir="-1" ${i === 0 ? 'disabled' : ''}>▲</button><button data-item-move="${esc(it.id)}" data-dir="1" ${i === shown.length - 1 ? 'disabled' : ''}>▼</button></div></div>` : itemRow(it)).join('')}</div>
            <a class="btn btn-primary" href="#/item/new?cat=${esc(cat)}">${esc(t('menu.new'))}</a>
        </div>`;
    };
    V.archive = () => {
        const items = st.draft.items.filter(i => i.archived);
        return `${bar(t('archive.title'), '#/menu')}<div class="view">${items.length ? `<div class="list">${items.map(it => itemRow(it)).join('')}</div>` : `<p class="muted">${esc(t('archive.empty'))}</p>`}</div>`;
    };

    const priceType = it => it.sizes.ONE_SIZE != null ? 'one' : it.sizes.GLASS != null || it.sizes.BOTTLE != null ? 'wine' : 'pizza';
    const cardPreview = it => {
        const m = it.image; const out = it.available === false;
        const price = priceType(it) === 'one' ? fmt(it.sizes.ONE_SIZE) : priceType(it) === 'wine' ? `${esc(t('item.type.wine').split(' / ')[0])} ${fmt(it.sizes.GLASS)} / ${fmt(it.sizes.BOTTLE)}` : fmt(it.sizes.L ?? it.sizes.S ?? it.sizes.XXL ?? 0);
        return `<article class="card ${out ? 'is-out' : ''}"><div class="card-media">${m ? `<img src="${esc(media(m.path))}" alt="" style="object-position:${(m.focal?.x ?? 0.5) * 100}% ${(m.focal?.y ?? 0.5) * 100}%">` : `<div class="card-type">${esc(it.num || it.name.slice(0, 1))}</div>`}</div>
            <div class="card-body"><div class="card-head"><h3 class="card-name">${it.num ? `<span class="row-num">${esc(it.num)}</span>` : ''}${esc(it.name)}</h3><p class="card-price">${price}</p></div>${out ? `<p class="card-out">${esc(t('item.available'))}</p>` : ''}<p class="card-desc">${esc(T2(it.desc))}</p><div class="card-meta">${it.tags.map(tg => `<span class="tag is-${tg.toLowerCase()}">${tg === 'STAR' ? '★' : tg === 'SPICY' ? esc(t('tag.SPICY')) : tg}</span>`).join('')}</div></div></article>`;
    };
    V.item = (id, params) => {
        let idx = st.draft.items.findIndex(i => i.id === id);
        if (id === 'new') {
            const cat = params.get('cat') || 'PIZZAS';
            const it = { id: uid('i'), num: '', name: '', cat, sub: (st.draft.categories.find(c => c.id === cat)?.subs || [])[0] || null, order: (Math.max(0, ...st.draft.items.filter(i => i.cat === cat).map(i => i.order)) + 1), desc: { tr: '', en: '' }, sizes: cat === 'PIZZAS' ? { S: null, L: null, XXL: null } : cat === 'WINES' ? { GLASS: null, BOTTLE: null } : { ONE_SIZE: null }, sizeLabel: null, tags: [], image: null, imageIsStock: false, available: true, unavailableUntil: null, inBuilder: cat === 'PIZZAS', archived: false };
            mutate(d => d.items.push(it)); location.replace(`#/item/${it.id}`); return '';
        }
        if (idx < 0) return V.menu();
        const it = st.draft.items[idx]; const P = `items.${idx}`;
        const cat = st.draft.categories.find(c => c.id === it.cat); const subs = cat?.subs || [];
        const type = priceType(it);
        return `${bar(it.name || t('item.new'), `#/menu/${esc(it.cat)}`)}<div class="view" id="item-editor">
            ${photoFrame(it.image, `${P}.image`, { prefix: `items/${it.id}`, stock: it.imageIsStock })}
            <div class="grid2" style="grid-template-columns: 100px 1fr">${F.text(t('item.num'), `${P}.num`, it.num, { ph: '#12' })}${F.text(t('item.name'), `${P}.name`, it.name)}</div>
            <div class="field ${it.name ? '' : 'has-err'}">${it.name ? '' : `<span class="err">${esc(t('item.validation.name'))}</span>`}</div>
            ${F.area(t('item.descTr'), `${P}.desc.tr`, it.desc?.tr)}${F.area(t('item.descEn'), `${P}.desc.en`, it.desc?.en)}
            ${F.seg(t('item.priceType'), '__type', type, [['pizza', t('item.type.pizza')], ['one', t('item.type.one')], ['wine', t('item.type.wine')]])}
            ${type === 'pizza' ? `<div class="price-grid">${SIZES.map(s => `<div class="field"><label>${s}</label><input type="text" inputmode="numeric" data-bind="${P}.sizes.${s}" data-type="num" value="${it.sizes[s] ?? ''}"></div>`).join('')}</div>`
              : type === 'wine' ? `<div class="grid2">${F.text(t('item.type.wine').split(' / ')[0], `${P}.sizes.GLASS`, it.sizes.GLASS, { num: true })}${F.text(t('item.type.wine').split(' / ')[1], `${P}.sizes.BOTTLE`, it.sizes.BOTTLE, { num: true })}</div>`
              : `<div class="grid2">${F.text(t('item.priceOne'), `${P}.sizes.ONE_SIZE`, it.sizes.ONE_SIZE, { num: true })}${F.text(t('item.sizeLabel'), `${P}.sizeLabel`, it.sizeLabel, { ph: '33 cl' })}</div>`}
            <div class="field"><span class="field-label">${esc(t('item.tags'))}</span><div class="chips-row">${TAGS.map(tg => `<button type="button" class="tchip" data-tag="${tg}" aria-pressed="${it.tags.includes(tg)}">${esc(t('tag.' + tg))}</button>`).join('')}</div></div>
            <div class="grid2">${F.select(t('item.cat'), `${P}.cat`, it.cat, st.draft.categories.map(c => [c.id, T2(c.name)]))}${subs.length ? F.select(t('item.sub'), `${P}.sub`, it.sub, subs.map(s => [s, T2(st.draft.subs?.[s]) || s])) : ''}</div>
            ${type === 'pizza' ? F.toggle(t('item.inBuilder'), `${P}.inBuilder`, it.inBuilder !== false) : ''}
            <div class="stack">${F.toggle(t('item.available'), '__soldout', it.available === false)}
            ${it.available === false ? F.seg(t('item.until'), '__until', it.unavailableUntil ? 'midnight' : 'manual', [['midnight', t('until.midnight')], ['manual', t('until.manual')]]) : ''}</div>
            <div class="stack"><span class="field-label">${esc(t('item.preview'))}</span><div class="card-preview" id="card-preview">${cardPreview(it)}</div></div>
            <div class="btn-row"><a class="btn btn-primary" href="#/menu/${esc(it.cat)}">${esc(t('item.save'))}</a><button class="btn btn-ghost" data-act="duplicate">${esc(t('item.duplicate'))}</button>${it.archived ? `<button class="btn btn-ghost" data-act="restore-item">${esc(t('item.restore'))}</button>` : `<button class="btn btn-quiet" data-act="archive-item">${esc(t('item.archive'))}</button>`}</div>
        </div>`;
    };

    V.builder = () => {
        const tab = st.btab || 'tops';
        const tops = st.draft.toppings.filter(x => !x.archived).sort((a, b) => a.order - b.order);
        const r = st.draft.rules;
        const pz = st.draft.items.filter(i => i.cat === 'PIZZAS' && !i.archived && i.sizes.XXL != null).slice(0, 2);
        const ex = pz.length === 2 ? Math.max(pz[0].sizes.XXL, pz[1].sizes.XXL) + (r.halfHalf?.XXL || 0) + (r.glutenFree?.XXL || 0) + tops.slice(0, 3).reduce((s, x) => s + (x.prices?.XXL || 0), 0) : 0;
        return `${bar(t('nav.builder'))}<div class="view">
            <div class="seg" role="tablist"><button role="tab" data-btab="tops" aria-checked="${tab === 'tops'}">${esc(t('builder.toppings'))}</button><button role="tab" data-btab="rules" aria-checked="${tab === 'rules'}">${esc(t('builder.rules'))}</button></div>
            ${tab === 'tops' ? `<div class="stack">${GROUPS.map(g => `<details class="tgroup" open><summary class="tgroup-name">${esc(T2(st.draft.toppingGroups.find(x => x.id === g)?.name) || g)}</summary><div class="list" style="padding:.5rem 0">${tops.filter(x => x.group === g).map(x => { const i = st.draft.toppings.indexOf(x); return `<div class="row-item" style="grid-template-columns: minmax(0,1fr) 84px 84px auto"><a href="#/topping/${esc(x.id)}" style="min-width:0"><div class="name">${esc(x.name?.tr)}</div><div class="sub">${esc(x.name?.en || '')}</div></a><input type="text" inputmode="numeric" data-bind="toppings.${i}.prices.L" data-type="num" value="${x.prices?.L ?? ''}" aria-label="L" style="min-height:40px;text-align:center;padding:0 .4rem;border-radius:var(--r);background:var(--ink-3);border:1px solid var(--line-strong);color:var(--chalk);font:inherit"><input type="text" inputmode="numeric" data-bind="toppings.${i}.prices.XXL" data-type="num" value="${x.prices?.XXL ?? ''}" aria-label="XXL" style="min-height:40px;text-align:center;padding:0 .4rem;border-radius:var(--r);background:var(--ink-3);border:1px solid var(--line-strong);color:var(--chalk);font:inherit"><a href="#/topping/${esc(x.id)}" class="chev">${ICON.chev}</a></div>`; }).join('')}</div></details>`).join('')}
                <p class="small">L / XXL ₺</p><a class="btn btn-primary" href="#/topping/new">${esc(t('builder.newTopping'))}</a></div>`
            : `<div class="stack">
                <div class="panel"><h3>${esc(t('rules.half'))}</h3><div class="grid2">${F.text('L', 'rules.halfHalf.L', r.halfHalf?.L, { num: true })}${F.text('XXL', 'rules.halfHalf.XXL', r.halfHalf?.XXL, { num: true })}</div></div>
                <div class="panel"><h3>${esc(t('rules.gf'))}</h3><div class="grid2">${F.text('L', 'rules.glutenFree.L', r.glutenFree?.L, { num: true })}${F.text('XXL', 'rules.glutenFree.XXL', r.glutenFree?.XXL, { num: true })}</div>${F.toggle(t('rules.wheat'), 'rules.wholeWheat', r.wholeWheat !== false)}</div>
                <div class="panel"><h3>${esc(t('rules.sizes'))}</h3>${SIZES.map(s => `<div class="grid3" style="grid-template-columns: 50px 1fr 1fr; align-items:end"><b style="padding-bottom:.8rem">${s}</b>${F.text(t('rules.cm'), `rules.sizes.${s}.cm`, r.sizes?.[s]?.cm, { num: true })}${F.text(t('rules.slices'), `rules.sizes.${s}.slices`, r.sizes?.[s]?.slices, { num: true })}</div>`).join('')}</div>
                ${pz.length === 2 ? `<p class="small">${esc(t('rules.example', { a: pz[0].name, b: pz[1].name, total: fmt(ex) }))}</p>` : ''}
            </div>`}
        </div>`;
    };
    V.topping = id => {
        let idx = st.draft.toppings.findIndex(x => x.id === id);
        if (id === 'new') { const x = { id: uid('t'), group: 'VEG', name: { tr: '', en: '' }, prices: { L: null, XXL: null }, order: st.draft.toppings.length + 1, archived: false }; mutate(d => d.toppings.push(x)); location.replace(`#/topping/${x.id}`); return ''; }
        if (idx < 0) return V.builder();
        const x = st.draft.toppings[idx]; const P = `toppings.${idx}`;
        return `${bar(x.name?.tr || t('builder.newTopping'), '#/builder')}<div class="view">
            ${F.text(t('top.name'), `${P}.name.tr`, x.name?.tr)}${F.text(t('top.nameEn'), `${P}.name.en`, x.name?.en)}
            ${F.select(t('top.group'), `${P}.group`, x.group, GROUPS.map(g => [g, T2(st.draft.toppingGroups.find(y => y.id === g)?.name) || g]))}
            <div class="grid2">${F.text('L ₺', `${P}.prices.L`, x.prices?.L, { num: true })}${F.text('XXL ₺', `${P}.prices.XXL`, x.prices?.XXL, { num: true })}</div>
            <div class="btn-row"><a class="btn btn-primary" href="#/builder">${esc(t('item.save'))}</a><button class="btn btn-quiet" data-act="archive-topping">${esc(t('item.archive'))}</button></div>
        </div>`;
    };

    V.branches = () => `${bar(t('branches.title'))}<div class="view"><div class="list">${st.draft.branches.filter(b => !b.archived).sort((a, b) => a.order - b.order).map(b => `<a class="row-item" href="#/branch/${esc(b.id)}"><span class="thumb-disc ${b.image ? '' : 'is-empty'}">${b.image ? `<img src="${esc(media(b.image.path))}" alt="">` : esc(b.name.slice(0, 1))}</span><span><span class="name">${esc(b.name)}</span><span class="sub">${esc(b.address || '')}</span></span><span class="chev">${ICON.chev}</span></a>`).join('')}</div><a class="btn btn-ghost" href="#/branch/new">${esc(t('branches.new'))}</a></div>`;
    V.branch = id => {
        let idx = st.draft.branches.findIndex(b => b.id === id);
        if (id === 'new') { const b = { id: uid('b'), name: '', order: st.draft.branches.length + 1, desc: { tr: '', en: '' }, address: '', phone: '', phoneDisplay: '', whatsapp: null, hours: Object.fromEntries(DAYS.map(d => [d, ['11:30', '22:30']])), mapsUrl: '', mapQuery: '', image: null, archived: false }; mutate(d => d.branches.push(b)); location.replace(`#/branch/${b.id}`); return ''; }
        if (idx < 0) return V.branches();
        const b = st.draft.branches[idx]; const P = `branches.${idx}`;
        return `${bar(b.name || t('branches.new'), '#/branches')}<div class="view" id="branch-editor">
            ${photoFrame(b.image, `${P}.image`, { prefix: `branches/${b.id}`, aspect: '3 / 2' })}
            ${F.text(t('branch.name'), `${P}.name`, b.name)}
            ${F.text2(t('branch.desc').replace(' (TR)', ''), `${P}.desc`, b.desc, true)}
            ${F.text(t('branch.address'), `${P}.address`, b.address)}
            <div class="grid2">${F.text(t('branch.phone'), `${P}.phone`, b.phone, { type: 'tel' })}${F.text(t('branch.phoneDisplay'), `${P}.phoneDisplay`, b.phoneDisplay)}</div>
            ${F.text(t('branch.whatsapp'), `${P}.whatsapp`, b.whatsapp, { type: 'tel' })}
            ${F.text(t('branch.maps'), `${P}.mapsUrl`, b.mapsUrl, { type: 'url' })}${F.text(t('branch.mapQuery'), `${P}.mapQuery`, b.mapQuery)}
            <div class="panel"><h3>${esc(t('branch.hours'))}</h3><div class="hours">${DAYS.map(d => { const h = b.hours?.[d]; const closed = !h || h.length !== 2; return `<div class="hrow ${closed ? 'is-closed' : ''}" data-day="${d}"><span class="dayname">${esc(t('day.' + d))}</span><button type="button" class="switch" role="switch" data-day-toggle="${d}" aria-checked="${!closed}" aria-label="${esc(t(closed ? 'branch.closed' : 'branch.open'))}"><span class="knob"></span></button><input type="time" data-bind="${P}.hours.${d}.0" value="${closed ? '11:30' : esc(h[0])}" aria-label="${esc(t('branch.open'))}"><input type="time" data-bind="${P}.hours.${d}.1" value="${closed ? '22:30' : esc(h[1])}" aria-label="${esc(t('branch.close'))}"></div>`; }).join('')}</div></div>
            <div class="btn-row"><a class="btn btn-primary" href="#/branches">${esc(t('item.save'))}</a><button class="btn btn-quiet" data-act="archive-branch">${esc(t('branch.archive'))}</button></div>
        </div>`;
    };

    const SECTIONS = ['hero', 'marquee', 'story', 'timeline', 'signature', 'teaser', 'statement', 'catering', 'locations', 'social', 'conversion', 'footer', 'menuHero', 'notes', 'meta'];
    const sectionThumb = key => { const L = st.draft.landing; const m = { hero: L.hero?.video?.poster, story: L.story?.photos?.[0]?.path, timeline: L.timeline?.entries?.[0]?.image?.path, signature: L.signature?.season?.image?.path, teaser: L.teaser?.image?.path, statement: L.statement?.video?.poster, catering: L.catering?.image?.path, social: L.social?.tiles?.[0]?.image?.path }[key]; return m ? `<img src="${esc(media(m))}" alt="">` : ''; };
    const sectionLine = key => { const L = st.draft.landing; const x = { hero: L.hero?.title, marquee: { tr: (L.marquee?.words || []).join(' / ') }, story: L.story?.title, timeline: L.timeline?.title, signature: L.signature?.title, teaser: L.teaser?.title, statement: L.statement?.title, catering: L.catering?.title, locations: L.locations?.title, social: { tr: L.social?.title }, conversion: L.conversion?.title, footer: L.footer?.tagline, menuHero: L.menuHero?.title, notes: L.notes?.[0], meta: { tr: st.draft.meta?.orderUrl } }[key]; return T2(x); };
    V.landing = () => `${bar(t('landing.title'))}<div class="view"><p class="muted">${esc(t('landing.hint'))}</p><div class="list">${SECTIONS.map(k => `<a class="row-item" href="#/landing/${k}"><span class="thumb-disc ${sectionThumb(k) ? '' : 'is-empty'}">${sectionThumb(k) || '¶'}</span><span><span class="name">${esc(t('sec.' + k))}</span><span class="sub">${esc(sectionLine(k).slice(0, 60))}</span></span><span class="chev">${ICON.chev}</span></a>`).join('')}</div></div>`;
    const listEditor = (label, path, arr, renderRow, blank) => `<div class="panel"><h3>${esc(label)}</h3>${(arr || []).map((row, i) => `<div class="stack" style="border-top:1px solid var(--line);padding-top:.75rem">${renderRow(row, `${path}.${i}`, i)}<div class="btn-row"><button class="btn btn-quiet" data-list-move="${esc(path)}" data-i="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''}>${esc(t('f.up'))}</button><button class="btn btn-quiet" data-list-move="${esc(path)}" data-i="${i}" data-dir="1" ${i === (arr.length - 1) ? 'disabled' : ''}>${esc(t('f.down'))}</button><button class="btn btn-quiet" data-list-remove="${esc(path)}" data-i="${i}">${esc(t('f.remove'))}</button></div></div>`).join('')}<button class="btn btn-ghost" data-list-add="${esc(path)}" data-blank='${esc(JSON.stringify(blank))}'>${esc(t('f.add'))}</button></div>`;
    const videoField = (label, path, v, prefix) => `<div class="panel"><h3>${esc(label)}</h3>${v?.path ? `<div class="video-box"><video src="${esc(media(v.path))}" poster="${esc(media(v.poster))}" controls muted playsinline preload="metadata"></video></div>` : ''}<div class="btn-row"><button class="btn btn-ghost" data-video-pick="${esc(path)}" data-prefix="${esc(prefix)}">${esc(t('f.video'))}</button>${v?.path ? `<button class="btn btn-quiet" data-video-remove="${esc(path)}">${esc(t('f.remove'))}</button>` : ''}</div></div>`;
    V.landingSection = key => {
        const L = st.draft.landing; const P = `landing.${key}`;
        let body = '';
        switch (key) {
            case 'hero': body = F.text2(t('f.title'), `${P}.title`, L.hero.title) + F.text2(t('f.subtitle'), `${P}.subtitle`, L.hero.subtitle) + videoField(t('f.video'), `${P}.video`, L.hero.video, 'landing/hero') + listEditor(t('f.awards'), `${P}.awards`, L.hero.awards, (row, p) => F.text2(t('f.text'), p, row), { tr: '', en: '' }); break;
            case 'marquee': body = `<div class="field"><label>${esc(t('f.words'))}</label><textarea data-bind="${P}.words" data-type="list">${esc((L.marquee.words || []).join('\n'))}</textarea></div>`; break;
            case 'story': body = F.text2(t('f.title'), `${P}.title`, L.story.title) + F.text2(t('f.text'), `${P}.text`, L.story.text, true) + listEditor(t('f.facts'), `${P}.facts`, L.story.facts, (row, p) => `<div class="grid2">${F.text2(t('f.name'), p + '.k', row.k)}${F.text2(t('f.text'), p + '.v', row.v)}</div>`, { k: { tr: '', en: '' }, v: { tr: '', en: '' } }) + `<div class="grid2">${photoFrame(L.story.photos?.[0], `${P}.photos.0`, { prefix: 'landing/story', removable: false })}${photoFrame(L.story.photos?.[1], `${P}.photos.1`, { prefix: 'landing/story', removable: false })}</div>`; break;
            case 'timeline': body = F.text2(t('f.title'), `${P}.title`, L.timeline.title) + listEditor(t('f.entries'), `${P}.entries`, L.timeline.entries, (row, p) => F.text2(t('f.date'), p + '.date', row.date) + F.text2(t('f.text'), p + '.text', row.text, true) + photoFrame(row.image, p + '.image', { prefix: 'landing/timeline', removable: false }), { date: { tr: '', en: '' }, text: { tr: '', en: '' }, image: null }); break;
            case 'signature': { const pizzas = st.draft.items.filter(i => !i.archived && i.image); body = F.text2(t('f.title'), `${P}.title`, L.signature.title) + F.text2(t('f.text'), `${P}.text`, L.signature.text, true) + `<div class="panel"><h3>${esc(t('f.items'))}</h3>${[0, 1, 2].map(i => F.select(`${i + 1}.`, `${P}.itemIds.${i}`, L.signature.itemIds?.[i], pizzas.map(p => [p.id, (p.num ? p.num + ' ' : '') + p.name]))).join('')}</div>` + `<div class="panel"><h3>${esc(t('f.season'))}</h3>${F.text2(t('f.name'), `${P}.season.name`, L.signature.season?.name)}${F.text2(t('f.text'), `${P}.season.desc`, L.signature.season?.desc, true)}${F.text(t('f.url'), `${P}.season.url`, L.signature.season?.url, { type: 'url' })}${photoFrame(L.signature.season?.image, `${P}.season.image`, { prefix: 'landing/season' })}</div>`; break; }
            case 'teaser': body = F.text2(t('f.title'), `${P}.title`, L.teaser.title) + F.text2(t('f.text'), `${P}.text`, L.teaser.text, true) + photoFrame(L.teaser.image, `${P}.image`, { prefix: 'landing/teaser', removable: false }); break;
            case 'statement': body = F.text2(t('f.title'), `${P}.title`, L.statement.title) + F.text2(t('f.text'), `${P}.text`, L.statement.text, true) + videoField(t('f.video'), `${P}.video`, L.statement.video, 'landing/statement'); break;
            case 'catering': body = F.text2(t('f.title'), `${P}.title`, L.catering.title) + F.text2(t('f.text'), `${P}.text`, L.catering.text, true) + F.text(t('f.phone'), `${P}.phone`, L.catering.phone, { type: 'tel' }) + photoFrame(L.catering.image, `${P}.image`, { prefix: 'landing/catering', removable: false }) + listEditor(t('f.strip'), `${P}.strip`, L.catering.strip, (row, p) => photoFrame(row, p, { prefix: 'landing/catering', removable: false, aspect: '4 / 5' }), { path: '', focal: { x: 0.5, y: 0.5 } }); break;
            case 'locations': body = F.text2(t('f.title'), `${P}.title`, L.locations.title) + F.text2(t('f.text'), `${P}.text`, L.locations.text, true); break;
            case 'social': body = F.text(t('f.handle'), `${P}.title`, L.social.title) + F.text(t('f.url'), `${P}.url`, L.social.url, { type: 'url' }) + F.text2(t('f.text'), `${P}.text`, L.social.text) + listEditor(t('f.tiles'), `${P}.tiles`, L.social.tiles, (row, p) => photoFrame(row.image, p + '.image', { prefix: 'landing/social', removable: false, aspect: '4 / 5' }) + F.text(t('f.caption'), p + '.caption', row.caption) + F.text(t('f.url'), p + '.url', row.url, { type: 'url' }), { image: null, caption: '', url: '' }); break;
            case 'conversion': body = F.text2(t('f.title'), `${P}.title`, L.conversion.title) + F.text2(t('f.text'), `${P}.text`, L.conversion.text, true); break;
            case 'footer': body = F.text2(t('f.tagline'), `${P}.tagline`, L.footer.tagline, true) + F.text(t('f.instagram'), `${P}.instagram`, L.footer.instagram, { type: 'url' }) + F.text(t('f.facebook'), `${P}.facebook`, L.footer.facebook, { type: 'url' }) + F.text(t('f.x'), `${P}.x`, L.footer.x, { type: 'url' }); break;
            case 'menuHero': body = F.text2(t('f.title'), `${P}.title`, L.menuHero.title) + F.text2(t('f.text'), `${P}.text`, L.menuHero.text, true); break;
            case 'notes': body = listEditor(t('sec.notes'), `${P}`, L.notes, (row, p) => F.text2(t('f.text'), p, row, true), { tr: '', en: '' }); break;
            case 'meta': body = F.text(t('f.orderUrl'), 'meta.orderUrl', st.draft.meta.orderUrl, { type: 'url' }) + F.text(t('f.menuPdf'), 'meta.menuPdf', st.draft.meta.menuPdf, { type: 'url' }) + F.text(t('f.paketPdf'), 'meta.paketPdf', st.draft.meta.paketPdf, { type: 'url' }) + F.text(t('f.priceDate'), 'meta.priceDate', st.draft.meta.priceDate, { type: 'date' }); break;
        }
        return `${bar(t('sec.' + key), '#/landing')}<div class="view" id="section-editor">${body}<a class="btn btn-primary" href="#/landing">${esc(t('item.save'))}</a></div>`;
    };

    V.quickSoldout = () => {
        const q = (st.q || '').toLowerCase();
        const items = st.draft.items.filter(i => !i.archived && (!q || (i.num + ' ' + i.name).toLowerCase().includes(q))).sort((a, b) => (a.available === false ? -1 : 1) - (b.available === false ? -1 : 1) || a.order - b.order);
        return `${bar(t('quick.soldout.title'), '#/')}<div class="view"><p class="muted">${esc(t('quick.soldout.text'))}</p>
            <input type="search" id="q" placeholder="${esc(t('menu.search'))}" value="${esc(st.q || '')}" style="min-height:44px;padding:0 .875rem;border-radius:var(--r);background:var(--ink-3);border:1px solid var(--line-strong);color:var(--chalk);font:inherit">
            <div class="list">${items.map(it => `<div class="row-item" style="grid-template-columns: minmax(0,1fr) auto"><span><span class="name">${it.num ? esc(it.num) + ' ' : ''}${esc(it.name)}</span><span class="sub">${esc(T2(st.draft.categories.find(c => c.id === it.cat)?.name))}</span></span><button type="button" class="switch" role="switch" data-soldout="${esc(it.id)}" aria-checked="${it.available === false}" style="width:auto;background:none;border:0"><span class="knob"></span></button></div>`).join('')}</div></div>`;
    };
    V.quickSlice = () => {
        const pizzas = st.draft.items.filter(i => i.cat === 'PIZZAS' && !i.archived);
        const s = st.draft.sliceOfDay || { itemId: null, note: { tr: '', en: '' } };
        return `${bar(t('quick.slice.title'), '#/')}<div class="view"><p class="muted">${esc(t('quick.slice.text'))}</p>
            ${F.select(t('quick.slice.title'), 'sliceOfDay.itemId', s.itemId || '', [['', t('quick.slice.none')], ...pizzas.map(p => [p.id, (p.num ? p.num + ' ' : '') + p.name])])}
            ${F.text2(t('quick.slice.note'), 'sliceOfDay.note', s.note)}
            <div class="btn-row"><a class="btn btn-primary" href="#/">${esc(t('item.save'))}</a><button class="btn btn-quiet" data-act="slice-clear">${esc(t('quick.slice.clear'))}</button></div></div>`;
    };
    const round5 = n => Math.round(n / 5) * 5;
    V.quickPrices = () => {
        const p = st.priceForm || { scope: 'ALL', mode: 'pct', value: '' };
        const cats = st.draft.categories.slice().sort((a, b) => a.order - b.order);
        const rows = st.pricePreview || [];
        return `${bar(t('quick.prices.title'), '#/')}<div class="view">
            ${F.select(t('quick.prices.scope'), '__scope', p.scope, [['ALL', t('quick.prices.all')], ...cats.map(c => [c.id, T2(c.name)])])}
            <div class="grid2">${F.seg(t('quick.prices.mode'), '__mode', p.mode, [['pct', t('quick.prices.pct')], ['abs', t('quick.prices.abs')]])}<div class="field"><label for="pv">${esc(t('quick.prices.value'))}</label><input id="pv" type="text" inputmode="decimal" value="${esc(p.value)}" placeholder="${p.mode === 'pct' ? '8' : '50'}"></div></div>
            <p class="small">${esc(t('quick.prices.round'))}</p>
            <div class="btn-row"><button class="btn btn-ghost" data-act="price-preview">${esc(t('quick.prices.preview'))}</button><button class="btn btn-primary" data-act="price-apply" ${rows.length ? '' : 'disabled'}>${esc(t('quick.prices.apply'))}</button></div>
            ${rows.length ? `<div style="overflow:auto"><table class="ptable"><thead><tr><th></th><th class="num">${esc(t('quick.prices.old'))}</th><th class="num">${esc(t('quick.prices.new'))}</th></tr></thead><tbody>${rows.slice(0, 200).map(r => `<tr><td>${esc(r.name)} <span class="small">${esc(r.size)}</span></td><td class="num">${fmt(r.old)}</td><td class="num ${r.nw >= r.old ? 'up' : 'down'}">${fmt(r.nw)}</td></tr>`).join('')}</tbody></table></div>` : ''}
        </div>`;
    };
    V.quickPhotos = () => {
        const items = st.draft.items.filter(i => !i.archived && i.imageIsStock);
        return `${bar(t('quick.photos.title'), '#/')}<div class="view"><p class="muted">${items.length ? esc(t('quick.photos.text')) : esc(t('quick.photos.done'))}</p><div class="list">${items.map(it => itemRow(it)).join('')}</div></div>`;
    };

    V.versions = () => `${bar(t('versions.title'), '#/')}<div class="view">${st.versions.length ? `<div class="list">${st.versions.map(v => `<div class="row-item" style="grid-template-columns: minmax(0,1fr) auto"><span><span class="name">v${v.id} ${st.live?.versionId === v.id ? `<span class="pill is-green">${esc(t('versions.live'))}</span>` : ''}</span><span class="sub">${esc(v.note || '')} ${v.publishedAt ? '· ' + esc(new Date(v.publishedAt).toLocaleString(st.lang === 'TR' ? 'tr-TR' : 'en-GB')) : ''} ${v.publishedBy ? '· ' + esc(v.publishedBy) : ''}</span></span>${st.live?.versionId === v.id ? '' : `<button class="btn btn-ghost" data-restore="${v.id}">${esc(t('versions.restore'))}</button>`}</div>`).join('')}</div>` : `<p class="muted">${esc(t('versions.empty'))}</p>`}</div>`;
    V.more = () => `${bar(t('nav.more'))}<div class="view"><div class="list"><a class="row-item" href="#/versions" style="grid-template-columns:1fr auto"><span class="name">${esc(t('nav.versions'))}</span><span class="chev">${ICON.chev}</span></a><a class="row-item" href="#/settings" style="grid-template-columns:1fr auto"><span class="name">${esc(t('nav.settings'))}</span><span class="chev">${ICON.chev}</span></a><a class="row-item" href="#/help" style="grid-template-columns:1fr auto"><span class="name">${esc(t('nav.help'))}</span><span class="chev">${ICON.chev}</span></a></div></div>`;
    V.settings = () => `${bar(t('settings.title'), '#/more')}<div class="view">
        <div class="panel"><h3>${esc(t('settings.lang'))}</h3><div class="seg"><button data-alang="TR" aria-checked="${st.lang === 'TR'}">Türkçe</button><button data-alang="EN" aria-checked="${st.lang === 'EN'}">English</button></div></div>
        <div class="panel"><h3>${esc(t('settings.account'))}</h3><p class="muted">${esc(st.user?.email || '')}</p><button class="btn btn-ghost" data-act="signout">${esc(t('settings.signout'))}</button></div>
        <div class="panel"><h3>${esc(t('settings.mode'))}</h3><p class="muted">${esc(t(store.mode === 'local' ? 'settings.mode.local' : 'settings.mode.supabase'))}</p><p class="small">${esc(t('settings.live'))}: ${st.live ? 'v' + st.live.versionId : '–'}</p></div>
        <div class="panel"><h3>${esc(t('settings.access'))}</h3><p class="muted">${esc(st.user?.email || '')}</p><p class="small">${esc(t('settings.accessNote'))}</p></div>
        <div class="btn-row"><a class="btn btn-ghost" href="../" target="_blank" rel="noopener">${esc(t('settings.site'))}</a><button class="btn btn-ghost" data-act="tour">${esc(t('settings.tour'))}</button>${store.mode === 'local' ? `<button class="btn btn-quiet" data-act="reset-demo">${esc(t('settings.reset'))}</button>` : ''}</div>
    </div>`;
    V.help = () => `${bar(t('help.title'), '#/more')}<div class="view"><div class="panel" id="help-body"><p class="muted">${esc(t('common.loading'))}</p></div><button class="btn btn-ghost" data-act="tour">${esc(t('settings.tour'))}</button></div>`;

    V.login = (denied) => `<div class="login"><img src="../images/official/uppercrust_logotype16-w.svg" alt=""><h1>${esc(t('login.title'))}</h1><p class="muted">${esc(t('login.text'))}</p>
        ${denied ? `<p class="err" style="color:var(--booth-soft)">${esc(t('login.denied'))}</p>` : ''}
        ${store.mode === 'supabase' ? `<button class="btn btn-lg gbtn" data-act="signin"><svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.5-5.8c-2.1 1.4-4.8 2.3-8.1 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>${esc(t('login.google'))}</button>` : `<button class="btn btn-lg btn-primary" data-act="signin">${esc(t('login.demo'))}</button><p class="small">${esc(t('login.demoNote'))}</p>`}
        <div class="lang" role="group"><button type="button" data-alang="TR" aria-pressed="${st.lang === 'TR'}">TR</button><button type="button" data-alang="EN" aria-pressed="${st.lang === 'EN'}">EN</button></div></div>`;

    /* ---------- router ---------- */
    function route() {
        const raw = location.hash.replace(/^#\/?/, ''); const [pathPart, query = ''] = raw.split('?'); const params = new URLSearchParams(query);
        const seg = pathPart.split('/').filter(Boolean);
        st.route = '/' + seg.join('/');
        if (seg[0] !== 'menu' && !seg[0]?.startsWith('quick')) st.q = '';
        switch (seg[0]) {
            case undefined: case '': return V.home();
            case 'menu': return seg[1] ? V.menuCat(seg[1]) : V.menu();
            case 'item': return V.item(seg[1], params);
            case 'archive': return V.archive();
            case 'builder': return V.builder();
            case 'topping': return V.topping(seg[1]);
            case 'branches': return V.branches();
            case 'branch': return V.branch(seg[1]);
            case 'landing': return seg[1] ? V.landingSection(seg[1]) : V.landing();
            case 'quick': return { soldout: V.quickSoldout, slice: V.quickSlice, prices: V.quickPrices, photos: V.quickPhotos }[seg[1]]?.() || V.home();
            case 'versions': return V.versions();
            case 'more': return V.more();
            case 'settings': return V.settings();
            case 'help': return V.help();
            default: return V.home();
        }
    }
    function render() {
        if (!st.user) { app.innerHTML = V.login(st.denied); return; }
        const html = route(); if (!html) return;
        app.innerHTML = html + tabs();
        const view = $('.view'); if (view) { bindInputs(view, onFieldChange); bindPhotoFrames(view, () => refreshPreview()); }
        updatePendingBadge();
        if (st.route === '/help') loadHelp();
        window.scrollTo(0, 0);
    }
    function refreshPreview() { const pv = $('#card-preview'); if (!pv) return; const id = st.route.split('/')[2]; const it = st.draft.items.find(i => i.id === id); if (it) pv.innerHTML = cardPreview(it); }
    function onFieldChange(path) { if (path.startsWith('items.')) refreshPreview(); }
    async function loadHelp() { try { const r = await fetch('../docs/KILAVUZ.md'); const md = await r.text(); const html = md.split('\n').map(l => l.startsWith('# ') ? `<h2>${esc(l.slice(2))}</h2>` : l.startsWith('## ') ? `<h3>${esc(l.slice(3))}</h3>` : l.startsWith('- ') ? `<li>${esc(l.slice(2))}</li>` : l.trim() ? `<p>${esc(l)}</p>` : '').join('').replace(/(<li>.*?<\/li>)+/g, m => `<ul class="changes">${m}</ul>`); $('#help-body').innerHTML = html; } catch { $('#help-body').innerHTML = `<p class="muted">${esc(t('common.error'))}</p>`; } }

    /* ---------- actions ---------- */
    document.addEventListener('click', async e => {
        const lang = e.target.closest('[data-alang]'); if (lang) { st.lang = lang.dataset.alang; localStorage.setItem('uc-admin-lang', st.lang); render(); return; }
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'signin') { try { await store.signIn(); } catch { toast(t('common.error')); } return; }
        if (act === 'signout') { await store.signOut(); st.user = null; render(); return; }
        if (act === 'preview') { e.preventDefault(); sheet(`<h3>${esc(t('home.preview'))}</h3><div class="btn-row"><a class="btn btn-ghost" href="../?preview=1" target="_blank" rel="noopener">${esc(t('nav.landing'))}</a><a class="btn btn-ghost" href="../menu/?preview=1" target="_blank" rel="noopener">${esc(t('nav.menu'))}</a></div>`); return; }
        if (act === 'publish') { publishFlow(); return; }
        if (act === 'undo') { e.preventDefault(); undoFlow(); return; }
        if (act === 'reorder') { st.reorder = !st.reorder; render(); return; }
        if (act === 'duplicate') { const id = st.route.split('/')[2]; const src = st.draft.items.find(i => i.id === id); if (src) { const c = clone(src); c.id = uid('i'); c.name = src.name + ' (2)'; c.order = src.order + 0.5; mutate(d => d.items.push(c)); location.hash = `#/item/${c.id}`; } return; }
        if (act === 'archive-item') { const id = st.route.split('/')[2]; const it = st.draft.items.find(i => i.id === id); if (it && await confirm(t('item.archive'), t('item.archiveConfirm', { name: it.name }), t('item.archive'), true)) { mutate(d => { d.items.find(i => i.id === id).archived = true; }); toast(t('item.archived')); location.hash = `#/menu/${it.cat}`; } return; }
        if (act === 'restore-item') { const id = st.route.split('/')[2]; mutate(d => { const it = d.items.find(i => i.id === id); if (it) it.archived = false; }); render(); return; }
        if (act === 'archive-topping') { const id = st.route.split('/')[2]; mutate(d => { const x = d.toppings.find(y => y.id === id); if (x) x.archived = true; }); location.hash = '#/builder'; return; }
        if (act === 'archive-branch') { const id = st.route.split('/')[2]; if (await confirm(t('branch.archive'), t('item.archiveConfirm', { name: st.draft.branches.find(b => b.id === id)?.name || '' }), t('branch.archive'), true)) { mutate(d => { const b = d.branches.find(x => x.id === id); if (b) b.archived = true; }); location.hash = '#/branches'; } return; }
        if (act === 'slice-clear') { mutate(d => { d.sliceOfDay = { itemId: null, note: { tr: '', en: '' }, date: null }; }); render(); return; }
        if (act === 'price-preview' || act === 'price-apply') { priceFlow(act === 'price-apply'); return; }
        if (act === 'tour') { startTour(); return; }
        if (act === 'reset-demo') { if (await confirm(t('settings.reset'), '', t('common.yes'), true)) { indexedDB.deleteDatabase('uc-admin'); localStorage.removeItem('uc-admin-tour'); location.reload(); } return; }

        const catMove = e.target.closest('[data-cat-move]'); if (catMove) { moveIn(st.draft.categories, c => c.id === catMove.dataset.catMove, Number(catMove.dataset.dir)); render(); return; }
        const catEdit = e.target.closest('[data-cat-edit]'); if (catEdit) { catEditSheet(catEdit.dataset.catEdit); return; }
        const itemMove = e.target.closest('[data-item-move]'); if (itemMove) { const cat = st.draft.items.find(i => i.id === itemMove.dataset.itemMove)?.cat; moveIn(st.draft.items.filter(i => i.cat === cat && !i.archived), i => i.id === itemMove.dataset.itemMove, Number(itemMove.dataset.dir)); render(); return; }
        const tag = e.target.closest('[data-tag]'); if (tag) { const id = st.route.split('/')[2]; mutate(d => { const it = d.items.find(i => i.id === id); const s = new Set(it.tags); s.has(tag.dataset.tag) ? s.delete(tag.dataset.tag) : s.add(tag.dataset.tag); it.tags = TAGS.filter(x => s.has(x)); }); tag.setAttribute('aria-pressed', String(tag.getAttribute('aria-pressed') !== 'true')); refreshPreview(); return; }
        const so = e.target.closest('[data-soldout]'); if (so) { const on = so.getAttribute('aria-checked') !== 'true'; mutate(d => { const it = d.items.find(i => i.id === so.dataset.soldout); it.available = !on; it.unavailableUntil = on ? istanbulMidnight() : null; }); so.setAttribute('aria-checked', String(on)); return; }
        const dayT = e.target.closest('[data-day-toggle]'); if (dayT) { const day = dayT.dataset.dayToggle; const id = st.route.split('/')[2]; const on = dayT.getAttribute('aria-checked') !== 'true'; mutate(d => { const b = d.branches.find(x => x.id === id); b.hours[day] = on ? [$(`input[data-bind$=".hours.${day}.0"]`).value || '11:30', $(`input[data-bind$=".hours.${day}.1"]`).value || '22:30'] : []; }); dayT.setAttribute('aria-checked', String(on)); dayT.closest('.hrow').classList.toggle('is-closed', !on); return; }
        const restore = e.target.closest('[data-restore]'); if (restore) { restoreFlow(Number(restore.dataset.restore)); return; }
        const btab = e.target.closest('[data-btab]'); if (btab) { st.btab = btab.dataset.btab; render(); return; }
        const lAdd = e.target.closest('[data-list-add]'); if (lAdd) { mutate(d => { const arr = getPath(d, lAdd.dataset.listAdd) || []; arr.push(JSON.parse(lAdd.dataset.blank)); setPath(d, lAdd.dataset.listAdd, arr); }); render(); return; }
        const lRm = e.target.closest('[data-list-remove]'); if (lRm) { mutate(d => { getPath(d, lRm.dataset.listRemove).splice(Number(lRm.dataset.i), 1); }); render(); return; }
        const lMv = e.target.closest('[data-list-move]'); if (lMv) { mutate(d => { const arr = getPath(d, lMv.dataset.listMove); const i = Number(lMv.dataset.i), j = i + Number(lMv.dataset.dir); if (j >= 0 && j < arr.length) [arr[i], arr[j]] = [arr[j], arr[i]]; }); render(); return; }
        const vPick = e.target.closest('[data-video-pick]'); if (vPick) { try { const res = await uploadVideoTo(vPick.dataset.prefix); if (res) { mutate(d => setPath(d, vPick.dataset.videoPick, { path: res.path, poster: res.poster || getPath(d, vPick.dataset.videoPick)?.poster || null })); render(); } } catch { toast(t('common.error')); } return; }
        const vRm = e.target.closest('[data-video-remove]'); if (vRm) { mutate(d => setPath(d, vRm.dataset.videoRemove, null)); render(); return; }
    });
    document.addEventListener('input', e => {
        if (e.target.id === 'q') { st.q = e.target.value; clearTimeout(st.qT); st.qT = setTimeout(() => { const pos = e.target.selectionStart; render(); const q = $('#q'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } }, 250); }
        if (e.target.id === 'pv') { st.priceForm = { ...(st.priceForm || { scope: 'ALL', mode: 'pct' }), value: e.target.value }; }
    });
    document.addEventListener('click', e => {
        // virtual (non-draft) controls: __type, __soldout, __until, __scope, __mode
        const seg = e.target.closest('.seg[data-bind^="__"] button'); const sw = e.target.closest('.switch[data-bind^="__"]'); const sel = null;
        const id = st.route.split('/')[2];
        if (seg) {
            const key = seg.parentElement.dataset.bind, v = seg.dataset.val;
            if (key === '__type') mutate(d => { const it = d.items.find(i => i.id === id); it.sizes = v === 'pizza' ? { S: null, L: null, XXL: null } : v === 'wine' ? { GLASS: null, BOTTLE: null } : { ONE_SIZE: null }; if (v !== 'pizza') it.inBuilder = false; });
            if (key === '__until') mutate(d => { const it = d.items.find(i => i.id === id); it.unavailableUntil = v === 'midnight' ? istanbulMidnight() : null; });
            if (key === '__mode') { st.priceForm = { ...(st.priceForm || { scope: 'ALL', value: '' }), mode: v }; st.pricePreview = []; }
            render();
        }
        if (sw && sw.dataset.bind === '__soldout') { const on = sw.getAttribute('aria-checked') !== 'true'; mutate(d => { const it = d.items.find(i => i.id === id); it.available = !on; it.unavailableUntil = on ? istanbulMidnight() : null; }); render(); }
    });
    document.addEventListener('change', e => { if (e.target.dataset.bind === '__scope') { st.priceForm = { ...(st.priceForm || { mode: 'pct', value: '' }), scope: e.target.value }; st.pricePreview = []; } });

    function moveIn(list, pred, dir) {
        const sorted = list.slice().sort((a, b) => a.order - b.order); const i = sorted.findIndex(pred); const j = i + dir; if (i < 0 || j < 0 || j >= sorted.length) return;
        mutate(() => { const a = sorted[i].order; sorted[i].order = sorted[j].order; sorted[j].order = a; if (sorted[i].order === sorted[j].order) sorted.forEach((x, k) => x.order = k + 1); });
    }
    function catEditSheet(id) {
        const idx = st.draft.categories.findIndex(c => c.id === id); const c = st.draft.categories[idx]; const P = `categories.${idx}`;
        const d = sheet(`<h3>${esc(t('cat.edit'))}</h3>${F.text2(t('cat.name'), `${P}.name`, c.name)}${F.seg(t('cat.layout'), `${P}.layout`, c.layout, [['cards', t('cat.cards')], ['rows', t('cat.rows')]])}${F.toggle(t('cat.hidden'), `${P}.hidden`, c.hidden)}<button class="btn btn-primary" data-x="close">${esc(t('common.save'))}</button>`);
        bindInputs(d); d.onclick = e => { if (e.target.closest('[data-x]')) { closeSheet(); render(); } };
    }
    function priceFlow(apply) {
        const p = st.priceForm || { scope: 'ALL', mode: 'pct', value: '' }; const val = parseFloat(String(p.value).replace(',', '.'));
        if (!isFinite(val)) return;
        const rows = [];
        const apply1 = old => Math.max(0, round5(p.mode === 'pct' ? old * (1 + val / 100) : old + val));
        for (const it of st.draft.items) { if (it.archived || (p.scope !== 'ALL' && it.cat !== p.scope)) continue; for (const [size, old] of Object.entries(it.sizes)) { if (old == null) continue; const nw = apply1(old); if (nw !== old) rows.push({ id: it.id, size, name: (it.num ? it.num + ' ' : '') + it.name, old, nw }); } }
        if (!apply) { st.pricePreview = rows; render(); return; }
        mutate(d => { for (const r of rows) { const it = d.items.find(i => i.id === r.id); if (it) it.sizes[r.size] = r.nw; } d.meta.priceDate = new Date().toISOString().slice(0, 10); });
        st.pricePreview = []; toast(t('quick.prices.applied', { n: rows.length })); location.hash = '#/';
    }
    async function publishFlow() {
        const ch = changes(); if (!ch.length) { toast(t('publish.nothing')); return; }
        const d = sheet(`<h3>${esc(t('publish.title'))}</h3><p class="muted">${esc(t('publish.text'))}</p><ul class="changes">${ch.map(c => `<li>${esc(c)}</li>`).join('')}</ul><div class="field"><label for="pnote">${esc(t('publish.note'))}</label><input id="pnote" type="text" placeholder="${esc(t('publish.notePh'))}"></div><div class="btn-row"><button class="btn btn-ghost" data-x="no">${esc(t('publish.cancel'))}</button><button class="btn btn-primary is-hot" data-x="yes">${esc(t('publish.confirm'))}</button></div>`);
        d.onclick = async e => {
            const b = e.target.closest('[data-x]'); if (!b) return;
            if (b.dataset.x !== 'yes') { closeSheet(); return; }
            b.disabled = true;
            try { clearTimeout(st.saveTimer); await store.saveDraft(st.draft, st.user?.email); const res = await store.publish(st.draft, $('#pnote').value.trim(), st.user?.email); await reloadState(); closeSheet(); toast(t('publish.done', { v: res.versionId })); render(); }
            catch (err) { b.disabled = false; toast(t('publish.fail')); }
        };
    }
    async function undoFlow() {
        const prev = st.versions.find(v => v.id !== st.live?.versionId); if (!prev) return;
        if (await confirm(t('undo.title'), t('undo.text', { v: prev.id }), t('undo.confirm'))) restoreFlow(prev.id);
    }
    async function restoreFlow(id) {
        try { const res = await store.restore(id, st.user?.email); await reloadState(); toast(t('publish.done', { v: res.versionId })); location.hash = '#/'; render(); } catch { toast(t('publish.fail')); }
    }
    function startTour() {
        let i = 0; const el = document.createElement('div'); el.className = 'tour';
        const draw = () => { el.innerHTML = `<div class="card-t"><div class="steps">${[1, 2, 3, 4, 5].map((_, k) => `<span class="${k === i ? 'is-on' : ''}"></span>`).join('')}</div><p>${esc(t('tour.' + (i + 1)))}</p><div class="btn-row"><button class="btn btn-quiet" data-t="skip">${esc(t('tour.skip'))}</button><button class="btn btn-primary" data-t="next">${esc(i === 4 ? t('tour.done') : t('tour.next'))}</button></div></div>`; };
        el.onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; if (b.dataset.t === 'skip' || i === 4) { el.remove(); localStorage.setItem('uc-admin-tour', '1'); return; } i++; draw(); };
        draw(); document.body.appendChild(el);
    }

    /* ---------- boot ---------- */
    async function reloadState() {
        st.live = await store.getLive(); st.versions = await store.listVersions();
        if (store.warmMedia) await store.warmMedia(st.draft);
    }
    async function loadBundled() { const r = await fetch('../content/content.json', { cache: 'no-cache' }); return r.json(); }
    async function afterLogin() {
        st.denied = false;
        if (!(await store.isAllowed())) { st.denied = true; st.user = null; render(); return; }
        try { await store.seedIfEmpty(await loadBundled()); } catch { /* bundled missing: continue with whatever is stored */ }
        st.draft = await store.getDraft();
        if (!st.draft) { st.draft = await loadBundled(); await store.saveDraft(st.draft, 'seed'); }
        await reloadState();
        render();
        if (!localStorage.getItem('uc-admin-tour')) setTimeout(startTour, 600);
    }
    window.addEventListener('hashchange', render);
    window.addEventListener('online', () => { if (st.dirty) scheduleSave(); });
    (async () => {
        try { await store.ready(); } catch { app.innerHTML = `<div class="login"><p class="muted">${esc(t('common.error'))}</p></div>`; return; }
        store.onAuth(u => { const was = !!st.user; st.user = u; if (u && !was) afterLogin(); else if (!u) render(); });
        st.user = await store.getUser();
        if (st.user) await afterLogin(); else render();
        if ('serviceWorker' in navigator && location.protocol === 'https:' && location.hostname !== 'localhost') navigator.serviceWorker.register('sw.js').catch(() => {});
    })();
})();

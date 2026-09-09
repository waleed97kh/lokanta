/* Loads the published content document and turns it into what app.js expects.
   Order of preference: preview draft (when ?preview=1 and a session exists) → published (local IndexedDB or Supabase public bucket)
   → bundled content/content.json → the hand-written data.js / i18n.js already on the page. The site never renders blank. */
(() => {
    'use strict';
    const CFG = window.SITE_CONFIG || { mode: 'local' };
    const ROOT = window.ASSET_ROOT || '';
    const params = new URLSearchParams(location.search);
    const PREVIEW_RAW = params.get('preview') || '';
    const PREVIEW = PREVIEW_RAW === '1';                                                        // the draft
    const PREVIEW_VERSION = /^v\d+$/.test(PREVIEW_RAW) ? Number(PREVIEW_RAW.slice(1)) : null;   // a published version
    const CAT_FALLBACK = ['PIZZAS', 'SLICES', 'STARTERS', 'SALADS', 'DESSERTS', 'DRINKS', 'WINES', 'BEERS'];
    const mediaCache = new Map();

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ---------- media resolution ---------- */
    async function resolveLocalMedia(content) {
        if (!window.ucdb || !ucdb.available()) return;
        const paths = new Set();
        JSON.stringify(content, (k, v) => { if (typeof v === 'string' && v.startsWith('media:')) paths.add(v); return v; });
        for (const p of paths) {
            if (mediaCache.has(p)) continue;
            try { const blob = await ucdb.get('media', p); if (blob) mediaCache.set(p, URL.createObjectURL(blob)); } catch { /* ignore */ }
        }
    }
    const mediaUrl = path => {
        if (!path) return '';
        if (/^(https?:|blob:|data:)/.test(path)) return path;
        if (path.startsWith('media:')) return mediaCache.get(path) || '';
        if (/^(images|video)\//.test(path)) return ROOT + path;
        return CFG.supabaseUrl ? `${CFG.supabaseUrl}/storage/v1/object/public/${CFG.mediaBucket || 'media'}/${path}` : ROOT + path;
    };
    window.mediaUrl = mediaUrl;

    /* ---------- fetch ---------- */
    async function fetchJson(url) {
        const r = await fetch(url, { cache: 'no-cache' });
        if (!r.ok) throw new Error(r.status + ' ' + url);
        return r.json();
    }
    async function supabaseRow(query) {
        const ref = (CFG.supabaseUrl.match(/https:\/\/([a-z0-9]+)\./) || [])[1];
        const raw = ref && localStorage.getItem(`sb-${ref}-auth-token`);
        if (!raw) return null;
        const token = JSON.parse(raw).access_token;
        const r = await fetch(`${CFG.supabaseUrl}/rest/v1/${query}`, { headers: { apikey: CFG.supabaseAnonKey, Authorization: 'Bearer ' + token } });
        if (!r.ok) return null;
        const rows = await r.json(); return rows[0] ? rows[0].content : null;
    }
    const loadSupabaseDraft = () => supabaseRow('draft?id=eq.1&select=content');
    const loadSupabaseVersion = id => supabaseRow(`versions?id=eq.${id}&select=content`);
    async function loadLocalVersion(id) { const all = await ucdb.all('versions'); const v = all.find(x => x.id === id); return v ? v.content : null; }
    async function load() {
        let content = null, source = 'bundled';
        try {
            if (PREVIEW) {
                if (CFG.mode === 'supabase' && CFG.supabaseUrl) content = await loadSupabaseDraft();
                else if (window.ucdb && ucdb.available()) content = await ucdb.get('kv', 'draft');
                if (content) source = 'draft';
            } else if (PREVIEW_VERSION) {
                if (CFG.mode === 'supabase' && CFG.supabaseUrl) content = await loadSupabaseVersion(PREVIEW_VERSION);
                else if (window.ucdb && ucdb.available()) content = await loadLocalVersion(PREVIEW_VERSION);
                if (content) source = 'version';
            }
            if (!content) {
                if (CFG.mode === 'supabase' && CFG.supabaseUrl) {
                    try { content = await fetchJson(`${CFG.supabaseUrl}/storage/v1/object/public/${CFG.publicBucket || 'public'}/content.json?t=${Math.floor(Date.now() / 60000)}`); source = 'published'; } catch { /* fall through */ }
                } else if (window.ucdb && ucdb.available()) {
                    const live = await ucdb.get('kv', 'live');
                    if (live && live.content) { content = live.content; source = 'published'; }
                }
            }
            if (!content) { content = await fetchJson(ROOT + (CFG.contentPath || 'content/content.json')); source = 'bundled'; }
        } catch (e) { content = null; }
        if (!content || content.schema !== 1) return null;
        if (CFG.mode !== 'supabase') await resolveLocalMedia(content);
        return { content, source };
    }

    /* ---------- convert to the app's shapes ---------- */
    const istanbulNow = () => {
        try {
            const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
            const g = t => p.find(x => x.type === t).value;
            return { day: g('weekday').toLowerCase().slice(0, 3), date: `${g('year')}-${g('month')}-${g('day')}`, minutes: Number(g('hour')) * 60 + Number(g('minute')), iso: `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}` };
        } catch { const d = new Date(); return { day: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()], date: d.toISOString().slice(0, 10), minutes: d.getHours() * 60 + d.getMinutes(), iso: d.toISOString().slice(0, 16) }; }
    };
    const isAvailable = it => {
        if (it.available !== false) return true;
        if (!it.unavailableUntil) return false;
        return istanbulNow().iso > it.unavailableUntil;   // sold-out window has passed
    };

    function bind(content) {
        const catOrder = new Map((content.categories || []).filter(c => !c.hidden).sort((a, b) => a.order - b.order).map((c, i) => [c.id, i]));
        const items = (content.items || []).filter(i => !i.archived && catOrder.has(i.cat))
            .sort((a, b) => (catOrder.get(a.cat) - catOrder.get(b.cat)) || (a.order - b.order))
            .map(i => ({ id: i.id, num: i.num || '', name: i.name, cat: i.cat, sub: i.sub || undefined, desc: i.desc?.tr || '', desc_en: i.desc?.en || '',
                img: i.image ? mediaUrl(i.image.path) : null, focal: i.image?.focal || null, sizes: i.sizes, size_label: i.sizeLabel || undefined,
                tags: i.tags || [], available: isAvailable(i), inBuilder: i.inBuilder !== false, isStock: !!i.imageIsStock }));
        window.menuData = items;
        window.menuToppings = (content.toppings || []).filter(x => !x.archived).sort((a, b) => a.order - b.order)
            .map(x => ({ id: x.id, group: x.group, name: x.name?.tr || '', name_en: x.name?.en || '', L: x.prices?.L, XXL: x.prices?.XXL }));
        window.menuRules = { halfHalfSurcharge: content.rules?.halfHalf || { L: 0, XXL: 0 }, glutenFreeSurcharge: content.rules?.glutenFree || { L: 0, XXL: 0 }, wholeWheat: content.rules?.wholeWheat !== false, sizes: content.rules?.sizes, priceDate: content.meta?.priceDate };
        window.menuCategories = (content.categories || []).filter(c => !c.hidden).sort((a, b) => a.order - b.order);

        /* dictionary overrides, TR and EN */
        const o = { TR: {}, EN: {} };
        const put = (key, tt) => { if (!tt) return; if (tt.tr) o.TR[key] = tt.tr; if (tt.en) o.EN[key] = tt.en; };
        const L = content.landing || {};
        put('hero.title', L.hero?.title); put('hero.subtitle', L.hero?.subtitle); (L.hero?.awards || []).forEach((a, i) => put(`hero.award.${i + 1}`, a));
        put('story.title', L.story?.title); put('story.text', L.story?.text); (L.story?.facts || []).forEach((f, i) => { put(`story.fact.${i + 1}.k`, f.k); put(`story.fact.${i + 1}.v`, f.v); });
        put('tl.title', L.timeline?.title); (L.timeline?.entries || []).forEach((e, i) => { put(`tl.${i + 1}.t`, e.date); put(`tl.${i + 1}.d`, e.text); });
        put('signature.title', L.signature?.title); put('signature.text', L.signature?.text); put('signature.season', L.signature?.season?.label); put('signature.season.name', L.signature?.season?.name); put('signature.season.desc', L.signature?.season?.desc);
        put('teaser.title', L.teaser?.title); put('teaser.text', L.teaser?.text);
        put('statement.title', L.statement?.title); put('statement.text', L.statement?.text);
        put('catering.title', L.catering?.title); put('catering.text', L.catering?.text);
        put('locations.title', L.locations?.title); put('locations.text', L.locations?.text);
        (content.branches || []).forEach(b => put(`locations.${b.id}.desc`, b.desc));
        put('social.text', L.social?.text); put('conversion.title', L.conversion?.title); put('conversion.text', L.conversion?.text); put('footer.tagline', L.footer?.tagline);
        put('menu.hero.title', L.menuHero?.title); put('menu.hero.text', L.menuHero?.text);
        ['white', 'gf', 'half', 'slices', 'legend', 'tax'].forEach((k, i) => put(`menu.notes.${k}`, (L.notes || [])[i]));
        (content.categories || []).forEach(c => put('menu.cat.' + c.id, c.name));
        Object.entries(content.subs || {}).forEach(([k, v]) => put('menu.sub.' + k, v));
        (content.toppingGroups || []).forEach(g => put('builder.group.' + g.id, g.name));
        window.siteDictOverrides = o;
        window.siteContent = content;
    }

    /* ---------- DOM: media and repeated blocks ---------- */
    const img = (m, extra = '') => m && m.path ? `<img src="${esc(mediaUrl(m.path))}" alt="" loading="lazy" decoding="async" style="object-position:${(m.focal?.x ?? 0.5) * 100}% ${(m.focal?.y ?? 0.5) * 100}%" ${extra}>` : '';
    const setImg = (el, m) => { if (!el || !m || !m.path) return; el.src = mediaUrl(m.path); el.style.objectPosition = `${(m.focal?.x ?? 0.5) * 100}% ${(m.focal?.y ?? 0.5) * 100}%`; };
    const setVideo = (video, v, fallbackImgSel) => {
        if (!video || !v) return;
        if (v.poster) video.poster = mediaUrl(v.poster);
        if (v.path) { const s = video.querySelector('source') || video.appendChild(document.createElement('source')); const url = mediaUrl(v.path); if (s.getAttribute('src') !== url) { s.src = url; s.type = 'video/mp4'; video.load(); } }
    };
    const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    function applyDom(content) {
        const L = content.landing || {}, M = content.meta || {};
        const q = (s, r = document) => r.querySelector(s), qa = (s, r = document) => Array.from(r.querySelectorAll(s));
        if (M.orderUrl) qa('a[href*="online-siparis"]').forEach(a => { a.href = M.orderUrl; });
        if (M.menuPdf) qa('a[href*="TheUpperCrust_Menu.pdf"]').forEach(a => { a.href = M.menuPdf; });
        if (M.paketPdf) qa('a[href*="Menu-PAKET"]').forEach(a => { a.href = M.paketPdf; });

        setVideo(q('.hero-video'), L.hero?.video);
        const sp = qa('.story-photo img'); setImg(sp[0], L.story?.photos?.[0]); setImg(sp[1], L.story?.photos?.[1]);
        const tl = q('#tl-track');
        if (tl && L.timeline?.entries?.length) tl.innerHTML = L.timeline.entries.map((e, i) => `<article class="tl-panel"><div class="tl-media">${img(e.image)}</div><div class="tl-text"><p class="tl-year" data-i18n="tl.${i + 1}.t">${esc(e.date?.tr)}</p><p data-i18n="tl.${i + 1}.d">${esc(e.text?.tr)}</p></div></article>`).join('');
        setImg(q('.teaser-media img'), L.teaser?.image);
        setVideo(q('.statement-media video'), L.statement?.video);
        setImg(q('.catering-bg img'), L.catering?.image);
        const strip = q('.catering-strip'); if (strip && L.catering?.strip?.length) strip.innerHTML = L.catering.strip.map(m => img(m)).join('');
        const cphone = q('.catering-copy a[href^="tel:"]'); if (cphone && L.catering?.phone) cphone.href = 'tel:' + L.catering.phone;

        const locGrid = q('.loc-grid');
        if (locGrid && content.branches?.length) {
            const now = istanbulNow();
            locGrid.innerHTML = content.branches.filter(b => !b.archived).sort((a, b) => a.order - b.order).map(b => {
                const today = b.hours?.[now.day];
                const open = today && today.length === 2 ? today[0] : '', close = today && today.length === 2 ? today[1] : '';
                const hoursLines = dayNames.map(d => b.hours?.[d]).filter(Boolean);
                const same = hoursLines.length === 7 && hoursLines.every(h => h.join() === hoursLines[0].join());
                const hoursText = same && hoursLines[0].length === 2 ? `<span data-i18n="locations.daily">Her gün</span> ${hoursLines[0][0]} - ${hoursLines[0][1]}` : dayNames.map(d => { const h = b.hours?.[d]; return `<span class="hrs-day">${d}</span> ${h && h.length === 2 ? h.join(' - ') : '<span data-i18n="locations.closedDay">Kapalı</span>'}`; }).join('<br>');
                return `<article class="loc" data-open="${open}" data-close="${close}">
                    <div class="loc-media" id="map-${esc(b.id)}">${img(b.image, 'alt="' + esc(b.name) + '"')}</div>
                    <div class="loc-body">
                        <div class="loc-title"><h3>${esc(b.name)}</h3><span class="status" data-status><span class="dot" aria-hidden="true"></span><span data-status-text></span></span></div>
                        <p data-i18n="locations.${esc(b.id)}.desc">${esc(b.desc?.tr)}</p>
                        <dl class="loc-facts">
                            <div><dt data-i18n="locations.address">Adres</dt><dd>${esc(b.address)}</dd></div>
                            <div><dt data-i18n="locations.phone">Telefon</dt><dd><a href="tel:${esc(b.phone)}">${esc(b.phoneDisplay || b.phone)}</a></dd></div>
                            <div><dt data-i18n="locations.hours">Saatler</dt><dd>${hoursText}</dd></div>
                        </dl>
                        <div class="loc-actions">
                            ${b.whatsapp ? `<a class="btn btn-ghost" href="https://wa.me/${esc(String(b.whatsapp).replace(/\D/g, ''))}" target="_blank" rel="noopener noreferrer" data-i18n="locations.whatsapp">WhatsApp sipariş</a>` : ''}
                            ${b.mapsUrl ? `<a class="btn btn-ghost" href="${esc(b.mapsUrl)}" target="_blank" rel="noopener noreferrer" data-i18n="locations.directions">Yol tarifi</a>` : ''}
                            ${b.mapQuery ? `<button type="button" class="btn btn-quiet" data-map="${esc(b.mapQuery)}" data-target="map-${esc(b.id)}" data-i18n="locations.map">Haritayı göster</button>` : ''}
                        </div>
                    </div>
                </article>`;
            }).join('');
        }
        const social = q('.social-track');
        if (social && L.social?.tiles?.length) social.innerHTML = L.social.tiles.map(tl => `<a href="${esc(tl.url || L.social.url || '#')}" target="_blank" rel="noopener noreferrer">${img(tl.image)}<span>${esc(tl.caption)}</span></a>`).join('');
        const follow = q('.social-head a'); if (follow && L.social?.url) follow.href = L.social.url;
        const handle = q('.social-head h2'); if (handle && L.social?.title) handle.textContent = L.social.title;
        qa('.site-footer a[href*="instagram.com"]').forEach(a => { if (L.footer?.instagram) a.href = L.footer.instagram; });
        qa('.site-footer a[href*="facebook.com"]').forEach(a => { if (L.footer?.facebook) a.href = L.footer.facebook; });
        qa('.site-footer a[href*="twitter.com"], .site-footer a[href*="x.com"]').forEach(a => { if (L.footer?.x) a.href = L.footer.x; });
        const mtrack = q('#marquee-track');
        if (mtrack && L.marquee?.words?.length === 2) mtrack.innerHTML = Array(6).fill(0).map(() => `<span>${esc(L.marquee.words[0])}</span><span class="em">${esc(L.marquee.words[1])}</span>`).join('');
        if (PREVIEW || PREVIEW_VERSION) {
            const bar = document.createElement('div'); bar.className = 'preview-bar'; bar.setAttribute('role', 'status');
            const label = window.siteContentSource === 'version' ? `Önizleme: sürüm v${PREVIEW_VERSION}` : window.siteContentSource === 'draft' ? 'Önizleme: yayınlanmamış taslak' : 'Önizleme bulunamadı, yayındaki içerik gösteriliyor';
            bar.innerHTML = `<span>${label}</span><a href="${ROOT}admin/${PREVIEW_VERSION ? '#/versions' : ''}">Yönetim paneline dön</a>`;
            document.body.prepend(bar); document.documentElement.classList.add('is-preview');
        }
    }

    window.siteReady = load().then(res => {
        if (!res) { window.siteContentSource = 'fallback'; return null; }
        bind(res.content);
        window.siteContentSource = res.source;
        applyDom(res.content);
        return res.content;
    }).catch(() => { window.siteContentSource = 'fallback'; return null; });
})();

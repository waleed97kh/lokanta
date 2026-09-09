/* Builds content/content.json (schema 1) from the hand-written js/data.js and js/i18n.js.
   Run once: node scripts/migrate.js. Re-running overwrites content.json but never touches the admin's draft. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const load = file => { const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx); return ctx.window; };
const dataWin = load('js/data.js');
const i18nWin = load('js/i18n.js');
const TR = i18nWin.translations.TR, EN = i18nWin.translations.EN;
const t2 = key => ({ tr: TR[key] ?? EN[key] ?? key, en: EN[key] ?? TR[key] ?? key });

const CAT_ORDER = ['PIZZAS', 'SLICES', 'STARTERS', 'SALADS', 'DESSERTS', 'DRINKS', 'WINES', 'BEERS'];
const ROWS = new Set(['DRINKS', 'WINES', 'BEERS']);
const SUBS = { DRINKS: ['COLD', 'HOT'], WINES: ['RED', 'WHITE', 'ROSE'] };
const img = (p, focal = { x: 0.5, y: 0.5 }) => (p ? { path: p, focal } : null);
const STOCK = /^images\/menu\//;

const content = {
    schema: 1,
    meta: {
        priceDate: '2026-06-03',
        orderUrl: 'https://uppercrustturkiye.com/online-siparis/',
        menuPdf: 'https://uppercrustturkiye.com/TheUpperCrust_Menu.pdf',
        paketPdf: 'https://uppercrustturkiye.com/TheUpperCrust_Menu-PAKET.pdf',
        siteName: 'The Upper Crust Pizzeria Türkiye'
    },
    categories: CAT_ORDER.map((id, i) => ({ id, name: t2('menu.cat.' + id), order: i + 1, layout: ROWS.has(id) ? 'rows' : 'cards', subs: SUBS[id] || [], hidden: false })),
    subs: { COLD: t2('menu.sub.COLD'), HOT: t2('menu.sub.HOT'), RED: t2('menu.sub.RED'), WHITE: t2('menu.sub.WHITE'), ROSE: t2('menu.sub.ROSE') },
    items: dataWin.menuData.map((it, i) => ({
        id: it.id, num: it.num || '', name: it.name, cat: it.cat, sub: it.sub || null, order: i + 1,
        desc: { tr: it.desc || '', en: it.desc_en || it.desc || '' },
        sizes: it.sizes, sizeLabel: it.size_label || null, tags: it.tags || [],
        image: img(it.img), imageIsStock: !!(it.img && STOCK.test(it.img)),
        available: true, unavailableUntil: null,
        inBuilder: it.cat === 'PIZZAS' && it.sizes.L != null && it.sizes.S != null,
        archived: false
    })),
    toppings: dataWin.menuToppings.map((x, i) => ({ id: x.id, group: x.group, name: { tr: x.name, en: x.name_en || x.name }, prices: { L: x.L, XXL: x.XXL }, order: i + 1, archived: false })),
    toppingGroups: ['MEAT', 'SEA', 'CHEESE', 'VEG', 'SAUCE'].map(g => ({ id: g, name: t2('builder.group.' + g) })),
    rules: {
        halfHalf: dataWin.menuRules.halfHalfSurcharge,
        glutenFree: dataWin.menuRules.glutenFreeSurcharge,
        wholeWheat: true,
        sizes: dataWin.menuRules.sizes
    },
    sliceOfDay: { itemId: null, note: { tr: '', en: '' }, date: null },
    branches: [
        {
            id: 'bebek', name: 'Bebek', order: 1, desc: t2('locations.bebek.desc'),
            address: 'Küçük Bebek Cad. No:6, Bebek, İstanbul', phone: '+902122650266', phoneDisplay: '0212 265 0 266', whatsapp: '+905305807528',
            hours: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => [d, ['11:30', '22:30']])),
            mapsUrl: 'https://www.google.com/maps/place/The+Upper+Crust+Bebek/@41.0790052,29.0429535,17z', mapQuery: 'The Upper Crust Pizzeria Bebek Istanbul',
            image: img('images/official/bebekbg.jpg'), archived: false
        },
        {
            id: 'maslak', name: 'Maslak', order: 2, desc: t2('locations.maslak.desc'),
            address: '42 Maslak, Ahi Evran Cad. No:6/190, Sarıyer', phone: '+902122761900', phoneDisplay: '0212 276 1900', whatsapp: null,
            hours: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => [d, ['11:30', '22:00']])),
            mapsUrl: 'https://www.google.com/maps/place/The+Upper+Crust+Pizzeria+Maslak/@41.1135946,29.0191992,17z', mapQuery: 'The Upper Crust Pizzeria 42 Maslak Istanbul',
            image: img('images/official/DSC_3587.jpg'), archived: false
        }
    ],
    landing: {
        hero: { title: t2('hero.title'), subtitle: t2('hero.subtitle'), video: { path: 'video/hero-oven.mp4', poster: 'images/official/icslide2.jpg' }, awards: [t2('hero.award.1'), t2('hero.award.2'), t2('hero.award.3')] },
        marquee: { words: ['One slice at a time', 'Happiness'] },
        story: { title: t2('story.title'), text: t2('story.text'), facts: [1, 2, 3, 4].map(n => ({ k: t2(`story.fact.${n}.k`), v: t2(`story.fact.${n}.v`) })), photos: [img('images/official/uppercrust2ic1.jpg'), img('images/official/DSC02661-copy.jpg')] },
        timeline: { title: t2('tl.title'), entries: [
            { date: t2('tl.1.t'), text: t2('tl.1.d'), image: img('images/official/icslide2-2018.jpg') },
            { date: t2('tl.2.t'), text: t2('tl.2.d'), image: img('images/ucbebek.jpg') },
            { date: t2('tl.3.t'), text: t2('tl.3.d'), image: img('images/IMG_1807.jpg') },
            { date: t2('tl.4.t'), text: t2('tl.4.d'), image: img('images/social/ig-5.jpg') }
        ] },
        signature: { title: t2('signature.title'), text: t2('signature.text'), itemIds: ['p27', 'p13', 'p4'], season: { label: t2('signature.season'), name: t2('signature.season.name'), desc: t2('signature.season.desc'), image: img('images/social/ig-1.jpg', { x: 0.5, y: 0.4 }), url: 'https://instagram.com/uppercrusttr' } },
        teaser: { title: t2('teaser.title'), text: t2('teaser.text'), image: img('images/official/MaslakRoni-.jpg') },
        statement: { title: t2('statement.title'), text: t2('statement.text'), video: { path: 'video/cheese-pull.mp4', poster: 'images/stock/statement.jpg' } },
        catering: { title: t2('catering.title'), text: t2('catering.text'), phone: '+902122650266', image: img('images/official/Dk-1332.jpg'),
            strip: ['images/official/ctr221.jpg', 'images/official/chr2027.jpg', 'images/official/ctr225.jpg', 'images/official/catering-keyframe.003.jpeg', 'images/official/ctr_3296.jpg'].map(p => img(p)) },
        locations: { title: t2('locations.title'), text: t2('locations.text') },
        social: { title: '@uppercrusttr', text: t2('social.text'), url: 'https://instagram.com/uppercrusttr', tiles: [
            { image: img('images/social/ig-1.jpg'), caption: 'Yaz menüsünün yıldızı geldi: White Summer Pizza', url: 'https://instagram.com/uppercrusttr' },
            { image: img('images/social/ig-5.jpg'), caption: "One bite and it's over", url: 'https://instagram.com/uppercrusttr' },
            { image: img('images/social/ig-2.jpg'), caption: 'Mutluluk satın alınamaz diyorlar. Biz pizza satıyoruz.', url: 'https://instagram.com/uppercrusttr' },
            { image: img('images/social/ig-4.jpg'), caption: 'Just a normal Wednesday at Upper Crust', url: 'https://instagram.com/uppercrusttr' },
            { image: img('images/social/ig-3.jpg'), caption: 'Temiz hava + pizza', url: 'https://instagram.com/uppercrusttr' },
            { image: img('images/social/ig-6.jpg'), caption: 'Dev pizzalara ulaşmanın en kolay yolu', url: 'https://instagram.com/uppercrusttr' }
        ] },
        conversion: { title: t2('conversion.title'), text: t2('conversion.text') },
        footer: { tagline: t2('footer.tagline'), instagram: 'https://instagram.com/uppercrusttr', facebook: 'https://facebook.com/TheUpperCrustTR', x: 'https://twitter.com/UpperCrustTR' },
        menuHero: { title: t2('menu.hero.title'), text: t2('menu.hero.text') },
        notes: ['white', 'gf', 'half', 'slices', 'legend', 'tax'].map(k => t2('menu.notes.' + k))
    }
};

const out = path.join(root, 'content', 'content.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(content, null, 2) + '\n');
console.log(`content.json written: ${content.items.length} items, ${content.toppings.length} toppings, ${content.branches.length} branches, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);

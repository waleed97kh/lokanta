/* Refreshes the bundled fallback (content/content.json) from the live Supabase publication.
   Run before a deploy so the site still shows the latest published content if Supabase is paused or unreachable.
   Usage: node scripts/export.js            (reads js/config.js for the project URL)
          node scripts/export.js <url>      (explicit content.json URL) */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const cfgWin = { window: {} }; vm.createContext(cfgWin); vm.runInContext(fs.readFileSync(path.join(root, 'js/config.js'), 'utf8'), cfgWin);
const cfg = cfgWin.window.SITE_CONFIG || {};
const url = process.argv[2] || (cfg.supabaseUrl ? `${cfg.supabaseUrl}/storage/v1/object/public/${cfg.publicBucket || 'public'}/content.json` : null);
if (!url) { console.error('No Supabase URL in js/config.js and none given. Nothing to export.'); process.exit(1); }

(async () => {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) { console.error(`Fetch failed: ${r.status} ${url}`); process.exit(1); }
    const content = await r.json();
    if (content.schema !== 1) { console.error('Unexpected schema, refusing to overwrite the bundled content.'); process.exit(1); }
    const out = path.join(root, 'content', 'content.json');
    fs.writeFileSync(out, JSON.stringify(content, null, 2) + '\n');
    console.log(`content.json refreshed from ${url}: ${content.items.length} items, published ${content.updatedAt || 'unknown'}`);
})().catch(e => { console.error(e.message); process.exit(1); });

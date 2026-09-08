# Upper Crust Admin Panel, Specification

Version 1.0, 2026-09-08. Status: agreed in interview, ready to build.

This document specifies the owner-facing admin panel for the Upper Crust Türkiye website (landing page at `/`, menu at `/menu/`). It records the decisions taken with the product owner, the screens, the data model, the publish flow, security, hosting and the delivery phases. Anything not written here is out of scope for v1.

---

## 1. Goal

The restaurant owner must be able to change everything a customer sees on the site, from a phone, without a developer: menu items, prices, photos, videos, toppings, branch hours, landing-page text. Changes are prepared in a draft, previewed on the real site, and published as one version that can be rolled back with one tap. The design (colours, fonts, layout, animations) is locked so the site cannot be broken.

Success looks like: the owner raises all pizza prices by 8%, replaces the Hawaiian photo with one taken on their phone, marks Bi Nevi Vegan sold out, previews, publishes, all within five minutes, and never messages the developer.

## 2. Decisions record

Taken in the product interview on 2026-09-08. Each is final for v1.

| Topic | Decision | Consequence |
|---|---|---|
| Scope | One client (Upper Crust), done well | No multi-tenant abstractions; brand is a constant |
| Backend | Managed service, Supabase | Auth, Postgres, Storage, no servers to run |
| Users | Only the owner | One role; access by Google-account allowlist |
| Publishing | Draft, then Publish, whole site at once | One numbered version per publish; single "Yayınla" button |
| Editable | Menu, builder toppings and rules, branches, landing content | See §5 for the exact field list |
| Design | Content only, design locked | No colour, font, layout or section-order controls |
| Languages | Site drops to TR + EN | AR, RU, DE removed from the public site; every text field has TR and EN |
| Quick actions | Sold out / hide, Günün Dilimi, bulk price update | All three exist; all go through draft → publish (see §7.4) |
| Login | Google sign-in | Supabase Auth with Google provider |
| Access list | Allowlist managed in the backend | Table of permitted emails; developer edits it |
| Photos | Phone-first: shoot or pick, drag to fit, auto-compress | No media library, no stock picker in v1 |
| Videos | Owner uploads MP4 (≤ 30 MB), poster frame auto | Falls back to a photo when no video |
| Mobile | Installable PWA | Mobile-first layout, Add to Home Screen, remembers login |
| Safety | Undo + version history | Every publish is a snapshot; delete = archive; restore in one tap |
| Hosting | Client's own accounts | Supabase project, hosting and Google OAuth client belong to the client |
| Insights | None | Content tool only; ordering stays on their existing system |
| Admin UI language | Turkish, with English toggle | TR default |
| Preview | Live preview of the real site with draft data | "Önizle" opens `/` or `/menu/` in preview mode |
| Address | Same site, `/admin/` | Shares the design system and data layer |
| Handover | In-app guided tour + one-page Turkish guide | No dependency on the developer for daily use |
| Reminders | None | No notifications, no emails |
| Bulk price rounding | Nearest 5 ₺ | Matches the printed menu (410, 1.095, 2.185) |

## 3. Who uses it

One person: the owner. Turkish speaker, uses a phone most of the day, not technical, familiar with Instagram and WhatsApp. They will open the admin a few times a week (prices, photos, sold-out) and a few times a year for bigger changes (new pizza, new campaign copy). Everything is designed for a thumb on a 6-inch screen first, a laptop second.

Non-goals for users: no staff accounts, no per-branch logins, no customer accounts.

## 4. Architecture

```
  Owner's phone                       Client's accounts
 ┌───────────────┐   Google login    ┌──────────────────────────────┐
 │  /admin (PWA) │ ────────────────▶ │ Supabase Auth  (Google)      │
 │  vanilla JS   │   read/write      │ Postgres: draft, versions,   │
 │  same design  │ ◀───────────────▶ │           allowed_users      │
 │  system       │   upload          │ Storage: media/ (photos,     │
 └───────────────┘ ────────────────▶ │           videos, posters)   │
                                      │ Storage: public/content.json│
                       on Publish ───▶│   (the published snapshot)  │
                                      └──────────────┬───────────────┘
  Customers                                          │ CDN, no DB reads
 ┌───────────────┐   GET content.json?v=<version>    │
 │  /  and /menu/│ ◀───────────────────────────────────┘
 │  (existing    │   fallback: bundled js/data.js if fetch fails
 │   static site)│
 └───────────────┘
```

Principles:

- **Visitors never hit the database.** Publishing writes one `content.json` to a public Storage bucket. The public pages fetch it (cache-busted by version number) and render exactly as today. If the fetch fails, the site falls back to the bundled `js/data.js` and `js/i18n.js`, so the site can never go blank.
- **The admin is part of the same static deployment** (`/admin/index.html`, `/admin/app.js`, `/admin/sw.js`, `/admin/manifest.webmanifest`). Same fonts, tokens and components as the site, so it feels like the brand, not a generic dashboard.
- **Draft is one JSON document.** The whole editable content (menu, toppings, rules, branches, landing) is a single JSON object. Editing mutates the draft row; Publish copies it into `versions` and into `content.json`. Restore copies an old version into the draft and publishes it as a new version. Simple, transactional, easy to reason about.
- **No build step, no framework**, matching the rest of the project. The admin is vanilla JS with the Supabase JS client from a CDN.

### 4.1 Supabase project

Owned by the client (created with their Google account by the developer during setup).

Tables (all in schema `public`, Row Level Security on):

```sql
-- who may enter the admin
create table allowed_users (
  email text primary key,
  note  text,
  created_at timestamptz default now()
);

-- exactly one row; the working copy
create table draft (
  id smallint primary key default 1 check (id = 1),
  content jsonb not null,
  updated_at timestamptz default now(),
  updated_by text
);

-- every publish
create table versions (
  id bigserial primary key,
  content jsonb not null,
  note text,
  published_at timestamptz default now(),
  published_by text
);

-- pointer to what is live (also mirrored into content.json)
create table live (
  id smallint primary key default 1 check (id = 1),
  version_id bigint references versions(id),
  published_at timestamptz
);
```

RLS policy on every table and on the `media` bucket: `auth.jwt() ->> 'email'` must exist in `allowed_users`. The `public` bucket (only `content.json` and nothing else) is world-readable, writable only by allowed users.

Storage buckets:

- `media` (public read): `items/<id>/<timestamp>.webp`, `landing/<key>/<timestamp>.webp|mp4`, `branches/<key>/…`, `posters/…`. Public read is required because the site displays them; write requires allowlist.
- `public` (public read): `content.json` only.

Auth: Google provider enabled. The Google OAuth client is created in the **client's** Google Cloud project so the consent screen shows their name and nothing depends on the developer's account. Sessions persist (PWA remembers login for 30 days, refreshes silently).

### 4.2 Content document shape

One JSON object, versioned by `schema: 1`. Text fields are objects `{ tr, en }`.

```jsonc
{
  "schema": 1,
  "meta": { "priceDate": "2026-06-03", "orderUrl": "https://uppercrustturkiye.com/online-siparis/", "menuPdf": "...", "paketPdf": "..." },
  "categories": [ { "id": "PIZZAS", "name": { "tr": "Pizzalar", "en": "Pizzas" }, "order": 1, "layout": "cards" | "rows", "subs": ["COLD","HOT"] } ],
  "items": [
    {
      "id": "p13", "num": "#13", "name": "Bub's BBQ Chicken",
      "cat": "PIZZAS", "sub": null, "order": 13,
      "desc": { "tr": "Barbekü soslu tavuk...", "en": "White pizza with BBQ chicken..." },
      "sizes": { "S": 565, "L": 1175, "XXL": 1570 },          // or { "ONE_SIZE": 310 } or { "GLASS": 340, "BOTTLE": 1350 }
      "sizeLabel": null,                                        // "33 cl" for drinks
      "tags": ["STAR"],                                         // V, VG, SPICY, STAR
      "image": { "path": "items/p13/1725790000.webp", "focal": { "x": 0.5, "y": 0.62 } },
      "available": true, "unavailableUntil": null,              // sold out / hide
      "inBuilder": true,
      "archived": false
    }
  ],
  "toppings": [ { "id": "t-mantar", "group": "VEG", "name": { "tr": "Mantar", "en": "Mushroom" }, "prices": { "L": 85, "XXL": 130 }, "order": 1, "archived": false } ],
  "rules": { "halfHalf": { "L": 40, "XXL": 80 }, "glutenFree": { "L": 165, "XXL": 220 }, "wholeWheat": true,
             "sizes": { "S": { "cm": 23, "slices": 4 }, "L": { "cm": 37, "slices": 8 }, "XXL": { "cm": 47, "slices": 12 } } },
  "sliceOfDay": { "itemId": "p27", "note": { "tr": "", "en": "" }, "date": "2026-09-08" },
  "branches": [
    { "id": "bebek", "name": "Bebek", "desc": { "tr": "...", "en": "..." }, "address": "Küçük Bebek Cad. No:6, Bebek, İstanbul",
      "phone": "+902122650266", "phoneDisplay": "0212 265 0 266", "whatsapp": "+905305807528",
      "hours": { "mon": ["11:30","22:30"], "tue": ["11:30","22:30"], "wed": ["11:30","22:30"], "thu": ["11:30","22:30"], "fri": ["11:30","22:30"], "sat": ["11:30","22:30"], "sun": ["11:30","22:30"] },
      "mapsUrl": "https://www.google.com/maps/...", "mapQuery": "The Upper Crust Pizzeria Bebek Istanbul",
      "image": { "path": "branches/bebek/....webp", "focal": { "x": 0.5, "y": 0.5 } }, "order": 1 }
  ],
  "landing": {
    "hero":      { "title": { "tr": "Ödüllü ince dilim gurme pizza.", "en": "..." }, "subtitle": { "tr": "...", "en": "..." },
                   "video": { "path": "landing/hero/....mp4", "poster": "posters/....webp" }, "awards": [ { "tr": "Best of Boston", "en": "Best of Boston" }, ... ] },
    "marquee":   { "words": ["One slice at a time", "Happiness"] },
    "story":     { "title": {...}, "text": {...}, "facts": [ { "k": {...}, "v": {...} } ], "photos": [ { "path": "...", "focal": {...} }, { ... } ] },
    "timeline":  [ { "date": {...}, "text": {...}, "image": {...} } ],
    "signature": { "title": {...}, "text": {...}, "itemIds": ["p27","p13","p4"], "season": { "name": {...}, "desc": {...}, "image": {...}, "url": "https://instagram.com/..." } },
    "teaser":    { "title": {...}, "text": {...}, "image": {...} },
    "statement": { "title": {...}, "text": {...}, "video": { "path": "...", "poster": "..." } },
    "catering":  { "title": {...}, "text": {...}, "phone": "+902122650266", "image": {...}, "strip": [ { "path": "..." } ] },
    "social":    { "handle": "@uppercrusttr", "url": "https://instagram.com/uppercrusttr", "tiles": [ { "image": {...}, "caption": "...", "url": "..." } ] },
    "footer":    { "tagline": {...}, "instagram": "...", "facebook": "...", "x": "..." }
  },
  "ui": { /* the TR/EN strings that are today in js/i18n.js and are worth exposing: hero CTAs, notes, conversion copy. Everything else stays in code. */ }
}
```

Migration: a one-off script converts today's `js/data.js`, `js/i18n.js` (TR + EN only), the branch facts and the landing copy in `index.html` into this document and publishes it as **version 1**. Existing photos are uploaded to `media/` keeping their file names, so nothing visible changes on day one.

### 4.3 Public site changes

Small, contained changes to the existing site:

1. `js/content.js` (new): fetches `content.json?v=<live version>` (the version is read from a tiny `live.json` next to it, or the fetch uses `cache: 'no-cache'`), validates `schema`, and exposes `window.menuData`, `window.menuToppings`, `window.menuRules`, `window.siteContent`. On any failure it leaves the bundled `data.js` values in place. `app.js` waits for this promise before rendering.
2. Landing and menu templates read text from `siteContent` where a field exists; otherwise from `i18n.js`. Images and videos resolve to Storage URLs.
3. Language switcher shrinks to TR / EN. `i18n.js` keeps only those two tables (the other three are deleted, not hidden).
4. `available: false` renders the card greyed with a "Bugün yok / Not today" tag, not clickable to add; `archived: true` is not rendered at all.
5. Preview mode: `?preview=1` makes `content.js` load the **draft** row through the Supabase client using the admin session already in the same origin's storage. If there is no session, preview silently falls back to the published content. A thin red bar at the top says "Önizleme: yayınlanmamış taslak".

## 5. What is editable

Everything below is editable; nothing else is. Text fields always have TR and EN.

**Menu**
- Categories: name, order, layout (cards or compact rows). Categories cannot be deleted, only hidden, because the site's sections depend on them. Subgroups (Soğuk / Sıcak, Kırmızı / Beyaz / Roze) are fixed labels with editable names.
- Items: number label, name, description, category and subgroup, prices per size (S/L/XXL, or single, or glass/bottle), size label for drinks (33 cl), tags (V, VG, Acılı, Favori), photo with focal point, available / unavailable-until, appears-in-builder, order within category. Add, duplicate, archive, restore.

**Builder**
- Toppings: name, group, L and XXL price, order, archive.
- Rules: half-and-half surcharge (L, XXL), gluten-free surcharge (L, XXL), whole-wheat available (on/off), size table (cm and slices; labels S/L/XXL are fixed).

**Branches**
- Per branch: name, description, address, phone (display and dial), WhatsApp number (Bebek today), opening hours per weekday with "closed" option, Google Maps link and map query, photo. Add a third branch; archive a branch.

**Landing page**
- Hero: title, subtitle, video (or photo), three award lines.
- Marquee: the two phrases.
- Story: title, text, four facts, two photos.
- Timeline: entries (date, text, photo), reorder, add, remove.
- Signature: title, text, which three items, the season card (name, text, photo, link).
- Menu teaser: title, text, photo.
- Statement: title, text, video (or photo).
- Catering: title, text, phone, background photo, strip of up to five photos.
- Instagram: handle, link, up to six tiles (photo, caption, link). Manual, no Instagram API.
- Footer: tagline, social links, menu PDF and paket PDF links, order URL, price date.

**Not editable (locked by design)**: colours, fonts, spacing, section order, animations, the chalkboard menu styling, the builder's mechanics, the cursor, the intro.

## 6. Screens

Mobile-first. One bottom tab bar on phones, a left rail on desktop. All labels Turkish by default; a toggle in Ayarlar switches the admin to English.

```
Tabs:  [ Başlangıç ]  [ Menü ]  [ Pizzanı Kur ]  [ Şubeler ]  [ Ana Sayfa ]  [ ··· ]
                                                                     └─ Sürümler, Ayarlar, Yardım
```

### 6.1 Başlangıç (Home)

```
┌──────────────────────────────────┐
│ Merhaba, Orhan                   │
│                                  │
│ ● 3 yayınlanmamış değişiklik     │  ← draft status; grey "Her şey yayında" when clean
│   Hawaiian fotoğrafı, 2 fiyat    │
│ [ Önizle ]      [ Yayınla ]      │  ← Yayınla is the only red button in the app
│                                  │
│ Hızlı işlemler                   │
│ ┌────────────┐ ┌────────────┐    │
│ │ Bugün yok  │ │ Günün      │    │
│ │ (sold out) │ │ Dilimi     │    │
│ └────────────┘ └────────────┘    │
│ ┌────────────┐ ┌────────────┐    │
│ │ Toplu fiyat│ │ Fotoğraf   │    │
│ │ güncelle   │ │ değiştir   │    │
│ └────────────┘ └────────────┘    │
│                                  │
│ Son yayın: v14, 2 gün önce       │
│ [ Geri al ]                      │  ← one tap restores v13 (confirm)
└──────────────────────────────────┘
```

### 6.2 Menü

List of categories with item counts → tap a category → list of items (photo thumb, name, L price, tags, sold-out badge), drag handle to reorder, search box at top, "+ Yeni ürün" button. Long-press or swipe on an item: Bugün yok, Çoğalt, Arşivle.

Item editor (full screen on phone, side panel on desktop):

```
┌──────────────────────────────────┐
│ ‹ Pizzalar        Bub's BBQ …    │
│ ┌──────────────────────────────┐ │
│ │        [ photo, drag to fit ]│ │  ← tap: Fotoğraf çek / Galeriden seç; drag adjusts focal point
│ └──────────────────────────────┘ │
│ Numara   [#13]                   │
│ Ad       [Bub's BBQ Chicken   ]  │
│ Açıklama TR                      │
│ [Barbekü soslu tavuk, dilim …  ] │
│ Açıklama EN                      │
│ [White pizza with BBQ chicken …] │
│ Fiyatlar   S [565]  L [1175] XXL [1570]  ₺
│ İşaretler  (V) (VG) (Acılı) (★Favori)
│ Kategori   [Pizzalar ▾]          │
│ Pizzanı Kur'da göster   [on]     │
│ Bugün yok               [off]    │
│   └ otomatik geri aç: gece yarısı ▾
│                                  │
│ ── Menüde böyle görünür ──       │
│ ┌ card preview, live ───────────┐│
│ └──────────────────────────────┘ │
│ [ Kaydet ]        Arşivle        │
└──────────────────────────────────┘
```

Field behaviour: prices accept digits only, thousands shown as 1.175; empty S price is allowed (item has L/XXL only); a drink has one price and a size label; a wine has glass/bottle. Validation is inline and in Turkish ("Fiyat girin", "En az bir fotoğraf ekleyin" is not required; items without photos render with the typographic tile as today).

### 6.3 Pizzanı Kur

Two tabs: **Ek malzemeler** (grouped list, inline L/XXL price fields, drag to reorder, add, archive) and **Kurallar** (half-and-half surcharge, gluten-free surcharge, whole-wheat toggle, size table). A live mini bill shows an example: "Chief + White Spinach, XXL, glutensiz, 3 malzeme = 1.720 ₺" so the owner sees the effect of a rule change.

### 6.4 Şubeler

Card per branch → editor: photo, name, description TR/EN, address, phone, WhatsApp, hours grid (7 rows, open/close pickers, "Kapalı" toggle), map link. "Şu an açık" preview reflects the hours being edited.

### 6.5 Ana Sayfa (Landing)

A vertical list of the landing sections in their fixed order, each a card with a thumbnail of its current media and its first line of text. Tap → section editor with only that section's fields (see §5). Video fields show "Video yükle (MP4, ≤ 30 MB)" and, after upload, a poster frame chooser (scrub a slider, tap "Bu kare").

### 6.6 Hızlı işlemler (quick actions)

- **Bugün yok**: a searchable list of all items with a toggle each. Toggling sets `available:false` and `unavailableUntil` = tonight 23:59 Istanbul (changeable to "Ben açana kadar"). At midnight the site treats it as available again; the admin shows it as reset.
- **Günün Dilimi**: pick one pizza (search), optional note, date defaults to today. Shows on the menu page's Dilim Pizza section: "Bugün: Rıfat'ın Acılı Pizzası".
- **Toplu fiyat güncelle**: scope (Tüm menü / a category / pizzas only), change (+% or +₺ or −), rounding fixed to nearest 5 ₺, then a preview table old → new for every affected item, then "Taslağa uygula". Also updates `meta.priceDate` to today.
- **Fotoğraf değiştir**: jumps to the item list filtered to items still using a stock (Pexels) photo, so the owner can replace them with real ones over time.

All quick actions edit the draft; the Home screen then shows "Yayınla". See §7.4.

### 6.7 Sürümler (Versions)

List: v14 "Fiyat güncellemesi %8" 2 gün önce, v13 …, each with "Önizle" (loads that version in preview mode) and "Bu sürüme dön" (confirm → becomes v15). The current live version is marked. Nothing is ever deleted.

### 6.8 Ayarlar / Yardım

Ayarlar: admin language (TR/EN), the signed-in Google account with "Çıkış", the live version number, links to the site and the Supabase status page. The allowlist is read-only here ("Erişimi olan hesaplar") with a note to contact the developer to add one.

Yardım: the one-page Turkish guide (§10) rendered in-app, and "Turu tekrar göster".

## 7. Publish flow

### 7.1 States

```
 edit ──▶ DRAFT (autosaved per field, "Kaydedildi ✓")
              │  Önizle: opens / or /menu/ with ?preview=1 in a new tab
              │  Yayınla: confirm sheet with a summary of changes
              ▼
          PUBLISH  = insert versions(content = draft) → update live → write public/content.json → toast "v15 yayında"
              │
              ▼
           LIVE (customers see it within seconds; CDN cache 60 s max)
```

- Autosave: every field change writes to `draft` (debounced 600 ms). The owner never loses work; closing the app mid-edit is fine.
- Change summary: the confirm sheet diffs draft against the live version and lists human-readable lines ("Hawaiian fotoğrafı değişti", "3 fiyat güncellendi", "Bi Nevi Vegan bugün yok"). A free-text note is optional and becomes the version's label.
- Publish is atomic: if writing `content.json` fails, the version row is rolled back and the owner sees "Yayınlanamadı, tekrar dene".

### 7.2 Undo

"Geri al" on Home restores the previous version (draft := previous, publish as new). "Bu sürüme dön" in Sürümler does the same for any version. Restoring never deletes history.

### 7.3 Concurrency

Single owner, so no merge conflicts by design. If the same account is open on two devices, the draft row's `updated_at` is checked before each write; a stale device shows "Başka bir cihazda değişiklik yapıldı, yenile".

### 7.4 Quick actions and the draft rule

Decision: quick actions go through draft → publish like everything else (whole-site publish). To keep "Bugün yok" fast, the quick-action screens end with a single sheet: "Yayınlansın mı? Sadece bu değişiklik değil, taslaktaki 3 değişiklik de yayınlanır." with Yayınla / Sonra. This keeps one mental model and one rollback path. Open question §12.1 records the alternative.

## 8. Media

**Photos**
- Sources: camera, photo library, file picker. Accepted: JPEG, PNG, HEIC (converted), WebP.
- On-device processing before upload: EXIF orientation fix, resize to max 1600 px on the long edge, encode WebP at quality 82, plus a 480 px thumbnail. Typical result 120–250 KB. Uploading happens with a progress ring; the card preview updates immediately.
- Focal point: after upload the photo is shown inside the exact card frame (4:3 on desktop cards, 1:1 on phones) and the owner drags it; `focal` is stored and rendered as `object-position`.
- Replacing a photo keeps the old file until the version that references it is older than 90 days (cleanup job), so rollbacks always have their images.

**Videos**
- Accepted: MP4 (H.264) up to 30 MB. Larger files are refused with a Turkish message and a tip ("Telefonunuzun 'Boyutu küçült' seçeneğini kullanın").
- Poster: the admin draws a frame from the video onto a canvas at the chosen time and uploads it as WebP. The site uses it as `poster` and as the reduced-motion fallback.
- No transcoding in v1 (no server). If the client later wants automatic compression, a Supabase Edge Function with ffmpeg.wasm or a Cloudflare Stream account is the upgrade path.

## 9. Security

- Authentication: Supabase Auth, Google provider only. Email/password is disabled.
- Authorization: a request is allowed only if the JWT email is in `allowed_users`. Enforced by RLS on every table and Storage policy, not by the front end. The front end additionally hides everything and shows "Bu hesabın erişimi yok" for a signed-in but non-allowlisted Google account.
- The admin bundle is public (it's static), but it holds only the Supabase anon key, which grants nothing without an allowlisted session.
- `content.json` and `media/` are public by necessity (the site shows them). They contain only what customers already see.
- No secrets in the repo. Supabase URL and anon key live in `/admin/config.js` (public by design) and are the client's.
- Sessions: 30-day refresh tokens; "Çıkış" everywhere revokes.
- Rate limiting and abuse: Supabase defaults; uploads capped at 30 MB by policy.

## 10. Handover and help

- **Guided tour** on first login, five steps, each pointing at a real control: Menüden bir ürün aç → Fotoğrafı değiştir → Fiyatı düzenle → Önizle → Yayınla. Skippable, repeatable from Yardım.
- **One-page guide** (`docs/KILAVUZ.md`, also rendered in Yardım): what Taslak and Yayınla mean, how to undo, how to add a pizza, how to mark sold out, how to change hours, who to contact. Turkish, with screenshots.
- **Accounts**: the Supabase project, the hosting project and the Google Cloud OAuth client are created in the client's Google account. The developer is added as a collaborator and can be removed by the client at any time.
- **Runbook** (`docs/RUNBOOK.md`, for the developer or a successor): how to add an allowlisted email, rotate keys, restore from a version by SQL, redeploy the static site.

## 11. Hosting and cost

- Static site + admin: Cloudflare Pages (or Netlify) on the client's account, custom domain, free tier. Deploy on push to `main`.
- Supabase: free tier is enough for the data (a few hundred KB) and media (well under 1 GB). **Risk**: free projects pause after 7 days without database activity. Mitigation options, to choose at setup: (a) Supabase Pro at 25 USD/month, no pausing, daily backups; or (b) stay free and add a daily keep-alive (a scheduled Cloudflare Worker or GitHub Action that reads one row). The public site is unaffected by a pause only if `content.json` is also mirrored to the static host; therefore Publish also commits `content.json` to the repo via a lightweight GitHub Action trigger **or** the site keeps its `data.js` fallback current at each deploy. Recommendation: Pro plan; it is a rounding error next to one XXL pizza a month.
- Expected monthly cost to the client: domain (already owned) + 0 or 25 USD.

## 12. Open questions and assumptions

### 12.1 Open questions for the client
1. Which Google account will be the owner's login? (Needed for the allowlist and to create the projects.)
2. Do they want sold-out changes to bypass draft and go live instantly? Current decision: no, whole-site publish. This is a two-line change if they change their mind after a week of use.
3. Do they want a second person on the allowlist from day one (a manager)? The system supports it; the UI treats everyone the same.
4. Will they provide real photos to replace the 27 stock (Pexels) photos? The "Fotoğraf değiştir" quick action is built for exactly this.
5. Free vs Pro Supabase plan (§11).

### 12.2 Assumptions
- The online ordering flow stays on their existing provider; the site only links to it (editable URL).
- Instagram tiles are maintained by hand (no API, no tokens to expire).
- Prices are integers in ₺ with no kuruş; the menu has none.
- Opening hours are the same every day today, but the model supports per-day hours and closed days.
- The five-language site becomes two languages; visitors who had AR/RU/DE stored get TR.
- The customer-facing tray keeps working exactly as now; it reads the published content.

## 13. Phases and acceptance

**Phase 0, plumbing (no admin yet)**
- Migration script produces version 1 from today's files; public site reads `content.json` with fallback; language switcher becomes TR/EN.
- Accept: site looks identical to today at v1; disconnecting the network still renders the site from the bundle.

**Phase 1, core editing**
- Google login + allowlist; Home; Menü (categories, items, photos with focal point, prices, tags); draft autosave; Önizle; Yayınla; Sürümler with restore.
- Accept: the owner can, on a phone, change a price and a photo, preview, publish, see it live, and restore the previous version, without help.

**Phase 2, everything else editable**
- Pizzanı Kur (toppings, rules), Şubeler (hours drive the open badge), Ana Sayfa sections, video upload with poster, quick actions (Bugün yok with midnight reset, Günün Dilimi, Toplu fiyat with rounding and preview, Fotoğraf değiştir).
- Accept: every field in §5 is editable and visible on the live site after publish; a 10% bulk update rounds to 5 ₺ and updates the price date.

**Phase 3, app feel and handover**
- PWA manifest, service worker (cached shell, offline read-only with a banner), Add to Home Screen prompt; guided tour; Turkish guide; runbook; accounts moved to the client; keep-alive or Pro plan decided.
- Accept: installed on the owner's phone, login persists for 30 days, tour completes, the client can revoke the developer's access and the panel keeps working.

## 14. Out of scope for v1
Staff roles, per-branch permissions, approval workflows, scheduled publishing, analytics, order management, reservations, loyalty, a media library, stock-photo search, design or layout controls, AR/RU/DE, email or push notifications, native app-store apps, video transcoding.

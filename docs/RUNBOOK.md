# Runbook (for the developer or a successor)

How the admin is wired, how to move it from demo mode to the client's Supabase project, and how to fix things.

## Architecture in one paragraph

Static site (`/`, `/menu/`) + static admin (`/admin/`). All editable content is one JSON document (`schema: 1`, see `docs/ADMIN-SPEC.md` §4.2). The admin edits a **draft**; Publish inserts a **version** and writes the snapshot to `content.json` in a public bucket. The site loads that file (`js/content.js`), falling back to the bundled `content/content.json` and finally to `js/data.js`. Visitors never read the database. Storage backends are pluggable (`admin/store.js`): `LocalStore` (IndexedDB in the browser, demo) and `SupabaseStore` (production).

## Files

| Path | Role |
|---|---|
| `js/config.js` | `mode: 'local' | 'supabase'`, Supabase URL and anon key, bucket names |
| `js/content.js` | Loads published/draft content, converts to the app's shapes, renders content-driven DOM |
| `js/idb.js` | IndexedDB helper shared by site (local mode) and admin |
| `content/content.json` | Bundled fallback = version 1, produced by `scripts/migrate.js` |
| `admin/*` | The admin PWA (index, admin.js, admin.css, store.js, i18n.js, sw.js, manifest) |
| `supabase/schema.sql` | Tables, RLS, storage buckets and policies |
| `docs/KILAVUZ.md` | Owner's guide (rendered inside the admin under Yardım) |

## Going live on the client's Supabase project

1. Client signs in to supabase.com with their Google account and creates a project (region: Frankfurt is closest to Istanbul). Add yourself as a project member.
2. SQL editor → paste and run `supabase/schema.sql`.
3. `insert into public.allowed_users (email, note) values ('<owner gmail>', 'Sahip');`
4. Authentication → Providers → Google: enable. Create the OAuth client in the **client's** Google Cloud project (APIs & Services → Credentials → OAuth client ID, type Web). Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. Paste client ID and secret into Supabase.
5. Authentication → URL configuration: Site URL = the production site; add `https://<site>/admin/` to redirect URLs (and `http://localhost:8090/admin/` for local testing).
6. `js/config.js`: `mode: 'supabase'`, `supabaseUrl`, `supabaseAnonKey` (Project settings → API). Commit and deploy.
7. Open `/admin/`, sign in with the owner's Google account. The admin seeds the draft and version 1 from `content/content.json` on first run and publishes `content.json` to the `public` bucket.
8. Existing repo images keep working (paths starting with `images/` or `video/` resolve to the site). New uploads go to the `media` bucket.

## Hosting

Any static host (Cloudflare Pages recommended, free). Deploy the repo root; nothing to build. Set `js/config.js` per environment. `_tmp/` is ignored.

## Supabase free tier pause

Free projects pause after 7 days without activity. Options: Pro plan (no pause, backups), or a daily keep-alive: a Cloudflare Worker cron / GitHub Action doing `GET https://<ref>.supabase.co/rest/v1/live?select=id` with the anon key. While paused, `content.json` in Storage is also unavailable, so the site falls back to the bundled `content/content.json`. To keep that fallback fresh, re-run `node scripts/export.js` (or copy the latest published JSON into `content/content.json`) whenever you deploy.

## Common tasks

- **Add an admin user**: `insert into public.allowed_users (email) values ('x@gmail.com');`
- **Remove a user**: delete the row; their session stops working at the next request.
- **Restore a version by SQL**: `update public.live set version_id = <id>, published_at = now();` then re-upload `content.json`: from the admin (Sürümler → Bu sürüme dön) is easier.
- **Rotate the anon key**: Project settings → API → regenerate; update `js/config.js`; redeploy.
- **Reset local demo data**: admin → Ayarlar → Demo verisini sıfırla (deletes IndexedDB `uc-admin`).
- **Regenerate version 1 from the hand-written data**: `node scripts/migrate.js` (only affects the bundled fallback).

## Security notes

The anon key is public by design; every table and bucket is protected by RLS keyed on `allowed_users`. `media` and `public` buckets are world-readable because the site displays them. Never put the service-role key in the repo or the admin.

## Sessions

Supabase Auth keeps the owner signed in with a refresh token; the admin refreshes it silently. Set Authentication → Sessions → "Time-box user sessions" to 30 days (or leave unlimited) to match the spec. "Çıkış yap" revokes the session on that device.

## Two devices at once

Before every autosave the admin compares the draft's `updatedAt` stamp with the one stored. If another device saved in between, the panel stops saving and shows a red "Başka bir cihazda değişiklik yapıldı" bar with a Reload button. Nothing is overwritten; the later device reloads and continues from the other device's draft.

## Version preview

`/menu/?preview=v12` (or `/?preview=v12`) renders any published version for an allow-listed session. `?preview=1` renders the draft. Without a session both fall back to the live content and the bar says so.

## Media housekeeping (optional, quarterly)

Uploads are never deleted automatically so that every version can still be restored with its images. To reclaim space, list files under `media/` in Storage that no version younger than 90 days references:

```sql
with refs as (
  select distinct m[1] as path
  from public.versions v, regexp_matches(v.content::text, '"(items|landing|branches|posters)/[^"]+"', 'g') m
  where v.published_at > now() - interval '90 days'
)
select name from storage.objects
where bucket_id = 'media' and name not in (select trim(both '"' from path) from refs)
order by created_at;
```

Review the list, then delete from the Storage UI. Also check the draft row before deleting.

## Photo formats

Photos are converted on the device to WebP (1600 px, plus a 480 px thumbnail for the admin lists). Chrome cannot decode HEIC; iPhones send JPEG when Camera → Formats is "Most Compatible", and Safari itself converts HEIC on upload. The admin shows a Turkish hint if a file cannot be decoded.

## Keep-alive workflow

`.github/workflows/supabase-keepalive.yml` reads one row every day when the repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set. Skip it on the Pro plan. Run `node scripts/export.js` before deploys to refresh the bundled fallback from the live publication.

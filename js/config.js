/* Shared configuration for the public site and the admin.
   mode: 'local'    everything lives in this browser (IndexedDB). Full demo, no accounts needed.
         'supabase' the client's Supabase project (see supabase/schema.sql and docs/RUNBOOK.md). */
window.SITE_CONFIG = {
    mode: 'local',
    supabaseUrl: '',          // e.g. https://abcd1234.supabase.co
    supabaseAnonKey: '',      // the project's anon public key (safe to ship; RLS protects the data)
    mediaBucket: 'media',
    publicBucket: 'public',
    contentPath: 'content/content.json',   // bundled fallback, relative to the site root
    adminEmails: []           // informational only; the real allowlist is the allowed_users table
};

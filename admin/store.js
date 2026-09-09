/* Storage adapters for the admin. One interface, two backends:
   LocalStore    everything in this browser's IndexedDB (demo / development, no accounts)
   SupabaseStore the client's Supabase project (Google login, RLS allowlist, Storage)
   The public site reads the same places (see ../js/content.js). */
window.createStore = function createStore(cfg) {
    const ROOT = '../';
    const now = () => new Date().toISOString();

    /* ---------------- Local ---------------- */
    class LocalStore {
        constructor() { this.mode = 'local'; this._urls = new Map(); this._authCbs = []; }
        async ready() { return true; }
        async getUser() { return (await ucdb.get('kv', 'user')) || null; }
        onAuth(cb) { this._authCbs.push(cb); }
        async signIn() { const u = { email: 'demo@upper-crust.local', name: 'Demo', mode: 'local' }; await ucdb.set('kv', 'user', u); this._authCbs.forEach(cb => cb(u)); return u; }
        async signOut() { await ucdb.del('kv', 'user'); this._authCbs.forEach(cb => cb(null)); }
        async isAllowed() { return true; }
        async getDraft() { return (await ucdb.get('kv', 'draft')) || null; }
        async getDraftStamp() { const d = await ucdb.get('kv', 'draft'); return d ? d.updatedAt || null : null; }
        async saveDraft(content, by) { content.updatedAt = now(); content.updatedBy = by || null; await ucdb.set('kv', 'draft', content); return content; }
        async getLive() { return (await ucdb.get('kv', 'live')) || null; }
        async listVersions() { const all = await ucdb.all('versions'); return all.sort((a, b) => b.id - a.id).map(v => ({ id: v.id, note: v.note, publishedAt: v.publishedAt, publishedBy: v.publishedBy })); }
        async getVersion(id) { const all = await ucdb.all('versions'); const v = all.find(x => x.id === id); return v ? v.content : null; }
        async publish(content, note, by) {
            const snapshot = JSON.parse(JSON.stringify(content));
            const id = await ucdb.add('versions', { content: snapshot, note: note || '', publishedAt: now(), publishedBy: by || null });
            const live = { versionId: id, publishedAt: now(), content: snapshot };
            await ucdb.set('kv', 'live', live);
            return { versionId: id };
        }
        async restore(versionId, by) {
            const content = await this.getVersion(versionId); if (!content) throw new Error('version not found');
            await this.saveDraft(JSON.parse(JSON.stringify(content)), by);
            return this.publish(content, `v${versionId} geri alındı`, by);
        }
        async uploadMedia(blob, path) { const key = 'media:' + path; await ucdb.set('media', key, blob); this._urls.set(key, URL.createObjectURL(blob)); return key; }
        async warmMedia(content) {
            const keys = new Set(); JSON.stringify(content, (k, v) => { if (typeof v === 'string' && v.startsWith('media:')) keys.add(v); return v; });
            for (const k of keys) { if (!this._urls.has(k)) { const b = await ucdb.get('media', k); if (b) this._urls.set(k, URL.createObjectURL(b)); } }
        }
        mediaUrl(path) {
            if (!path) return '';
            if (/^(https?:|blob:|data:)/.test(path)) return path;
            if (path.startsWith('media:')) return this._urls.get(path) || '';
            return ROOT + path;
        }
        async seedIfEmpty(bundled) {
            if (await this.getDraft()) return false;
            await this.saveDraft(JSON.parse(JSON.stringify(bundled)), 'seed');
            if (!(await this.getLive())) await this.publish(bundled, 'İlk sürüm (mevcut site)', 'seed');
            return true;
        }
    }

    /* ---------------- Supabase ---------------- */
    class SupabaseStore {
        constructor() { this.mode = 'supabase'; this._authCbs = []; this.client = null; }
        async ready() {
            if (!window.supabase) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
            this.client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
            this.client.auth.onAuthStateChange((_e, session) => this._authCbs.forEach(cb => cb(session ? this._user(session.user) : null)));
            return true;
        }
        _user(u) { return u ? { email: u.email, name: u.user_metadata?.full_name || u.email, avatar: u.user_metadata?.avatar_url, mode: 'supabase' } : null; }
        async getUser() { const { data } = await this.client.auth.getSession(); return this._user(data.session?.user); }
        onAuth(cb) { this._authCbs.push(cb); }
        async signIn() { await this.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }); }
        async signOut() { await this.client.auth.signOut(); }
        async isAllowed() { const { error } = await this.client.from('draft').select('id').limit(1); return !error; }
        async getDraft() { const { data, error } = await this.client.from('draft').select('content').eq('id', 1).maybeSingle(); if (error) throw error; return data ? data.content : null; }
        async getDraftStamp() { const { data, error } = await this.client.from('draft').select('stamp:content->>updatedAt').eq('id', 1).maybeSingle(); if (error) throw error; return data ? data.stamp || null : null; }
        async saveDraft(content, by) { content.updatedAt = now(); content.updatedBy = by || null; const { error } = await this.client.from('draft').upsert({ id: 1, content, updated_at: now(), updated_by: by || null }); if (error) throw error; return content; }
        async getLive() {
            const { data, error } = await this.client.from('live').select('version_id, published_at, versions(content)').eq('id', 1).maybeSingle(); if (error) throw error;
            return data && data.version_id ? { versionId: data.version_id, publishedAt: data.published_at, content: data.versions?.content } : null;
        }
        async listVersions() { const { data, error } = await this.client.from('versions').select('id, note, published_at, published_by').order('id', { ascending: false }).limit(100); if (error) throw error; return data.map(v => ({ id: v.id, note: v.note, publishedAt: v.published_at, publishedBy: v.published_by })); }
        async getVersion(id) { const { data, error } = await this.client.from('versions').select('content').eq('id', id).maybeSingle(); if (error) throw error; return data ? data.content : null; }
        async publish(content, note, by) {
            const { data: v, error } = await this.client.from('versions').insert({ content, note: note || '', published_by: by || null }).select('id').single(); if (error) throw error;
            const { error: e2 } = await this.client.from('live').upsert({ id: 1, version_id: v.id, published_at: now() }); if (e2) throw e2;
            const blob = new Blob([JSON.stringify(content)], { type: 'application/json' });
            const { error: e3 } = await this.client.storage.from(cfg.publicBucket || 'public').upload('content.json', blob, { upsert: true, contentType: 'application/json', cacheControl: '60' });
            if (e3) { await this.client.from('versions').delete().eq('id', v.id); throw e3; }
            return { versionId: v.id };
        }
        async restore(versionId, by) { const content = await this.getVersion(versionId); if (!content) throw new Error('version not found'); await this.saveDraft(JSON.parse(JSON.stringify(content)), by); return this.publish(content, `v${versionId} geri alındı`, by); }
        async uploadMedia(blob, path) { const { error } = await this.client.storage.from(cfg.mediaBucket || 'media').upload(path, blob, { upsert: true, contentType: blob.type }); if (error) throw error; return path; }
        async warmMedia() { /* nothing to do, URLs are public */ }
        mediaUrl(path) {
            if (!path) return '';
            if (/^(https?:|blob:|data:)/.test(path)) return path;
            if (/^(images|video)\//.test(path)) return ROOT + path;
            return `${cfg.supabaseUrl}/storage/v1/object/public/${cfg.mediaBucket || 'media'}/${path}`;
        }
        async seedIfEmpty(bundled) {
            if (await this.getDraft()) return false;
            await this.saveDraft(JSON.parse(JSON.stringify(bundled)), 'seed');
            if (!(await this.getLive())) await this.publish(bundled, 'İlk sürüm (mevcut site)', 'seed');
            return true;
        }
    }

    return cfg.mode === 'supabase' && cfg.supabaseUrl ? new SupabaseStore() : new LocalStore();
};

/* Tiny promise wrapper over IndexedDB, shared by the site (local mode) and the admin.
   Database uc-admin: kv (draft, live), versions (autoincrement), media (blobs by path). */
window.ucdb = (() => {
    const NAME = 'uc-admin', VERSION = 1;
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
        const req = indexedDB.open(NAME, VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
            if (!db.objectStoreNames.contains('versions')) db.createObjectStore('versions', { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains('media')) db.createObjectStore('media');
        };
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
    }));
    const tx = async (store, mode, fn) => {
        const db = await open();
        return new Promise((res, rej) => {
            const t = db.transaction(store, mode); const s = t.objectStore(store);
            const out = fn(s);
            t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out);
            t.onerror = () => rej(t.error);
        });
    };
    const req = (store, mode, fn) => tx(store, mode, s => fn(s));
    return {
        get: (store, key) => req(store, 'readonly', s => s.get(key)),
        set: (store, key, val) => req(store, 'readwrite', s => s.put(val, key)),
        add: (store, val) => req(store, 'readwrite', s => s.add(val)),
        del: (store, key) => req(store, 'readwrite', s => s.delete(key)),
        all: store => req(store, 'readonly', s => s.getAll()),
        keys: store => req(store, 'readonly', s => s.getAllKeys()),
        available: () => typeof indexedDB !== 'undefined'
    };
})();

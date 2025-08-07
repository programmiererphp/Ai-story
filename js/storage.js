/* localStorage wrapper with namespacing, migrations, and atomic transactions (+ polyfills) */
(function () {
  // ---- Polyfills ----
  if (typeof window.structuredClone !== 'function') {
    window.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
  }
  function hasLocalStorage() {
    try { localStorage.setItem('_t','1'); localStorage.removeItem('_t'); return true; } catch { return false; }
  }
  if (!hasLocalStorage()) {
    // Fallback in-memory store for very restrictive mobile contexts
    console.warn('localStorage unavailable; using in-memory store');
    const mem = new Map();
    window.localStorage = {
      getItem: k => (mem.has(k) ? mem.get(k) : null),
      setItem: (k,v) => mem.set(k, String(v)),
      removeItem: k => mem.delete(k)
    };
  }

  const NS = 'asg:';
  const KEYS = {
    version: NS + 'version',
    config:  NS + 'config',
    prompts: NS + 'prompts',
    session: NS + 'session',
    history: NS + 'history',
  };
  const CURRENT_VERSION = 1;

  const Storage = {
    getRaw(key) { return localStorage.getItem(key); },
    setRaw(key, val) { localStorage.setItem(key, val); },
    del(key) { localStorage.removeItem(key); },
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, obj) {
      try { localStorage.setItem(key, JSON.stringify(obj)); }
      catch (e) { console.warn('Store.set failed:', e); }
    },
    tx(fn) {
      // Atomic-ish: read -> mutate -> write. If it throws, nothing is saved.
      const snap = {
        [KEYS.config]: this.get(KEYS.config) ?? {},
        [KEYS.prompts]: this.get(KEYS.prompts) ?? {},
        [KEYS.session]: this.get(KEYS.session) ?? {},
        [KEYS.history]: this.get(KEYS.history) ?? [],
      };
      let next = null;
      try {
        next = fn(window.structuredClone ? structuredClone(snap) : JSON.parse(JSON.stringify(snap)));
      } catch (e) {
        console.warn('Store.tx mutate failed:', e);
        return;
      }
      if (!next) return;
      try { this.set(KEYS.config,  next[KEYS.config]  ?? snap[KEYS.config]); } catch{}
      try { this.set(KEYS.prompts, next[KEYS.prompts] ?? snap[KEYS.prompts]); } catch{}
      try { this.set(KEYS.session, next[KEYS.session] ?? snap[KEYS.session]); } catch{}
      try { this.set(KEYS.history, next[KEYS.history] ?? snap[KEYS.history]); } catch{}
    },
    ensureDefaults() {
      if (!localStorage.getItem(KEYS.version)) {
        this.set(KEYS.version, CURRENT_VERSION);
      }
      if (!localStorage.getItem(KEYS.config)) {
        this.set(KEYS.config, {
          apiKey: '',
          model: 'openrouter/auto',
          lang: 'en',
          scenario: 'romantic',
          players: { mode: 'single', p1: 'User 1', p2: 'User 2', turn: 'p1' },
          limits: { maxTurns: 24, maxChars: 8000 },
          ui: { compact: false }
        });
      }
      if (!localStorage.getItem(KEYS.prompts)) this.set(KEYS.prompts, {});
      if (!localStorage.getItem(KEYS.session)) this.set(KEYS.session, {
        storyHtml: '',
        turns: 0,
        timestamps: { created: Date.now(), updated: Date.now() }
      });
      if (!localStorage.getItem(KEYS.history)) this.set(KEYS.history, []);
    },
    migrateIfNeeded() {
      const v = this.get(KEYS.version, 0);
      if (v === CURRENT_VERSION) return;
      this.set(KEYS.version, CURRENT_VERSION);
    },
    clearAll() {
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    },
    keys: KEYS
  };

  try {
    Storage.migrateIfNeeded();
    Storage.ensureDefaults();
  } catch (e) {
    console.warn('Storage init error; clearing data.', e);
    Storage.clearAll();
    Storage.ensureDefaults();
  }

  window.Store = Storage;
})();

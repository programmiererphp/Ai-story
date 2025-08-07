/* Tiny event bus: pub/sub with once(), emit(), and wildcard logs
   Usage:
     Bus.on('APP/START', payload => {...})
     Bus.emit('APP/START', {foo:1})
*/
(function () {
  const map = new Map();

  const Bus = {
    on(evt, fn) {
      if (!map.has(evt)) map.set(evt, new Set());
      map.get(evt).add(fn);
      return () => Bus.off(evt, fn);
    },
    once(evt, fn) {
      const off = Bus.on(evt, (p) => { try { fn(p); } finally { off(); } });
      return off;
    },
    off(evt, fn) {
      const set = map.get(evt);
      if (set) set.delete(fn);
    },
    emit(evt, payload) {
      const set = map.get(evt);
      if (set) for (const fn of Array.from(set)) {
        try { fn(payload); } catch (e) { console.error('Bus handler error for', evt, e); }
      }
      // Mirror to debug log if present

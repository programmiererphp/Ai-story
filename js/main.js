/* Entry point: light boot logs and initial config sync */
(function () {
  window.addEventListener('DOMContentLoaded', () => {
    const cfg = Store.get(Store.keys.config);
    OpenRouter.configure({ apiKey: cfg.apiKey, model: cfg.model });
    DebugLog.push({ type:'info', msg:'App ready' });
    // Show current turn on first paint
    Bus.emit('TURN/UPDATE', { turn: cfg.players?.turn || 'p1', name: cfg.players?.p1 || 'User 1' });
  });
})();

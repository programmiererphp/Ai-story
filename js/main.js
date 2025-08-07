/* Entry point with extra safety for mobile browsers */
(function () {
  function boot() {
    const cfg = Store.get(Store.keys.config);
    OpenRouter.configure({ apiKey: cfg.apiKey, model: cfg.model });
    (window.DebugLog?.push || console.log)({ type:'info', msg:'App ready (boot)' });
    Bus.emit('TURN/UPDATE', { turn: cfg.players?.turn || 'p1', name: cfg.players?.p1 || 'User 1' });
  }
  window.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', boot); // some mobile browsers fire one but not the other reliably
})();


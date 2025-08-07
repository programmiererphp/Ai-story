/* Player names, mode, and turn indicator */
(function () {
  const turnEl = () => document.getElementById('turn-indicator');

  function updateTurn({ turn, name }) {
    turnEl().textContent = name ? `${name}’s turn` : (turn === 'p2' ? 'User 2’s turn' : 'User 1’s turn');
  }

  function savePlayers() {
    const cfg = Store.get(Store.keys.config);
    const mode = document.querySelector('input[name="mode"]:checked')?.value || 'single';
    const p1 = document.getElementById('p1-name').value || 'User 1';
    const p2 = document.getElementById('p2-name').value || 'User 2';
    cfg.players = cfg.players || { turn:'p1' };
    cfg.players.mode = mode;
    cfg.players.p1 = p1;
    cfg.players.p2 = p2;
    Store.set(Store.keys.config, cfg);
    Bus.emit('CONFIG/UPDATE');
  }

  window.addEventListener('DOMContentLoaded', () => {
    // Load current names/mode
    const cfg = Store.get(Store.keys.config);
    document.querySelector(`input[name="mode"][value="${cfg.players?.mode||'single'}"]`)?.click();
    document.getElementById('p1-name').value = cfg.players?.p1 || 'User 1';
    document.getElementById('p2-name').value = cfg.players?.p2 || 'User 2';

    // Save on change
    document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('change', savePlayers));
    document.getElementById('p1-name').addEventListener('input', savePlayers);
    document.getElementById('p2-name').addEventListener('input', savePlayers);
  });

  Bus.on('TURN/UPDATE', updateTurn);
})();

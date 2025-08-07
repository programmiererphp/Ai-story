/* Top-level controls + small extras:
   - Start, Reset, Export, Import
   - Initial cue text
   - Theme toggle (light/dark) injected into header; persisted in localStorage
*/
(function () {
  function onStart(){ Bus.emit('APP/START'); }
  function onReset(){ Bus.emit('APP/RESET'); }
  function onExport(){ XMLIO.exportXML(); }
  async function onImport(e){
    const file = e.target.files?.[0];
    if (!file) return;
    await XMLIO.importXMLFile(file);
    e.target.value = '';
  }

  // ===== Theme toggle (no HTML change needed) =====
  const THEME_KEY = 'asg:theme';
  function applyTheme(t){
    document.body.dataset.theme = t;
    // quick vars for dark
    if (t === 'dark') {
      injectDarkVars();
    }
    localStorage.setItem(THEME_KEY, t);
  }
  function injectDarkVars() {
    if (document.getElementById('asg-dark-vars')) return;
    const style = document.createElement('style');
    style.id = 'asg-dark-vars';
    style.textContent = `
      body[data-theme="dark"]{
        --bg:#0f1115; --text:#e9e9ea; --muted:#9aa0a6; --border:#252a33;
        --u1:#1b1f26; --u2:#162029; --ai:#12161c;
      }
      body[data-theme="dark"] .story-wrap,
      body[data-theme="dark"] .controls-wrap,
      body[data-theme="dark"] .settings,
      body[data-theme="dark"] .debug{
        background:#12161c; border-color:#252a33;
      }
      body[data-theme="dark"] .story .ai{border-left-color:#2a3442}
      body[data-theme="dark"] button{background:#11161c; border-color:#2a3442; color:#e9e9ea}
      body[data-theme="dark"] .question{background:#11161c}
      body[data-theme="dark"] #debug-log{background:#0a0d11; color:#cfe9cf}
    `;
    document.head.appendChild(style);
  }
  function installThemeToggle() {
    const header = document.querySelector('.topbar');
    if (!header) return;
    const btn = document.createElement('button');
    btn.title = 'Toggle Theme';
    btn.textContent = '🌓';
    btn.style.minWidth = '40px';
    btn.addEventListener('click', () => {
      const current = document.body.dataset.theme || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
    header.appendChild(btn);
    // Restore previous
    applyTheme(localStorage.getItem(THEME_KEY) || 'light');
  }

  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-btn').addEventListener('click', onStart);
    document.getElementById('reset-btn').addEventListener('click', onReset);
    document.getElementById('export-btn').addEventListener('click', onExport);
    document.getElementById('import-input').addEventListener('change', onImport);

    // Initial question
    Bus.emit('QUESTION/SHOW', { q: 'Press Start to begin.', options: [] });

    // Theme toggle
    installThemeToggle();
  });
})();

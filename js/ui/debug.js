/* Debug-Konsole ++
   - Globales Log
   - Fehler-/Status-Banner im UI (keine HTML-Änderungen nötig)
   - Mini-Test-Harness: 1 Turn / 3 Turns (Mock oder Live)
*/
(function () {
  const MAX = 500;
  const buf = [];

  // ===== Banner UI (inject in .controls-wrap) =====
  let banner, bannerMsg, bannerClose;
  function ensureBannerHost() {
    if (banner) return;
    const host = document.querySelector('.controls-wrap');
    if (!host) return;
    banner = document.createElement('div');
    banner.style.cssText = 'display:none;border:1px solid #ddd;border-radius:8px;padding:8px;background:#fff;margin-bottom:8px';
    bannerMsg = document.createElement('div');
    bannerMsg.style.cssText = 'font-weight:600';
    const sub = document.createElement('div');
    sub.style.cssText = 'font-size:12px;color:#666;margin-top:4px';
    sub.textContent = 'Check Debug Console for details.';
    bannerClose = document.createElement('button');
    bannerClose.textContent = '×';
    bannerClose.style.cssText = 'float:right;margin:-6px -6px 0 0;border:0;background:transparent;font-size:18px;cursor:pointer';
    bannerClose.addEventListener('click', () => banner.style.display = 'none');
    banner.append(bannerClose, bannerMsg, sub);
    host.prepend(banner);
  }
  function showBanner(type, text) {
    ensureBannerHost();
    if (!banner) return;
    bannerMsg.textContent = text;
    if (type === 'error') {
      banner.style.background = '#fff3f3';
      banner.style.borderColor = '#ffc6c6';
    } else if (type === 'info') {
      banner.style.background = '#f5f8ff';
      banner.style.borderColor = '#cfe0ff';
    } else {
      banner.style.background = '#fff';
      banner.style.borderColor = '#ddd';
    }
    banner.style.display = 'block';
  }
  function hideBanner() { if (banner) banner.style.display = 'none'; }

  // ===== Debug Log =====
  function fmtTs(ts){ return new Date(ts).toISOString().replace('T',' ').replace('Z',''); }
  function fmtLine(x){
    try {
      const base = `[${fmtTs(x.ts)}] ${x.type || 'evt'} ${x.evt || ''}`;
      if (x.payload) return base + ' ' + JSON.stringify(x.payload);
      if (x.error) return base + ' ' + x.error;
      if (x.msg) return base + ' ' + x.msg;
      return base;
    } catch { return String(x); }
  }
  function renderLog() {
    const pre = document.getElementById('debug-log');
    if (!pre) return;
    pre.textContent = buf.map(fmtLine).join('\n');
    pre.scrollTop = pre.scrollHeight;
  }
  window.DebugLog = {
    push(x){
      buf.push({ ts: Date.now(), ...x });
      if (buf.length > MAX) buf.splice(0, buf.length - MAX);
      renderLog();
    },
    clear(){ buf.length = 0; renderLog(); },
    toText(){ return buf.map(fmtLine).join('\n'); }
  };

  // ===== Env Checks =====
  function envCheck() {
    const lacks = [];
    if (!window.fetch) lacks.push('fetch');
    try { localStorage.setItem('_t','1'); localStorage.removeItem('_t'); } catch { lacks.push('localStorage'); }
    if (!window.DOMParser) lacks.push('DOMParser');
    if (!window.AbortController) lacks.push('AbortController');
    if (lacks.length) {
      const msg = 'Missing browser features: ' + lacks.join(', ');
      DebugLog.push({ type:'error', msg });
      showBanner('error', msg);
    }
  }

  // ===== API status hooks =====
  Bus?.on?.('API/REQUEST', (p) => {
    DebugLog.push({ type:'api', evt:'API/REQUEST', payload: { url: p?.url }});
    showBanner('info', 'Contacting AI…');
  });
  Bus?.on?.('API/RESPONSE', (p) => {
    DebugLog.push({ type:'api', evt:'API/RESPONSE', payload: p });
    hideBanner();
  });
  Bus?.on?.('API/ERROR', (p) => {
    DebugLog.push({ type:'error', evt:'API/ERROR', error: p?.error || 'unknown error' });
    showBanner('error', 'AI request failed. See Debug Console.');
  });

  // Browser errors
  window.addEventListener('error', e => { DebugLog.push({ type:'error', msg: e.message }); showBanner('error', 'Runtime error occurred.'); });
  window.addEventListener('unhandledrejection', e => { DebugLog.push({ type:'error', msg: 'Promise: ' + (e.reason?.message||String(e.reason)) }); showBanner('error', 'Unhandled error in promise.'); });

  // ===== Mini Test Harness (works in Mock *or* Live) =====
  async function nextCue() {
    return await new Promise(resolve => Bus.once('QUESTION/SHOW', resolve));
  }
  async function runDemo(turns, forceMock=false) {
    const cfg = Store.get(Store.keys.config);
    const originalKey = cfg.apiKey;
    if (forceMock) {
      // do not persist — temp override only
      OpenRouter.configure({ apiKey: '' });
    }
    // Reset & start fresh
    Bus.emit('APP/RESET');
    await new Promise(r => setTimeout(r, 50));
    Bus.emit('APP/START');
    let cue = await nextCue(); // first cue ready
    for (let i = 0; i < turns; i++) {
      const opts = (cue && cue.options) || [];
      if (!opts.length) break;
      const pick = opts[Math.floor(Math.random() * opts.length)] || '…';
      Bus.emit('USER/CHOICE', { text: pick });
      cue = await nextCue(); // wait for next cue
    }
    if (forceMock) OpenRouter.configure({ apiKey: originalKey });
  }

  function addHarnessButtons() {
    const dbg = document.querySelector('#debug .debug-body .debug-row');
    if (!dbg) return;
    const mkBtn = (label, handler) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.addEventListener('click', handler);
      return b;
    };
    const mock1 = mkBtn('Run 1 Turn (Mock)', () => runDemo(1, true));
    const mock3 = mkBtn('Run 3 Turns (Mock)', () => runDemo(3, true));
    const live1 = mkBtn('Run 1 Turn (Live)', () => {
      const hasKey = (Store.get(Store.keys.config)?.apiKey || '').trim().length > 0;
      if (!hasKey) return showBanner('error', 'No API key set (Settings). Use Mock buttons instead.');
      runDemo(1, false);
    });
    dbg.append(mock1, mock3, live1);
  }

  // Wire buttons after DOM ready
  window.addEventListener('DOMContentLoaded', () => {
    const copyBtn = document.getElementById('debug-copy');
    const clrBtn  = document.getElementById('debug-clear');
    copyBtn?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(DebugLog.toText()); } catch {}
    });
    clrBtn?.addEventListener('click', () => DebugLog.clear());
    renderLog();
    envCheck();
    addHarnessButtons();
  });
})();

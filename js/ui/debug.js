/* Collapsible Debug Console + global log buffer */
(function () {
  const MAX = 500;
  const buf = [];

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

  function render() {
    const pre = document.getElementById('debug-log');
    if (!pre) return;
    pre.textContent = buf.map(fmtLine).join('\n');
    pre.scrollTop = pre.scrollHeight;
  }

  window.DebugLog = {
    push(x){
      buf.push({ ts: Date.now(), ...x });
      if (buf.length > MAX) buf.splice(0, buf.length - MAX);
      render();
    },
    clear(){ buf.length = 0; render(); },
    toText(){ return buf.map(fmtLine).join('\n'); }
  };

  // Capture window errors & unhandled rejections
  window.addEventListener('error', e => DebugLog.push({ type:'error', msg: e.message }));
  window.addEventListener('unhandledrejection', e => DebugLog.push({ type:'error', msg: 'Promise: '+(e.reason?.message||String(e.reason)) }));

  // Wire buttons after DOM ready
  window.addEventListener('DOMContentLoaded', () => {
    const copyBtn = document.getElementById('debug-copy');
    const clrBtn  = document.getElementById('debug-clear');
    copyBtn?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(DebugLog.toText()); } catch {}
    });
    clrBtn?.addEventListener('click', () => DebugLog.clear());
    render();
  });
})();

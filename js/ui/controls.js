/* Question, three options, custom input + Send button */
(function () {
  const questionEl = () => document.getElementById('question');
  const optionsEl  = () => document.getElementById('options');
  const inputEl    = () => document.getElementById('custom-input');
  const sendBtn    = () => document.getElementById('send-btn');

  function renderQuestion({ q = '', options = [] } = {}) {
    questionEl().textContent = q || '';
    const host = optionsEl();
    host.innerHTML = '';
    options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'option-btn';
      b.textContent = opt;
      b.addEventListener('click', () => {
        Bus.emit('USER/CHOICE', { text: String(opt) });
        inputEl().value = '';
        host.innerHTML = '';
      });
      host.appendChild(b);
    });
  }

  function onSend() {
    const txt = (inputEl().value || '').trim();
    if (!txt) return;
    Bus.emit('USER/CHOICE', { text: txt });
    inputEl().value = '';
    optionsEl().innerHTML = '';
  }

  // Wire
  window.addEventListener('DOMContentLoaded', () => {
    sendBtn().addEventListener('click', onSend);
    inputEl().addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSend();
    });
  });

  Bus.on('QUESTION/SHOW', renderQuestion);
})();

/* Rendering & Sanitizing. Provides:
   - sanitize(html)
   - renderStory(html)
   - appendAI(text), appendUser(text, player)  -> returns updated HTML
   - highlightLastUserSpan(player)
*/
(function () {
  function sanitize(html) {
    const allowed = new Set(['B','I','EM','STRONG','U','BR','P','MARK','SPAN']);
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const walk = (node) => {
      if (node.nodeType === 1) {
        if (!allowed.has(node.tagName)) {
          const p = doc.createElement('p');
          p.textContent = node.textContent;
          node.replaceWith(p);
          node = p;
        }
        // strip attributes
        [...node.attributes].forEach(attr => node.removeAttribute(attr.name));
      }
      [...node.childNodes].forEach(walk);
    };
    [...doc.body.childNodes].forEach(walk);
    return doc.body.innerHTML;
  }

  function renderStory(html) {
    const pane = document.getElementById('story-pane');
    pane.innerHTML = sanitize(html || '');
    pane.scrollTop = pane.scrollHeight;
  }

  function wrapParagraph(text, cls) {
    const p = document.createElement('p');
    if (cls) p.className = cls;
    p.textContent = text;
    return p.outerHTML;
  }

  function appendAI(text) {
    const session = Store.get(Store.keys.session);
    const next = (session.storyHtml || '') + wrapParagraph(text, 'ai');
    Store.set(Store.keys.session, { ...session, storyHtml: next, timestamps: { ...session.timestamps, updated: Date.now() }});
    renderStory(next);
    return next;
  }

  function appendUser(text, player = 'p1') {
    const cls = player === 'p2' ? 'u2' : 'u1';
    const session = Store.get(Store.keys.session);
    const next = (session.storyHtml || '') + wrapParagraph(text, cls);
    Store.set(Store.keys.session, { ...session, storyHtml: next, timestamps: { ...session.timestamps, updated: Date.now() }});
    renderStory(next);
    return next;
  }

  window.Renderer = { sanitize, renderStory, appendAI, appendUser };
})();

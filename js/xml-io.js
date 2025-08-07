/* Vollständiger Export/Import (XML). UI: Export-Button + File-Input nutzen Bus-Events. */
(function () {
  function cdata(s){ return `<![CDATA[${s ?? ''}]]>`; }

  function exportXML() {
    const cfg = Store.get(Store.keys.config, {});
    const prm = Store.get(Store.keys.prompts, {});
    const ses = Store.get(Store.keys.session, {});
    const his = Store.get(Store.keys.history, []);

    const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<Session version="1.0">
  <Meta startedAt="${new Date(ses.timestamps?.created || Date.now()).toISOString()}"
        updatedAt="${new Date(ses.timestamps?.updated || Date.now()).toISOString()}"
        lang="${cfg.lang||'en'}" scenario="${cfg.scenario||'romantic'}" model="${cfg.model||''}"/>
  <Players mode="${cfg.players?.mode||'single'}">
    <Player id="1" name="${cfg.players?.p1||'User 1'}" color="#F0F0F0"/>
    <Player id="2" name="${cfg.players?.p2||'User 2'}" color="#E0E0E0"/>
    <Turn current="${cfg.players?.turn||'p1'}"/>
  </Players>
  <Story>${cdata(ses.storyHtml || '')}</Story>
  <History>${cdata(JSON.stringify(his))}</History>
  <Prompts overrides="true">${cdata(JSON.stringify(prm))}</Prompts>
  <Settings>${cdata(JSON.stringify(cfg))}</Settings>
</Session>`;

    const blob = new Blob([xml], {type:'application/xml'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ai-story-session-${Date.now()}.xml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function importXMLFile(file) {
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const get = sel => doc.querySelector(sel);

    // Basic fields
    const story = get('Story')?.textContent || '';
    const prompts = get('Prompts')?.textContent || '{}';
    const settings = get('Settings')?.textContent || '{}';
    const history = get('History')?.textContent || '[]';

    // Save
    Store.set(Store.keys.prompts, JSON.parse(prompts));
    Store.set(Store.keys.config, JSON.parse(settings));
    Store.set(Store.keys.history, JSON.parse(history));
    Store.set(Store.keys.session, {
      storyHtml: story.replace(/^<!\[CDATA\[|\]\]>$/g,''),
      turns: 0,
      timestamps: { created: Date.now(), updated: Date.now() }
    });

    Bus.emit('XML/IMPORTED');
  }

  window.XMLIO = { exportXML, importXMLFile };
})();

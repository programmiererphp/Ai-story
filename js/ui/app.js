/* Top-level controls: Start, Reset, Export, Import; also reflect cue text early on */
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

  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-btn').addEventListener('click', onStart);
    document.getElementById('reset-btn').addEventListener('click', onReset);
    document.getElementById('export-btn').addEventListener('click', onExport);
    document.getElementById('import-input').addEventListener('change', onImport);

    // Initial question empty
    Bus.emit('QUESTION/SHOW', { q: 'Press Start to begin.', options: [] });
  });
})();

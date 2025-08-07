/* Zustandsmaschine für die 4-Phasen-Interaktion.
   Events in/out:
   IN:  APP/START, APP/RESET, USER/CHOICE({text}), CONFIG/UPDATE, XML/IMPORTED
   OUT: QUESTION/SHOW({q,options}), TURN/UPDATE({turn,name}), STORY/UPDATED
*/
(function () {
  const S = {
    BOOT:'BOOT', READY:'READY',
    INIT:'STAGE_1_INIT', CUE:'STAGE_2_CUE', USER:'STAGE_3_USER', UPDATE:'STAGE_4_UPDATE',
    CHECK:'CHECK_STOP', END:'TERMINATED'
  };

  const State = {
    st: S.BOOT,
    lastCue: null,

    hydrateFromStore(){
      const cfg = Store.get(Store.keys.config);
      const ses = Store.get(Store.keys.session);
      OpenRouter.configure({ apiKey: cfg.apiKey, model: cfg.model });
      Renderer.renderStory(ses.storyHtml || '');
      Bus.emit('TURN/UPDATE', { turn: cfg.players.turn, name: cfg.players[cfg.players.turn === 'p1' ? 'p1' : 'p2'] });
      this.st = S.READY;
    },

    async start(){
      const cfg = Store.get(Store.keys.config);
      if (!cfg) return;
      this.st = S.INIT;
      const openingUser = Prompts.getPrompt('opening', cfg.scenario, cfg.lang, {
        language: langName(cfg.lang)
      });
      const res = await OpenRouter.complete({
        system: `You are a collaborative story assistant. Keep outputs concise for web UI.`,
        user: openingUser,
        temperature: 0.8, maxTokens: 120
      });
      Renderer.appendAI(res.content.trim());
      Store.tx(s => {
        s[Store.keys.session].turns = 1 + (s[Store.keys.session].turns||0);
        return s;
      });
      this.st = S.CUE;
      await this.generateCue();
    },

    async generateCue(){
      const cfg = Store.get(Store.keys.config);
      const ses = Store.get(Store.keys.session);
      const user = Prompts.getPrompt('cueJson', cfg.scenario, cfg.lang, {
        language: langName(cfg.lang),
        currentStory: ses.storyHtml
      });
      const res = await OpenRouter.complete({
        system: `Return only valid JSON like {"q":"...","options":["a","b","c"]}. Do not add commentary.`,
        user, temperature: 0.7, maxTokens: 160
      });
      const parsed = tryParseJSON(res.content);
      const q = parsed?.q || fallbackCueQ(cfg.lang);
      const options = normOptions(parsed?.options) || fallbackOptions(cfg.lang);
      this.lastCue = { q, options };
      Bus.emit('QUESTION/SHOW', { q, options });
      this.st = S.USER;
    },

    async onUserChoice(text){
      const cfg = Store.get(Store.keys.config);
      const ses = Store.get(Store.keys.session);
      Renderer.appendUser(text, cfg.players.turn);
      Bus.emit('STORY/UPDATED');

      // Ironic comment
      const ironyUser = Prompts.getPrompt('irony', cfg.scenario, cfg.lang, {
        language: langName(cfg.lang)
      });
      const irony = await OpenRouter.complete({
        system: `Return one short ironic line only.`,
        user: ironyUser, temperature: 0.9, maxTokens: 40
      });
      Renderer.appendAI(irony.content.trim());

      // Update story
      this.st = S.UPDATE;
      const updUser = Prompts.getPrompt('update', cfg.scenario, cfg.lang, {
        language: langName(cfg.lang),
        currentStory: ses.storyHtml,
        userAnswer: text
      });
      const upd = await OpenRouter.complete({
        system: `Continue story coherently. Avoid repeating prior text. 2–4 sentences.`,
        user: updUser, temperature: 0.85, maxTokens: 220
      });
      Renderer.appendAI(upd.content.trim());
      Store.tx(s => {
        s[Store.keys.session].turns = 1 + (s[Store.keys.session].turns||0);
        return s;
      });

      // Limits & turn-flip
      this.st = S.CHECK;
      const limits = cfg.limits || { maxTurns: 24, maxChars: 8000 };
      const turns = Store.get(Store.keys.session).turns || 0;
      const chars = (Store.get(Store.keys.session).storyHtml || '').length;
      if (turns >= limits.maxTurns || chars >= limits.maxChars) {
        this.st = S.END;
        Bus.emit('QUESTION/SHOW', { q: stopMsg(cfg.lang), options: [] });
        return;
      }
      // Next player's turn if two-player
      if (cfg.players.mode === 'two') {
        cfg.players.turn = cfg.players.turn === 'p1' ? 'p2' : 'p1';
        Store.set(Store.keys.config, cfg);
        Bus.emit('TURN/UPDATE', { turn: cfg.players.turn, name: cfg.players[cfg.players.turn] });
      }
      this.st = S.CUE;
      await this.generateCue();
    },

    reset(){
      Store.ensureDefaults();
      Store.tx(s => {
        s[Store.keys.session] = { storyHtml:'', turns:0, timestamps:{created:Date.now(), updated:Date.now()} };
        s[Store.keys.history] = [];
        return s;
      });
      this.hydrateFromStore();
      Bus.emit('QUESTION/SHOW', { q: '', options: [] });
    }
  };

  // Helpers
  function tryParseJSON(txt){
    try { return JSON.parse(txt); } catch {}
    // try to extract {...}
    const m = txt && txt.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return null;
  }
  function normOptions(arr){
    if (!Array.isArray(arr)) return null;
    const out = arr.map(x => String(x)).filter(Boolean).slice(0,3);
    while (out.length < 3) out.push('—');
    return out;
  }
  function fallbackCueQ(lang){
    return lang === 'de' ? 'Wohin soll die Szene gehen?' :
           lang === 'ru' ? 'Куда дальше движется сцена?' :
                           'Where should the scene go next?';
  }
  function fallbackOptions(lang){
    return lang === 'de' ? ['Sie riskiert etwas.','Sie bleibt vorsichtig.','Nudeln um 3 Uhr morgens.'] :
           lang === 'ru' ? ['Она рискнёт.','Она сыграет безопасно.','Лапша в 3 часа ночи.'] :
                           ['She takes a risk.','She plays it safe.','Noodles at 3am.'];
  }
  function stopMsg(lang){
    return lang === 'de' ? 'Stopp erreicht. Du kannst Reset drücken, um neu zu starten.' :
           lang === 'ru' ? 'Лимит достигнут. Нажми Reset, чтобы начать заново.' :
                           'Limit reached. Press Reset to start over.';
  }
  function langName(code){
    return code === 'de' ? 'German' : code === 'ru' ? 'Russian' : 'English';
  }

  // Wire global listeners
  Bus.on('APP/START', () => State.start());
  Bus.on('APP/RESET', () => State.reset());
  Bus.on('USER/CHOICE', p => State.onUserChoice(p?.text || ''));
  Bus.on('XML/IMPORTED', () => State.hydrateFromStore());
  Bus.on('CONFIG/UPDATE', () => {
    const cfg = Store.get(Store.keys.config);
    OpenRouter.configure({ apiKey: cfg.apiKey, model: cfg.model });
  });

  // Boot
  window.addEventListener('DOMContentLoaded', () => {
    State.hydrateFromStore();
  });

  window.FSM = State;
})();

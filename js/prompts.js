/* 52+ Prompt-Templates mit Platzhaltern: [LANGUAGE], [CURRENT_STORY], [USER_ANSWER]
   Szenarien-Ziele: jugendliche/young women Zielgruppe, kurze, bildhafte Sätze. */
(function () {
  const SCENARIOS = [
    'romantic','fantasy','young_adult','life_coaching','learn_german_b1',
    'practice_flirting','ironic_comms','career_advice','confidence','dating_advice',
    'self_care','creative_prompt','personal_reflection'
  ];

  const L = {
    en: {
      opening: s => `Write 1–2 vivid opening sentences in [LANGUAGE] for a ${s.replaceAll('_',' ')} scene. Keep it grounded, sensory, and inviting.`,
      cueJson:  `Based on [CURRENT_STORY], output ONLY valid JSON with keys "q" and "options" (array of exactly 3, two serious and one ironic). No extra text.`,
      irony:    `In [LANGUAGE], reply with a short, playful, slightly ironic one-liner reacting to the user's choice (max 14 words).`,
      update:   `Continue the story in [LANGUAGE], naturally integrating [USER_ANSWER]. Keep tone consistent, 2–4 sentences.`
    },
    de: {
      opening: s => `Schreibe 1–2 dichte Eröffnungssätze in [LANGUAGE] für eine ${s.replaceAll('_',' ')}-Szene. Sinnlich, konkret, einladend.`,
      cueJson:  `Erzeuge basierend auf [CURRENT_STORY] NUR gültiges JSON mit "q" und "options" (genau 3; zwei ernst, eine ironisch). Kein zusätzlicher Text.`,
      irony:    `Antworte in [LANGUAGE] mit einer kurzen, spielerisch-ironischen Einzeile (max. 14 Wörter).`,
      update:   `Führe die Geschichte in [LANGUAGE] fort und integriere [USER_ANSWER] organisch. 2–4 Sätze, gleicher Ton.`
    },
    ru: {
      opening: s => `Напиши 1–2 ярких вступительных предложения на [LANGUAGE] для сцены в жанре ${s.replaceAll('_',' ')}. Образно и понятно.`,
      cueJson:  `На основе [CURRENT_STORY] выведи ТОЛЬКО валидный JSON с ключами "q" и "options" (ровно 3: две серьёзные и одна ироничная). Без лишнего текста.`,
      irony:    `Ответь на [LANGUAGE] короткой игриво-ироничной репликой (не более 14 слов).`,
      update:   `Продолжи историю на [LANGUAGE], естественно интегрируя [USER_ANSWER]. 2–4 предложения, тот же тон.`
    }
  };

  // Vorbelegte Szenarien: identische Struktur, aber Opening textet das Szenario rein
  const PROMPTS = {};
  for (const sc of SCENARIOS) {
    PROMPTS[sc] = {
      en: {
        opening: L.en.opening(sc), cueJson: L.en.cueJson, irony: L.en.irony, update: L.en.update
      },
      de: {
        opening: L.de.opening(sc), cueJson: L.de.cueJson, irony: L.de.irony, update: L.de.update
      },
      ru: {
        opening: L.ru.opening(sc), cueJson: L.ru.cueJson, irony: L.ru.irony, update: L.ru.update
      }
    };
  }

  function fillPlaceholders(str, { language, currentStory, userAnswer }) {
    return String(str)
      .replaceAll('[LANGUAGE]', language || 'English')
      .replaceAll('[CURRENT_STORY]', currentStory || '')
      .replaceAll('[USER_ANSWER]', userAnswer || '');
  }

  function getPrompt(kind, scenario, lang, ctx = {}) {
    const cfgOverrides = Store.get(Store.keys.prompts, {});
    const sc = scenario && PROMPTS[scenario] ? scenario : 'romantic';
    const la = ['en','de','ru'].includes(lang) ? lang : 'en';

    // user overrides? structure: overrides[scenario]?.[lang]?.[kind]
    const ov = cfgOverrides?.[sc]?.[la]?.[kind];
    const base = ov || PROMPTS[sc][la][kind] || PROMPTS['romantic']['en'][kind];
    return fillPlaceholders(base, ctx);
  }

  function listScenarios(){ return SCENARIOS.slice(); }

  window.Prompts = { getPrompt, listScenarios };
})();

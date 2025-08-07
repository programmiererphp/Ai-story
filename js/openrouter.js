/* OpenRouter API client (OpenAI-compatible chat endpoint) with retries.
   - Browser-only, no streaming (simple to host on GitHub Pages).
   - Emits Bus events: API/REQUEST, API/RESPONSE, API/ERROR.
   - Falls back to a local "mock" model if no apiKey (useful for testing).
*/
(function () {
  const DEFAULTS = {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openrouter/auto',
    timeoutMs: 30000,
    maxRetries: 3,
  };

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function jitter(base) { return base * (0.6 + Math.random() * 0.8); }

  const OpenRouter = {
    config: {
      apiKey: '',
      model: DEFAULTS.model,
      baseUrl: DEFAULTS.baseUrl,
      headers: {}, // optional: { "HTTP-Referer": "...", "X-Title": "AI Story Generator" }
      timeoutMs: DEFAULTS.timeoutMs,
      maxRetries: DEFAULTS.maxRetries,
    },

    configure(partial) {
      Object.assign(this.config, partial || {});
    },

    async complete({ system, user, temperature = 0.8, maxTokens = 300 }) {
      const { apiKey } = this.config;
      if (!apiKey) {
        // Mock mode for offline testing
        const mock = this._mockReply(system, user);
        Bus?.emit?.('API/RESPONSE', { provider: 'mock', ok: true, mock });
        return { role: 'assistant', content: mock };
      }
      const body = {
        model: this.config.model || DEFAULTS.model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: user }
        ]
      };

      const url = this.config.baseUrl.replace(/\/$/, '') + '/chat/completions';
      const headers = Object.assign({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }, this.config.headers || {});
      const req = { method: 'POST', headers, body: JSON.stringify(body) };

      Bus?.emit?.('API/REQUEST', { url, body });

      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), this.config.timeoutMs);
        try {
          const res = await fetch(url, { ...req, signal: ctrl.signal });
          clearTimeout(t);

          if (res.status === 429 || res.status >= 500) {
            if (attempt < this.config.maxRetries) {
              const wait = jitter(400 * Math.pow(2, attempt));
              await sleep(wait);
              continue;
            }
          }
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            const error = new Error(`OpenRouter error ${res.status}: ${text.slice(0, 500)}`);
            Bus?.emit?.('API/ERROR', { error: error.message, status: res.status });
            throw error;
          }

          const json = await res.json();
          const msg = json.choices?.[0]?.message?.content ?? '';
          Bus?.emit?.('API/RESPONSE', { ok: true, usage: json.usage, id: json.id });
          return { role: 'assistant', content: msg, raw: json };
        } catch (e) {
          clearTimeout(t);
          if (attempt < this.config.maxRetries) {
            const wait = jitter(400 * Math.pow(2, attempt));
            await sleep(wait);
            continue;
          }
          Bus?.emit?.('API/ERROR', { error: String(e) });
          throw e;
        }
      }
      throw new Error('Retries exhausted');
    },

    _mockReply(system, user) {
      const lower = (user || '').toLowerCase();
      // Lightweight heuristics for our four stages
      if (lower.includes('"options"') || lower.includes('output json')) {
        // Stage 2 mock: JSON cue
        return JSON.stringify({
          q: "Where should the scene go next?",
          options: ["She takes a risk.", "She plays it safe.", "She orders noodles at 3am."]
        });
      }
      if (lower.includes('opening') || lower.includes('1–2') || lower.includes('1-2')) {
        return "The night smelled like rain and neon. She almost turned back, but the city held its breath.";
      }
      if (lower.includes('ironic') || lower.includes('irony')) {
        return "Bold choice. What could possibly go wrong?";
      }
      // Stage 4 update mock
      return "She tucked the note inside her jacket and stepped into the narrow alley, letting curiosity outrun caution.";
    }
  };

  window.OpenRouter = OpenRouter;
})();

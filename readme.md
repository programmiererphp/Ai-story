# AI Story Generator (Browser-Only)

Interactive, multi-language, single- or two-player storytelling in the browser with AI via OpenRouter.

## Features
- 4-stage loop: Opening → Cue (JSON: question + 3 options) → User choice/comment → Story update
- Single or Two Player with turn management and visual highlighting
- English / Deutsch / Русский UI + prompts
- Modular JS (no build tools), localStorage persistence
- Full session Export/Import (XML)
- Debug console (events, API calls, errors)

## Quick Start
1. Download/clone and open `index.html` in a modern browser **or** host with GitHub Pages.
2. In **Settings**, paste your **OpenRouter API key**.
3. Choose **Scenario** + **Language**, click **Start**.
4. Pick an option or write custom text, then **Send**. Repeat.

## GitHub Pages
- Create repo → Upload files → Settings → Pages → “Deploy from branch: main / root”
- Add `.nojekyll` (included)

## Files
- `css/` minimal styles
- `js/` modular code (state machine, prompts, storage, OpenRouter client, UI components)
- `index.html` wires UI

## License
MIT

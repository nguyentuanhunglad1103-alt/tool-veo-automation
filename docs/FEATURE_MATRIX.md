# Feature Matrix

Baseline date: 2026-06-16

Scope: only `1. Veo Automation/veo-automation`. The deleted second (Veo Voice & Design) and third (Delogo) folders are intentionally ignored.

## Survey Summary

No `README`, `src/`, route/page source files, `vite.config.*`, lint config, or real test config were found. Both apps are shipped as Electron apps with built frontend assets in `dist/`, `deobfuscated.js` as the main process entry, and `preload.js` as the renderer bridge.

Current validation scripts are artifact smoke checks only:

- `npm test`: runs `scripts/verify-ipc-contract.js` for the app. This verifies required artifacts, relative `dist` script/style references, preload wrapper exercise, and preload `invoke/send` channels against main-process `ipcMain.handle/on` registrations.
- `npm run build`: same artifact smoke check.
- No lint script is defined.

## Feature Status

| Area | Priority | Veo Automation | Status | Notes |
| --- | --- | --- | --- | --- |
| Electron launchers | critical | Present | Existing, smoke-tested | `.bat` launcher prefers local Electron, with portable/global Node fallback. |
| Electron bundle artifacts | critical | Present | Existing, smoke-tested | `npm test` and `npm run build` pass, but only check file existence. |
| Main/preload IPC bridge | critical | Broad API exposed | Existing, contract-tested | `npm test` verifies preload wrapper channels against main handlers/listeners, local dist assets, and HTML mojibake markers. Automation still exposes a generic `invoke`, treated as explicitly dynamic. |
| License verification | critical | Present | Existing, untested | `license:verify`, `license:check-saved`. |
| Settings store | high | Present | Existing, untested | Automation exposes get/save/delete. |
| File/dialog/shell utilities | high | Present | Existing, untested | Main handlers are broad. |
| Flow/Veo generation | critical | Present | Existing in Automation, untested | Video/image/content generation, polling, download, upscale, reference upload. |
| Scene video workflow | critical | Present | Existing in Automation, untested | Create, upload start/frame, extend, poll, update, merge. |
| Browser/account/auth automation | critical | Present | Existing in Automation, untested | Google auth, browser profile control, account token/credits handlers. |
| Token pool | high | Present | Existing in Automation, untested | Lease, report error, list, manual deposit. |
| Grok workflow | high | Present | Existing in Automation, untested | Login/connect/generate/status/settings/profile/temp image. |
| TTS | high | Present | Existing, untested | Automation exposes voices/synthesize/preview/save/read/default path/Google/batch join/SRT. |
| Whisper/subtitle | high | Present | Existing, untested | Model checks/download, Python setup, transcribe, translate, burn subtitle. |
| OmniVoice | critical | Present | Existing, untested | Status, install, clone, design, library, mix. Automation also exposes auto-trim, offload, SRT generation. |
| Video/audio tools | high | Present | Existing, untested | Merge, metadata, watermark removal, frame/audio extraction, scene detection, audio-to-video assembly. |
| YouTube downloader | medium | Present | Existing, untested | Info/download/progress in Automation. |
| Gemini upload | medium | Present | Existing, untested | Video/audio upload handlers; Automation exposes video upload. |
| Telegram reporting | medium | Present | Existing, untested | ID config, stats, completion tracking, batch log/video send. |
| Diagnostics | medium | Present | Existing, untested | Read/open diagnostic logs in Automation preload. |
| FFmpeg install/check | high | Present | Existing, untested | Runtime side effects need careful verification. |
| Feature gating/admin | high | Present | Existing in Automation, untested | Get enabled features, all licenses, update license features. |
| Frontend routes/pages source | critical | Missing | Missing | Only minified/bundled `dist` JS is available, so route/page intent cannot be safely edited at source level. |
| Real build pipeline | critical | Missing | Missing | `build` does not compile from source; it only checks artifacts. |
| Unit/integration/e2e tests | critical | Partial static contract test only | Partially covered | `scripts/verify-ipc-contract.js` covers artifact/static IPC contract behavior; no runtime/unit/e2e harness yet. |
| Lint/type checks | high | Missing | Missing | No lint script, TypeScript config, or source typing surface found. |
| README/operator docs | medium | Missing | Missing | Operational knowledge is currently in `AGENTS.md` and these docs only. |
| Splash/title Vietnamese text | medium | Unicode stored correctly | Existing, static-tested | PowerShell console may display mojibake, but `dist/index.html` contains correct Unicode and `npm test` checks known mojibake markers. |
| Favicon asset | low | Present | Fixed, static-tested | `dist/index.html` now references local `./vite.svg`, and Automation has `dist/vite.svg`. |

## Features Without Real Tests

All user-facing/runtime features currently lack runtime tests. The passing checks are artifact/build smoke plus the new static IPC contract test. Highest-risk untested areas:

- Critical: launchers, license, Flow/Veo generation, scene workflow, browser/auth automation, OmniVoice.
- High: TTS, Whisper, media processing, FFmpeg, token pool, settings persistence, IPC contract.
- Medium: YouTube, Gemini upload, Telegram, diagnostics.

## Technical Risks

| Priority | Risk | Impact |
| --- | --- | --- |
| critical | Source files are unavailable; app logic is bundled/obfuscated. | Feature changes in React UI or main logic are fragile and hard to review. |
| critical | Build script is not a real build. | A broken frontend or main bundle can pass `npm run build`. |
| critical | IPC contract tests are static only. | They catch missing handlers/listeners for preload wrappers, but do not prove handler behavior or renderer UI flows. |
| high | Automation exposes generic `electronAPI.invoke`. | Renderer can call arbitrary registered IPC channels; this widens blast radius. |
| high | External dependencies include Google/Veo, Grok, Gemini, YouTube, Telegram, Puppeteer/Chrome, Python, FFmpeg, Whisper, OmniVoice. | Tests need mocks and explicit opt-in for live external calls. |
| high | Paths contain spaces. | Shell commands and launchers can fail if quoting regresses. |
| medium | Console encoding can make Vietnamese text look mojibake in PowerShell output. | Can cause false-positive diagnosis unless files are read as UTF-8. |

## Proposed Batches

| Batch | Priority | Goal | Scope | Verification |
| --- | --- | --- | --- | --- |
| 0 | critical | Baseline docs and inventory | Create/update `docs/FEATURE_MATRIX.md` and `docs/TEST_PLAN.md` only. | `npm test` and `npm run build` for the app. |
| 1 | critical | Add non-invasive contract checks | Done: `scripts/verify-ipc-contract.js` is wired to `npm test` in the app and verifies required artifacts, relative dist assets, preload wrappers, and main IPC registrations. | Completed 2026-06-16: `npm test`, `npm run build`, and `npm run lint --if-present` for the app. |
| 2 | high | Fix visible static asset issues | Done: verified HTML Unicode, added mojibake-marker check, changed favicon refs to `./vite.svg`, and added local favicon SVG. | Completed 2026-06-16: `npm test`, `npm run build`, and `npm run lint --if-present` for the app. |
| 3 | high | Runtime launch smoke automation | Add a controlled Electron startup smoke that starts, waits, and exits without external calls. | Startup smoke, existing build/test. |
| 4 | high | External-service-safe tests | Add mocked tests/checks for license, settings, media/FFmpeg, OmniVoice/TTS/Whisper flow boundaries. | Mocked tests by default; live tests opt-in only. |
| 5 | medium | Operator docs | Add concise README/runbook after behavior is verified. | Docs review plus smoke checks. |

Implementation should start only after approval for a specific batch.

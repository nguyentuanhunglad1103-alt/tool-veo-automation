# Test Plan

Baseline date: 2026-06-16

Scope: `1. Veo Automation/veo-automation` only.

## Current Verified Baseline

Commands run successfully:

```powershell
cd "C:\Users\le van cuong\Desktop\4 tool\3 tool\1. Veo Automation\veo-automation"
..\..\.runtime\node\npm.cmd test
..\..\.runtime\node\npm.cmd run build
```

Current result after Batch 1: all test/build commands pass. `npm test` now runs the IPC contract verifier; `npm run build` remains the artifact smoke check.

Limitation: `npm test` validates static preload/main IPC contract behavior, but does not launch Electron, render UI, or exercise actual handler side effects. `npm run build` still does not compile from source.

Additional command run successfully:

```powershell
..\..\.runtime\node\npm.cmd run lint --if-present
```

There is still no real lint script, so this is a no-op confirmation.

## Test Levels To Add

| Level | Priority | Purpose | Default Mode |
| --- | --- | --- | --- |
| Artifact smoke | critical | Required files, dist assets, package entrypoints, launcher targets. | Offline, always on; covered by `npm test` and `npm run build`. |
| IPC contract | critical | Preload API wrappers map to registered main-process IPC channels/listeners; no accidental missing handlers for exposed wrappers. | Offline, always on; covered by `npm test`. |
| Static HTML checks | high | Encoding/title/loading text, local asset references, script/style/favicon files exist. | Offline, always on; covered by `npm test`. |
| Electron launch smoke | high | Each app starts from launcher or Electron binary and stays alive briefly without crashing. | Offline, always on. |
| Renderer smoke | high | Root page loads, splash renders, no immediate console/runtime errors. | Offline, always on if browser automation is available. |
| File/settings/license mocks | high | Verify local IPC handlers with safe temp paths and mocked service calls. | Offline, always on after harness exists. |
| Media dependency checks | high | FFmpeg, Python/Whisper, OmniVoice status/install boundaries do not crash. | Offline by default; install/live actions opt-in. |
| External service flows | medium | Flow/Veo, Grok, Gemini, YouTube, Telegram, license server live behavior. | Opt-in only with explicit credentials/environment. |

## Per-Batch Verification Rule

Every approved implementation batch must run:

- Existing `npm test` for each touched app.
- Existing `npm run build` for each touched app.
- Any new targeted test added by that batch.
- Lint/type check if a real source/lint pipeline is added later.
- Docs update in `docs/FEATURE_MATRIX.md` and/or this file.

## Initial Test Cases

| ID | Priority | App | Test | Expected |
| --- | --- | --- | --- | --- |
| ART-001 | critical | Automation | Verify `package.json#main` points to an existing file. | Covered by `scripts/verify-ipc-contract.js`. |
| ART-002 | critical | Automation | Verify `preload.js` and `dist/index.html` exist. | Covered by `scripts/verify-ipc-contract.js` and `npm run build`. |
| ART-003 | high | Automation | Verify local HTML script/style/favicon references exist under `dist`. | Covered by `scripts/verify-ipc-contract.js`. |
| ART-004 | low | Automation | Verify favicon reference exists or is removed/replaced. | Covered by `scripts/verify-ipc-contract.js`; both apps now use `./vite.svg`. |
| IPC-001 | critical | Automation | Extract preload API keys with mocked Electron context. | Covered by `scripts/verify-ipc-contract.js`. |
| IPC-002 | critical | Automation | Extract main `ipcMain.handle/on` channels. | Covered by `scripts/verify-ipc-contract.js`. |
| IPC-003 | critical | Automation | Exercise preload wrappers and verify `invoke/send` channels exist in main. | Covered by `scripts/verify-ipc-contract.js`. |
| IPC-004 | high | Automation | Flag generic `electronAPI.invoke`. | Covered as an explicit dynamic note; removal/hardening remains a later decision. |
| UI-001 | medium | Automation | Check `dist/index.html` title/loading text encoding markers. | Covered by `scripts/verify-ipc-contract.js`; known mojibake markers fail the test. |
| RUN-001 | critical | Automation | Start Electron app and wait 5 seconds. | Process remains alive or exits cleanly with captured reason. |
| EXT-001 | medium | Automation | Flow/Veo generation dry-run or mock. | No live call in default tests. |
| EXT-002 | medium | Automation | OmniVoice status/mock boundary. | No install/live model mutation in default tests. |

## Commands For Future Batches

Use portable Node/npm from the workspace:

```powershell
..\..\.runtime\node\npm.cmd test
..\..\.runtime\node\npm.cmd run build
```

Contract verifier:

```powershell
..\..\.runtime\node\npm.cmd run verify:contract
```

Launcher smoke commands:

```powershell
cd "C:\Users\le van cuong\Desktop\4 tool\3 tool\1. Veo Automation"
cmd /c chay_automation.bat
```

Live external-service tests must not run by default. They should require explicit opt-in variables and must not write secrets, tokens, cookies, or long logs into the repository.

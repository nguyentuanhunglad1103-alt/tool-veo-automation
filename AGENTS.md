# AGENTS.md

Huong dan ngan cho AI agent khi lam viec trong workspace nay.

## Project Snapshot

Workspace dang lam viec gom 1 tool (da loai bo hoan toan folder 2. Veo Voice & Design va folder 3 Delogo theo yeu cau cua user):

- `1. Veo Automation/veo-automation`: Electron desktop app, React 19 frontend da build san bang Vite trong `dist/`.

Khong thay `README`, `src/`, `vite.config.*`, route source React/Vite ro rang, hoac test config goc ro rang. App Electron chinh van dung `deobfuscated.js` lam entrypoint runtime da va va `preload.js` de expose `window.electronAPI`; artifact goc tu installer da duoc phuc dung them vao `dist-electron/`, `python/`, va `resources/`.

## Run / Build / Test

- Automation launcher: `cmd /c chay_automation.bat` tu `1. Veo Automation/`.
- Electron prod load `./dist/index.html`; dev mode trong bundle ky vong `http://localhost:3001` khi `NODE_ENV=development`.
- Automation co `start`, `build`, `test`, `verify:bundle`, `verify:contract` scripts. `build` va `verify:bundle` la smoke-check artifact vi khong co source build pipeline; `test` chay `verify:contract`.
- `scripts/verify-ipc-contract.js` o workspace root kiem tra package main/preload/dist, local dist asset refs, marker mojibake HTML, preload wrapper `invoke/send`, va main `ipcMain.handle/on` tuong ung ma khong goi external service.
- Workspace co Node portable tai `.runtime/node/node.exe` (`v22.12.0`) va npm portable (`10.9.0`).
- Electron binary local da co cho Automation: `node_modules/electron/dist/electron.exe` (`v42.4.0`).
- GitNexus da duoc cai user-local cho Codex; dung `gitnexus-auto` tu repo root khi can graph context, fallback la `gitnexus status` / `gitnexus analyze --index-only --skip-agents-md --skip-skills`. `.gitnexus/` la cache local va khong commit.
- Packaged runtime trong `**/resources/antigravity-core.dist/` va `**/resources/grok-engine.dist/` rat lon; da dua vao `.gitignore` va `.gitnexusignore` de tranh Git/Codex/GitNexus scan nhu source khi mo session moi.

## Important Files

- `1. Veo Automation/chay_automation.bat`: launcher da duoc sua de khong dung path hardcoded `..\..\4. Hyper\...`; uu tien Electron binary local, fallback qua Node portable/global + Electron CLI.
- `1. Veo Automation/veo-automation/package.json`: `main` la `deobfuscated.js`.
- `1. Veo Automation/veo-automation/package.json`: scripts dung Node portable relative path.
- `1. Veo Automation/veo-automation/deobfuscated.js`: Electron main process bundled/obfuscated.
- `1. Veo Automation/veo-automation/preload.js`: preload API bridge.
- `1. Veo Automation/veo-automation/dist-electron/`: Electron main/preload/security-config goc bung tu `Veo Automation Setup 1.5.3.exe`; giu de tham chieu source artifact, runtime hien van dung `deobfuscated.js`.
- `1. Veo Automation/veo-automation/dist/index.html`: frontend entry.
- `1. Veo Automation/veo-automation/dist/vite.svg`: favicon local duoc `dist/index.html` tham chieu bang `./vite.svg`.
- `1. Veo Automation/veo-automation/python/services/whisper_service.py`: source Whisper service bung tu installer.
- `1. Veo Automation/veo-automation/resources/antigravity-core.dist`: packaged Python backend runtime bung tu installer; khong co `python/backend/main.py` source goc.
- `1. Veo Automation/veo-automation/resources/grok-engine.dist`: packaged Grok engine runtime bung tu installer.
- `1. Veo Automation/veo-automation/deobfuscated.js`: nhanh Whisper/burn subtitle uu tien FFmpeg bundled `ffmpeg-static` truoc khi fallback `ffmpeg` trong PATH.
- `scripts/verify-ipc-contract.js`: static contract test cho app.

## Known Issues

- Automation launcher da chay qua loi thieu Node/Electron; test truc tiep Electron process song sau 5s.
- Console PowerShell co the hien thi tieng Viet mojibake, nhung `dist/index.html` dang luu Unicode dung cho title/loading text; `verify:contract` co check marker mojibake.
- Installer goc da phuc dung duoc packaged runtime (`resources/antigravity-core.dist`, Automation `resources/grok-engine.dist`) va Whisper service; tuy nhien van khong co React `src/`, `vite.config.*`, hoac source dev `python/backend/main.py`. `antigravity-core.exe` khong extract duoc bang `pyinstxtractor-ng` (bao khong phai PyInstaller archive ho tro).
- Cleanup an toan 2026-06-15 da xoa cac artifact tach bundle `1.js`-`71.js` va `bundle.json` o root; runtime hien dung `deobfuscated.js`, `preload.js`, va `dist/index.html`.

## Agent Rules

- Chi doc file can thiet truoc khi sua: manifest, launcher, entrypoint, preload, config, route/source chinh neu co.
- Tranh doc toan bo bundle lon neu khong can; uu tien `rg` voi pattern cu the.
- Chi sua file lien quan truc tiep den loi dang xu ly.
- Khi cleanup, khong xoa package-internal cache/build artifact trong `node_modules` neu chua co ke hoach reinstall ro rang; launcher dang uu tien Electron binary local trong `node_modules`.
- Khong ghi secret, token, license key, cookie, hoac log dai vao repo hay vao file nay.
- Sau moi lan sua loi, neu phat hien thong tin ben vung ve lenh chay dung, nguyen nhan loi, file quan trong, hoac loi con lai thi cap nhat file nay ngan gon.

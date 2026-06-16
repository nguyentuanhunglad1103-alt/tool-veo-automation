# AGENTS.md

Huong dan ngan cho AI agent khi lam viec trong workspace nay.

## Project Snapshot

Workspace dang lam viec gom 2 tool chinh:

- `1. Veo Automation/veo-automation`: Electron desktop app, React 19 frontend da build san bang Vite trong `dist/`.
- `2. Veo Voice & Design/veo-voice`: Electron desktop app, React 19 frontend da build san bang Vite trong `dist/`.
- Folder thu 3 da bi xoa khoi workspace; khong khao sat, sua, hay tinh vao trang thai chung.

Khong thay `README`, `src/`, `vite.config.*`, route source ro rang, hoac test config ro rang. Hai app Electron chinh dung `deobfuscated.js` lam entrypoint va `preload.js` de expose `window.electronAPI`.

## Run / Build / Test

- Automation launcher: `cmd /c chay_automation.bat` tu `1. Veo Automation/`.
- Voice launcher: `cmd /c chay_voice.bat` tu `2. Veo Voice & Design/`.
- Electron prod load `./dist/index.html`; dev mode trong bundle ky vong `http://localhost:3001` khi `NODE_ENV=development`.
- Automation/Voice co `start`, `build`, `test`, `verify:bundle` scripts. `build/test` la smoke-check artifact vi khong co source build pipeline.
- Workspace co Node portable tai `.runtime/node/node.exe` (`v22.12.0`) va npm portable (`10.9.0`).
- Electron binary local da co cho Automation va Voice: `node_modules/electron/dist/electron.exe` (`v42.4.0`).

## Important Files

- `1. Veo Automation/chay_automation.bat`: launcher da duoc sua de khong dung path hardcoded `..\..\4. Hyper\...`; uu tien Electron binary local, fallback qua Node portable/global + Electron CLI.
- `1. Veo Automation/veo-automation/package.json`: `main` la `deobfuscated.js`.
- `1. Veo Automation/veo-automation/package.json`: scripts dung Node portable relative path.
- `1. Veo Automation/veo-automation/deobfuscated.js`: Electron main process bundled/obfuscated.
- `1. Veo Automation/veo-automation/preload.js`: preload API bridge.
- `1. Veo Automation/veo-automation/dist/index.html`: frontend entry.
- `2. Veo Voice & Design/chay_voice.bat`: launcher da duoc sua de khong dung path hardcoded; tranh npm `.bin/electron.cmd` vi path co ky tu `&`; fallback qua Node portable/global + Electron CLI.
- `2. Veo Voice & Design/veo-voice/dist/index.html`: splash branding da sua thanh `VEO VOICE & DESIGN`.
- `2. Veo Voice & Design/veo-voice/package.json`: `main` la `deobfuscated.js`.
- `2. Veo Voice & Design/veo-voice/package.json`: scripts dung Node portable relative path.

## Known Issues

- Automation/Voice launcher da chay qua loi thieu Node/Electron; test truc tiep Electron process song sau 5s.
- Console PowerShell co the hien thi tieng Viet mojibake, nhung `dist/index.html` dang luu Unicode dung cho title/loading text.
- Cleanup an toan 2026-06-15 da xoa cac artifact tach bundle `1.js`-`71.js` va `bundle.json` o root hai app; runtime hien dung `deobfuscated.js`, `preload.js`, va `dist/index.html`.

## Agent Rules

- Chi doc file can thiet truoc khi sua: manifest, launcher, entrypoint, preload, config, route/source chinh neu co.
- Tranh doc toan bo bundle lon neu khong can; uu tien `rg` voi pattern cu the.
- Chi sua file lien quan truc tiep den loi dang xu ly.
- Khi cleanup, khong xoa package-internal cache/build artifact trong `node_modules` neu chua co ke hoach reinstall ro rang; launcher dang uu tien Electron binary local trong `node_modules`.
- Khong xu ly folder thu 3 nua, tru khi user them lai va doi y ro rang.
- Khong ghi secret, token, license key, cookie, hoac log dai vao repo hay vao file nay.
- Sau moi lan sua loi, neu phat hien thong tin ben vung ve lenh chay dung, nguyen nhan loi, file quan trong, hoac loi con lai thi cap nhat file nay ngan gon.

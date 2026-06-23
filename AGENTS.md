# AGENTS.md

Huong dan ngan cho AI agent khi lam viec trong workspace nay.

## Project Snapshot

Workspace dang lam viec gom 1 tool (da loai bo hoan toan folder 2. Veo Voice & Design va folder 3 Delogo theo yeu cau cua user):

- `1. Veo Automation/veo-automation`: Electron desktop app; runtime hien hanh dung backend `deobfuscated.js`, preload ghep `preload-entry.js`, va frontend goc da build san trong `dist/`.

`src/` va `src-electron/` chi la source phuc dung/tham khao, khong tham gia runtime. Khong chuyen entrypoint sang cac thu muc nay va khong build Vite de ghi de `dist/`.

## Run / Build / Test

- Automation launcher: `cmd /c chay_automation.bat` tu `1. Veo Automation/`.
- Electron prod load `./dist/index.html`; dev mode trong bundle ky vong `http://localhost:3001` khi `NODE_ENV=development`.
- Automation co `start`, `build`, `test`, `verify:bundle`, `verify:contract`, `verify:cloud` scripts. `build` va `verify:bundle` chi smoke-check artifact; `test` chay ca IPC contract va Cloud AI contract.
- `scripts/verify-ipc-contract.js` o workspace root kiem tra package main/preload/dist, local dist asset refs, marker mojibake HTML, preload wrapper `invoke/send`, va main `ipcMain.handle/on` tuong ung. (Da cap nhat de ho tro cau truc source code src-electron/ va cac file module IPC).
- `scripts/verify-runtime-launch.js` o workspace root chay kiem thu smoke test Electron thuc te de kiem tra tinh on dinh cua ung dung trong 5 giay.
- `scripts/verify-cloud-ai-contract.js` kiem tra secure profile, khong ro API key plaintext, cac IPC Cloud va cau noi tu API Whisper cu sang Cloud.
- Workspace co Node portable tai `.runtime/node/node.exe` (`v22.12.0`) va npm portable (`10.9.0`).
- Electron binary local da co cho Automation: `node_modules/electron/dist/electron.exe` (`v42.4.0`).
- GitNexus da duoc cai user-local cho Codex; dung `gitnexus-auto` tu repo root khi can graph context, fallback la `gitnexus status` / `gitnexus analyze --index-only --skip-agents-md --skip-skills`. `.gitnexus/` la cache local va khong commit.
- Packaged runtime trong `**/resources/antigravity-core.dist/` va `**/resources/grok-engine.dist/` rat lon; da dua vao `.gitignore` va `.gitnexusignore` de tranh Git/Codex/GitNexus scan nhu source khi mo session moi.

## Important Files

- `1. Veo Automation/chay_automation.bat`: launcher da duoc sua de khong dung path hardcoded `..\..\4. Hyper\...`; uu tien Electron binary local, fallback qua Node portable/global + Electron CLI.
- `1. Veo Automation/veo-automation/package.json`: `main` la `deobfuscated.js` (da duoc chuyen sang dung file backend deobfuscated sach thay vi code phuc dung src-electron).
- `1. Veo Automation/veo-automation/package.json`: scripts dung Node portable relative path.
- `1. Veo Automation/veo-automation/deobfuscated.js`: Electron main process bundled/deobfuscated.
- `1. Veo Automation/veo-automation/preload.js`: preload bridge goc, giu nguyen de tuong thich.
- `1. Veo Automation/veo-automation/preload-entry.js`: preload runtime duoc ghep tu `preload.js` + `preload-cloud-tail.js`; tao lai bang `npm run generate:preload`.
- `1. Veo Automation/veo-automation/cloud-ai.js`: secure profiles, adapter OpenAI-compatible/Gemini, streaming/cancel, Cloud STT va dich SRT.
- `1. Veo Automation/veo-automation/dist/cloud-ai-renderer.js`: UI cau hinh Cloud AI, migration key cu va lop tuong thich cho bundle frontend goc.
- `1. Veo Automation/veo-automation/dist-electron/`: Electron main/preload/security-config goc bung tu `Veo Automation Setup 1.5.3.exe`; giu de tham chieu source artifact.
- `1. Veo Automation/veo-automation/dist/index.html`: frontend entry.
- `1. Veo Automation/veo-automation/dist/vite.svg`: favicon local duoc `dist/index.html` tham chieu bang `./vite.svg`.
- `1. Veo Automation/veo-automation/python/services/whisper_service.py`: artifact tham khao tu installer; khong con duoc active subtitle runtime goi.
- `1. Veo Automation/veo-automation/resources/antigravity-core.dist`: packaged Python backend runtime bung tu installer; khong co `python/backend/main.py` source goc.
- `1. Veo Automation/veo-automation/resources/grok-engine.dist`: packaged Grok engine runtime bung tu installer.
- `1. Veo Automation/veo-automation/deobfuscated.js`: burn subtitle van dung FFmpeg bundled; AI transcribe/dich da chuyen sang `cloud-ai.js`.
- `scripts/verify-ipc-contract.js`: static contract test cho app (da sua regex ho tro code format xuong dong).

- **Phục hồi trạng thái nguyên bản (2026-06-20)**: Để giải quyết phản hồi của người dùng về việc ứng dụng bị thay đổi hoàn toàn giao diện và biến mất hầu hết các tính năng gốc (do bản phục dựng React `src/` chỉ nặng 220KB so với 2.85MB của bản build gốc), chúng tôi đã khôi phục 100% mã nguồn nguyên bản:
  - Trỏ `package.json` entrypoint `main` về lại `deobfuscated.js` (file gốc đã được giải mã 100% bằng webcrack).
  - Khôi phục `preload.js` gốc từ bản backup.
  - Khôi phục thư mục giao diện `dist/` nguyên bản (2.85MB JS) chứa đầy đủ các tính năng ban đầu (Quản lý tài khoản, Browser Automation, Quét tài nguyên, Cài đặt chuyên sâu, v.v.).
  - Giữ lại launcher `chay_automation.bat` đã sửa lỗi đường dẫn để người dùng mở là chạy được ngay qua Electron cục bộ.
  - Các thư mục phục dựng trước đó (`src/`, `src-electron/`) vẫn được giữ lại dưới dạng untracked để tham khảo, không còn tham gia vào luồng runtime của ứng dụng.
  - Tích hợp tải video YouTube qua thư viện `@distube/ytdl-core` trực tiếp trong Node.js (lưu vào Downloads, báo tiến trình thực tế) thay cho Python sidecar.
  - Intercept các cuộc gọi tạo video tự động (Flow/Grok) để báo lỗi "Tính năng chưa được hỗ trợ trên thiết bị này" thay vì treo máy vô hạn.

- **Cloud AI migration (2026-06-23)**:
  - Active runtime khong con marker/call `localhost:11434`, Ollama, faster-whisper, hoac `whisper_service.py`.
  - API key Text/Translation/STT duoc ma hoa bang Electron `safeStorage`; renderer chi nhan metadata da mask.
  - Ho tro profile OpenAI-compatible, Gemini, OpenAI Audio-compatible va Groq STT; Text va STT co active profile rieng.
  - Cloud STT chia audio lon thanh chunk 20 phut, overlap 2 giay, merge/dedup timestamp va cleanup temp trong `finally`.
  - Cac ten IPC Whisper cu chi la cau noi tuong thich sang Cloud; khong tai model hay cai Python.
  - Smoke test dung `VEO_SMOKE_TEST=1` va user-data-dir tam, khong khoi dong/stop sidecar cua phien nguoi dung.

## Agent Rules

- Không tự ý thay đổi luồng build hoặc chuyển đổi entrypoint sang thư mục phục dựng `src/` hay `src-electron/` trừ khi có chỉ thị trực tiếp từ người dùng.
- Khi sửa lỗi backend, hãy chỉnh sửa trực tiếp trên file backend chính `deobfuscated.js` (hoặc các file module gốc nếu có liên kết).
- Không chạy lại lệnh build Vite `npm run build` vì nó sẽ ghi đè và phá hỏng thư mục giao diện nguyên bản `dist/` của ứng dụng.
- Khong ghi secret, token, license key, cookie, hoac log dai vao repo hay vao file nay.
- Sau moi lan sua loi, neu phat hien thong tin ben vung ve lenh chay dung, nguyen nhan loi, file quan trong, hoac loi con lai thi cap nhat file nay ngan gon.

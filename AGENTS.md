# AGENTS.md

Huong dan ngan cho AI agent khi lam viec trong workspace nay.

## Project Snapshot

Workspace dang lam viec gom 1 tool duy nhat o thu muc goc (da loai bo hoan toan folder `1. Veo Automation` truoc day, dua toan bo code len root level):

- `deobfuscated.js`: Electron main process backend hien hanh.
- `preload-entry.js`: Preload runtime ghep tu `preload.js` + `preload-cloud-tail.js`.
- `dist/`: Giao dien frontend goc da duoc build san va chay on dinh (khong tu y rebuild Vite).

`src/` va `src-electron/` chi la source phuc dung/tham khao, khong tham gia runtime. Khong chuyen entrypoint sang cac thu muc nay va khong build Vite de ghi de `dist/`.

## Run / Build / Test

- Automation launcher: `cmd /c chay_automation.bat` o root folder.
- Electron prod load `./dist/index.html`; dev mode trong bundle ky vong `http://localhost:3001` khi `NODE_ENV=development`.
- Automation co cac scripts defined trong `package.json` (chay bang Node portable):
  - `npm start`: Chay ung dung Electron.
  - `npm test`: Chay contract testing (verify-ipc-contract.js va verify-cloud-ai-contract.js).
  - `node scripts/verify-runtime-launch.js`: Smoke test thuc te trong 5 giay de kiem tra tinh on dinh cua Electron.
- Workspace co Node portable tai `.runtime/node/node.exe` (`v22.12.0`) va npm portable (`10.9.0`).
- Electron binary local: `node_modules/electron/dist/electron.exe` (`v42.4.0`).
- GitNexus: Dung `gitnexus-auto` tu repo root khi can graph context, fallback la `gitnexus status` / `gitnexus analyze --index-only --skip-agents-md --skip-skills`.
- Packaged runtime trong `resources/antigravity-core.dist/` va `resources/grok-engine.dist/` rat lon; da dua vao `.gitignore` va `.gitnexusignore` de tranh quet.

## Important Files

- `chay_automation.bat`: Launcher chinh cua app tu root.
- `package.json`: Cau hinh package va tap lenh script o root.
- `deobfuscated.js`: Electron main process bundled/deobfuscated.
- `preload.js`: Preload bridge goc.
- `preload-entry.js`: Preload runtime ghep tu `preload.js` + `preload-cloud-tail.js`; tao lai bang `npm run generate:preload`.
- `cloud-ai.js`: Secure profiles, adapter OpenAI-compatible/Gemini, STT va SRT translation.
- `dist/cloud-ai-renderer.js`: UI cau hinh Cloud AI.
- `dist-electron/`: Electron main/preload/security-config goc bung tu installer de tham khao.
- `dist/index.html`: Entrypoint cua frontend.
- `dist/vite.svg`: Favicon local.
- `python/services/whisper_service.py`: Artifact tham khao (khong active).
- `resources/antigravity-core.dist`: Packaged Python backend runtime.
- `resources/grok-engine.dist`: Packaged Grok engine runtime.

- **Phục hồi trạng thái nguyên bản (2026-06-20)**:
  - Trỏ `package.json` entrypoint `main` ve lai `deobfuscated.js` (file goc da deobfuscated 100%).
  - Khuyen khich giu nguyen thu muc frontend `dist/` nguyen ban (2.85MB JS).
  - Tich hop tai video YouTube qua `@distube/ytdl-core` trong Node.js (luu vao Downloads, bao tien trinh thuc te).
  - Intercept cuoc goi video tu dong (Flow/Grok) de bao loi tinh nang chua duoc ho tro thay vi treo may.

- **Cloud AI migration (2026-06-23)**:
  - Active runtime dung Cloud STT (Gemini, OpenAI, Groq STT) va text translation, khong can model local hay Python sidecar.
  - API key duoc ma hoa bang `safeStorage`; renderer nhan metadata da mask.
  - Smoke test runtime dung `VEO_SMOKE_TEST=1` va user-data-dir tam de khong anh huong profile nguoi dung.

## Agent Rules

- Không tự ý thay đổi luồng build hoặc chuyển đổi entrypoint sang thư mục phục dựng `src/` hay `src-electron/` trừ khi có chỉ thị trực tiếp từ người dùng.
- Khi sửa lỗi backend, hãy chỉnh sửa trực tiếp trên file backend chính `deobfuscated.js` ở root.
- Không chạy lại lệnh build Vite `npm run build` vì nó sẽ ghi đè và phá hỏng thư mục giao diện nguyên bản `dist/` của ứng dụng.
- Khong ghi secret, token, license key, cookie, hoac log dai vao repo hay vao file nay.
- Sau moi lan sua loi, neu phat hien thong tin ben vung ve lenh chay dung, nguyen nhan loi, file quan trong, hoac loi con lai thi cap nhat file nay ngan gon.

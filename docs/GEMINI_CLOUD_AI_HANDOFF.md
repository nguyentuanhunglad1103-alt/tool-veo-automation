# Bàn giao phần Cloud AI Gemini đang làm dở

Ngày chốt: 2026-06-20 (Asia/Saigon)

## Mục tiêu đã thống nhất

- Loại bỏ hoàn toàn Ollama khỏi giao diện và active runtime.
- Không dùng Whisper/faster-whisper offline cho luồng phụ đề; STT và dịch phụ đề chuyển sang Cloud API.
- Thêm cấu hình API đa nhà cung cấp, tách riêng năng lực Text/Translation và STT.
- Hỗ trợ OpenAI-compatible và Gemini bằng adapter riêng.
- API key chỉ được giải mã và sử dụng trong Electron Main Process; lưu bằng `safeStorage`, không lưu plaintext.
- Giữ FFmpeg local để trích audio và burn phụ đề.
- Không xóa toàn bộ Python runtime vì OmniVoice và backend đóng gói khác có thể còn sử dụng.
- Giữ entrypoint `deobfuscated.js`, preload và giao diện nguyên bản trong `dist/`; tuyệt đối không chạy Vite build.

## Điểm Gemini đã dừng

Phiên Antigravity: `e966c502-e4c6-413b-9bab-98ebf57e473e`.

- Gemini đã hoàn thiện bản kế hoạch 534 dòng và danh sách 10 bước.
- Chỉ bước 1 (sao lưu baseline) được đánh dấu hoàn thành.
- Hành động cuối cùng là đọc và xác định khối `RN()` trong `deobfuscated.js` (khoảng dòng 93608-93831), các handler store và hàm FFmpeg `mie` để chuẩn bị thay đổi.
- Gemini chưa thực hiện thao tác sửa source cho đợt Cloud AI.
- Active runtime vẫn còn `whisper:check-model`, `whisper:check-python` và logic Ollama.
- Chưa có `safeStorage`, `custom-config:save`, `custom:chat-completion` hoặc Cloud STT mới.

Tài liệu gốc của phiên Gemini:

- `C:\Users\le van cuong\.gemini\antigravity\brain\e966c502-e4c6-413b-9bab-98ebf57e473e\implementation_plan.md`
- `C:\Users\le van cuong\.gemini\antigravity\brain\e966c502-e4c6-413b-9bab-98ebf57e473e\task.md`

## Baseline và backup đã xác nhận

Git HEAD lúc chốt: `b66562f2f7f4c48e6a0856d2f529028e130a3ddd`.

| File | Kích thước | SHA-256 |
|---|---:|---|
| `deobfuscated.js` và `deobfuscated.js.cloudai.bak` | 2,931,190 | `37F1421D6AD62D80D42E2A8D4887A31E93D18A227FA79777034ACC3939B130D7` |
| `preload.js` và `preload.js.cloudai.bak` | 20,179 | `913ECCF41CAABD13A859C4ECAA85A5A49EF6B6FAFBE07B23116478B79ECE0026` |
| `dist/assets/index-ByQoZoaH.js` và bản `.cloudai.bak` | 2,858,903 | `8A51E596092F724A3B322DE79DE48C07E631192ED9BB5A4DBC43662413B1D4F6` |

Các cặp active/backup giống hệt nhau tại thời điểm chốt. Backup chỉ là điểm quay lại trước đợt Cloud AI; nó không đại diện cho một worktree Git sạch. Repo vẫn chứa nhiều thay đổi chưa commit từ các đợt trước.

## Các checkpoint nên triển khai

### C0 — Trạng thái hiện tại

- Backup Cloud AI đã tồn tại và khớp hash.
- Chưa có source Cloud AI mới.
- Có thể tiếp tục mà không cần rollback.

### C1 — Chốt baseline đang chạy được

- Phân loại và lưu riêng các thay đổi cũ: deobfuscation, YouTube downloader, lỗi trung thực cho Flow/Grok và contract verifier.
- Xác nhận static IPC contract và runtime smoke test trước khi thêm Cloud AI.
- Không trộn checkpoint này với thay đổi Cloud AI.

### C2 — Nền tảng cấu hình Cloud ở backend

- Thêm secure profile store bằng `safeStorage` và `electron-store`.
- Thêm `custom-config:save/list/delete/test` với validation, timeout và redaction secret.
- Chưa xóa Ollama/Whisper cũ tại checkpoint này.
- Kiểm tra syntax, contract và lưu checkpoint riêng.

### C3 — Text API và preload

- Thêm adapter OpenAI-compatible và Gemini.
- Thêm completion, streaming, cancel và request tracking trong Main Process.
- Bổ sung wrapper preload theo hướng additive; chưa xóa wrapper cũ khi frontend còn gọi.
- Chuyển từng consumer: AI Assistant, Scriptwriter, SEO, Rewrite và dịch thuật.

### C4 — Cloud STT và dịch phụ đề

- FFmpeg trích audio mono 16 kHz, 48/64 kbps.
- Upload trực tiếp khi nhỏ; file lớn chia chunk 20 phút, overlap 2 giây.
- Validate segment, cộng offset thực, dedup tại biên overlap và dựng SRT trong app.
- Dịch theo `ID + text`, giữ nguyên timestamp; cleanup temp trong `finally`.
- Không trả kết quả thành công nếu thiếu chunk hoặc thiếu cue.

### C5 — Migration giao diện nguyên bản

- Chỉnh trực tiếp bundle hiện hành bằng anchor duy nhất và backup trước mỗi lần sửa.
- Thêm UI cấu hình riêng Text/Translation và STT.
- Di chuyển API key cũ khỏi `localStorage` chỉ sau khi Main xác nhận mã hóa thành công.
- Không chạy `npm run build` hoặc bất kỳ Vite build nào.

### C6 — Loại bỏ offline và nghiệm thu

- Chỉ xóa Ollama và các handler/UI Whisper offline sau khi mọi call site đã chuyển.
- Quét active runtime để bảo đảm không còn `localhost:11434`, polling/model Ollama hoặc check/download/setup Whisper model.
- Giữ OmniVoice, Python runtime cần thiết, Edge-TTS, Google TTS và FFmpeg.
- Chạy contract test, runtime smoke test và kiểm tra thủ công Text, STT, dịch SRT, cancel, retry, migration và cleanup.

## Nguyên tắc khi tiếp tục

- Không thay nguyên khối `RN()` cùng lúc; chia thành thay đổi nhỏ có thể kiểm tra và rollback.
- Không xóa API cũ khỏi preload trước khi xác nhận bundle không còn gọi.
- Không gửi API key từ Main trở lại renderer, URL, log hoặc thông báo lỗi.
- Không sửa entrypoint sang `src-electron/`; không dùng `archive/legacy-*` làm runtime.
- Không coi các backup `.cloudai.bak` là lý do được phép ghi đè thay đổi chưa commit của người dùng.

## Kết quả tiếp tục — 2026-06-23

Các checkpoint C1-C6 đã được triển khai:

- Thêm secure provider profiles bằng `safeStorage`; key không trả về renderer và không lưu plaintext.
- Thêm adapter OpenAI-compatible/Gemini, completion, streaming SSE, cancel và timeout/retry.
- Thêm Cloud STT, upload/chunk/overlap/dedup, dựng SRT và dịch theo `ID + text`.
- Thêm preload Cloud riêng trên nền preload gốc và UI Cloud AI trong frontend nguyên bản.
- Di chuyển key cũ sang secure store; chỉ xóa localStorage sau khi Main xác nhận lưu thành công.
- Các IPC Whisper cũ được giữ làm cầu tương thích nhưng chỉ gọi Cloud; code cài Python/tải model/offline transcription đã bị loại khỏi active backend.
- Đã loại marker và đường gọi Ollama, `localhost:11434`, faster-whisper và `whisper_service.py` khỏi active runtime.
- Các lần chỉnh bundle đều có backup theo stage và codemod có kiểm tra anchor; không chạy Vite build.

Kết quả xác minh cuối:

- `npm test`: đạt; 159 preload APIs, 154 main handlers, Cloud AI secure-profile contract đạt.
- `scripts/verify-runtime-launch.js`: đạt sau 5 giây với profile Electron tạm và không chạm sidecar đang chạy.
- Syntax check đạt cho backend, preload, renderer bridge và bundle frontend.

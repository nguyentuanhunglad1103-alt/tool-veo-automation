'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PROFILE_STORE_KEY = 'cloudAI.profiles';
const ACTIVE_PROFILE_STORE_KEY = 'cloudAI.activeProfiles';
const MIGRATION_STORE_KEY = 'cloudAI.migrationVersion';
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 60_000;
const STT_UPLOAD_LIMIT_BYTES = 24 * 1024 * 1024;
const STT_CHUNK_SECONDS = 1_200;
const STT_OVERLAP_SECONDS = 2;
const PROFILE_TYPES = new Set([
  'openai-compatible',
  'gemini',
  'openai-audio-compatible',
  'groq-stt'
]);
const CAPABILITIES = new Set(['chat', 'translation', 'stt']);

function cleanError(error) {
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  return message
    .replace(/(authorization:\s*bearer\s+)[^\s]+/gi, '$1[REDACTED]')
    .replace(/([?&](?:key|api_key)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/(x-goog-api-key["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi, '$1[REDACTED]')
    .slice(0, 800);
}

function safeId(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) {
    throw new Error('Profile ID không hợp lệ');
  }
  return value;
}

function normalizeCapabilities(value) {
  const capabilities = Array.isArray(value) ? [...new Set(value)] : [];
  if (capabilities.length === 0 || capabilities.some((item) => !CAPABILITIES.has(item))) {
    throw new Error('Profile phải có ít nhất một capability hợp lệ');
  }
  return capabilities;
}

function isPrivateHostname(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host === '::1' || host.endsWith('.localhost')) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^169\.254\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  const match172 = host.match(/^172\.(\d{1,3})\./);
  if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31) return true;
  return host === '0.0.0.0' || host === '::';
}

function normalizeBaseUrl(rawValue, allowInsecureLocal = false) {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0 || rawValue.length > 2_000) {
    throw new Error('Base URL không hợp lệ');
  }
  let url;
  try {
    url = new URL(rawValue.trim());
  } catch {
    throw new Error('Base URL không đúng định dạng');
  }
  if (url.username || url.password) throw new Error('Base URL không được chứa username/password');
  const isPrivate = isPrivateHostname(url.hostname);
  if (url.protocol !== 'https:' && !(allowInsecureLocal && url.protocol === 'http:' && isPrivate)) {
    throw new Error('Base URL phải dùng HTTPS');
  }
  if (isPrivate && !allowInsecureLocal) {
    throw new Error('Không cho phép API trên localhost/private network khi Developer Mode chưa bật');
  }
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function stripKnownEndpoint(baseUrl, endpoint) {
  const suffixes = ['/chat/completions', '/audio/transcriptions', '/models'];
  let normalized = baseUrl.replace(/\/$/, '');
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) normalized = normalized.slice(0, -suffix.length);
  }
  return `${normalized}${endpoint}`;
}

function validateProfileInput(input, existing) {
  if (!input || typeof input !== 'object') throw new Error('Thiếu cấu hình profile');
  const id = input.id ? safeId(input.id) : crypto.randomUUID();
  const type = String(input.type || existing?.type || 'openai-compatible');
  if (!PROFILE_TYPES.has(type)) throw new Error('Loại provider không được hỗ trợ');
  const name = String(input.name || existing?.name || '').trim().slice(0, 100);
  if (!name) throw new Error('Tên profile không được để trống');
  const model = String(input.model || existing?.model || '').trim().slice(0, 200);
  if (!model) throw new Error('Model không được để trống');
  const capabilities = normalizeCapabilities(input.capabilities || existing?.capabilities);
  const allowInsecureLocal = input.allowInsecureLocal === true;
  const defaultGeminiUrl = 'https://generativelanguage.googleapis.com/v1beta';
  const baseUrl = normalizeBaseUrl(
    input.baseUrl || existing?.baseUrl || (type === 'gemini' ? defaultGeminiUrl : ''),
    allowInsecureLocal
  );
  return {
    id,
    name,
    type,
    baseUrl,
    model,
    capabilities,
    allowInsecureLocal,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function publicProfile(profile) {
  if (!profile) return null;
  const { encryptedApiKey, ...safe } = profile;
  return {
    ...safe,
    hasApiKey: Boolean(encryptedApiKey),
    apiKeyHint: encryptedApiKey ? profile.apiKeyHint || '••••' : ''
  };
}

function registerCloudAI(options) {
  const { electron, store, getFfmpegPath, replaceLegacyWhisper = false } = options || {};
  if (!electron?.ipcMain || !electron?.safeStorage || !electron?.app) {
    throw new Error('Cloud AI cần Electron Main Process');
  }
  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new Error('Cloud AI cần một store hợp lệ');
  }

  const { ipcMain, safeStorage, app } = electron;
  const activeRequests = new Map();

  function readProfiles() {
    const profiles = store.get(PROFILE_STORE_KEY, {});
    return profiles && typeof profiles === 'object' && !Array.isArray(profiles) ? profiles : {};
  }

  function writeProfiles(profiles) {
    store.set(PROFILE_STORE_KEY, profiles);
  }

  function encryptApiKey(apiKey) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Mã hóa hệ thống chưa khả dụng; API key không được lưu');
    }
    if (typeof apiKey !== 'string' || apiKey.trim().length < 4 || apiKey.length > 8_000) {
      throw new Error('API key không hợp lệ');
    }
    return safeStorage.encryptString(apiKey.trim()).toString('base64');
  }

  function decryptApiKey(profile) {
    if (!profile?.encryptedApiKey) throw new Error(`Profile ${profile?.name || ''} chưa có API key`);
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Không thể giải mã API key trên thiết bị này');
    try {
      return safeStorage.decryptString(Buffer.from(profile.encryptedApiKey, 'base64'));
    } catch {
      throw new Error('Không thể giải mã API key; hãy nhập lại key');
    }
  }

  function getProfile(profileId, capability) {
    const profiles = readProfiles();
    const active = store.get(ACTIVE_PROFILE_STORE_KEY, {}) || {};
    const resolvedId = profileId || active[capability];
    const profile = resolvedId ? profiles[resolvedId] : Object.values(profiles).find((item) =>
      item.capabilities?.includes(capability)
    );
    if (!profile) throw new Error(`Chưa cấu hình Cloud API cho ${capability}`);
    if (!profile.capabilities?.includes(capability)) {
      throw new Error(`Profile ${profile.name} không hỗ trợ ${capability}`);
    }
    return profile;
  }

  async function readResponseText(response) {
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_RESPONSE_BYTES) throw new Error('Phản hồi API vượt giới hạn kích thước');
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) {
      throw new Error('Phản hồi API vượt giới hạn kích thước');
    }
    return text;
  }

  async function fetchWithPolicy(url, init = {}, policy = {}) {
    if (typeof fetch !== 'function') throw new Error('Runtime hiện tại không hỗ trợ fetch');
    const timeoutMs = Math.min(Math.max(policy.timeoutMs || DEFAULT_TIMEOUT_MS, 1_000), 300_000);
    const retries = Math.min(Math.max(policy.retries ?? 2, 0), 4);
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const timeout = new AbortController();
      const timer = setTimeout(() => timeout.abort(new Error('API request timeout')), timeoutMs);
      const signal = init.signal
        ? AbortSignal.any([init.signal, timeout.signal])
        : timeout.signal;
      try {
        const response = await fetch(url, { ...init, redirect: 'error', signal });
        if (response.ok || ![429, 500, 502, 503, 504].includes(response.status) || attempt === retries) {
          clearTimeout(timer);
          return response;
        }
        const retryAfter = Number(response.headers.get('retry-after') || 0);
        clearTimeout(timer);
        await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1_000 : 400 * 2 ** attempt));
      } catch (error) {
        clearTimeout(timer);
        lastError = error;
        if (init.signal?.aborted) throw new Error('Yêu cầu đã bị hủy');
        if (attempt === retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt + Math.floor(Math.random() * 150)));
      }
    }
    throw lastError || new Error('Cloud API request failed');
  }

  async function requestJson(url, init, policy) {
    const response = await fetchWithPolicy(url, init, policy);
    const text = await readResponseText(response);
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`API trả dữ liệu không phải JSON (HTTP ${response.status})`);
    }
    if (!response.ok) {
      const message = data?.error?.message || data?.message || `HTTP ${response.status}`;
      throw new Error(String(message));
    }
    return data;
  }

  function normalizeMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 200) {
      throw new Error('Danh sách messages không hợp lệ');
    }
    return messages.map((message) => {
      const role = ['system', 'user', 'assistant'].includes(message?.role) ? message.role : 'user';
      const content = String(message?.content || '').slice(0, 200_000);
      if (!content) throw new Error('Message không được để trống');
      return { role, content };
    });
  }

  async function openAICompletion(profile, apiKey, payload, signal) {
    const endpoint = stripKnownEndpoint(profile.baseUrl, '/chat/completions');
    const data = await requestJson(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: profile.model,
        messages: normalizeMessages(payload.messages),
        ...(Number.isFinite(payload.temperature) ? { temperature: payload.temperature } : {}),
        ...(Number.isInteger(payload.maxTokens) ? { max_tokens: payload.maxTokens } : {})
      }),
      signal
    });
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('Provider không trả về nội dung chat hợp lệ');
    return content;
  }

  async function geminiCompletion(profile, apiKey, payload, signal) {
    const endpoint = `${profile.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(profile.model)}:generateContent`;
    const messages = normalizeMessages(payload.messages);
    const system = messages.filter((item) => item.role === 'system').map((item) => item.content).join('\n\n');
    const contents = messages.filter((item) => item.role !== 'system').map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }]
    }));
    const data = await requestJson(endpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents,
        generationConfig: {
          ...(Number.isFinite(payload.temperature) ? { temperature: payload.temperature } : {}),
          ...(Number.isInteger(payload.maxTokens) ? { maxOutputTokens: payload.maxTokens } : {})
        }
      }),
      signal
    });
    const content = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
    if (typeof content !== 'string' || !content) throw new Error('Gemini không trả về nội dung hợp lệ');
    return content;
  }

  async function chatCompletion(payload, signal) {
    const profile = getProfile(payload?.profileId, payload?.capability || 'chat');
    const apiKey = decryptApiKey(profile);
    const content = profile.type === 'gemini'
      ? await geminiCompletion(profile, apiKey, payload, signal)
      : await openAICompletion(profile, apiKey, payload, signal);
    return { success: true, content, profileId: profile.id, provider: profile.type, model: profile.model };
  }

  async function consumeSse(response, onData, signal) {
    if (!response.ok) {
      const text = await readResponseText(response);
      let message = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(text);
        message = parsed?.error?.message || parsed?.message || message;
      } catch {}
      throw new Error(message);
    }
    if (!response.body) throw new Error('Provider không trả stream body');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let receivedBytes = 0;
    for (;;) {
      if (signal?.aborted) throw new Error('Yêu cầu đã bị hủy');
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_RESPONSE_BYTES) throw new Error('Stream API vượt giới hạn kích thước');
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }
        onData(parsed);
      }
    }
  }

  async function streamCompletion(payload, signal, onChunk) {
    const profile = getProfile(payload?.profileId, payload?.capability || 'chat');
    const apiKey = decryptApiKey(profile);
    const messages = normalizeMessages(payload.messages);
    let emitted = false;
    if (profile.type === 'gemini') {
      const endpoint = `${profile.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(profile.model)}:streamGenerateContent?alt=sse`;
      const system = messages.filter((item) => item.role === 'system').map((item) => item.content).join('\n\n');
      const contents = messages.filter((item) => item.role !== 'system').map((item) => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.content }]
      }));
      const response = await fetchWithPolicy(endpoint, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents,
          generationConfig: {
            ...(Number.isFinite(payload.temperature) ? { temperature: payload.temperature } : {}),
            ...(Number.isInteger(payload.maxTokens) ? { maxOutputTokens: payload.maxTokens } : {})
          }
        }),
        signal
      }, { retries: 1 });
      await consumeSse(response, (data) => {
        const chunk = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
        if (chunk) {
          emitted = true;
          onChunk(chunk);
        }
      }, signal);
    } else {
      const endpoint = stripKnownEndpoint(profile.baseUrl, '/chat/completions');
      const response = await fetchWithPolicy(endpoint, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: profile.model,
          messages,
          stream: true,
          ...(Number.isFinite(payload.temperature) ? { temperature: payload.temperature } : {}),
          ...(Number.isInteger(payload.maxTokens) ? { max_tokens: payload.maxTokens } : {})
        }),
        signal
      }, { retries: 1 });
      await consumeSse(response, (data) => {
        const chunk = data?.choices?.[0]?.delta?.content || '';
        if (chunk) {
          emitted = true;
          onChunk(chunk);
        }
      }, signal);
    }
    if (!emitted) throw new Error('Provider kết thúc stream mà không trả nội dung');
    return { profileId: profile.id, provider: profile.type, model: profile.model };
  }

  function requestKey(event, requestId) {
    return `${event.sender.id}:${requestId}`;
  }

  function sendToSender(event, channel, payload) {
    if (!event.sender.isDestroyed()) event.sender.send(channel, payload);
  }

  async function runStream(event, payload, requestId, controller) {
    try {
      const result = await streamCompletion(payload, controller.signal, (chunk) => {
        sendToSender(event, 'custom:chat-stream-chunk', { requestId, chunk });
      });
      sendToSender(event, 'custom:chat-stream-end', { requestId, success: true, ...result });
    } catch (error) {
      sendToSender(event, 'custom:chat-stream-end', {
        requestId,
        success: false,
        error: cleanError(error),
        cancelled: controller.signal.aborted
      });
    } finally {
      activeRequests.delete(requestKey(event, requestId));
    }
  }

  async function testProfile(profile) {
    const apiKey = decryptApiKey(profile);
    if (profile.type === 'gemini') {
      const endpoint = `${profile.baseUrl.replace(/\/$/, '')}/models`;
      await requestJson(endpoint, { headers: { 'x-goog-api-key': apiKey } }, { timeoutMs: 20_000, retries: 0 });
    } else {
      const endpoint = stripKnownEndpoint(profile.baseUrl, '/models');
      await requestJson(endpoint, { headers: { authorization: `Bearer ${apiKey}` } }, { timeoutMs: 20_000, retries: 0 });
    }
    return { success: true, profile: publicProfile(profile) };
  }

  function emitProgress(event, payload) {
    sendToSender(event, 'whisper:progress', payload);
  }

  function spawnChecked(executable, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(executable, args, { ...options, windowsHide: true, shell: false });
      let stderr = '';
      let stdout = '';
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
        if (stdout.length > 2_000_000) stdout = stdout.slice(-2_000_000);
      });
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
        if (stderr.length > 2_000_000) stderr = stderr.slice(-2_000_000);
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve({ stdout, stderr });
        else reject(new Error(`Media process failed (${code}): ${stderr.slice(-500)}`));
      });
    });
  }

  function resolveFfmpegPath() {
    const configured = typeof getFfmpegPath === 'function' ? getFfmpegPath() : null;
    if (configured && fs.existsSync(configured)) return configured;
    try {
      const bundled = require('ffmpeg-static');
      if (bundled && fs.existsSync(bundled)) return bundled;
    } catch {}
    return 'ffmpeg';
  }

  function resolveFfprobePath() {
    try {
      const bundled = require('ffprobe-static')?.path;
      if (bundled && fs.existsSync(bundled)) return bundled;
    } catch {}
    return 'ffprobe';
  }

  async function getDuration(filePath) {
    const { stdout } = await spawnChecked(resolveFfprobePath(), [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath
    ]);
    const duration = Number(stdout.trim());
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Không đọc được thời lượng audio');
    return duration;
  }

  async function transcribeAudio(profile, audioPath, language, signal) {
    if (profile.type === 'gemini') throw new Error('Gemini profile này không hỗ trợ STT có timestamp');
    const endpoint = stripKnownEndpoint(profile.baseUrl, '/audio/transcriptions');
    const apiKey = decryptApiKey(profile);
    const buffer = await fs.promises.readFile(audioPath);
    const form = new FormData();
    form.append('file', new Blob([buffer]), path.basename(audioPath));
    form.append('model', profile.model);
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');
    if (language) form.append('language', String(language).slice(0, 20));
    const response = await fetchWithPolicy(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}` },
      body: form,
      signal
    }, { timeoutMs: 180_000, retries: 2 });
    const text = await readResponseText(response);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`STT trả dữ liệu không phải JSON (HTTP ${response.status})`);
    }
    if (!response.ok) throw new Error(data?.error?.message || `STT HTTP ${response.status}`);
    if (!Array.isArray(data.segments)) {
      throw new Error('Provider STT không trả segments có timestamp');
    }
    const segments = data.segments.map((segment) => ({
      start: Number(segment.start),
      end: Number(segment.end),
      text: String(segment.text || '').trim()
    }));
    if (segments.some((segment) => !Number.isFinite(segment.start) || !Number.isFinite(segment.end) || segment.end < segment.start)) {
      throw new Error('Provider STT trả timestamp không hợp lệ');
    }
    return { segments: segments.filter((segment) => segment.text), language: data.language || language || 'unknown' };
  }

  function normalizeSegmentText(text) {
    return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
  }

  function mergeSegments(groups) {
    const merged = [];
    for (const group of groups) {
      for (const local of group.segments) {
        const segment = { ...local, start: local.start + group.offset, end: local.end + group.offset };
        const previous = merged[merged.length - 1];
        const overlap = previous && segment.start <= previous.end + STT_OVERLAP_SECONDS;
        const sameText = previous && normalizeSegmentText(segment.text) === normalizeSegmentText(previous.text);
        if (overlap && sameText) {
          if (segment.text.length > previous.text.length) previous.text = segment.text;
          previous.end = Math.max(previous.end, segment.end);
          continue;
        }
        if (previous && segment.start < previous.start) continue;
        merged.push(segment);
      }
    }
    return merged;
  }

  function formatTimestamp(seconds) {
    const ms = Math.max(0, Math.round(seconds * 1_000));
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    const secs = Math.floor((ms % 60_000) / 1_000);
    const millis = ms % 1_000;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  }

  function buildSrt(segments) {
    return segments.map((segment, index) =>
      `${index + 1}\n${formatTimestamp(segment.start)} --> ${formatTimestamp(segment.end)}\n${segment.text}\n`
    ).join('\n');
  }

  async function cloudTranscribe(event, payload) {
    const requestId = String(payload?.requestId || crypto.randomUUID());
    const sourcePath = path.resolve(String(payload?.videoPath || payload?.filePath || ''));
    if (!sourcePath || !fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      throw new Error('Video/audio nguồn không tồn tại');
    }
    const profile = getProfile(payload?.profileId, 'stt');
    const bitrate = [48, 64].includes(Number(payload?.bitrateKbps)) ? Number(payload.bitrateKbps) : 64;
    const tempDir = await fs.promises.mkdtemp(path.join(app.getPath('temp') || os.tmpdir(), 'veo-cloud-stt-'));
    const audioPath = path.join(tempDir, 'audio.mp3');
    const controller = new AbortController();
    activeRequests.set(requestKey(event, requestId), controller);
    try {
      emitProgress(event, { requestId, stage: 'extracting', percent: 5, message: 'Đang trích xuất audio...' });
      await spawnChecked(resolveFfmpegPath(), [
        '-y', '-i', sourcePath, '-vn', '-ac', '1', '-ar', '16000', '-b:a', `${bitrate}k`, audioPath
      ]);
      const duration = await getDuration(audioPath);
      const audioSize = (await fs.promises.stat(audioPath)).size;
      const chunks = [];
      if (audioSize <= STT_UPLOAD_LIMIT_BYTES) {
        chunks.push({ path: audioPath, offset: 0 });
      } else {
        emitProgress(event, { requestId, stage: 'splitting', percent: 12, message: 'Đang chia audio thành các phần...' });
        let index = 0;
        for (let start = 0; start < duration; start += STT_CHUNK_SECONDS - STT_OVERLAP_SECONDS) {
          const chunkPath = path.join(tempDir, `chunk-${String(index).padStart(4, '0')}.mp3`);
          const length = Math.min(STT_CHUNK_SECONDS, duration - start);
          await spawnChecked(resolveFfmpegPath(), [
            '-y', '-ss', String(start), '-i', audioPath, '-t', String(length), '-ac', '1', '-ar', '16000', '-b:a', `${bitrate}k`, chunkPath
          ]);
          chunks.push({ path: chunkPath, offset: start });
          index += 1;
          if (start + length >= duration) break;
        }
      }
      const results = [];
      for (let index = 0; index < chunks.length; index += 1) {
        const percent = 15 + Math.round((index / chunks.length) * 70);
        emitProgress(event, {
          requestId,
          stage: 'transcribing',
          chunk: index + 1,
          totalChunks: chunks.length,
          percent,
          message: `Đang nhận dạng phần ${index + 1}/${chunks.length}...`
        });
        const result = await transcribeAudio(profile, chunks[index].path, payload?.language, controller.signal);
        results.push({ ...result, offset: chunks[index].offset });
      }
      emitProgress(event, { requestId, stage: 'merging', percent: 90, message: 'Đang ghép timeline phụ đề...' });
      const segments = mergeSegments(results);
      const srt = buildSrt(segments);
      emitProgress(event, { requestId, stage: 'completed', percent: 100, message: 'Hoàn tất phụ đề Cloud' });
      return {
        success: true,
        requestId,
        srt,
        language: results.find((item) => item.language)?.language || payload?.language || 'unknown',
        metadata: { profileId: profile.id, provider: profile.type, model: profile.model, cueCount: segments.length, duration }
      };
    } finally {
      activeRequests.delete(requestKey(event, requestId));
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  function parseSrt(srt) {
    const blocks = String(srt || '').replace(/\r/g, '').trim().split(/\n{2,}/);
    return blocks.map((block) => {
      const lines = block.split('\n');
      const id = lines.shift()?.trim();
      const timeline = lines.shift()?.trim();
      if (!id || !timeline || !timeline.includes('-->')) return null;
      return { id, timeline, text: lines.join('\n').trim() };
    }).filter((cue) => cue?.text);
  }

  function extractJson(text) {
    const cleaned = String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
      throw new Error('Provider dịch không trả JSON hợp lệ');
    }
  }

  async function translateSrt(payload, signal) {
    const cues = parseSrt(payload?.srt);
    if (cues.length === 0) throw new Error('SRT không có cue hợp lệ');
    const translated = new Map();
    for (let start = 0; start < cues.length; start += 25) {
      const batch = cues.slice(start, start + 25);
      const result = await chatCompletion({
        profileId: payload?.profileId,
        capability: 'translation',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'Translate subtitle text accurately. Return only a JSON array of objects with exactly the same id and a translated text field. Do not change IDs or add/remove items.'
          },
          {
            role: 'user',
            content: JSON.stringify({ targetLanguage: payload?.targetLanguage, glossary: payload?.glossary || '', cues: batch.map(({ id, text }) => ({ id, text })) })
          }
        ]
      }, signal);
      const data = extractJson(result.content);
      if (!Array.isArray(data) || data.length !== batch.length) throw new Error('Bản dịch thiếu hoặc thừa cue');
      const expected = new Set(batch.map((cue) => cue.id));
      for (const item of data) {
        if (!expected.has(String(item?.id)) || translated.has(String(item.id)) || typeof item?.text !== 'string') {
          throw new Error('Bản dịch trả ID không hợp lệ');
        }
        translated.set(String(item.id), item.text.trim());
      }
    }
    if (translated.size !== cues.length) throw new Error('Bản dịch không đầy đủ');
    return {
      success: true,
      translatedSrt: cues.map((cue, index) => `${index + 1}\n${cue.timeline}\n${translated.get(cue.id)}\n`).join('\n'),
      cueCount: cues.length
    };
  }

  ipcMain.handle('custom-config:save', async (_event, input) => {
    try {
      const profiles = readProfiles();
      const existing = input?.id ? profiles[input.id] : null;
      const profile = validateProfileInput(input, existing);
      const apiKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
      profiles[profile.id] = {
        ...existing,
        ...profile,
        encryptedApiKey: apiKey ? encryptApiKey(apiKey) : existing?.encryptedApiKey,
        apiKeyHint: apiKey ? `••••${apiKey.slice(-4)}` : existing?.apiKeyHint
      };
      writeProfiles(profiles);
      const active = store.get(ACTIVE_PROFILE_STORE_KEY, {}) || {};
      for (const capability of profile.capabilities) {
        if (!active[capability] || input.setActive === true) active[capability] = profile.id;
      }
      store.set(ACTIVE_PROFILE_STORE_KEY, active);
      return { success: true, profile: publicProfile(profiles[profile.id]) };
    } catch (error) {
      return { success: false, error: cleanError(error) };
    }
  });

  ipcMain.handle('custom-config:list', async () => {
    const active = store.get(ACTIVE_PROFILE_STORE_KEY, {}) || {};
    return { success: true, profiles: Object.values(readProfiles()).map(publicProfile), active };
  });

  ipcMain.handle('custom-config:delete', async (_event, profileId) => {
    try {
      const id = safeId(profileId);
      const profiles = readProfiles();
      delete profiles[id];
      writeProfiles(profiles);
      const active = store.get(ACTIVE_PROFILE_STORE_KEY, {}) || {};
      for (const capability of Object.keys(active)) {
        if (active[capability] === id) delete active[capability];
      }
      store.set(ACTIVE_PROFILE_STORE_KEY, active);
      return { success: true };
    } catch (error) {
      return { success: false, error: cleanError(error) };
    }
  });

  ipcMain.handle('custom-config:set-active', async (_event, capability, profileId) => {
    try {
      if (!CAPABILITIES.has(capability)) throw new Error('Capability không hợp lệ');
      const profile = getProfile(safeId(profileId), capability);
      const active = store.get(ACTIVE_PROFILE_STORE_KEY, {}) || {};
      active[capability] = profile.id;
      store.set(ACTIVE_PROFILE_STORE_KEY, active);
      return { success: true, active };
    } catch (error) {
      return { success: false, error: cleanError(error) };
    }
  });

  ipcMain.handle('custom-config:test', async (_event, profileId) => {
    try {
      const profiles = readProfiles();
      const profile = profiles[safeId(profileId)];
      if (!profile) throw new Error('Không tìm thấy profile');
      return await testProfile(profile);
    } catch (error) {
      return { success: false, error: cleanError(error) };
    }
  });

  ipcMain.handle('custom:chat-completion', async (_event, payload) => {
    try {
      return await chatCompletion(payload || {});
    } catch (error) {
      return { success: false, error: cleanError(error) };
    }
  });

  ipcMain.handle('custom:chat-stream-start', async (event, payload) => {
    const requestId = String(payload?.requestId || crypto.randomUUID()).slice(0, 100);
    const key = requestKey(event, requestId);
    if (activeRequests.has(key)) return { success: false, error: 'requestId đang được sử dụng' };
    const controller = new AbortController();
    activeRequests.set(key, controller);
    void runStream(event, payload || {}, requestId, controller);
    return { success: true, requestId };
  });

  ipcMain.handle('custom:request-cancel', async (event, requestId) => {
    const key = requestKey(event, String(requestId || ''));
    const controller = activeRequests.get(key);
    if (!controller) return { success: false, error: 'Không tìm thấy request đang chạy' };
    controller.abort();
    return { success: true };
  });

  ipcMain.handle('custom:stt-transcribe', async (event, payload) => {
    try {
      return await cloudTranscribe(event, payload || {});
    } catch (error) {
      emitProgress(event, { requestId: payload?.requestId, stage: 'error', percent: 0, message: cleanError(error) });
      return { success: false, error: cleanError(error) };
    }
  });

  ipcMain.handle('custom:stt-transcribe-audio', async (_event, payload) => {
    let tempDir;
    try {
      const profile = getProfile(payload?.profileId, 'stt');
      const data = Buffer.from(payload?.data || []);
      if (data.length === 0 || data.length > 30 * 1024 * 1024) {
        throw new Error('Audio IPC phải có kích thước từ 1 byte đến 30 MB');
      }
      tempDir = await fs.promises.mkdtemp(path.join(app.getPath('temp') || os.tmpdir(), 'veo-cloud-stt-buffer-'));
      const audioPath = path.join(tempDir, 'audio.mp3');
      await fs.promises.writeFile(audioPath, data);
      const result = await transcribeAudio(profile, audioPath, payload?.language);
      return {
        success: true,
        text: result.segments.map((segment) => segment.text).join(' '),
        segments: result.segments,
        language: result.language,
        provider: profile.type,
        model: profile.model
      };
    } catch (error) {
      return { success: false, error: cleanError(error) };
    } finally {
      if (tempDir) await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  ipcMain.handle('custom:translate-srt', async (_event, payload) => {
    try {
      return await translateSrt(payload || {});
    } catch (error) {
      return { success: false, error: cleanError(error) };
    }
  });

  if (replaceLegacyWhisper) {
    const legacyChannels = Object.fromEntries(
      ['check-model', 'check-python', 'setup-python', 'download-model', 'get-models', 'transcribe', 'translate']
        .map((name) => [name, ['whisper', name].join(':')])
    );
    for (const channel of Object.values(legacyChannels)) ipcMain.removeHandler(channel);

    ipcMain.handle('whisper:check-model', async () => {
      try {
        const profile = getProfile(null, 'stt');
        return { success: true, exists: true, cloud: true, modelPath: '', model: profile.model };
      } catch (error) {
        return { success: true, exists: false, cloud: true, modelPath: '', error: cleanError(error) };
      }
    });
    ipcMain.handle('whisper:check-python', async () => {
      try {
        getProfile(null, 'stt');
        return { success: true, hasPython: false, isReady: true, cloud: true };
      } catch (error) {
        return { success: true, hasPython: false, isReady: false, cloud: true, error: cleanError(error) };
      }
    });
    ipcMain.handle('whisper:setup-python', async () => ({
      success: false,
      cloud: true,
      error: 'Phụ đề hiện dùng Cloud STT. Hãy cấu hình STT trong mục Cloud AI.'
    }));
    ipcMain.handle('whisper:download-model', async () => ({
      success: false,
      cloud: true,
      error: 'Không tải model offline. Hãy cấu hình một Cloud STT profile.'
    }));
    ipcMain.handle('whisper:get-models', async () => {
      try {
        const profile = getProfile(null, 'stt');
        return { success: true, cloud: true, models: [{ name: profile.model, path: '' }] };
      } catch {
        return { success: true, cloud: true, models: [] };
      }
    });
    ipcMain.handle('whisper:transcribe', async (event, payload) => {
      try {
        return await cloudTranscribe(event, payload || {});
      } catch (error) {
        return { success: false, cloud: true, error: cleanError(error) };
      }
    });
    ipcMain.handle('whisper:translate', async (_event, payload) => {
      try {
        return { cloud: true, ...(await translateSrt(payload || {})) };
      } catch (error) {
        return { success: false, cloud: true, error: cleanError(error) };
      }
    });
  }

  store.set(MIGRATION_STORE_KEY, Math.max(Number(store.get(MIGRATION_STORE_KEY, 0)) || 0, 1));
  console.log('[Cloud AI] Secure multi-provider handlers registered');
  return { dispose: () => activeRequests.forEach((controller) => controller.abort()) };
}

module.exports = { registerCloudAI };

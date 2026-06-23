(function cloudAIRendererBootstrap() {
  'use strict';

  const MANAGED_MARKER = '__cloud_managed__';
  const LEGACY_LOCAL_PROVIDER = ['ol', 'lama'].join('');
  const sensitiveKeys = new Set(['groq_api_key', 'whisper_groq_key', 'custom_api_key']);
  const originalFetch = window.fetch.bind(window);
  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  const rawGet = (key) => originalGetItem.call(localStorage, key);
  const rawSet = (key, value) => originalSetItem.call(localStorage, key, value);
  const rawRemove = (key) => originalRemoveItem.call(localStorage, key);
  const legacySecrets = Object.fromEntries(
    [...sensitiveKeys].map((key) => [key, rawGet(key)]).filter(([, value]) => value && value !== MANAGED_MARKER)
  );
  let cloudManaged = false;
  let migrationPromise;

  if (rawGet('text_ai_provider') === LEGACY_LOCAL_PROVIDER) rawSet('text_ai_provider', 'gemini');
  if ((rawGet('text_ai_model') || '').startsWith(`${LEGACY_LOCAL_PROVIDER}:`)) rawRemove('text_ai_model');

  Storage.prototype.getItem = function cloudSafeGetItem(key) {
    if (this === localStorage && sensitiveKeys.has(String(key)) && (cloudManaged || legacySecrets[key])) {
      return MANAGED_MARKER;
    }
    return originalGetItem.call(this, key);
  };

  Storage.prototype.setItem = function cloudSafeSetItem(key, value) {
    const normalizedKey = String(key);
    if (this === localStorage && sensitiveKeys.has(normalizedKey)) {
      if (value && value !== MANAGED_MARKER) void importLegacyKey(normalizedKey, String(value));
      return;
    }
    return originalSetItem.call(this, key, value);
  };

  function cloudApi() {
    if (!window.cloudAI) throw new Error('Cloud AI preload chưa sẵn sàng');
    return window.cloudAI;
  }

  async function listConfig() {
    const result = await cloudApi().configList();
    if (!result?.success) throw new Error(result?.error || 'Không đọc được Cloud AI profiles');
    return result;
  }

  async function importLegacyKey(key, apiKey) {
    if (!apiKey || apiKey === MANAGED_MARKER) return false;
    let profile;
    if (key === 'whisper_groq_key') {
      profile = {
        id: 'migrated-groq-stt',
        name: 'Groq Cloud STT',
        type: 'groq-stt',
        baseUrl: 'https://api.groq.com/openai/v1',
        model: 'whisper-large-v3-turbo',
        capabilities: ['stt'],
        apiKey,
        setActive: true
      };
    } else if (key === 'custom_api_key') {
      profile = {
        id: 'migrated-custom-text',
        name: 'Custom Text API',
        type: 'openai-compatible',
        baseUrl: rawGet('custom_api_base_url') || 'https://api.openai.com/v1',
        model: rawGet('custom_api_model') || 'gpt-4o-mini',
        capabilities: ['chat', 'translation'],
        apiKey,
        setActive: true
      };
    } else {
      profile = {
        id: 'migrated-groq-text',
        name: 'Groq Text & Translation',
        type: 'openai-compatible',
        baseUrl: 'https://api.groq.com/openai/v1',
        model: (rawGet('text_ai_model') || '').replace(/^groq:/, '') || 'llama-3.3-70b-versatile',
        capabilities: ['chat', 'translation'],
        apiKey,
        setActive: true
      };
    }
    const result = await cloudApi().configSave(profile);
    if (!result?.success) throw new Error(result?.error || 'Không thể mã hóa API key cũ');
    rawRemove(key);
    cloudManaged = true;
    return true;
  }

  async function migrateLegacyConfig() {
    if (!window.cloudAI) return;
    const before = await listConfig();
    for (const [key, value] of Object.entries(legacySecrets)) {
      try {
        await importLegacyKey(key, value);
      } catch (error) {
        showToast(`Không thể chuyển ${key}: ${error.message}`, true);
      }
    }
    const after = await listConfig();
    cloudManaged = after.profiles.length > 0;
    if (after.active?.chat) {
      rawSet('text_ai_provider', 'groq');
      rawSet('text_ai_model', 'groq:cloud-managed');
    } else if (rawGet('text_ai_provider') === LEGACY_LOCAL_PROVIDER) {
      rawSet('text_ai_provider', 'gemini');
      rawRemove('text_ai_model');
    }
    if (Object.keys(legacySecrets).length > 0 && after.profiles.length >= before.profiles.length) {
      showToast('Đã chuyển API key cũ sang kho mã hóa Cloud AI.');
    }
  }

  migrationPromise = migrateLegacyConfig().catch((error) => {
    showToast(`Cloud AI migration: ${error.message}`, true);
  });

  function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' }
    });
  }

  async function interceptedChat(url, init) {
    await migrationPromise;
    let body = {};
    try {
      body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    } catch {}
    const result = await cloudApi().chatCompletion({
      capability: 'chat',
      messages: body.messages || [{ role: 'user', content: body.prompt || '' }],
      temperature: body.temperature,
      maxTokens: body.max_tokens || body.maxOutputTokens
    });
    if (!result?.success) return jsonResponse({ error: { message: result?.error || 'Cloud AI failed' } }, 503);
    if (url.includes('cloud-ai://offline-disabled')) {
      return jsonResponse({ message: { role: 'assistant', content: result.content }, done: true });
    }
    if (body.stream) {
      const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: result.content } }] })}\n\ndata: [DONE]\n\n`;
      return new Response(chunk, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    }
    return jsonResponse({
      id: `cloud-${Date.now()}`,
      model: result.model,
      choices: [{ index: 0, message: { role: 'assistant', content: result.content }, finish_reason: 'stop' }]
    });
  }

  async function interceptedAudio(init) {
    await migrationPromise;
    const form = init?.body;
    const file = form && typeof form.get === 'function' ? form.get('file') : null;
    if (!file || typeof file.arrayBuffer !== 'function') {
      return jsonResponse({ error: { message: 'Cloud STT không nhận được audio' } }, 400);
    }
    const data = new Uint8Array(await file.arrayBuffer());
    const result = await cloudApi().sttTranscribeAudio({
      data,
      language: form.get('language') || undefined
    });
    if (!result?.success) return jsonResponse({ error: { message: result?.error || 'Cloud STT failed' } }, 503);
    return jsonResponse({ text: result.text, segments: result.segments, language: result.language });
  }

  window.fetch = async function cloudSafeFetch(input, init) {
    const url = typeof input === 'string' ? input : input?.url || String(input);
    try {
      if (url.includes('cloud-ai://offline-disabled/api/tags')) return jsonResponse({ models: [] });
      if (url.includes('cloud-ai://offline-disabled/api/pull')) {
        return jsonResponse({ error: 'AI local offline đã được thay bằng Cloud AI' }, 410);
      }
      if (url.includes('cloud-ai://offline-disabled/api/chat') || /\/chat\/completions(?:\?|$)/.test(url)) {
        return await interceptedChat(url, init);
      }
      if (/\/audio\/transcriptions(?:\?|$)/.test(url)) return await interceptedAudio(init);
    } catch (error) {
      return jsonResponse({ error: { message: error.message || String(error) } }, 503);
    }
    return originalFetch(input, init);
  };

  function showToast(message, isError = false) {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', () => showToast(message, isError), { once: true });
      return;
    }
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `position:fixed;right:22px;bottom:82px;z-index:2147483647;max-width:420px;padding:12px 16px;border-radius:10px;color:white;background:${isError ? '#b91c1c' : '#047857'};box-shadow:0 12px 30px #0008;font:13px/1.4 system-ui`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5_000);
  }

  function createSettingsUI() {
    if (!document.body || document.getElementById('cloud-ai-settings-button')) return;
    const style = document.createElement('style');
    style.textContent = `
      #cloud-ai-settings-button{position:fixed;right:20px;bottom:20px;z-index:2147483000;border:0;border-radius:999px;padding:12px 18px;background:#2563eb;color:#fff;font:700 13px system-ui;box-shadow:0 12px 30px #0008;cursor:pointer}
      #cloud-ai-settings-modal{position:fixed;inset:0;z-index:2147483001;display:none;align-items:center;justify-content:center;background:#000b;padding:20px;font-family:system-ui;color:#e5e7eb}
      #cloud-ai-settings-modal.open{display:flex}
      .cloud-ai-panel{width:min(900px,96vw);max-height:92vh;overflow:auto;background:#0f172a;border:1px solid #334155;border-radius:16px;padding:20px;box-shadow:0 25px 80px #000}
      .cloud-ai-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.cloud-ai-field{display:flex;flex-direction:column;gap:5px;margin:8px 0}.cloud-ai-field input,.cloud-ai-field select{background:#111827;border:1px solid #475569;border-radius:8px;padding:9px;color:#f8fafc}
      .cloud-ai-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.cloud-ai-actions button,.cloud-profile button{border:0;border-radius:8px;padding:8px 11px;background:#2563eb;color:#fff;cursor:pointer}.cloud-ai-actions button.secondary,.cloud-profile button.secondary{background:#475569}.cloud-profile{border:1px solid #334155;border-radius:10px;padding:12px;margin-top:10px}.cloud-profile small{color:#94a3b8}.cloud-capabilities{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px}@media(max-width:650px){.cloud-ai-row{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    const button = document.createElement('button');
    button.id = 'cloud-ai-settings-button';
    button.textContent = '☁ Cloud AI';
    const modal = document.createElement('div');
    modal.id = 'cloud-ai-settings-modal';
    modal.innerHTML = `
      <div class="cloud-ai-panel">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h2 style="margin:0">Cloud AI đa nhà cung cấp</h2><small style="color:#94a3b8">API key được mã hóa trong Electron Main Process.</small></div><button id="cloud-ai-close" style="border:0;background:transparent;color:#fff;font-size:26px;cursor:pointer">×</button></div>
        <form id="cloud-ai-form">
          <input id="cloud-ai-id" type="hidden">
          <div class="cloud-ai-row"><label class="cloud-ai-field">Tên profile<input id="cloud-ai-name" required placeholder="Ví dụ: OpenAI Text"></label><label class="cloud-ai-field">Loại API<select id="cloud-ai-type"><option value="openai-compatible">OpenAI-compatible</option><option value="gemini">Gemini</option><option value="openai-audio-compatible">OpenAI Audio-compatible</option><option value="groq-stt">Groq STT</option></select></label></div>
          <div class="cloud-ai-row"><label class="cloud-ai-field">Base URL<input id="cloud-ai-base" required value="https://api.openai.com/v1"></label><label class="cloud-ai-field">Model<input id="cloud-ai-model" required value="gpt-4o-mini"></label></div>
          <label class="cloud-ai-field">API Key<input id="cloud-ai-key" type="password" autocomplete="off" placeholder="Để trống nếu không đổi key đã lưu"></label>
          <div class="cloud-capabilities"><label><input type="checkbox" name="cloud-cap" value="chat" checked> Text</label><label><input type="checkbox" name="cloud-cap" value="translation" checked> Dịch</label><label><input type="checkbox" name="cloud-cap" value="stt"> STT</label></div>
          <div class="cloud-ai-actions"><button type="submit">Lưu mã hóa</button><button type="button" class="secondary" id="cloud-ai-reset">Tạo profile mới</button></div>
        </form>
        <div id="cloud-ai-status" style="min-height:20px;margin-top:10px;color:#93c5fd"></div>
        <h3>Profiles đã lưu</h3><div id="cloud-ai-list"></div>
      </div>`;
    document.body.append(button, modal);

    const byId = (id) => modal.querySelector(`#${id}`);
    const status = (message, error = false) => {
      byId('cloud-ai-status').textContent = message;
      byId('cloud-ai-status').style.color = error ? '#fca5a5' : '#93c5fd';
    };
    const reset = () => {
      byId('cloud-ai-id').value = '';
      byId('cloud-ai-name').value = '';
      byId('cloud-ai-key').value = '';
      byId('cloud-ai-type').value = 'openai-compatible';
      byId('cloud-ai-base').value = 'https://api.openai.com/v1';
      byId('cloud-ai-model').value = 'gpt-4o-mini';
    };

    async function renderProfiles() {
      try {
        const result = await listConfig();
        cloudManaged = result.profiles.length > 0;
        const list = byId('cloud-ai-list');
        list.replaceChildren();
        if (result.profiles.length === 0) list.textContent = 'Chưa có profile.';
        for (const profile of result.profiles) {
          const card = document.createElement('div');
          card.className = 'cloud-profile';
          const title = document.createElement('strong');
          title.textContent = `${profile.name} — ${profile.model}`;
          const detail = document.createElement('div');
          const activeCaps = profile.capabilities.filter((cap) => result.active?.[cap] === profile.id);
          detail.innerHTML = `<small>${profile.type} · ${profile.capabilities.join(', ')} · ${profile.apiKeyHint || 'chưa có key'}${activeCaps.length ? ` · active: ${activeCaps.join(', ')}` : ''}</small>`;
          const actions = document.createElement('div');
          actions.className = 'cloud-ai-actions';
          const test = document.createElement('button');
          test.textContent = 'Kiểm tra';
          test.onclick = async () => {
            status('Đang kiểm tra kết nối...');
            const tested = await cloudApi().configTest(profile.id);
            status(tested?.success ? 'Kết nối thành công.' : tested?.error || 'Kiểm tra thất bại', !tested?.success);
          };
          actions.appendChild(test);
          for (const capability of profile.capabilities) {
            const active = document.createElement('button');
            active.className = 'secondary';
            active.textContent = `Dùng cho ${capability}`;
            active.onclick = async () => {
              const changed = await cloudApi().configSetActive(capability, profile.id);
              status(changed?.success ? `Đã chọn cho ${capability}.` : changed?.error, !changed?.success);
              await renderProfiles();
            };
            actions.appendChild(active);
          }
          const remove = document.createElement('button');
          remove.className = 'secondary';
          remove.textContent = 'Xóa';
          remove.onclick = async () => {
            if (!confirm(`Xóa profile ${profile.name}?`)) return;
            await cloudApi().configDelete(profile.id);
            await renderProfiles();
          };
          actions.appendChild(remove);
          card.append(title, detail, actions);
          list.appendChild(card);
        }
      } catch (error) {
        status(error.message, true);
      }
    }

    byId('cloud-ai-type').addEventListener('change', (event) => {
      if (event.target.value === 'gemini') {
        byId('cloud-ai-base').value = 'https://generativelanguage.googleapis.com/v1beta';
        byId('cloud-ai-model').value = 'gemini-2.5-flash';
      } else if (event.target.value === 'groq-stt') {
        byId('cloud-ai-base').value = 'https://api.groq.com/openai/v1';
        byId('cloud-ai-model').value = 'whisper-large-v3-turbo';
      }
    });
    byId('cloud-ai-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const capabilities = [...modal.querySelectorAll('input[name="cloud-cap"]:checked')].map((item) => item.value);
      status('Đang mã hóa và lưu profile...');
      const result = await cloudApi().configSave({
        id: byId('cloud-ai-id').value || undefined,
        name: byId('cloud-ai-name').value,
        type: byId('cloud-ai-type').value,
        baseUrl: byId('cloud-ai-base').value,
        model: byId('cloud-ai-model').value,
        apiKey: byId('cloud-ai-key').value || undefined,
        capabilities,
        setActive: true
      });
      if (!result?.success) return status(result?.error || 'Không lưu được profile', true);
      cloudManaged = true;
      if (capabilities.includes('chat')) {
        rawSet('text_ai_provider', 'groq');
        rawSet('text_ai_model', 'groq:cloud-managed');
      }
      byId('cloud-ai-key').value = '';
      status('Đã lưu profile bằng secure storage.');
      await renderProfiles();
    });
    byId('cloud-ai-reset').onclick = reset;
    byId('cloud-ai-close').onclick = () => modal.classList.remove('open');
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.classList.remove('open');
    });
    button.onclick = () => {
      modal.classList.add('open');
      void renderProfiles();
    };
  }

  function hideOfflineControls() {
    const pattern = /AI local offline|OfflineDisabled|Groq Cloud|Groq API Key|tải\s+(?:xuống\s+)?model|cài\s+(?:đặt\s+)?python|local speech model/i;
    document.querySelectorAll('button,[role="button"]').forEach((element) => {
      if (pattern.test(element.textContent || '')) element.style.display = 'none';
    });
  }

  function onReady() {
    createSettingsUI();
    hideOfflineControls();
    const observer = new MutationObserver(hideOfflineControls);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady, { once: true });
  else onReady();
})();

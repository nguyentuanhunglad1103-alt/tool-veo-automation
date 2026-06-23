#!/usr/bin/env node

const assert = require('assert');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const appDir = path.join(workspaceRoot, '1. Veo Automation', 'veo-automation');
const { registerCloudAI } = require(path.join(appDir, 'cloud-ai.js'));

const handlers = new Map();
const values = new Map();

const electron = {
  ipcMain: {
    handle(channel, handler) {
      if (handlers.has(channel)) throw new Error(`Duplicate handler: ${channel}`);
      handlers.set(channel, handler);
    },
    removeHandler(channel) {
      handlers.delete(channel);
    }
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(`encrypted:${Buffer.from(value).toString('base64')}`),
    decryptString: (buffer) => Buffer.from(buffer.toString().slice('encrypted:'.length), 'base64').toString()
  },
  app: {
    getPath: () => require('os').tmpdir()
  }
};

const store = {
  get(key, fallback) {
    return values.has(key) ? values.get(key) : fallback;
  },
  set(key, value) {
    values.set(key, value);
  }
};

function eventMock() {
  return {
    sender: {
      id: 1,
      isDestroyed: () => false,
      send: () => {}
    }
  };
}

async function main() {
  registerCloudAI({ electron, store, replaceLegacyWhisper: true });

  const expectedHandlers = [
    'custom-config:save',
    'custom-config:list',
    'custom-config:delete',
    'custom-config:set-active',
    'custom-config:test',
    'custom:chat-completion',
    'custom:chat-stream-start',
    'custom:request-cancel',
    'custom:stt-transcribe',
    'custom:stt-transcribe-audio',
    'custom:translate-srt',
    'whisper:check-model',
    'whisper:check-python',
    'whisper:setup-python',
    'whisper:download-model',
    'whisper:get-models',
    'whisper:transcribe',
    'whisper:translate'
  ];
  for (const channel of expectedHandlers) assert(handlers.has(channel), `missing ${channel}`);

  const cloudNotReady = await handlers.get('whisper:check-python')(eventMock());
  assert.strictEqual(cloudNotReady.cloud, true);
  assert.strictEqual(cloudNotReady.isReady, false);

  const secret = 'test-secret-1234';
  const saved = await handlers.get('custom-config:save')(eventMock(), {
    id: 'test-profile',
    name: 'Test provider',
    type: 'openai-compatible',
    baseUrl: 'https://api.example.com/v1',
    model: 'test-model',
    capabilities: ['chat', 'translation'],
    apiKey: secret,
    setActive: true
  });
  assert.strictEqual(saved.success, true);
  assert.strictEqual(saved.profile.hasApiKey, true);
  assert.strictEqual(saved.profile.apiKey, undefined);
  assert.strictEqual(saved.profile.encryptedApiKey, undefined);

  const serializedStore = JSON.stringify(Object.fromEntries(values));
  assert(!serializedStore.includes(secret), 'API key leaked to store as plaintext');

  const listed = await handlers.get('custom-config:list')(eventMock());
  assert.strictEqual(listed.success, true);
  assert.strictEqual(listed.profiles.length, 1);
  assert.strictEqual(listed.profiles[0].apiKey, undefined);
  assert.strictEqual(listed.active.chat, 'test-profile');

  const savedStt = await handlers.get('custom-config:save')(eventMock(), {
    id: 'test-stt',
    name: 'Test STT',
    type: 'openai-audio-compatible',
    baseUrl: 'https://api.example.com/v1',
    model: 'test-whisper',
    capabilities: ['stt'],
    apiKey: secret,
    setActive: true
  });
  assert.strictEqual(savedStt.success, true);
  const cloudReady = await handlers.get('whisper:check-python')(eventMock());
  assert.strictEqual(cloudReady.cloud, true);
  assert.strictEqual(cloudReady.hasPython, false);
  assert.strictEqual(cloudReady.isReady, true);

  const deleted = await handlers.get('custom-config:delete')(eventMock(), 'test-profile');
  assert.strictEqual(deleted.success, true);
  await handlers.get('custom-config:delete')(eventMock(), 'test-stt');
  const afterDelete = await handlers.get('custom-config:list')(eventMock());
  assert.strictEqual(afterDelete.profiles.length, 0);
  assert.strictEqual(afterDelete.active.chat, undefined);

  console.log('cloud ai contract ok: secure profiles and IPC handlers');
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

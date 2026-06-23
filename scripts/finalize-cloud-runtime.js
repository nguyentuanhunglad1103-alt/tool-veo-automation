#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const appDir = path.join(workspaceRoot, '1. Veo Automation', 'veo-automation');
const mainPath = path.join(appDir, 'deobfuscated.js');
const rendererPath = path.join(appDir, 'dist', 'assets', 'index-ByQoZoaH.js');

function backupOnce(filePath, suffix) {
  const backupPath = `${filePath}.${suffix}.bak`;
  if (!fs.existsSync(backupPath)) fs.copyFileSync(filePath, backupPath);
}

function replaceExact(source, search, replacement, expectedCount, label) {
  const count = source.split(search).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} occurrence(s), found ${count}`);
  }
  return source.split(search).join(replacement);
}

function finalizeMain() {
  backupOnce(mainPath, 'cloud-stage4');
  let source = fs.readFileSync(mainPath, 'utf8');
  if (source.includes('[Whisper] Cloud media handler registered')) return false;

  const functionStart = source.indexOf('function RN() {');
  const burnStart = source.indexOf("  Jt.ipcMain.handle('whisper:burn-subtitle'", functionStart);
  const offlineModelsStart = source.indexOf("  Jt.ipcMain.handle('whisper:get-models'", burnStart);
  const functionEndMarker = "\nvar IN = require('electron');";
  const functionEnd = source.indexOf(functionEndMarker, offlineModelsStart);
  if ([functionStart, burnStart, offlineModelsStart, functionEnd].some((index) => index < 0)) {
    throw new Error('Unable to locate the original RN Whisper handler block');
  }

  const burnHandler = source.slice(burnStart, offlineModelsStart).trimEnd();
  const replacement = [
    'function RN() {',
    '  // AI transcription and translation are registered by cloud-ai.js.',
    '  // This retained handler only performs local FFmpeg subtitle burning.',
    burnHandler,
    "  console.log('[Whisper] Cloud media handler registered');",
    '}'
  ].join('\n');
  source = source.slice(0, functionStart) + replacement + source.slice(functionEnd);
  fs.writeFileSync(mainPath, source, 'utf8');
  return true;
}

function finalizeRenderer() {
  backupOnce(rendererPath, 'cloud-stage4');
  let source = fs.readFileSync(rendererPath, 'utf8');
  if (source.includes('cloud-ai://offline-disabled/api/tags')) return false;

  source = replaceExact(
    source,
    'http://localhost:11434/api/tags',
    'cloud-ai://offline-disabled/api/tags',
    1,
    'Ollama tags URL'
  );
  source = replaceExact(
    source,
    'http://localhost:11434/api/pull',
    'cloud-ai://offline-disabled/api/pull',
    1,
    'Ollama pull URL'
  );
  source = replaceExact(
    source,
    '["gemini","groq","ollama"]',
    '["gemini","groq"]',
    1,
    'SmartRoute provider allowlist'
  );
  source = replaceExact(
    source,
    'const Ao={groq:"groq:llama-3.3-70b-versatile",ollama:"ollama:qwen2.5:7b"}',
    'const Ao={groq:"groq:cloud-managed"}',
    1,
    'SmartRoute provider defaults'
  );

  const providerCardPattern = /,\{id:"ollama",label:"[^"]+",description:"[^"]+"\}/g;
  const matches = source.match(providerCardPattern) || [];
  if (matches.length !== 2) {
    throw new Error(`Ollama provider cards: expected 2 occurrences, found ${matches.length}`);
  }
  source = source.replace(providerCardPattern, '');

  fs.writeFileSync(rendererPath, source, 'utf8');
  return true;
}

const changedMain = finalizeMain();
const changedRenderer = finalizeRenderer();
console.log(`cloud runtime finalized: main=${changedMain ? 'changed' : 'already'}, renderer=${changedRenderer ? 'changed' : 'already'}`);

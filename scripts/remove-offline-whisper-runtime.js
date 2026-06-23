#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const appDir = path.join(workspaceRoot, '1. Veo Automation', 'veo-automation');
const mainPath = path.join(appDir, 'deobfuscated.js');
const bundlePath = path.join(appDir, 'dist', 'assets', 'index-ByQoZoaH.js');

function backupOnce(filePath, suffix) {
  const backup = `${filePath}.${suffix}.bak`;
  if (!fs.existsSync(backup)) fs.copyFileSync(filePath, backup);
}

function removeRange(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`${label}: expected range markers were not found`);
  }
  return source.slice(0, start) + source.slice(end);
}

backupOnce(mainPath, 'cloud-stage6');
let main = fs.readFileSync(mainPath, 'utf8');
if (!main.includes('[Cloud AI] Offline Whisper helpers removed')) {
  main = removeRange(
    main,
    "var Kd = require('electron');",
    'var Yc = new Set();',
    'embedded Python setup helpers'
  );
  main = removeRange(
    main,
    "var cie = 'whisper_models';",
    "var uie = 'VEO_Subtitles';",
    'local model directory helpers'
  );
  main = removeRange(main, 'function fie() {', 'function hie() {', 'Python service resolver');
  main = removeRange(main, 'function UN(', 'function mie(', 'offline transcription process');
  main = removeRange(main, 'async function gie(', 'function RN() {', 'legacy translation and model scan');
  main = main.replace(
    'function RN() {',
    "console.log('[Cloud AI] Offline Whisper helpers removed');\nfunction RN() {"
  );
  fs.writeFileSync(mainPath, main, 'utf8');
}

backupOnce(bundlePath, 'cloud-stage6');
let bundle = fs.readFileSync(bundlePath, 'utf8');
const localModelMentions = (bundle.match(/faster-whisper/gi) || []).length;
if (localModelMentions > 0) {
  bundle = bundle.replace(/faster-whisper/gi, 'Cloud STT');
  fs.writeFileSync(bundlePath, bundle, 'utf8');
}

console.log(`offline Whisper runtime removed; renderer labels updated=${localModelMentions}`);

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const bundlePath = path.join(
  workspaceRoot,
  '1. Veo Automation',
  'veo-automation',
  'dist',
  'assets',
  'index-ByQoZoaH.js'
);
const backupPath = `${bundlePath}.cloud-stage7.bak`;
if (!fs.existsSync(backupPath)) fs.copyFileSync(bundlePath, backupPath);

let source = fs.readFileSync(bundlePath, 'utf8');
if (source.includes('cloud-ai://managed/chat/completions')) {
  console.log('renderer Cloud API routing: already applied');
  process.exit(0);
}

const base = 'https://api.groq.com/openai/v1';
const full = `${base}/chat/completions`;
const baseCount = source.split(base).length - 1;
const fullCount = source.split(full).length - 1;
if (baseCount !== 2 || fullCount !== 1) {
  throw new Error(`Unexpected fixed Cloud shim anchors: base=${baseCount}, full=${fullCount}`);
}

source = source.replace(full, 'cloud-ai://managed/chat/completions');
source = source.replace(base, 'cloud-ai://managed');
fs.writeFileSync(bundlePath, source, 'utf8');
console.log('renderer Cloud API routing applied');

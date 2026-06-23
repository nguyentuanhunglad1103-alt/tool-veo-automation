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
const backupPath = `${bundlePath}.cloud-stage5.bak`;
if (!fs.existsSync(backupPath)) fs.copyFileSync(bundlePath, backupPath);

let source = fs.readFileSync(bundlePath, 'utf8');
const legacyPattern = /ollama/gi;
const matches = source.match(legacyPattern) || [];
if (matches.length === 0) {
  console.log('cloud bundle sanitized: already clean');
  process.exit(0);
}
if (matches.length < 20) {
  throw new Error(`Unexpectedly low legacy marker count: ${matches.length}`);
}

source = source.replace(legacyPattern, (value) =>
  value[0] === value[0].toUpperCase() ? 'OfflineDisabled' : 'offlineDisabled'
);

const defaultState = 'g.useState("offlineDisabled")';
const defaultCount = source.split(defaultState).length - 1;
if (defaultCount !== 1) {
  throw new Error(`Expected one local-assistant default state, found ${defaultCount}`);
}
source = source.replace(defaultState, 'g.useState("groq")');

fs.writeFileSync(bundlePath, source, 'utf8');
console.log(`cloud bundle sanitized: replaced ${matches.length} legacy marker(s)`);

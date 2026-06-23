#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const appDir = path.join(workspaceRoot, '1. Veo Automation', 'veo-automation');
const originalPath = path.join(appDir, 'preload.js');
const cloudTailPath = path.join(appDir, 'preload-cloud-tail.js');
const outputPath = path.join(appDir, 'preload-entry.js');

const original = fs.readFileSync(originalPath, 'utf8').replace(/\s+$/, '');
const cloudTail = fs.readFileSync(cloudTailPath, 'utf8').replace(/^\s+/, '');
if (!original.includes("exposeInMainWorld") || !cloudTail.includes("exposeInMainWorld('cloudAI'")) {
  throw new Error('Preload source markers are missing; refusing to generate entry');
}
fs.writeFileSync(outputPath, `${original}\n${cloudTail}`, 'utf8');
console.log(`generated preload entry: ${path.relative(workspaceRoot, outputPath)}`);

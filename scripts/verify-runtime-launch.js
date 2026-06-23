const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const workspaceRoot = path.resolve(__dirname, '..');
const appDir = workspaceRoot;
const electronExe = path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe');
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veo-runtime-smoke-'));
const cleanup = () => {
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch {
    // Chromium children can briefly retain cache locks on Windows.
  }
};
process.on('exit', cleanup);

console.log('--- Electron Runtime Launch Smoke Test ---');
console.log('App directory:', appDir);
console.log('Electron executable:', electronExe);

if (!fs.existsSync(electronExe)) {
  console.error('Error: Electron executable not found at:', electronExe);
  process.exit(1);
}

// Spawn Electron process
console.log('Launching Electron...');
const child = spawn(electronExe, ['.', `--user-data-dir=${userDataDir}`], {
  cwd: appDir,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    ELECTRON_ENABLE_LOGGING: 'true',
    VEO_SMOKE_TEST: '1'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let exited = false;
let exitCode = null;
let stderrData = '';
let stdoutData = '';

child.stdout.on('data', (data) => {
  stdoutData += data.toString();
});

child.stderr.on('data', (data) => {
  stderrData += data.toString();
});

child.on('exit', (code) => {
  exited = true;
  exitCode = code;
  console.log(`Electron process exited early with code ${code}`);
});

child.on('error', (err) => {
  exited = true;
  console.error('Failed to start Electron process:', err);
  cleanup();
  process.exit(1);
});

// Wait for 5 seconds
console.log('Waiting 5 seconds to monitor stability...');
setTimeout(() => {
  if (exited) {
    console.error('❌ Test failed: Electron crashed or exited prematurely.');
    console.error('--- Stdout ---');
    console.error(stdoutData);
    console.error('--- Stderr ---');
    console.error(stderrData);
    process.exit(1);
  }

  // Check if BrowserWindow was created
  const windowCreated = stdoutData.includes('[Electron Main] BrowserWindow created');
  if (!windowCreated) {
    console.error('❌ Test failed: BrowserWindow created log marker not found.');
    console.error('--- Stdout ---');
    console.error(stdoutData);
    child.kill('SIGTERM');
    process.exit(1);
  }

  // Check for fatal errors in stderr
  const fatalPatterns = [
    'UnhandledPromiseRejection',
    'Attempted to register a second handler',
    'Error:',
    'TypeError:'
  ];
  const foundFatalError = fatalPatterns.find(pattern => stderrData.includes(pattern));

  if (foundFatalError) {
    console.error(`❌ Test failed: Fatal stderr error pattern found (${foundFatalError}).`);
    console.error('--- Stderr ---');
    console.error(stderrData);
    child.kill('SIGTERM');
    process.exit(1);
  }

  console.log('✅ Electron is still running stable after 5 seconds.');
  console.log('Terminating Electron process cleanly...');
  
  // Kill the child process
  child.kill('SIGTERM');
  
  // Give it a tiny bit to clean up, then exit successfully
  setTimeout(() => {
    console.log('🎉 Smoke test passed successfully!');
    cleanup();
    process.exit(0);
  }, 1000);
}, 5000);

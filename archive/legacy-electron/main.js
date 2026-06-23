const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerSystemIPC } = require('./ipc/system.ipc');
const { registerFileIPC } = require('./ipc/file.ipc');
const { registerDiagIPC } = require('./ipc/diag.ipc');
const { registerLicenseIPC } = require('./ipc/license.ipc');
const { registerTokenIPC } = require('./ipc/token.ipc');
const { registerMediaIPC } = require('./ipc/media.ipc');
const { registerWhisperIPC } = require('./ipc/whisper.ipc');
const { registerTtsIPC } = require('./ipc/tts.ipc');
const { registerBrowserIPC } = require('./ipc/browser.ipc');
const { registerFlowIPC } = require('./ipc/flow.ipc');
const { registerSceneIPC } = require('./ipc/scene.ipc');
const { registerGrokIPC } = require('./ipc/grok.ipc');
const { registerGeminiIPC } = require('./ipc/gemini.ipc');
const { registerYoutubeIPC } = require('./ipc/youtube.ipc');
const { registerTelegramIPC } = require('./ipc/telegram.ipc');
const { registerOmnivoiceIPC } = require('./ipc/omnivoice.ipc');
const { registerAudioIPC } = require('./ipc/audio.ipc');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load UI - Basic frame
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3001');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  
  console.log('[Electron Main] BrowserWindow created');
}

app.whenReady().then(() => {
  registerSystemIPC();
  registerFileIPC();
  registerDiagIPC();
  registerLicenseIPC();
  registerTokenIPC();
  registerMediaIPC();
  registerWhisperIPC();
  registerTtsIPC();
  registerBrowserIPC();
  registerFlowIPC();
  registerSceneIPC();
  registerGrokIPC();
  registerGeminiIPC();
  registerYoutubeIPC();
  registerTelegramIPC();
  registerOmnivoiceIPC();
  registerAudioIPC();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

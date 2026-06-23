const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Mock implementations for Stage 1
  ping: () => ipcRenderer.invoke('ping'),
  sendSync: (channel, data) => {
    console.log(`Mock sendSync to ${channel}`, data);
  },
  receive: (channel, func) => {
    const subscription = (event, ...args) => func(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },

  // Settings
  getSetting: (key) => ipcRenderer.invoke('store:get', key),
  saveSetting: (key, val) => ipcRenderer.invoke('store:set', key, val),
  deleteSetting: (key) => ipcRenderer.invoke('store:delete', key),

  // File and Dialog
  selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  saveFile: (content, options) => ipcRenderer.invoke('file:save', content, options),
  saveFileToPath: (filePath, content) => ipcRenderer.invoke('file:save-to-path', filePath, content),
  readFileAsBuffer: (filePath) => ipcRenderer.invoke('file:read-buffer', filePath),
  listFiles: (dirPath) => ipcRenderer.invoke('file:list-files-in-dir', dirPath),
  loadJSON: (filePath) => ipcRenderer.invoke('file:load-json', filePath),
  readTextFile: (filePath) => ipcRenderer.invoke('file:read-text', filePath),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:openFile-custom', options),

  // System App Path
  getAppPath: (name) => ipcRenderer.invoke('app:get-path', name),
  getDownloadsPath: () => ipcRenderer.invoke('app:get-downloads-path'),
  openPath: (path) => ipcRenderer.invoke('shell:openPath', path),
  showItemInFolder: (path) => ipcRenderer.invoke('shell:showItemInFolder', path),

  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Diagnostic
  readDiagLog: () => ipcRenderer.invoke('diag:read-log'),
  openDiagLogFolder: () => ipcRenderer.invoke('diag:open-log-folder'),

  // License & Features
  verifyLicense: (key) => ipcRenderer.invoke('license:verify', key),
  checkSavedLicense: () => ipcRenderer.invoke('license:check-saved'),
  getEnabledFeatures: () => ipcRenderer.invoke('features:get-enabled'),
  getAllLicenses: () => ipcRenderer.invoke('features:get-all-licenses'),
  updateLicenseFeatures: (features) => ipcRenderer.invoke('features:update', features),
  scanChannelAssets: () => ipcRenderer.invoke('channel:scan-assets'),

  // Tokens
  leaseToken: () => ipcRenderer.invoke('token:lease'),
  reportTokenError: (id, err) => ipcRenderer.invoke('token:report-error', id, err),
  getAllTokens: () => ipcRenderer.invoke('token:get-all'),
  manualDepositToken: (val) => ipcRenderer.invoke('token:manual-deposit', val),

  // Media & FFmpeg
  saveCharacterImage: (data) => ipcRenderer.invoke('images:save-character-image', data),
  mergeVideos: (options) => ipcRenderer.invoke('video:merge', options),
  getVideosInFolder: (folder) => ipcRenderer.invoke('video:get-videos-in-folder', folder),
  getVideoMetadata: (file) => ipcRenderer.invoke('video:get-metadata', file),
  generateTransitionPreview: (opts) => ipcRenderer.invoke('video:generate-transition-preview', opts),
  installFfmpeg: () => ipcRenderer.invoke('system:install-ffmpeg'),
  checkFfmpeg: () => ipcRenderer.invoke('system:check-ffmpeg'),
  removeWatermark: (opts) => ipcRenderer.invoke('video:remove-watermark', opts),
  extractFrameFromVideo: (opts) => ipcRenderer.invoke('clone:extract-frame', opts),
  getVideoInfo: (file) => ipcRenderer.invoke('clone:get-video-info', file),
  extractAudioFile: (opts) => ipcRenderer.invoke('analysis:extract-audio', opts),
  detectSceneChanges: (opts) => ipcRenderer.invoke('analysis:detect-scenes', opts),
  extractAudioFromUrl: (url) => ipcRenderer.invoke('audio:extract-from-url', url),
  extractSRT: (opts) => ipcRenderer.invoke('audio:extract-srt', opts),
  splitAudioSegments: (opts) => ipcRenderer.invoke('audio:split-segments', opts),
  assembleA2V: (opts) => ipcRenderer.invoke('video:assemble-a2v', opts),
  
  // Whisper APIs
  transcribe: (opts) => ipcRenderer.invoke('whisper:transcribe', opts),
  burnSubtitle: (opts) => ipcRenderer.invoke('whisper:burn-subtitle', opts),
  checkPython: () => ipcRenderer.invoke('whisper:check-python'),
  setupPython: () => ipcRenderer.invoke('whisper:setup-python'),
  
  // Flow/Veo APIs
  generateVideo: (opts) => ipcRenderer.invoke('flow:generate-video', opts),

  // Edge-TTS APIs
  getVoices: () => ipcRenderer.invoke('tts:get-voices'),
  synthesizeTTS: (opts) => ipcRenderer.invoke('tts:synthesize', opts),
  previewVoice: (opts) => ipcRenderer.invoke('tts:preview-voice', opts),
  saveTTSAudio: (opts) => ipcRenderer.invoke('tts:save-audio', opts),
  readAudio: (filePath) => ipcRenderer.invoke('tts:read-audio', filePath),

  // YouTube Download APIs
  getInfoYoutube: (url) => ipcRenderer.invoke('youtube:get-info', url),
  downloadYoutube: (opts) => ipcRenderer.invoke('youtube:download', opts),
  onYoutubeProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('youtube:download-progress', subscription);
    return () => ipcRenderer.removeListener('youtube:download-progress', subscription);
  },

  // Telegram Integration APIs
  sendTelegramBatchLog: (message) => ipcRenderer.invoke('telegram:send-batch-log', message),
  sendTelegramVideo: (opts) => ipcRenderer.invoke('telegram:send-video', opts),
  getTelegramId: () => ipcRenderer.invoke('telegram:get-id'),
  updateTelegramId: (opts) => ipcRenderer.invoke('telegram:update-id', opts),

  onMergeProgress: (callback) => {
    const subscription = (event, progress) => callback(progress);
    ipcRenderer.on('video:merge-progress', subscription);
    return () => ipcRenderer.removeListener('video:merge-progress', subscription);
  }
});

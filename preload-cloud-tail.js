
// Maintained Cloud AI bridge appended to the preserved original preload.
;(() => {
  const { contextBridge, ipcRenderer } = require('electron');

  function subscribe(channel, callback) {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  }

  contextBridge.exposeInMainWorld('cloudAI', {
    configSave: (profile) => ipcRenderer.invoke('custom-config:save', profile),
    configList: () => ipcRenderer.invoke('custom-config:list'),
    configDelete: (profileId) => ipcRenderer.invoke('custom-config:delete', profileId),
    configSetActive: (capability, profileId) =>
      ipcRenderer.invoke('custom-config:set-active', capability, profileId),
    configTest: (profileId) => ipcRenderer.invoke('custom-config:test', profileId),
    chatCompletion: (payload) => ipcRenderer.invoke('custom:chat-completion', payload),
    chatStreamStart: (payload) => ipcRenderer.invoke('custom:chat-stream-start', payload),
    requestCancel: (requestId) => ipcRenderer.invoke('custom:request-cancel', requestId),
    onChatStreamChunk: (callback) => subscribe('custom:chat-stream-chunk', callback),
    onChatStreamEnd: (callback) => subscribe('custom:chat-stream-end', callback),
    sttTranscribe: (payload) => ipcRenderer.invoke('custom:stt-transcribe', payload),
    sttTranscribeAudio: (payload) => ipcRenderer.invoke('custom:stt-transcribe-audio', payload),
    translateSrt: (payload) => ipcRenderer.invoke('custom:translate-srt', payload)
  });
})();

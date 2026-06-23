const { ipcMain } = require('electron');

function registerAudioIPC() {
    ipcMain.handle('audio:extract-from-url', async () => ({ success: true, audioUrl: 'mock.mp3' }));
    ipcMain.handle('audio:extract-srt', async () => ({ success: true, srt: 'mock' }));
    ipcMain.handle('audio:split-segments', async () => ({ success: true }));
    ipcMain.handle('audio:extract', async () => ({ success: true })); // fallback
}

module.exports = { registerAudioIPC };

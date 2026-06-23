const { ipcMain } = require('electron');

function registerOmnivoiceIPC() {
    ipcMain.handle('omnivoice:status', async () => ({ success: true, status: 'mock' }));
    ipcMain.handle('omnivoice:auto-trim', async () => ({ success: true }));
    ipcMain.handle('omnivoice:clone', async () => ({ success: true }));
    ipcMain.handle('omnivoice:design', async () => ({ success: true }));
    ipcMain.handle('omnivoice:offload', async () => ({ success: true }));
    ipcMain.handle('omnivoice:install', async () => ({ success: true }));
    ipcMain.handle('omnivoice:install-status', async () => ({ success: true, progress: 100 }));
    ipcMain.handle('omnivoice:save-voice', async () => ({ success: true }));
    ipcMain.handle('omnivoice:list-library', async () => ({ success: true, voices: [] }));
    ipcMain.handle('omnivoice:delete-voice', async () => ({ success: true }));
    ipcMain.handle('omnivoice:clone-from-library', async () => ({ success: true }));
    ipcMain.handle('omnivoice:mix-clone', async () => ({ success: true }));
    ipcMain.handle('omnivoice:generate-srt', async () => ({ success: true }));
}

module.exports = { registerOmnivoiceIPC };

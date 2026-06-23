const { ipcMain } = require('electron');

function registerGrokIPC() {
    ipcMain.handle('grok:generate-text-video', async () => ({
        success: false,
        error: 'Tính năng tạo video qua Grok hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('grok:generate-image-video', async () => ({
        success: false,
        error: 'Tính năng tạo video qua Grok hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('grok:generate-components-video', async () => ({
        success: false,
        error: 'Tính năng tạo video qua Grok hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('grok:generate-extension-video', async () => ({
        success: false,
        error: 'Tính năng tạo video qua Grok hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('grok:generate-batch-video', async () => ({
        success: false,
        error: 'Tính năng tạo video qua Grok hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('grok:generate-image', async () => ({
        success: false,
        error: 'Tính năng tạo video qua Grok hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('grok:job-status', async () => ({
        success: false,
        error: 'Tính năng tạo video qua Grok hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('grok:get-settings', async () => ({
        success: false,
        error: 'Tính năng tạo video qua Grok hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('grok:save-settings', async () => ({
        success: false,
        error: 'Tính năng tạo video qua Grok hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('grok:delete-profile', async () => ({
        success: false,
        error: 'Tính năng tạo video qua Grok hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('grok:check-health', async () => ({
        success: false,
        error: 'Tính năng tạo video qua Grok hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('grok:hide-browser', async () => ({
        success: false,
        error: 'Tính năng tạo video qua Grok hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('grok:save-temp-image', async () => ({
        success: false,
        error: 'Tính năng tạo video qua Grok hiện chưa được hỗ trợ.'
    }));
}

module.exports = { registerGrokIPC };

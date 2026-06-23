const { ipcMain } = require('electron');

function registerFlowIPC() {
    ipcMain.handle('flow:generate-video', async () => ({
        success: false,
        error: 'Tính năng tạo video tự động (Flow/Veo) hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('flow:poll-video', async () => ({
        success: false,
        error: 'Tính năng tạo video tự động (Flow/Veo) hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('flow:download-video', async () => ({
        success: false,
        error: 'Tính năng tạo video tự động (Flow/Veo) hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('flow:upscale-video', async () => ({
        success: false,
        error: 'Tính năng tạo video tự động (Flow/Veo) hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('flow:generate-image', async () => ({
        success: false,
        error: 'Tính năng tạo video tự động (Flow/Veo) hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('flow:generate-content', async () => ({
        success: false,
        error: 'Tính năng tạo video tự động (Flow/Veo) hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('flow:upload-reference-image', async () => ({
        success: false,
        error: 'Tính năng tạo video tự động (Flow/Veo) hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('flow:upscale-image', async () => ({
        success: false,
        error: 'Tính năng tạo video tự động (Flow/Veo) hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('flow:poll-upscale-status', async () => ({
        success: false,
        error: 'Tính năng tạo video tự động (Flow/Veo) hiện chưa được hỗ trợ.'
    }));
}

module.exports = { registerFlowIPC };

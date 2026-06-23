const { ipcMain } = require('electron');

function registerGeminiIPC() {
    ipcMain.handle('gemini:upload-video', async () => ({
        success: false,
        error: 'Tính năng tải lên video qua Gemini hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('gemini:upload-audio', async () => ({
        success: false,
        error: 'Tính năng tải lên âm thanh qua Gemini hiện chưa được hỗ trợ.'
    }));
    ipcMain.handle('gemini:upload-files', async () => ({
        success: false,
        error: 'Tính năng tải lên tệp tin qua Gemini hiện chưa được hỗ trợ.'
    })); 
    ipcMain.handle('gemini:upload-file', async () => ({
        success: false,
        error: 'Tính năng tải lên tệp tin qua Gemini hiện chưa được hỗ trợ.'
    }));
}

module.exports = { registerGeminiIPC };

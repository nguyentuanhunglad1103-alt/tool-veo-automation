const { ipcMain } = require('electron');

function registerSceneIPC() {
    ipcMain.handle('scene:get-project-id', async () => ({ success: true, projectId: 'mock-proj-123' }));
    ipcMain.handle('scene:create-video', async () => ({ success: true }));
    ipcMain.handle('scene:upload-start-image', async () => ({ success: true }));
    ipcMain.handle('scene:create-video-from-image', async () => ({ success: true }));
    ipcMain.handle('scene:upload-frame', async () => ({ success: true }));
    ipcMain.handle('scene:extend-video', async () => ({ success: true }));
    ipcMain.handle('scene:poll-extend', async () => ({ success: true, status: 'completed' }));
    ipcMain.handle('scene:update-scene', async () => ({ success: true }));
    ipcMain.handle('scene:merge-videos', async () => ({ success: true, outputPath: 'mock_merged.mp4' }));
}

module.exports = { registerSceneIPC };

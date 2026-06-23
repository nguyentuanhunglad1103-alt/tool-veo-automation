const { ipcMain } = require('electron');

function registerLicenseIPC() {
  ipcMain.handle('license:verify', async (event, licenseKey) => {
    return { success: true, valid: true, message: 'Mock license valid', features: ['pro', 'watermark-removal'] };
  });

  ipcMain.handle('license:check-saved', async () => {
    return { success: true, valid: true, licenseKey: 'XXXX-XXXX-XXXX-1234', features: ['pro', 'watermark-removal'] };
  });

  ipcMain.handle('features:get-enabled', async () => {
    return { success: true, features: ['pro', 'watermark-removal'] };
  });

  ipcMain.handle('features:get-all-licenses', async () => {
    return [{ id: 'mock', status: 'active' }];
  });

  ipcMain.handle('features:update', async (event, features) => {
    return { success: true };
  });

  ipcMain.handle('channel:scan-assets', async () => {
    return { success: true, count: 0 };
  });
}

module.exports = { registerLicenseIPC };

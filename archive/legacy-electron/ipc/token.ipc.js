const { ipcMain } = require('electron');

function registerTokenIPC() {
  ipcMain.handle('token:lease', async () => {
    return { token: 'mock-token', status: 'leased' };
  });

  ipcMain.handle('token:report-error', async (event, tokenId, err) => {
    console.log(`Reported token error for ${tokenId}:`, err);
    return { success: true };
  });

  ipcMain.handle('token:get-all', async () => {
    return { success: true, tokens: [{ id: 'mock-token', value: '1234567890', status: 'available' }] };
  });

  ipcMain.handle('token:manual-deposit', async (event, tokenValue) => {
    return { success: true, added: true };
  });
}

module.exports = { registerTokenIPC };

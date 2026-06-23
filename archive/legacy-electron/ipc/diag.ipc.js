const { ipcMain, shell, app } = require('electron');
const path = require('path');
const fs = require('fs');

function registerDiagIPC() {
  ipcMain.handle('diag:read-log', async () => {
    try {
      const logPath = path.join(app.getPath('userData'), 'logs', 'main.log');
      if (fs.existsSync(logPath)) {
        return fs.readFileSync(logPath, 'utf8');
      }
      return 'No log file found.';
    } catch (e) {
      return `Error reading log: ${e.message}`;
    }
  });

  ipcMain.handle('diag:open-log-folder', async () => {
    const logFolder = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logFolder)) {
      fs.mkdirSync(logFolder, { recursive: true });
    }
    await shell.openPath(logFolder);
    return true;
  });
}

module.exports = { registerDiagIPC };

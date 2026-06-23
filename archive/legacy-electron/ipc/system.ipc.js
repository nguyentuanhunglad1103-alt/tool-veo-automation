const { ipcMain, app, shell, BrowserWindow } = require('electron');
const store = require('../services/store');

function registerSystemIPC() {
  // Ping
  ipcMain.handle('ping', () => 'pong');

  // Store
  ipcMain.handle('store:get', (event, key) => store.get(key));
  ipcMain.handle('store:set', (event, key, val) => store.set(key, val));
  ipcMain.handle('store:delete', (event, key) => store.delete(key));

  // App Paths
  ipcMain.handle('app:get-path', (event, name) => app.getPath(name));
  ipcMain.handle('app:get-downloads-path', () => app.getPath('downloads'));

  // Shell
  ipcMain.handle('shell:openPath', (event, path) => shell.openPath(path));
  ipcMain.handle('shell:showItemInFolder', (event, path) => shell.showItemInFolder(path));

  // Window Controls
  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });
  
  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  });

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

}

module.exports = { registerSystemIPC };

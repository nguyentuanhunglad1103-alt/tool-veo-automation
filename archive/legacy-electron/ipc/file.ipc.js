const { ipcMain, dialog, BrowserWindow, app } = require('electron');
const fs = require('fs');
const path = require('path');
const store = require('../services/store');

function getSafeDirectories() {
  const dirs = [
    app.getPath('userData'),
    app.getPath('temp'),
    app.getPath('downloads'),
    app.getPath('documents'),
    app.getPath('desktop'),
    app.getPath('home'),
    app.getAppPath()
  ];
  try {
    const savePath = store.get('savePath');
    if (savePath) {
      dirs.push(savePath);
    }
  } catch (e) {}
  
  return dirs.map(d => path.resolve(d).toLowerCase());
}

function isSafePath(filePath, isWrite = false) {
  if (typeof filePath !== 'string') return false;
  
  let resolvedPath;
  try {
    resolvedPath = path.resolve(filePath);
  } catch (e) {
    return false;
  }
  
  if (fs.existsSync(resolvedPath)) {
    try {
      resolvedPath = fs.realpathSync(resolvedPath);
    } catch (e) {}
  }
  
  const normPath = resolvedPath.toLowerCase();

  const systemDirs = [
    'c:\\windows',
    'c:\\program files',
    'c:\\program files (x86)',
    'c:\\programdata',
    'c:\\users\\all users'
  ];
  if (systemDirs.some(dir => normPath.startsWith(dir))) {
    return false;
  }

  const safeDirs = getSafeDirectories();
  const isAllowed = safeDirs.some(dir => normPath.startsWith(dir));
  if (!isAllowed) {
    return false;
  }

  const ext = path.extname(normPath).substring(1);
  if (ext) {
    const allowedExts = [
      'txt', 'json', 'srt', 'vtt', 'doc', 'docx', 'csv', 'log',
      'mp3', 'wav', 'ogg', 'm4a', 'flac',
      'mp4', 'mkv', 'avi', 'mov',
      'png', 'jpg', 'jpeg', 'webp', 'svg'
    ];
    if (!allowedExts.includes(ext)) {
      return false;
    }
  }

  if (!isWrite && fs.existsSync(resolvedPath)) {
    try {
      const stats = fs.statSync(resolvedPath);
      if (stats.isFile() && stats.size > 50 * 1024 * 1024) {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  return true;
}

function registerFileIPC() {
  // Dialogs
  ipcMain.handle('dialog:openDirectory', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    });
    return result;
  });

  ipcMain.handle('dialog:saveFile', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showSaveDialog(win, options);
    return result;
  });

  ipcMain.handle('dialog:openFile', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const defaultOptions = { properties: ['openFile'] };
    const result = await dialog.showOpenDialog(win, { ...defaultOptions, ...options });
    return result;
  });

  ipcMain.handle('dialog:openFile-custom', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, options);
    return result;
  });

  ipcMain.handle('dialog:openAudioFile', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] }]
    });
    return result;
  });

  // File Operations
  ipcMain.handle('file:list-files-in-dir', async (event, dirPath) => {
    if (!isSafePath(dirPath)) {
      throw new Error('Access denied: Unsafe path');
    }
    try {
      if (!fs.existsSync(dirPath)) return [];
      const files = fs.readdirSync(dirPath);
      return files.map(f => ({
        name: f,
        path: path.join(dirPath, f),
        isDirectory: fs.statSync(path.join(dirPath, f)).isDirectory()
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  });

  ipcMain.handle('file:read-buffer', async (event, filePath) => {
    if (!isSafePath(filePath)) {
      throw new Error('Access denied: Unsafe path');
    }
    try {
      const buffer = fs.readFileSync(filePath);
      return buffer;
    } catch (error) {
      console.error('Error reading file as buffer:', error);
      throw error;
    }
  });

  ipcMain.handle('file:read-text', async (event, filePath) => {
    if (!isSafePath(filePath)) {
      throw new Error('Access denied: Unsafe path');
    }
    try {
      const text = fs.readFileSync(filePath, 'utf-8');
      return text;
    } catch (error) {
      console.error('Error reading text file:', error);
      throw error;
    }
  });

  ipcMain.handle('file:save', async (event, content, options) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showSaveDialog(win, options);
      if (!result.canceled && result.filePath) {
        if (!isSafePath(result.filePath, true)) {
          throw new Error('Access denied: Unsafe output path');
        }
        fs.writeFileSync(result.filePath, content);
        return result.filePath;
      }
      return null;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  });

  ipcMain.handle('file:save-to-path', async (event, filePath, content) => {
    if (!isSafePath(filePath, true)) {
      throw new Error('Access denied: Unsafe output path');
    }
    try {
      fs.writeFileSync(filePath, content);
      return true;
    } catch (error) {
      console.error('Error saving file to path:', error);
      throw error;
    }
  });

  ipcMain.handle('file:load-json', async (event, filePath) => {
    if (!isSafePath(filePath)) {
      throw new Error('Access denied: Unsafe path');
    }
    try {
      const text = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(text);
    } catch (error) {
      console.error('Error loading JSON:', error);
      throw error;
    }
  });
}

module.exports = { registerFileIPC, isSafePath };

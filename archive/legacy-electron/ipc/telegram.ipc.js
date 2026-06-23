const { ipcMain } = require('electron');
const store = require('../services/store');
const fs = require('fs');
const path = require('path');

function registerTelegramIPC() {
    ipcMain.handle('telegram:get-id', async () => {
        try {
            return {
                success: true,
                id: store.get('telegram_id') || '',
                token: store.get('telegram_bot_token') || ''
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('telegram:update-id', async (event, options) => {
        const { id, token } = options;
        try {
            store.set('telegram_id', id ? id.trim() : '');
            if (token !== undefined) {
                store.set('telegram_bot_token', token ? token.trim() : '');
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('telegram:send-batch-log', async (event, message) => {
        const token = store.get('telegram_bot_token');
        const chatId = store.get('telegram_id');
        if (!token || !chatId) {
            return { success: false, error: 'Telegram credentials not configured.' };
        }
        try {
            const url = `https://api.telegram.org/bot${token}/sendMessage`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: message })
            });
            const data = await res.json();
            if (data.ok) return { success: true };
            return { success: false, error: data.description || 'Unknown error' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('telegram:send-video', async (event, options) => {
        const { videoPath, caption } = options;
        const token = store.get('telegram_bot_token');
        const chatId = store.get('telegram_id');
        if (!token || !chatId) {
            return { success: false, error: 'Telegram credentials not configured.' };
        }
        if (!fs.existsSync(videoPath)) {
            return { success: false, error: `File not found: ${videoPath}` };
        }

        try {
            const url = `https://api.telegram.org/bot${token}/sendVideo`;
            const fileBlob = new Blob([fs.readFileSync(videoPath)], { type: 'video/mp4' });
            
            const form = new FormData();
            form.append('chat_id', chatId);
            form.append('caption', caption || 'Video output from VEO');
            form.append('video', fileBlob, path.basename(videoPath));

            const res = await fetch(url, {
                method: 'POST',
                body: form
            });
            const data = await res.json();
            if (data.ok) return { success: true };
            return { success: false, error: data.description || 'Unknown error' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('telegram:track-completion', async () => ({ success: true }));
    ipcMain.handle('telegram:get-stats', async () => ({ success: true, stats: {} }));
}

module.exports = { registerTelegramIPC };

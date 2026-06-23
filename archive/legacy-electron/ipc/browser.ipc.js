const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { launchBrowser, closeBrowser, getBrowser } = require('../services/puppeteer.service');
const { isSafePath } = require('./file.ipc');

function registerBrowserIPC() {
    const getProfilePath = (index = 1) => {
        const safeIndex = parseInt(index, 10) || 1;
        const profilePath = path.join(app.getPath('userData'), `browser_profile_${safeIndex}`);
        if (!isSafePath(profilePath, true)) {
            throw new Error("Access denied: Unsafe profile path");
        }
        return profilePath;
    };

    ipcMain.handle('auth:login', async (event, options) => {
        const { email, password } = options;
        console.log(`[Browser IPC] auth:login for ${email}`);
        return { success: true };
    });

    ipcMain.handle('auth:logout', async (event, profileIndex = 1) => {
        console.log(`[Browser IPC] auth:logout profile ${profileIndex}`);
        return { success: true };
    });

    ipcMain.handle('auth:clear-cookies', async () => {
        console.log(`[Browser IPC] auth:clear-cookies`);
        const browser = await getBrowser();
        if (browser) {
            const pages = await browser.pages();
            for (const page of pages) {
                try {
                    const client = await page.target().createCDPSession();
                    await client.send('Network.clearBrowserCookies');
                } catch (e) {
                    console.error("[Browser IPC] Error clearing cookies for a page", e);
                }
            }
        }
        return { success: true };
    });

    ipcMain.handle('auth:auto-relogin', async (event, options) => {
        const { email, password } = options;
        console.log(`[Browser IPC] auth:auto-relogin for ${email}`);
        return { success: true };
    });

    ipcMain.handle('auth:check-status', async () => {
        return { isLoggedIn: true, email: "mock@veo.com" };
    });

    ipcMain.handle('browser:switch-profile', async (event, profileIndex = 1) => {
        console.log(`[Browser IPC] Switching to profile ${profileIndex}`);
        const profilePath = getProfilePath(profileIndex);
        await launchBrowser(true, profilePath);
        return { success: true };
    });

    ipcMain.handle('browser:show', async (event, options) => {
        console.log(`[Browser IPC] Showing browser`);
        const profilePath = getProfilePath(1);
        await launchBrowser(false, profilePath);
        return { success: true };
    });

    ipcMain.handle('browser:restart', async (event, profileIndex = 1) => {
        console.log(`[Browser IPC] Restarting browser`);
        const profilePath = getProfilePath(profileIndex);
        await closeBrowser();
        await launchBrowser(true, profilePath);
        return { success: true };
    });

    ipcMain.handle('browser:nuke', async (event, profileIndex = 1) => {
        console.log(`[Browser IPC] Nuking browser profile ${profileIndex}`);
        await closeBrowser();
        const profilePath = getProfilePath(profileIndex);
        if (fs.existsSync(profilePath)) {
            fs.rmSync(profilePath, { recursive: true, force: true });
        }
        return { success: true };
    });

    ipcMain.handle('browser:hide', async (event, profileIndex = 1) => {
        console.log(`[Browser IPC] Hiding browser`);
        const profilePath = getProfilePath(profileIndex);
        await launchBrowser(true, profilePath);
        return { success: true };
    });
}

module.exports = { registerBrowserIPC };

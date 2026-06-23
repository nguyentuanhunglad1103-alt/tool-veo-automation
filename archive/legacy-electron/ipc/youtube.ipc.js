const { ipcMain } = require('electron');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');

function registerYoutubeIPC() {
    ipcMain.handle('youtube:get-info', async (event, url) => {
        try {
            if (!url) throw new Error("No YouTube URL provided");
            const info = await ytdl.getInfo(url);
            return {
                success: true,
                title: info.videoDetails.title,
                duration: info.videoDetails.lengthSeconds,
                thumbnail: info.videoDetails.thumbnails[0]?.url,
                author: info.videoDetails.author.name
            };
        } catch (error) {
            console.error("[YouTube IPC] get-info error:", error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('youtube:download', async (event, options) => {
        const { url, outputPath } = options;
        try {
            if (!url) throw new Error("No YouTube URL provided");
            if (!outputPath) throw new Error("No output path provided");

            return new Promise((resolve, reject) => {
                const stream = ytdl(url, { quality: 'highest' });
                const writer = fs.createWriteStream(outputPath);
                
                stream.pipe(writer);
                
                stream.on('progress', (chunkLength, downloaded, total) => {
                    const percent = Math.round((downloaded / total) * 100);
                    event.sender.send('youtube:download-progress', percent);
                });
                
                writer.on('finish', () => {
                    resolve({ success: true, outputPath });
                });
                
                writer.on('error', (err) => {
                    reject(err);
                });

                stream.on('error', (err) => {
                    reject(err);
                });
            });
        } catch (error) {
            console.error("[YouTube IPC] download error:", error);
            return { success: false, error: error.message };
        }
    });
}

module.exports = { registerYoutubeIPC };

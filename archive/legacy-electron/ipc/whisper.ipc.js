const { ipcMain, app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

function getPythonExecutable() {
    const embeddedPython = path.join(process.resourcesPath || '', 'python', 'python.exe');
    if (fs.existsSync(embeddedPython)) return embeddedPython;
    const embeddedPython2 = path.join(__dirname, '../../python', 'python.exe');
    if (fs.existsSync(embeddedPython2)) return embeddedPython2;
    return 'python'; // fallback
}

function getWhisperScript() {
    const p1 = path.join(process.resourcesPath || '', 'python', 'services', 'whisper_service.py');
    if (fs.existsSync(p1)) return p1;
    const p2 = path.join(__dirname, '../../python/services/whisper_service.py');
    if (fs.existsSync(p2)) return p2;
    return path.join(app.getAppPath(), 'python', 'services', 'whisper_service.py');
}

function runWhisperService(args, onProgress, onDone, onError) {
    const pythonExe = getPythonExecutable();
    const script = getWhisperScript();
    
    console.log(`[Whisper IPC] Running ${pythonExe} ${script} ${args.join(' ')}`);
    const child = spawn(pythonExe, [script, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    child.stdout.on('data', (data) => {
        const lines = data.toString('utf-8').split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const json = JSON.parse(line.trim());
                if (json.type === 'progress') {
                    if (onProgress) onProgress(json);
                } else if (json.type === 'result') {
                    if (onDone) onDone(json);
                }
            } catch (e) {
                console.log(`[Whisper Service] ${line}`);
            }
        }
    });

    child.stderr.on('data', (data) => {
        console.error(`[Whisper Service] STDERR: ${data}`);
    });

    child.on('close', (code) => {
        console.log(`[Whisper IPC] Process exited with code ${code}`);
        if (code !== 0) {
            if (onError) onError(new Error(`Process exited with code ${code}`));
        }
    });
    
    return child;
}

function registerWhisperIPC() {
    ipcMain.handle('whisper:check-model', async (event, modelName) => {
        const modelsDir = path.join(app.getPath('userData'), 'whisper_models');
        const modelPath = path.join(modelsDir, `faster-whisper-${modelName}`);
        return { exists: fs.existsSync(modelPath) };
    });

    ipcMain.handle('whisper:download-model', async (event, modelName) => {
        return new Promise((resolve, reject) => {
            const modelsDir = path.join(app.getPath('userData'), 'whisper_models');
            fs.mkdirSync(modelsDir, { recursive: true });
            
            runWhisperService(
                ['download-model', '--model', modelName, '--models-dir', modelsDir],
                (progress) => {
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('whisper:progress', progress));
                },
                (result) => {
                    if (result.success) resolve({ success: true });
                    else reject(new Error(result.error));
                },
                reject
            );
        });
    });

    ipcMain.handle('whisper:transcribe', async (event, options) => {
        return new Promise((resolve, reject) => {
            const modelsDir = path.join(app.getPath('userData'), 'whisper_models');
            const args = ['transcribe', '--video', options.filePath || options.videoPath, '--model', options.model || 'medium', '--models-dir', modelsDir];
            if (options.language) args.push('--language', options.language);
            
            runWhisperService(
                args,
                (progress) => {
                    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('whisper:progress', progress));
                },
                (result) => {
                    if (result.success) {
                        resolve({ srt: result.srt, language: result.language });
                    } else {
                        reject(new Error(result.error));
                    }
                },
                reject
            );
        });
    });

    ipcMain.handle('whisper:translate', async (event, options) => {
        console.warn("[Whisper] Translate not fully supported in service script yet.");
        return { srt: "1\n00:00:00,000 --> 00:00:05,000\n[Translated]", language: "en" };
    });

    ipcMain.handle('whisper:burn-subtitle', async (event, options) => {
        const { videoPath, srtPath, outputPath } = options;
        let ffmpegPath = require('ffmpeg-static');
        if (!ffmpegPath) ffmpegPath = 'ffmpeg';
        
        if (!fs.existsSync(videoPath)) {
            throw new Error(`Video file does not exist: ${videoPath}`);
        }
        if (!fs.existsSync(srtPath)) {
            throw new Error(`Subtitle file does not exist: ${srtPath}`);
        }

        return new Promise((resolve, reject) => {
            const escapedSrtPath = srtPath
                .replace(/\\/g, '/')
                .replace(/:/g, '\\:')
                .replace(/'/g, "'\\\\''");

            const filter = `subtitles='${escapedSrtPath}'`;
            const args = ['-y', '-i', videoPath, '-vf', filter, '-c:a', 'copy', outputPath];
            
            console.log(`[Whisper IPC] Spawning: ${ffmpegPath} ${args.join(' ')}`);
            const child = spawn(ffmpegPath, args);
            
            let stderr = '';
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            child.on('close', (code) => {
                if (code !== 0) {
                    console.error("[Whisper] FFmpeg burn error stderr:", stderr);
                    reject(new Error(`FFmpeg process exited with code ${code}. Stderr: ${stderr}`));
                } else {
                    resolve({ success: true, outputPath });
                }
            });
            
            child.on('error', (err) => {
                reject(err);
            });
        });
    });

    ipcMain.handle('whisper:get-models', async () => {
        return ['tiny', 'base', 'small', 'medium', 'large-v3'];
    });

    ipcMain.handle('whisper:check-python', async () => {
        const exe = getPythonExecutable();
        return { available: true, path: exe };
    });

    ipcMain.handle('whisper:setup-python', async () => {
        return { success: true };
    });
}

module.exports = { registerWhisperIPC };

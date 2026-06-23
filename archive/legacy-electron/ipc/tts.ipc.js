const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const WebSocket = require('ws');

// Constants for Microsoft Edge-TTS websocket
const EN = "speech.platform.bing.com/consumer/speech/synthesize/readaloud";
const Lw = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const Mre = "wss://" + EN + "/edge/v1?TrustedClientToken=" + Lw;
const Wre = "https://" + EN + "/voices/list?trustedclienttoken=" + Lw;
const DN = "143.0.3650.75";
const Kc = DN.split(".")[0];
const $re = "1-" + DN;
const Hre = 11644473600;
const Vre = 1000000000;
let Bw = 0;

function zre() {
  let timeInSecs = Date.now() / 1000 + Bw;
  timeInSecs += Hre;
  timeInSecs -= timeInSecs % 300;
  timeInSecs *= Vre / 100;
  let str = "" + timeInSecs.toFixed(0) + Lw;
  return crypto.createHash("sha256").update(str, "ascii").digest("hex").toUpperCase();
}

function Gre() {
  return crypto.randomBytes(16).toString("hex").toUpperCase();
}

function bN() {
  return crypto.randomUUID().replaceAll("-", "");
}

function Kre() {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + Kc + ".0.0.0 Safari/537.36 Edg/" + Kc + ".0.0.0",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
    Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
    Cookie: "muid=" + Gre() + ";"
  };
}

function Xre() {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/" + Kc + ".0.0.0 Safari/537.36 Edg/" + Kc + ".0.0.0",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    Authority: "speech.platform.bing.com",
    "Sec-CH-UA": "\" Not;A Brand\";v=\"99\", \"Microsoft Edge\";v=\"" + Kc + "\", \"Chromium\";v=\"" + Kc + "\"",
    "Sec-CH-UA-Mobile": "?0",
    Accept: "*/*",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty"
  };
}

async function fetchVoicesList() {
  let res = await fetch(Wre, {
    headers: Xre()
  });
  if (!res.ok) {
    throw new Error("Voice list fetch failed: " + res.status);
  }
  return await res.json();
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

const xN = 30000;
function splitTextIntoChunks(text) {
  if (Buffer.from(text, "utf-8").length <= xN) {
    return [text];
  }
  let sentences = text.split(/(?<=[。！？\.!\?\n])\s*/);
  let chunks = [];
  let current = "";
  for (let s of sentences) {
    let combined = current ? current + " " + s : s;
    if (Buffer.from(combined, "utf-8").length > xN && current) {
      chunks.push(current);
      current = s;
    } else {
      current = combined;
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks;
}

function synthesizeChunk(textChunk, options = {}) {
  let {
    voice = "en-US-EmmaMultilingualNeural",
    volume = "+0%",
    rate = "+0%",
    pitch = "+0Hz"
  } = options;
  
  return new Promise((resolve, reject) => {
    let connectionId = bN();
    let secMsGec = zre();
    let wsUrl = Mre + "&ConnectionId=" + connectionId + "&Sec-MS-GEC=" + secMsGec + "&Sec-MS-GEC-Version=" + $re;
    
    console.log(`[TTS] WebSocket connecting... voice=${voice}, textLen=${textChunk.length}`);
    
    let ws = new WebSocket(wsUrl, {
      host: "speech.platform.bing.com",
      headers: Kre()
    });
    
    let audioDataChunks = [];
    let finished = false;
    
    let timeoutId = setTimeout(() => {
      if (!finished) {
        finished = true;
        try { ws.close(); } catch {}
        reject(new Error("Timeout waiting for audio response (60s)"));
      }
    }, 60000);
    
    ws.on("unexpected-response", (req, res) => {
      if (!finished) {
        finished = true;
        clearTimeout(timeoutId);
        let status = res?.statusCode || "unknown";
        if (res?.headers?.date) {
          try {
            let serverTime = new Date(res.headers.date).getTime() / 1000;
            let localTime = Date.now() / 1000;
            Bw += serverTime - localTime;
            console.log(`[TTS] Adjusted clock skew: ${Bw.toFixed(1)}s`);
          } catch {}
        }
        reject(new Error(`Server rejected connection: HTTP ${status}`));
      }
    });
    
    ws.on("message", (data, isBinary) => {
      if (!isBinary) {
        if (data.toString("utf8").includes("turn.end")) {
          if (!finished) {
            finished = true;
            clearTimeout(timeoutId);
            resolve(Buffer.concat(audioDataChunks));
            ws.close();
          }
        }
        return;
      }
      
      let raw = data;
      if (raw.length < 2) return;
      let headerLength = raw.readUInt16BE(0);
      if (headerLength > raw.length) return;
      let audioPayload = raw.subarray(2 + headerLength);
      if (audioPayload.length > 0) {
        audioDataChunks.push(audioPayload);
      }
    });
    
    ws.on("error", (err) => {
      if (!finished) {
        finished = true;
        clearTimeout(timeoutId);
        reject(err);
      }
    });
    
    ws.on("close", (code) => {
      if (!finished) {
        finished = true;
        clearTimeout(timeoutId);
        reject(new Error(`WebSocket closed unexpectedly with code: ${code}`));
      }
    });
    
    let configMsg = JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: {
              sentenceBoundaryEnabled: "false",
              wordBoundaryEnabled: "false"
            },
            outputFormat: "audio-24khz-48kbitrate-mono-mp3"
          }
        }
      }
    });
    
    ws.on("open", () => {
      let configPayload = "X-Timestamp:" + new Date().toUTCString() + "\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n" + configMsg;
      ws.send(configPayload, (err) => {
        if (err) {
          if (!finished) {
            finished = true;
            clearTimeout(timeoutId);
            reject(err);
          }
          return;
        }
        
        let escapedText = escapeXml(textChunk);
        let ssmlPayload = "X-RequestId:" + bN() + "\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:" + new Date().toUTCString() + "Z\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='" + voice + "'><prosody pitch='" + pitch + "' rate='" + rate + "' volume='" + volume + "'>" + escapedText + "</prosody></voice></speak>";
        
        ws.send(ssmlPayload, (sendErr) => {
          if (sendErr && !finished) {
            finished = true;
            clearTimeout(timeoutId);
            reject(sendErr);
          }
        });
      });
    });
  });
}

async function synthesizeFullText(text, options = {}) {
  let chunks = splitTextIntoChunks(text);
  let buffers = [];
  for (let i = 0; i < chunks.length; i++) {
    let attempts = 3;
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        let buf = await synthesizeChunk(chunks[i], options);
        buffers.push(buf);
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        if (attempt < attempts - 1) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
        }
      }
    }
    if (lastError) throw lastError;
  }
  return Buffer.concat(buffers);
}

let cachedVoices = null;

function registerTtsIPC() {
  ipcMain.handle('tts:get-voices', async () => {
    try {
      if (cachedVoices) return cachedVoices;
      const list = await fetchVoicesList();
      cachedVoices = list.map(v => {
        let parts = v.ShortName.split("-");
        return {
          name: v.Name,
          shortName: v.ShortName,
          friendlyName: v.FriendlyName,
          locale: v.Locale,
          gender: v.Gender,
          language: parts[0],
          country: parts[1]
        };
      });
      return cachedVoices;
    } catch (e) {
      console.error("[TTS] Error fetching voices list:", e);
      return [
        { name: "vi-VN-HoaiMyNeural", shortName: "vi-VN-HoaiMyNeural", gender: "Female", locale: "vi-VN" },
        { name: "vi-VN-NamMinhNeural", shortName: "vi-VN-NamMinhNeural", gender: "Male", locale: "vi-VN" }
      ];
    }
  });

  ipcMain.handle('tts:synthesize', async (event, options) => {
    const { text, voice, rate, pitch, savePath } = options;
    try {
      const buffer = await synthesizeFullText(text, {
        voice: voice || 'vi-VN-HoaiMyNeural',
        rate: rate || '+0%',
        pitch: pitch || '+0Hz'
      });
      
      const targetPath = savePath || path.join(app.getPath('temp'), `tts_${Date.now()}.mp3`);
      
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(targetPath, buffer);
      return { success: true, audioPath: targetPath, duration: 1.0 };
    } catch (err) {
      console.error("[TTS] Synthesis error:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tts:preview-voice', async (event, options) => {
    const { voice, text } = options;
    try {
      const buffer = await synthesizeFullText(text || "Xin chào, đây là giọng đọc thử.", {
        voice: voice || 'vi-VN-HoaiMyNeural',
        rate: '+0%',
        pitch: '+0Hz'
      });
      const tempPath = path.join(app.getPath('temp'), `tts_preview_${Date.now()}.mp3`);
      fs.writeFileSync(tempPath, buffer);
      return { success: true, audioPath: tempPath };
    } catch (err) {
      console.error("[TTS] Preview error:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tts:save-audio', async (event, options) => {
    const { audioPath, savePath } = options;
    try {
      if (fs.existsSync(audioPath)) {
        const dir = path.dirname(savePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.copyFileSync(audioPath, savePath);
        return { success: true, path: savePath };
      }
      return { success: false, error: "Tệp âm thanh nguồn không tồn tại" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tts:get-default-path', async () => {
    const docsPath = app.getPath('documents');
    const defaultPath = path.join(docsPath, 'VEO_TTS');
    if (!fs.existsSync(defaultPath)) {
      fs.mkdirSync(defaultPath, { recursive: true });
    }
    return defaultPath;
  });

  ipcMain.handle('tts:read-audio', async (event, audioPath) => {
    try {
      if (fs.existsSync(audioPath)) {
        const buffer = fs.readFileSync(audioPath);
        return { success: true, data: buffer };
      }
      return { success: false, error: "Audio file not found" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tts:synthesize-google', async (event, options) => {
    const { text, voice, rate, pitch, savePath } = options;
    try {
      const buffer = await synthesizeFullText(text, {
        voice: voice || 'vi-VN-HoaiMyNeural',
        rate: rate || '+0%',
        pitch: pitch || '+0Hz'
      });
      const targetPath = savePath || path.join(app.getPath('temp'), `tts_g_${Date.now()}.mp3`);
      fs.writeFileSync(targetPath, buffer);
      return { success: true, audioPath: targetPath, duration: 1.0 };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tts:batch-join-audio', async (event, options) => {
    return { success: false, error: 'Tính năng ghép nối âm thanh hàng loạt hiện chưa hỗ trợ.' };
  });

  ipcMain.handle('tts:batch-create-srt', async (event, options) => {
    return { success: false, error: 'Tính năng tạo SRT hàng loạt hiện chưa hỗ trợ.' };
  });
}

module.exports = { registerTtsIPC };

import React, { useState } from 'react';

export default function MediaUtilsPage() {
  const [activeTab, setActiveTab] = useState('merge');
  const [status, setStatus] = useState('');

  // Tab 1: Merge
  const [mergeFiles, setMergeFiles] = useState([]);
  const [mergeOut, setMergeOut] = useState('');

  // Tab 2: Watermark
  const [wmFile, setWmFile] = useState('');
  const [wmOut, setWmOut] = useState('');

  // Tab 3: Extract Audio
  const [extVideo, setExtVideo] = useState('');
  const [extOut, setExtOut] = useState('');

  // Tab 4: Extract SRT (Whisper)
  const [whisperFile, setWhisperFile] = useState('');
  const [whisperLang, setWhisperLang] = useState('vi');
  const [srtResult, setSrtResult] = useState('');

  // Tab 5: Assemble A2V
  const [a2vVisual, setA2vVisual] = useState('');
  const [a2vAudio, setA2vAudio] = useState('');
  const [a2vOut, setA2vOut] = useState('');

  const pickFile = async (type = 'open', multi = false, extensions = []) => {
    if (!window.electronAPI) {
      alert('Electron API không khả dụng.');
      return null;
    }
    if (type === 'save') {
      const res = await window.electronAPI.showSaveDialog({
        filters: extensions.length ? [{ name: 'Allowed Files', extensions }] : []
      });
      return (!res.canceled && res.filePath) ? res.filePath : null;
    } else {
      const res = await window.electronAPI.showOpenDialog({
        properties: multi ? ['openFile', 'multiSelections'] : ['openFile'],
        filters: extensions.length ? [{ name: 'Allowed Files', extensions }] : []
      });
      return (!res.canceled && res.filePaths) ? (multi ? res.filePaths : res.filePaths[0]) : null;
    }
  };

  const handleMerge = async () => {
    if (!mergeFiles.length || !mergeOut) {
      setStatus('Lỗi: Hãy chọn các file đầu vào và file đầu ra.');
      return;
    }
    setStatus('Đang thực hiện ghép video bằng FFmpeg...');
    try {
      const res = await window.electronAPI.mergeVideos({ files: mergeFiles, outputPath: mergeOut });
      if (res.success) {
        setStatus(`Ghép thành công! File đã lưu vào: ${res.outputPath}`);
      } else {
        setStatus(`Thất bại: ${res.error}`);
      }
    } catch (err) {
      setStatus(`Lỗi: ${err.message}`);
    }
  };

  const handleRemoveWatermark = async () => {
    if (!wmFile || !wmOut) {
      setStatus('Lỗi: Hãy chọn file đầu vào và file đầu ra.');
      return;
    }
    setStatus('Đang thực hiện xóa watermark...');
    try {
      const res = await window.electronAPI.removeWatermark({ file: wmFile, outputPath: wmOut });
      if (res.success) {
        setStatus('Đã hoàn tất yêu cầu xóa watermark (Mô phỏng).');
      } else {
        setStatus('Có lỗi xảy ra.');
      }
    } catch (err) {
      setStatus(`Lỗi: ${err.message}`);
    }
  };

  const handleExtractAudio = async () => {
    if (!extVideo || !extOut) {
      setStatus('Lỗi: Hãy chọn video đầu vào và file âm thanh đầu ra.');
      return;
    }
    setStatus('Đang trích xuất âm thanh bằng FFmpeg...');
    try {
      const res = await window.electronAPI.extractAudioFile({ videoPath: extVideo, outputPath: extOut });
      if (res.success) {
        setStatus(`Trích xuất thành công! Lưu vào: ${res.outputPath}`);
      } else {
        setStatus(`Thất bại: ${res.error}`);
      }
    } catch (err) {
      setStatus(`Lỗi: ${err.message}`);
    }
  };

  const handleTranscribe = async () => {
    if (!whisperFile) {
      setStatus('Lỗi: Hãy chọn file audio/video đầu vào.');
      return;
    }
    setStatus('Đang chạy Whisper AI nhận dạng giọng nói... (Quá trình này có thể mất vài phút)');
    setSrtResult('');
    try {
      const res = await window.electronAPI.transcribe({
        filePath: whisperFile,
        language: whisperLang,
        model: 'tiny'
      });
      if (res && res.srt) {
        setSrtResult(res.srt);
        setStatus(`Nhận dạng thành công! Ngôn ngữ phát hiện: ${res.language}`);
      } else {
        setStatus('Nhận dạng thất bại.');
      }
    } catch (err) {
      setStatus(`Lỗi: ${err.message}`);
    }
  };

  const handleAssembleA2V = async () => {
    if (!a2vVisual || !a2vAudio || !a2vOut) {
      setStatus('Lỗi: Hãy nhập đầy đủ file hình ảnh/video, file âm thanh và file đầu ra.');
      return;
    }
    setStatus('Đang ghép âm thanh và video bằng FFmpeg...');
    try {
      const res = await window.electronAPI.assembleA2V({
        video: a2vVisual,
        audio: a2vAudio,
        outputPath: a2vOut
      });
      if (res.success) {
        setStatus(`Ghép A2V thành công! File lưu vào: ${res.outputPath}`);
      } else {
        setStatus(`Thất bại: ${res.error}`);
      }
    } catch (err) {
      setStatus(`Lỗi: ${err.message}`);
    }
  };

  const tabs = [
    { id: 'merge', label: 'Ghép Videos' },
    { id: 'watermark', label: 'Xóa Watermark' },
    { id: 'audio', label: 'Trích âm thanh' },
    { id: 'srt', label: 'Tạo phụ đề SRT' },
    { id: 'a2v', label: 'Ghép A2V' }
  ];

  return (
    <div className="p-8 max-w-4xl">
      <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
        Media & Video Utilities
      </h2>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-slate-700 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setStatus('');
            }}
            className={`px-4 py-2 rounded-t-lg transition-colors font-medium text-sm ${
              activeTab === tab.id
                ? 'bg-slate-800 text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg min-h-[300px]">
        
        {/* MERGE TAB */}
        {activeTab === 'merge' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-semibold text-slate-200">Ghép nhiều Video thành một</h3>
            <p className="text-slate-400 text-sm">Chọn danh sách video đầu vào và vị trí lưu file ghép.</p>
            
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-400">Danh sách file đã chọn ({mergeFiles.length}):</span>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 min-h-[80px] max-h-[150px] overflow-y-auto space-y-1">
                {mergeFiles.map((f, i) => (
                  <div key={i} className="flex justify-between items-center text-xs text-slate-300 bg-slate-900 px-2 py-1 rounded">
                    <span className="truncate flex-1 mr-2">{f}</span>
                    <button 
                      onClick={() => setMergeFiles(mergeFiles.filter((_, idx) => idx !== i))}
                      className="text-rose-400 hover:text-rose-300 font-bold"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
                {mergeFiles.length === 0 && <span className="text-xs text-slate-600 italic">Chưa chọn file nào.</span>}
              </div>
              <button 
                onClick={async () => {
                  const paths = await pickFile('open', true, ['mp4', 'mkv', 'avi', 'mov']);
                  if (paths) setMergeFiles([...mergeFiles, ...paths]);
                }}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs transition-colors"
              >
                + Thêm File Video...
              </button>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1">File đầu ra:</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={mergeOut} 
                  readOnly 
                  placeholder="Chưa chọn nơi lưu..." 
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 cursor-not-allowed"
                />
                <button 
                  onClick={async () => {
                    const p = await pickFile('save', false, ['mp4']);
                    if (p) setMergeOut(p);
                  }}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
                >
                  Chọn nơi lưu
                </button>
              </div>
            </div>

            <button 
              onClick={handleMerge}
              className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-all active:scale-95"
            >
              Bắt đầu ghép Video
            </button>
          </div>
        )}

        {/* WATERMARK TAB */}
        {activeTab === 'watermark' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-semibold text-slate-200">Xóa Watermark khỏi Video</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">File Video nguồn:</label>
              <div className="flex gap-2">
                <input type="text" value={wmFile} readOnly placeholder="Chưa chọn video..." className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 cursor-not-allowed"/>
                <button onClick={async () => { const p = await pickFile('open', false, ['mp4', 'mkv', 'avi']); if (p) setWmFile(p); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs">Chọn File</button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">File Video đầu ra:</label>
              <div className="flex gap-2">
                <input type="text" value={wmOut} readOnly placeholder="Chưa chọn nơi lưu..." className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 cursor-not-allowed"/>
                <button onClick={async () => { const p = await pickFile('save', false, ['mp4']); if (p) setWmOut(p); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs">Chọn nơi lưu</button>
              </div>
            </div>

            <button 
              onClick={handleRemoveWatermark}
              className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-all active:scale-95"
            >
              Thực hiện xóa Watermark
            </button>
          </div>
        )}

        {/* EXTRACT AUDIO TAB */}
        {activeTab === 'audio' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-semibold text-slate-200">Trích xuất âm thanh từ Video</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">File Video nguồn:</label>
              <div className="flex gap-2">
                <input type="text" value={extVideo} readOnly placeholder="Chưa chọn video..." className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 cursor-not-allowed"/>
                <button onClick={async () => { const p = await pickFile('open', false, ['mp4', 'mkv', 'avi']); if (p) setExtVideo(p); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs">Chọn File</button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Lưu file âm thanh (.mp3) tại:</label>
              <div className="flex gap-2">
                <input type="text" value={extOut} readOnly placeholder="Chưa chọn nơi lưu..." className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 cursor-not-allowed"/>
                <button onClick={async () => { const p = await pickFile('save', false, ['mp3']); if (p) setExtOut(p); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs">Chọn nơi lưu</button>
              </div>
            </div>

            <button 
              onClick={handleExtractAudio}
              className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-all active:scale-95"
            >
              Bắt đầu trích xuất âm thanh
            </button>
          </div>
        )}

        {/* WHISPER SRT TAB */}
        {activeTab === 'srt' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-semibold text-slate-200">Tạo phụ đề tự động bằng Whisper AI</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Chọn file Video hoặc Audio:</label>
              <div className="flex gap-2">
                <input type="text" value={whisperFile} readOnly placeholder="Chưa chọn file..." className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 cursor-not-allowed"/>
                <button onClick={async () => { const p = await pickFile('open', false, ['mp4', 'mkv', 'avi', 'mp3', 'wav', 'm4a']); if (p) setWhisperFile(p); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs">Chọn File</button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Ngôn ngữ giọng nói:</label>
              <select 
                value={whisperLang}
                onChange={e => setWhisperLang(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 outline-none"
              >
                <option value="vi">Tiếng Việt (vi)</option>
                <option value="en">Tiếng Anh (en)</option>
              </select>
            </div>

            <button 
              onClick={handleTranscribe}
              className="mt-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-all active:scale-95"
            >
              Chạy nhận dạng giọng nói
            </button>

            {srtResult && (
              <div className="space-y-1 pt-2">
                <span className="block text-xs font-semibold text-slate-400">Phụ đề SRT kết quả:</span>
                <textarea 
                  value={srtResult} 
                  readOnly 
                  rows="8"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-xs text-slate-300 font-mono resize-none"
                />
              </div>
            )}
          </div>
        )}

        {/* ASSEMBLE A2V TAB */}
        {activeTab === 'a2v' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-semibold text-slate-200">Ghép âm thanh vào Video / Ảnh nền (Assemble A2V)</h3>
            
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Chọn file ảnh hoặc video nền:</label>
              <div className="flex gap-2">
                <input type="text" value={a2vVisual} readOnly placeholder="Chưa chọn file..." className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 cursor-not-allowed"/>
                <button onClick={async () => { const p = await pickFile('open', false, ['mp4', 'mkv', 'avi', 'png', 'jpg', 'jpeg']); if (p) setA2vVisual(p); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs">Chọn File</button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Chọn file âm thanh nguồn:</label>
              <div className="flex gap-2">
                <input type="text" value={a2vAudio} readOnly placeholder="Chưa chọn file..." className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 cursor-not-allowed"/>
                <button onClick={async () => { const p = await pickFile('open', false, ['mp3', 'wav', 'm4a']); if (p) setA2vAudio(p); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs">Chọn File</button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">File Video đầu ra:</label>
              <div className="flex gap-2">
                <input type="text" value={a2vOut} readOnly placeholder="Chưa chọn nơi lưu..." className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-300 cursor-not-allowed"/>
                <button onClick={async () => { const p = await pickFile('save', false, ['mp4']); if (p) setA2vOut(p); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs">Chọn nơi lưu</button>
              </div>
            </div>

            <button 
              onClick={handleAssembleA2V}
              className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-all active:scale-95"
            >
              Thực hiện ghép A2V
            </button>
          </div>
        )}

      </div>

      {status && (
        <div className="mt-6 p-4 bg-slate-800 border-l-4 border-emerald-500 rounded text-emerald-400 animate-fade-in text-xs font-medium">
          {status}
        </div>
      )}
    </div>
  );
}

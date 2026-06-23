import React, { useState, useEffect } from 'react';

export default function OmniVoicePage() {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('vi-VN-HoaiMyNeural');
  const [voices, setVoices] = useState([]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getVoices) {
      window.electronAPI.getVoices().then(list => {
        if (list) {
          setVoices(list);
        }
      }).catch(err => {
        console.error('Error fetching voices:', err);
      });
    }
  }, []);

  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    setAudioUrl('');
    setStatus('Đang thực hiện tổng hợp giọng nói Edge-TTS...');
    try {
      if (window.electronAPI && window.electronAPI.synthesizeTTS) {
        const res = await window.electronAPI.synthesizeTTS({
          text,
          voice,
          rate: '+0%',
          pitch: '+0Hz'
        });
        
        if (res.success && res.audioPath) {
          setStatus('Tổng hợp thành công! Đang tải dữ liệu âm thanh...');
          
          const fileRes = await window.electronAPI.readAudio(res.audioPath);
          if (fileRes.success && fileRes.data) {
            const blob = new Blob([fileRes.data], { type: 'audio/mp3' });
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
            setStatus('Đã tải âm thanh xong.');
          } else {
            setStatus(`Lỗi đọc file: ${fileRes.error}`);
          }
        } else {
          setStatus(`Lỗi tổng hợp: ${res.error}`);
        }
      } else {
        setStatus('Electron API không khả dụng.');
      }
    } catch (err) {
      setStatus(`Yêu cầu thất bại: ${err.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        OmniVoice TTS
      </h2>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Text to Synthesize
            </label>
            <textarea
              rows="8"
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
              placeholder="Nhập văn bản tiếng Việt hoặc tiếng Anh..."
            />
            
            <div className="mt-6 flex items-center justify-between">
              {audioUrl ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-3 text-emerald-400 bg-emerald-900/30 px-4 py-2 rounded-lg border border-emerald-500/50">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    <span className="text-sm font-medium">Đã tạo âm thanh thành công</span>
                  </div>
                  <audio src={audioUrl} controls className="h-8 max-w-xs mt-1" />
                </div>
              ) : status ? (
                <div className="text-sm text-slate-400 italic">{status}</div>
              ) : <div />}

              <button
                onClick={handleSynthesize}
                disabled={isSynthesizing || !text}
                className={`px-8 py-3 rounded-lg font-medium shadow-lg transition-all ${
                  isSynthesizing || !text
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-500 text-white active:scale-95'
                }`}
              >
                {isSynthesizing ? 'Synthesizing...' : 'Generate Audio'}
              </button>
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Voice Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Select Voice</label>
                <select 
                  value={voice}
                  onChange={e => setVoice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                >
                  {voices.length > 0 ? (
                    voices.map(v => (
                      <option key={v.shortName} value={v.shortName}>
                        {v.displayName || v.friendlyName || v.shortName} ({v.gender}, {v.locale})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="vi-VN-HoaiMyNeural">Hoài My (Female)</option>
                      <option value="vi-VN-NamMinhNeural">Nam Minh (Male)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';

export default function FlowVeoPage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState('');

  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult('');
    setError('');
    try {
      if (window.electronAPI && window.electronAPI.generateVideo) {
        const res = await window.electronAPI.generateVideo({ prompt });
        if (res.success) {
          setResult(res.videoUrl || 'Tạo video thành công!');
        } else {
          setError(res.error || 'Có lỗi xảy ra.');
        }
      } else {
        setError('Đầu kết nối Electron API không khả dụng.');
      }
    } catch (err) {
      setError(`Yêu cầu thất bại: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Flow & Veo Automation
          </h2>
          <p className="text-slate-400 mt-2">Generate automated video flows powered by Grok and Veo models.</p>
        </div>
      </div>
 
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Prompt Instructions
            </label>
            <textarea
              rows="6"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
              placeholder="Describe the video you want to generate..."
            />
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                className={`px-8 py-3 rounded-lg font-medium shadow-lg transition-all ${
                  isGenerating || !prompt
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                }`}
              >
                {isGenerating ? 'Generating...' : 'Start Generation'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-900/30 border border-rose-500/50 rounded-xl text-rose-400 animate-fade-in">
              <span className="font-semibold mr-2">Lỗi:</span> {error}
            </div>
          )}
 
          {result && (
            <div className="p-4 bg-emerald-900/30 border border-emerald-500/50 rounded-xl text-emerald-400 animate-fade-in">
              <span className="font-semibold mr-2">Success:</span> {result}
            </div>
          )}
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Model Engine</label>
                <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none">
                  <option>Veo 1.5</option>
                  <option>Veo 2.0 (Alpha)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Resolution</label>
                <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none">
                  <option>1080p</option>
                  <option>4K</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

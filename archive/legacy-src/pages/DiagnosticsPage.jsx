import React, { useState, useEffect } from 'react';

export default function DiagnosticsPage() {
  const [logs, setLogs] = useState('');
  const [ffmpegStatus, setFfmpegStatus] = useState('Unknown');
  const [tokens, setTokens] = useState([]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.checkFfmpeg().then(res => {
        setFfmpegStatus(res.success ? 'Installed & Ready' : 'Not Found');
      });
      window.electronAPI.getAllTokens().then(res => {
        if (res && res.tokens) {
          setTokens(res.tokens);
        }
      });
    }
  }, []);

  const handleReadLog = async () => {
    if (window.electronAPI) {
      try {
        const logContent = await window.electronAPI.readDiagLog();
        setLogs(logContent || 'Log file is empty.');
      } catch (err) {
        setLogs(`Error reading log: ${err.message}`);
      }
    }
  };

  const handleOpenLogFolder = async () => {
    if (window.electronAPI) {
      await window.electronAPI.openDiagLogFolder();
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <h2 className="text-3xl font-bold mb-8 text-slate-100">
        Diagnostics & System
      </h2>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* System Status */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            System Status
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
              <span className="text-slate-400">FFmpeg</span>
              <span className={`font-medium ${ffmpegStatus === 'Installed & Ready' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {ffmpegStatus}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
              <span className="text-slate-400">App Version</span>
              <span className="font-medium text-slate-200">1.5.3</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Active Tokens</span>
              <span className="font-medium text-slate-200">{tokens.length} / 5</span>
            </div>
          </div>
        </div>

        {/* Tokens List */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Token Pool</h3>
          {tokens.length === 0 ? (
            <p className="text-slate-500 text-sm italic">No tokens available.</p>
          ) : (
            <div className="space-y-2">
              {tokens.map((t, idx) => (
                <div key={idx} className="bg-slate-900 px-3 py-2 rounded border border-slate-700 flex justify-between items-center text-sm">
                  <span className="text-slate-300 font-mono truncate max-w-[200px]">{t.id}</span>
                  <span className="text-emerald-400 text-xs px-2 py-1 bg-emerald-900/30 rounded-full">Active</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logs Viewer */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-200">System Logs</h3>
          <div className="space-x-3">
            <button
              onClick={handleReadLog}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors"
            >
              Refresh Logs
            </button>
            <button
              onClick={handleOpenLogFolder}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-700 border border-slate-600 text-white rounded text-sm transition-colors"
            >
              Open Log Folder
            </button>
          </div>
        </div>
        
        <div className="bg-black/50 p-4 rounded-lg border border-slate-700 h-[300px] overflow-auto">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
            {logs || 'Click "Refresh Logs" to view latest system events.'}
          </pre>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [savePath, setSavePath] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [features, setFeatures] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSetting('apiKey').then(val => val && setApiKey(val));
      window.electronAPI.getSetting('savePath').then(val => val && setSavePath(val));
      
      // Load license features
      window.electronAPI.getEnabledFeatures().then(res => {
        if (res && res.features) {
          setFeatures(res.features);
        }
      });
      window.electronAPI.checkSavedLicense().then(res => {
         if (res && res.licenseKey) {
            setLicenseKey(res.licenseKey);
         }
      });
    }
  }, []);

  const handleSave = async () => {
    if (window.electronAPI) {
      await window.electronAPI.saveSetting('apiKey', apiKey);
      await window.electronAPI.saveSetting('savePath', savePath);
      setStatus('Settings saved successfully!');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleSelectDir = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.selectDirectory();
      if (!result.canceled && result.filePaths.length > 0) {
        setSavePath(result.filePaths[0]);
      }
    }
  };

  const handleVerifyLicense = async () => {
    if (window.electronAPI) {
      setStatus('Verifying license...');
      try {
        const res = await window.electronAPI.verifyLicense(licenseKey);
        if (res.success && res.valid) {
           setStatus('License activated successfully!');
           window.electronAPI.getEnabledFeatures().then(r => r && r.features && setFeatures(r.features));
        } else {
           setStatus('Invalid license key.');
        }
      } catch (e) {
        setStatus(`Error: ${e.message}`);
      }
      setTimeout(() => setStatus(''), 4000);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h2 className="text-3xl font-bold mb-8 text-slate-100">Settings & License</h2>
      
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* API Key */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Grok / Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="Enter your API key"
            />
          </div>

          {/* Directory Path */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Default Save Directory
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={savePath}
                readOnly
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-slate-400 cursor-not-allowed"
                placeholder="No directory selected"
              />
              <button
                onClick={handleSelectDir}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg transition-colors text-sm font-medium text-white"
              >
                Browse...
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md transition-colors active:scale-95"
            >
              Save Settings
            </button>
            {status && <span className="text-emerald-400 text-sm font-medium">{status}</span>}
          </div>
        </div>

        <div className="space-y-6">
          {/* License */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">License Verification</h3>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                placeholder="XXXX-XXXX-XXXX-XXXX"
              />
              <button
                onClick={handleVerifyLicense}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Verify
              </button>
            </div>
            
            <div className="mt-4">
              <span className="text-sm text-slate-400 mb-2 block">Enabled Features:</span>
              <div className="flex flex-wrap gap-2">
                {features.length > 0 ? (
                  features.map(f => (
                    <span key={f} className="px-2 py-1 bg-indigo-900/40 text-indigo-300 text-xs rounded border border-indigo-500/30">
                      {f}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">No features unlocked</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

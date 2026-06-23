import React from 'react';

export default function MainLayout({ children, currentRoute, setRoute }) {
  const menuItems = [
    { id: 'flow', label: 'Flow & Veo Automation' },
    { id: 'media-utils', label: 'Media & Video Utilities' },
    { id: 'omnivoice', label: 'OmniVoice TTS' },
    { id: 'diagnostics', label: 'Diagnostics & System' },
    { id: 'settings', label: 'Settings & License' }
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Veo Automation
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setRoute(item.id)}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                currentRoute === item.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'hover:bg-slate-700 text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import MainLayout from './layouts/MainLayout';
import SettingsPage from './pages/SettingsPage';
import MediaUtilsPage from './pages/MediaUtilsPage';
import FlowVeoPage from './pages/FlowVeoPage';
import OmniVoicePage from './pages/OmniVoicePage';
import DiagnosticsPage from './pages/DiagnosticsPage';

function App() {
  const [route, setRoute] = useState('settings');

  return (
    <MainLayout currentRoute={route} setRoute={setRoute}>
      {route === 'settings' && <SettingsPage />}
      {route === 'media-utils' && <MediaUtilsPage />}
      {route === 'flow' && <FlowVeoPage />}
      {route === 'omnivoice' && <OmniVoicePage />}
      {route === 'diagnostics' && <DiagnosticsPage />}
    </MainLayout>
  );
}

export default App;

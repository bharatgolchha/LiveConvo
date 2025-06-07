import React from 'react';
import ReactDOM from 'react-dom/client';
import { SidebarApp } from '@/components/SidebarApp';
import '@/styles/globals.css';

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <SidebarApp />
    </React.StrictMode>
  );
}
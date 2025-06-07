import React from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';
import { PopupApp } from '@/components/PopupApp';
import '@/styles/globals.css';

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <PopupApp />
    </React.StrictMode>
  );
}
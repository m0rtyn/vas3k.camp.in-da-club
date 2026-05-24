import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { initServiceWorker } from './lib/sw-registration';
import { useThemeStore } from './store/theme';
import './index.css';

initServiceWorker();

useThemeStore.getState().init();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

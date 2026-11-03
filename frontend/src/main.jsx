import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App.jsx';
import './index.css';

// Configure Axios baseURL for production deployment (Vercel -> Render)
// When VITE_API_URL is unset/empty, relative /api requests route through Vite's dev proxy
const apiBaseUrl = import.meta.env.VITE_API_URL;
if (apiBaseUrl) {
  axios.defaults.baseURL = apiBaseUrl.replace(/\/+$/, '');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

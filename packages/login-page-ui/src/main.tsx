/**
 * EPMCDMETST-71978: React Entry Point
 * 
 * Initializes React application and renders root component
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

ReactDOM.createRoot(
  document.getElementById('root') || document.body
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

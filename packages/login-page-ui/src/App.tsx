/**
 * EPMCDMETST-71978: React App Entry Point
 * 
 * Root component that renders the login form
 */

import React from 'react';
import { LoginForm } from './components/LoginForm/LoginForm';
import './App.scss';

/**
 * App Component
 * 
 * @returns JSX element
 */
function App() {
  const handleLoginSuccess = (user: any) => {
    console.log('✅ Login successful:', user);
  };

  const handleLoginError = (error: string) => {
    console.error('❌ Login error:', error);
  };

  return (
    <div className="app">
      <LoginForm
        onSubmit={handleLoginSuccess}
        onError={handleLoginError}
      />
    </div>
  );
}

export default App;

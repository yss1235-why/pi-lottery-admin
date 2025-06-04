// File path: src/MainApp.js - Clean Main Router Component
import React, { useState, useEffect } from 'react';
import App from './App';                // Admin Interface
import UserApp from './UserApp';        // User Interface
import LegalComponents from './components/LegalComponents';

function MainApp() {
  const [currentInterface, setCurrentInterface] = useState('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check URL path to determine interface
    const path = window.location.pathname;

    if (path.includes('/legal')) {
      setCurrentInterface('legal');
    } else if (path.includes('/admin')) {
      setCurrentInterface('admin');
    } else {
      setCurrentInterface('user');
    }

    setLoading(false);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #6f42c1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        ></div>
        <h3 style={{ marginTop: '20px', color: '#6f42c1' }}>
          🎰 Loading Pi Lottery Platform...
        </h3>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Render current interface
  if (currentInterface === 'legal') {
    return <LegalComponents />;
  }

  return (
    <div className="main-app">
      {currentInterface === 'admin' ? <App /> : <UserApp />}
    </div>
  );
}

export default MainApp;

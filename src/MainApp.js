// File path: src/MainApp.js - Simplified Main Router Component
import React, { useState, useEffect } from 'react';
import App from './App';                // Admin Interface
import UserApp from './UserApp';        // User Interface
import LegalComponents from './components/LegalComponents';

function MainApp() {
  const [currentInterface, setCurrentInterface] = useState('user'); // Default to user interface
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check URL path to determine interface - only admin if explicitly accessing /admin
    const path = window.location.pathname;

    console.log('🔍 Checking route:', { path });

    // If the URL contains "/legal", we'll render LegalComponents instead of admin/user
    if (path.includes('/legal')) {
      setCurrentInterface('legal');
      console.log('📜 Loading Legal Components');
    }
    // Admin interface triggers - only for /admin path
    else if (path.includes('/admin')) {
      setCurrentInterface('admin');
      console.log('🔧 Loading Admin Interface');
    } 
    else {
      setCurrentInterface('user');
      console.log('👤 Loading User Interface');
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
        <p style={{ color: '#6c757d', textAlign: 'center', maxWidth: '400px' }}>
          Connecting to Pi Network and loading available lotteries
        </p>
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

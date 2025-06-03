// File path: src/MainApp.js - Main Router Component
import React, { useState, useEffect } from 'react';
import App from './App'; // Admin Interface
import UserApp from './UserApp'; // User Interface

function MainApp() {
  const [currentInterface, setCurrentInterface] = useState('user'); // Default to user interface
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check URL path to determine interface
    const path = window.location.pathname;
    const search = window.location.search;
    
    console.log('🔍 Checking route:', { path, search });
    
    // Admin interface triggers
    if (path.includes('/admin') || 
        search.includes('admin=true') || 
        search.includes('interface=admin') ||
        localStorage.getItem('pi-lottery-interface') === 'admin') {
      setCurrentInterface('admin');
      console.log('🔧 Loading Admin Interface');
    } else {
      setCurrentInterface('user');
      console.log('👤 Loading User Interface');
    }
    
    setLoading(false);
  }, []);

  // Interface switcher function
  const switchInterface = (interfaceType) => {
    setCurrentInterface(interfaceType);
    localStorage.setItem('pi-lottery-interface', interfaceType);
    
    // Update URL without page reload
    const newUrl = interfaceType === 'admin' ? '/admin' : '/';
    window.history.pushState({}, '', newUrl);
    
    console.log(`🔄 Switched to ${interfaceType} interface`);
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #6f42c1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <h3 style={{ marginTop: '20px', color: '#6f42c1' }}>
          🎰 Loading Pi Lottery Platform...
        </h3>
        <p style={{ color: '#6c757d', textAlign: 'center', maxWidth: '400px' }}>
          Initializing {currentInterface} interface and connecting to Pi Network
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

  // Development interface switcher (only in dev mode)
  const showInterfaceSwitcher = process.env.REACT_APP_DEV_MODE === 'true' || 
                               process.env.NODE_ENV === 'development';

  return (
    <div className="main-app">
      {/* Development Interface Switcher */}
      {showInterfaceSwitcher && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 9999,
          background: 'white',
          border: '2px solid #6f42c1',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          fontSize: '0.9rem'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#6f42c1' }}>
            🔧 Dev Mode
          </div>
          <button
            onClick={() => switchInterface('user')}
            style={{
              background: currentInterface === 'user' ? '#6f42c1' : '#e9ecef',
              color: currentInterface === 'user' ? 'white' : '#6c757d',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '5px',
              fontSize: '0.8rem'
            }}
          >
            👤 User
          </button>
          <button
            onClick={() => switchInterface('admin')}
            style={{
              background: currentInterface === 'admin' ? '#6f42c1' : '#e9ecef',
              color: currentInterface === 'admin' ? 'white' : '#6c757d',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            🔧 Admin
          </button>
        </div>
      )}

      {/* Render current interface */}
      {currentInterface === 'admin' ? <App /> : <UserApp />}

      {/* Interface information for debugging */}
      {process.env.REACT_APP_ENABLE_DEBUG_MODE === 'true' && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontFamily: 'monospace',
          zIndex: 9998
        }}>
          Interface: {currentInterface} | 
          Path: {window.location.pathname} | 
          Build: {process.env.REACT_APP_BUILD_VERSION || 'dev'}
        </div>
      )}
    </div>
  );
}

export default MainApp;

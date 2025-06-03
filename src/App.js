// Replace your entire src/App.js with this temporarily
import React from 'react';

function App() {
  console.log('🚀 Debug App component loaded');
  
  return (
    <div style={{padding: '20px', fontFamily: 'Arial, sans-serif'}}>
      <h1 style={{color: 'green'}}>🧪 Debug Test - React is Working!</h1>
      <p>If you see this, React and Netlify deployment are working correctly.</p>
      
      <h2>Environment Variables Check:</h2>
      <div style={{background: '#f5f5f5', padding: '15px', borderRadius: '5px'}}>
        <ul style={{listStyle: 'none', padding: 0}}>
          <li>✅ API Key: {process.env.REACT_APP_FIREBASE_API_KEY ? 'SET' : '❌ MISSING'}</li>
          <li>✅ Auth Domain: {process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? 'SET' : '❌ MISSING'}</li>
          <li>✅ Project ID: {process.env.REACT_APP_FIREBASE_PROJECT_ID ? 'SET' : '❌ MISSING'}</li>
          <li>✅ Admin Email: {process.env.REACT_APP_ADMIN_EMAIL ? 'SET' : '❌ MISSING'}</li>
          <li>✅ Pi API Key: {process.env.REACT_APP_PI_API_KEY ? 'SET' : '❌ MISSING'}</li>
        </ul>
      </div>
      
      <h2>System Info:</h2>
      <div style={{background: '#e8f4fd', padding: '15px', borderRadius: '5px'}}>
        <p><strong>Node Environment:</strong> {process.env.NODE_ENV}</p>
        <p><strong>Window Object:</strong> {typeof window !== 'undefined' ? '✅ Available' : '❌ Missing'}</p>
        <p><strong>Current Time:</strong> {new Date().toLocaleString()}</p>
      </div>
      
      <h2>Next Steps:</h2>
      <ol>
        <li>If you see this page, React is working ✅</li>
        <li>Check if all environment variables show "SET" ✅</li>
        <li>If everything looks good, the issue is with your main app code</li>
        <li>If variables show "MISSING", there's an issue with Netlify config</li>
      </ol>
    </div>
  );
}

export default App;

// File path: src/index.js - Updated React Entry Point
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import MainApp from './MainApp'; // Import main router component

// Enhanced error boundary for better error handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Pi Lottery App Error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Report error to analytics if enabled
    if (window.lotteryAnalytics && window.lotteryAnalytics.trackEvent) {
      window.lotteryAnalytics.trackEvent('app_error', {
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
          textAlign: 'center',
          background: '#f8f9fa'
        }}>
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxWidth: '500px',
            width: '100%'
          }}>
            <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>
              🚨 Something went wrong
            </h2>
            <p style={{ color: '#6c757d', marginBottom: '20px' }}>
              The Pi Lottery app encountered an unexpected error. Please try refreshing the page.
            </p>
            
            {process.env.REACT_APP_ENABLE_DEBUG_MODE === 'true' && (
              <details style={{ marginBottom: '20px', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
                  🔧 Error Details (Debug Mode)
                </summary>
                <pre style={{ 
                  background: '#f8f9fa', 
                  padding: '10px', 
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}>
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: '#6f42c1',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                marginRight: '10px'
              }}
            >
              🔄 Refresh Page
            </button>
            
            <button 
              onClick={() => window.location.href = '/'}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              🏠 Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize React app
console.log('🚀 Initializing Pi Lottery Platform...');

const root = ReactDOM.createRoot(document.getElementById('root'));

// Enhanced render with error boundary and performance monitoring
const renderApp = () => {
  const startTime = performance.now();
  
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <MainApp />
      </ErrorBoundary>
    </React.StrictMode>
  );
  
  const endTime = performance.now();
  console.log(`⚡ App rendered in ${(endTime - startTime).toFixed(2)}ms`);
  
  // Track app initialization
  if (window.lotteryAnalytics && window.lotteryAnalytics.trackEvent) {
    window.lotteryAnalytics.trackEvent('app_initialized', {
      renderTime: endTime - startTime,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      buildVersion: process.env.REACT_APP_BUILD_VERSION || 'dev'
    });
  }
};

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}

// Performance monitoring
if (process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true') {
  // Web Vitals monitoring
  const reportWebVitals = (metric) => {
    console.log('📊 Web Vital:', metric);
    
    if (window.lotteryAnalytics && window.lotteryAnalytics.trackEvent) {
      window.lotteryAnalytics.trackEvent('web_vital', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  // Import and use web-vitals if available
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(reportWebVitals);
    getFID(reportWebVitals);
    getFCP(reportWebVitals);
    getLCP(reportWebVitals);
    getTTFB(reportWebVitals);
  }).catch(() => {
    console.log('📊 Web Vitals not available');
  });
}

// Hot reload support for development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./MainApp', () => {
    console.log('🔄 Hot reloading MainApp...');
    renderApp();
  });
}

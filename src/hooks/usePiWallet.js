// File path: src/hooks/usePiWallet.js
// Enhanced Pi Wallet hook with timeout and retry logic
import { useState, useEffect, useCallback } from 'react';

export const usePiWallet = () => {
  const [piUser, setPiUser] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionStep, setConnectionStep] = useState('');
  const [debugInfo, setDebugInfo] = useState({});

  // Authentication with timeout and retry
  const connectWithTimeout = useCallback(async (timeoutMs = 30000, retryCount = 0) => {
    const maxRetries = 3;
    
    return new Promise(async (resolve, reject) => {
      let timeoutId;
      let authCompleted = false;

      // Set timeout
      timeoutId = setTimeout(() => {
        if (!authCompleted) {
          authCompleted = true;
          reject(new Error(`Authentication timeout after ${timeoutMs/1000} seconds`));
        }
      }, timeoutMs);

      try {
        setConnectionStep(`Authenticating... (attempt ${retryCount + 1}/${maxRetries + 1})`);
        
        console.log(`🔐 Starting authentication attempt ${retryCount + 1}`);
        
        // Try authentication with minimal scope first
        const authResult = await window.Pi.authenticate(['username'], {
          onIncompletePaymentFound: (payment) => {
            console.log('💳 Incomplete payment found:', payment);
            setConnectionStep('Found incomplete payment, processing...');
          }
        });

        // Clear timeout if successful
        if (timeoutId) clearTimeout(timeoutId);
        
        if (!authCompleted) {
          authCompleted = true;
          console.log('✅ Authentication successful:', authResult);
          resolve(authResult);
        }

      } catch (error) {
        // Clear timeout
        if (timeoutId) clearTimeout(timeoutId);
        
        if (!authCompleted) {
          authCompleted = true;
          console.error(`❌ Authentication attempt ${retryCount + 1} failed:`, error);
          
          // Retry logic
          if (retryCount < maxRetries) {
            console.log(`🔄 Retrying authentication in 2 seconds...`);
            setTimeout(() => {
              connectWithTimeout(timeoutMs, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, 2000);
          } else {
            reject(error);
          }
        }
      }
    });
  }, []);

  // Enhanced permission request
  const requestPaymentPermission = useCallback(async () => {
    try {
      setConnectionStep('Requesting payment permissions...');
      
      // Request payment permission separately
      const paymentAuthResult = await window.Pi.authenticate(['payments'], {
        onIncompletePaymentFound: (payment) => {
          console.log('💳 Incomplete payment during permission request:', payment);
        }
      });

      console.log('✅ Payment permission granted:', paymentAuthResult);
      return paymentAuthResult;
      
    } catch (error) {
      console.error('❌ Payment permission failed:', error);
      throw new Error(`Payment permission failed: ${error.message}`);
    }
  }, []);

  // Main connection function
  const connectWallet = useCallback(async () => {
    setError('');
    setLoading(true);
    setConnectionStep('Initializing...');
    
    try {
      // Step 1: Verify Pi SDK
      if (!window.Pi) {
        throw new Error('Pi SDK not available');
      }

      setConnectionStep('Checking Pi SDK status...');
      
      // Step 2: Initialize if needed
      try {
        await window.Pi.init({ 
          version: "2.0", 
          sandbox: true,
          timeout: 20000  // 20 second timeout
        });
        console.log('✅ Pi SDK initialized');
      } catch (initError) {
        console.warn('⚠️ SDK init warning (might already be initialized):', initError);
        // Continue anyway - SDK might already be initialized
      }

      setConnectionStep('Connecting to Pi Network...');
      
      // Step 3: Authenticate with timeout
      const authResult = await connectWithTimeout(25000); // 25 second timeout
      
      setConnectionStep('Authentication successful!');
      
      // Step 4: Request payment permission if needed
      let finalUser = authResult.user;
      try {
        const paymentAuth = await requestPaymentPermission();
        finalUser = paymentAuth.user;
        console.log('✅ Payment permissions granted');
      } catch (permError) {
        console.warn('⚠️ Payment permission failed, continuing with basic auth:', permError);
        // Continue with basic auth - user can try payments later
      }

      // Step 5: Success
      setPiUser(finalUser);
      setWalletConnected(true);
      setConnectionStep('');
      
      // Update debug info
      setDebugInfo({
        connectedAt: new Date().toISOString(),
        user: finalUser,
        hasPaymentPermission: !!finalUser.accessToken,
        authMethod: 'timeout_retry'
      });
      
      console.log('🎉 Wallet connected successfully:', finalUser);
      
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      setError(`Connection failed: ${error.message}`);
      setConnectionStep('');
      
      // Update debug info with error
      setDebugInfo(prev => ({
        ...prev,
        lastError: {
          message: error.message,
          timestamp: new Date().toISOString(),
          stack: error.stack
        }
      }));
    } finally {
      setLoading(false);
    }
  }, [connectWithTimeout, requestPaymentPermission]);

  // Quick connection test (username only)
  const testConnection = useCallback(async () => {
    try {
      setConnectionStep('Testing connection...');
      
      const testResult = await window.Pi.authenticate(['username'], {
        onIncompletePaymentFound: () => console.log('Test: incomplete payment found')
      });
      
      console.log('✅ Connection test successful:', testResult);
      setConnectionStep('');
      return testResult;
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      setConnectionStep('');
      throw error;
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setPiUser(null);
    setWalletConnected(false);
    setError('');
    setConnectionStep('');
    setDebugInfo({});
    console.log('🔌 Wallet disconnected');
  }, []);

  // Auto-retry on mount if SDK becomes available
  useEffect(() => {
    const checkSDKAndAutoConnect = () => {
      if (window.Pi && !walletConnected && !loading) {
        console.log('📡 Pi SDK detected, auto-connection available');
      }
    };

    checkSDKAndAutoConnect();
    
    // Listen for SDK ready event
    const handleSDKReady = () => {
      console.log('📡 Pi SDK ready event received');
      checkSDKAndAutoConnect();
    };

    window.addEventListener('piSDKReady', handleSDKReady);
    return () => window.removeEventListener('piSDKReady', handleSDKReady);
  }, [walletConnected, loading]);

  return {
    piUser,
    walletConnected,
    loading,
    error,
    connectionStep,
    debugInfo,
    connectWallet,
    testConnection,
    disconnectWallet,
    // Utility functions
    isSDKReady: !!window.Pi,
    canConnect: !!window.Pi && !loading,
    requestPaymentPermission
  };
};

// File path: src/hooks/usePiSDK.js - Enhanced Pi SDK Integration for Pi Browser
import { useState, useEffect, useCallback, useRef } from 'react';

// Track initialization for debugging
if (!window.PI_LOTTERY_START_TIME) {
  window.PI_LOTTERY_START_TIME = Date.now();
}

/**
 * Enhanced Pi SDK Hook optimized for Pi Browser
 * Includes extended timeouts, better error handling, and Pi Browser specific optimizations
 */
export const usePiSDK = () => {
  // State management
  const [piUser, setPiUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPaymentAccess, setHasPaymentAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [authStep, setAuthStep] = useState('');
  
  // Refs for cleanup
  const authTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  // Enhanced Configuration for Pi Browser
  const PI_SDK_CONFIG = {
    version: "2.0",
    sandbox: true, // Set to false for mainnet
    timeout: 60000, // 60 seconds for mobile Pi Browser
    maxRetries: 5, // More retries for mobile
    retryDelay: 3000 // 3 seconds between retries
  };

  // Check if component is still mounted
  const isMounted = () => mountedRef.current;

  // Cleanup function
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Initialize Pi SDK with enhanced Pi Browser detection
  const initializePiSDK = useCallback(async () => {
    try {
      console.log('🔍 Checking Pi SDK availability...');
      
      if (!window.Pi) {
        throw new Error('Pi SDK not available. Please use Pi Browser.');
      }

      console.log('📦 Pi SDK object found, checking methods...');
      
      // Check if required methods exist
      if (typeof window.Pi.init !== 'function') {
        throw new Error('Pi SDK init method not available');
      }
      
      if (typeof window.Pi.authenticate !== 'function') {
        throw new Error('Pi SDK authenticate method not available');
      }

      // Initialize SDK with Pi Browser optimized settings
      console.log('⚙️ Initializing Pi SDK for Pi Browser...');
      
      try {
        await window.Pi.init({
          version: PI_SDK_CONFIG.version,
          sandbox: PI_SDK_CONFIG.sandbox,
          timeout: PI_SDK_CONFIG.timeout
        });
        console.log('✅ Pi SDK initialized successfully');
      } catch (initError) {
        console.warn('⚠️ SDK init failed, but continuing...', initError);
        // Sometimes init fails but SDK still works
      }

      if (isMounted()) {
        setSdkReady(true);
        setError(null);
        console.log('🎯 Pi SDK ready for authentication');
      }

    } catch (error) {
      console.error('❌ Pi SDK initialization failed:', error);
      if (isMounted()) {
        setError(`SDK Initialization Failed: ${error.message}`);
        setSdkReady(false);
      }
    }
  }, []);

  // Listen for Pi SDK ready event
  useEffect(() => {
    const handlePiSDKReady = () => {
      console.log('📡 Pi SDK ready event received');
      initializePiSDK();
    };

    // Check if already available
    if (window.Pi) {
      initializePiSDK();
    } else {
      // Listen for SDK ready event
      window.addEventListener('piSDKReady', handlePiSDKReady);
      
      // Fallback check after delay
      const fallbackCheck = setTimeout(() => {
        if (window.Pi && !sdkReady) {
          initializePiSDK();
        }
      }, 3000);

      return () => {
        window.removeEventListener('piSDKReady', handlePiSDKReady);
        clearTimeout(fallbackCheck);
      };
    }
  }, [initializePiSDK, sdkReady]);

  // Enhanced authentication with Pi Browser optimization
  const authenticateWithRetry = useCallback(async (scopes = ['username'], retryCount = 0) => {
    console.log(`🔐 Starting authentication attempt ${retryCount + 1}/${PI_SDK_CONFIG.maxRetries + 1}...`);
    console.log('📋 Requested scopes:', scopes);
    
    return new Promise((resolve, reject) => {
      // Clear any existing timeout
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }

      const timeout = setTimeout(() => {
        console.error(`⏰ Authentication timeout after ${PI_SDK_CONFIG.timeout / 1000} seconds`);
        reject(new Error(`Authentication timeout after ${PI_SDK_CONFIG.timeout / 1000} seconds. Please try again.`));
      }, PI_SDK_CONFIG.timeout);

      authTimeoutRef.current = timeout;

      // Enhanced authentication call
      console.log('🚀 Calling Pi.authenticate...');
      
      try {
        window.Pi.authenticate(scopes, {
          onIncompletePaymentFound: (payment) => {
            console.log('💳 Incomplete payment found:', payment);
            if (isMounted()) {
              setAuthStep('Processing incomplete payment...');
            }
          }
        }).then(authResult => {
          console.log('✅ Authentication successful:', authResult);
          clearTimeout(timeout);
          resolve(authResult);
        }).catch(authError => {
          console.error('❌ Authentication error:', authError);
          clearTimeout(timeout);
          
          // Enhanced retry logic for Pi Browser
          if (retryCount < PI_SDK_CONFIG.maxRetries) {
            const nextRetry = retryCount + 1;
            const delay = PI_SDK_CONFIG.retryDelay * nextRetry; // Increasing delay
            
            console.log(`🔄 Retrying authentication (${nextRetry}/${PI_SDK_CONFIG.maxRetries}) in ${delay/1000}s...`);
            
            if (isMounted()) {
              setAuthStep(`Retrying authentication (${nextRetry}/${PI_SDK_CONFIG.maxRetries})...`);
            }
            
            retryTimeoutRef.current = setTimeout(() => {
              authenticateWithRetry(scopes, nextRetry)
                .then(resolve)
                .catch(reject);
            }, delay);
          } else {
            console.error('❌ All authentication attempts failed');
            reject(new Error(`Authentication failed after ${PI_SDK_CONFIG.maxRetries + 1} attempts: ${authError.message || authError}`));
          }
        });
      } catch (syncError) {
        console.error('❌ Synchronous authentication error:', syncError);
        clearTimeout(timeout);
        reject(new Error(`Authentication call failed: ${syncError.message}`));
      }
    });
  }, []);

  // Connect user with Pi Browser optimization
  const connectUser = useCallback(async () => {
    if (!sdkReady) {
      const errorMsg = 'Pi SDK not ready. Please wait for initialization to complete.';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    // Check if we're in Pi Browser
    const userAgent = navigator.userAgent;
    const isPiBrowser = userAgent.includes('PiBrowser') || 
                       userAgent.includes('Pi Browser') || 
                       (userAgent.includes('Chrome') && userAgent.includes('wv'));
    
    console.log('📱 Browser detection:', {
      userAgent,
      isPiBrowser,
      hasWindow: typeof window !== 'undefined',
      hasPi: !!window.Pi,
      piMethods: window.Pi ? Object.keys(window.Pi) : []
    });

    setLoading(true);
    setConnectionStatus('connecting');
    setError(null);
    setAuthStep('Connecting to Pi Network...');

    try {
      console.log('🔗 Starting Pi Network connection...');
      
      // Add user interaction hint for Pi Browser
      if (isMounted()) {
        setAuthStep('Please approve the connection request in Pi Browser...');
      }

      const authResult = await authenticateWithRetry(['username']);
      
      console.log('🎉 Authentication result:', authResult);
      
      if (isMounted() && authResult && authResult.user) {
        setPiUser(authResult.user);
        setIsAuthenticated(true);
        setConnectionStatus('connected');
        setAuthStep('');
        
        console.log('✅ User connected successfully:', {
          username: authResult.user.username,
          uid: authResult.user.uid
        });
        
        return authResult.user;
      } else {
        throw new Error('Authentication succeeded but user data is missing');
      }
      
    } catch (error) {
      console.error('❌ User connection failed:', error);
      
      if (isMounted()) {
        // Provide more helpful error messages for common Pi Browser issues
        let errorMessage = error.message;
        
        if (errorMessage.includes('timeout')) {
          errorMessage = 'Connection timed out. Please ensure you have a stable internet connection and try again.';
        } else if (errorMessage.includes('denied') || errorMessage.includes('cancelled')) {
          errorMessage = 'Connection was cancelled. Please try again and approve the request.';
        } else if (errorMessage.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        
        setError(errorMessage);
        setConnectionStatus('error');
        setAuthStep('');
      }
      throw error;
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [sdkReady, authenticateWithRetry]);

  // Request payment access
  const requestPaymentAccess = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('User must be connected first');
    }

    setLoading(true);
    setAuthStep('Requesting payment permissions...');

    try {
      const paymentAuthResult = await authenticateWithRetry(['payments']);
      
      if (isMounted() && paymentAuthResult.user) {
        setPiUser(paymentAuthResult.user);
        setHasPaymentAccess(true);
        setAuthStep('');
        console.log('✅ Payment access granted');
        return paymentAuthResult.user;
      }
    } catch (error) {
      console.error('❌ Payment access request failed:', error);
      if (isMounted()) {
        setError(`Payment access failed: ${error.message}`);
        setAuthStep('');
      }
      throw error;
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, authenticateWithRetry]);

  // Full connection (username + payments)
  const connectWallet = useCallback(async () => {
    try {
      // Step 1: Connect user
      await connectUser();
      
      // Step 2: Request payment access
      await requestPaymentAccess();
      
      return piUser;
    } catch (error) {
      console.error('❌ Full wallet connection failed:', error);
      throw error;
    }
  }, [connectUser, requestPaymentAccess, piUser]);

  // Create payment with enhanced error handling
  const createPayment = useCallback(async (paymentData, callbacks = {}) => {
    if (!hasPaymentAccess) {
      throw new Error('Payment access required. Please connect wallet first.');
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    console.log('💰 Creating Pi payment:', paymentData);

    // Enhanced callbacks with error handling
    const enhancedCallbacks = {
      onReadyForServerApproval: (paymentId) => {
        console.log('📋 Payment ready for approval:', paymentId);
        callbacks.onReadyForServerApproval?.(paymentId);
      },
      
      onReadyForServerCompletion: (paymentId, txnId) => {
        console.log('✅ Payment completed:', { paymentId, txnId });
        callbacks.onReadyForServerCompletion?.(paymentId, txnId);
      },
      
      onCancel: (paymentId) => {
        console.log('❌ Payment cancelled:', paymentId);
        callbacks.onCancel?.(paymentId);
      },
      
      onError: (error, paymentId) => {
        console.error('❌ Payment error:', { error, paymentId });
        callbacks.onError?.(error, paymentId);
      }
    };

    try {
      return await window.Pi.createPayment(paymentData, enhancedCallbacks);
    } catch (error) {
      console.error('❌ Create payment failed:', error);
      throw error;
    }
  }, [hasPaymentAccess]);

  // Disconnect user
  const disconnect = useCallback(() => {
    setPiUser(null);
    setIsAuthenticated(false);
    setHasPaymentAccess(false);
    setConnectionStatus('disconnected');
    setError(null);
    setAuthStep('');
    
    // Clear any pending timeouts
    if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    
    console.log('🔌 User disconnected');
  }, []);

  // Enhanced test connection with Pi Browser diagnostics
  const testConnection = useCallback(async () => {
    if (!sdkReady) {
      throw new Error('Pi SDK not ready');
    }

    console.log('🧪 Starting Pi Browser connection test...');
    
    try {
      setAuthStep('Testing Pi Browser connection...');
      
      // Quick SDK check
      if (!window.Pi || typeof window.Pi.authenticate !== 'function') {
        throw new Error('Pi SDK methods not available');
      }
      
      console.log('📋 Pi SDK methods available:', Object.keys(window.Pi));
      
      // Set up test timeout
      const testTimeout = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Test connection timeout - Pi Browser may not be responding'));
        }, 15000); // 15 seconds for test
      });
      
      // Attempt authentication
      const authPromise = window.Pi.authenticate(['username'], {
        onIncompletePaymentFound: () => {
          console.log('🧪 Test: Incomplete payment found during test');
        }
      });
      
      const testResult = await Promise.race([authPromise, testTimeout]);
      
      if (isMounted()) {
        setAuthStep('');
      }
      
      console.log('✅ Pi Browser connection test successful:', {
        username: testResult.user?.username,
        uid: testResult.user?.uid,
        accessToken: testResult.accessToken ? 'present' : 'missing'
      });
      
      return testResult;
    } catch (error) {
      if (isMounted()) {
        setAuthStep('');
      }
      
      console.error('❌ Pi Browser connection test failed:', error);
      
      // Provide specific error messages for common issues
      let detailedError = error.message;
      
      if (error.message.includes('timeout')) {
        detailedError = 'Pi Browser is not responding to authentication requests. Try refreshing the page or restarting Pi Browser.';
      } else if (error.message.includes('not available')) {
        detailedError = 'Pi SDK is not properly loaded. Please ensure you are using the official Pi Browser.';
      } else if (error.message.includes('network')) {
        detailedError = 'Network connectivity issue. Check your internet connection.';
      }
      
      throw new Error(detailedError);
    }
  }, [sdkReady]);

  // Enhanced connection info for debugging Pi Browser issues
  const getConnectionInfo = useCallback(() => {
    const userAgent = navigator.userAgent;
    const isPiBrowser = userAgent.includes('PiBrowser') || 
                       userAgent.includes('Pi Browser') || 
                       (userAgent.includes('Chrome') && userAgent.includes('wv'));
    
    return {
      // Basic state
      sdkReady,
      isAuthenticated,
      hasPaymentAccess,
      connectionStatus,
      user: piUser,
      error,
      authStep,
      
      // SDK information
      sdkVersion: window.Pi?.version || 'unknown',
      sdkMethods: window.Pi ? Object.keys(window.Pi).sort() : [],
      sdkAvailable: !!window.Pi,
      
      // Browser information
      userAgent,
      isPiBrowser,
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
      
      // Environment
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      
      // Configuration
      config: {
        timeout: PI_SDK_CONFIG.timeout,
        maxRetries: PI_SDK_CONFIG.maxRetries,
        retryDelay: PI_SDK_CONFIG.retryDelay,
        sandbox: PI_SDK_CONFIG.sandbox
      },
      
      // Performance
      uptime: Date.now() - (window.PI_LOTTERY_START_TIME || Date.now()),
      
      // Network status
      online: navigator.onLine,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : 'unknown'
    };
  }, [sdkReady, isAuthenticated, hasPaymentAccess, connectionStatus, piUser, error, authStep]);

  // Quick fix method for common Pi Browser issues
  const quickFix = useCallback(async () => {
    console.log('🔧 Starting Pi Browser quick fix...');
    
    // Reset all state
    setPiUser(null);
    setIsAuthenticated(false);
    setHasPaymentAccess(false);
    setConnectionStatus('disconnected');
    setError(null);
    setAuthStep('Performing quick fix...');
    setLoading(false);
    
    // Clear timeouts
    if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Re-initialize SDK
    try {
      setAuthStep('Re-initializing Pi SDK...');
      await initializePiSDK();
      
      setAuthStep('Quick fix completed. Try connecting again.');
      
      setTimeout(() => {
        if (isMounted()) {
          setAuthStep('');
        }
      }, 3000);
      
      console.log('✅ Quick fix completed');
      return true;
      
    } catch (error) {
      console.error('❌ Quick fix failed:', error);
      setError(`Quick fix failed: ${error.message}`);
      setAuthStep('');
      return false;
    }
  }, [initializePiSDK]);

  // Return hook interface
  return {
    // State
    piUser,
    isAuthenticated,
    hasPaymentAccess,
    loading,
    error,
    sdkReady,
    connectionStatus,
    authStep,
    
    // Actions
    connectUser,
    requestPaymentAccess,
    connectWallet,
    createPayment,
    disconnect,
    testConnection,
    quickFix,
    
    // Utilities
    getConnectionInfo,
    clearError: () => setError(null),
    
    // Computed values
    canConnect: sdkReady && !loading,
    isFullyConnected: isAuthenticated && hasPaymentAccess,
    needsPaymentAccess: isAuthenticated && !hasPaymentAccess
  };
};

// Export default for convenience
export default usePiSDK;

// File path: src/hooks/usePiSDK.js - Enhanced Pi SDK Integration
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Enhanced Pi SDK Hook with best practices
 * Based on Pi Network official patterns and error handling
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

  // Configuration
  const PI_SDK_CONFIG = {
    version: "2.0",
    sandbox: true, // Set to false for mainnet
    timeout: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 2000 // 2 seconds
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

  // Initialize Pi SDK
  const initializePiSDK = useCallback(async () => {
    try {
      if (!window.Pi) {
        throw new Error('Pi SDK not available. Please use Pi Browser.');
      }

      // Initialize SDK if not already done
      if (!window.Pi.isInitialized) {
        await window.Pi.init(PI_SDK_CONFIG);
        console.log('✅ Pi SDK initialized successfully');
      }

      if (isMounted()) {
        setSdkReady(true);
        setError(null);
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

  // Authentication with timeout and retry
  const authenticateWithRetry = useCallback(async (scopes = ['username'], retryCount = 0) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Authentication timeout after ${PI_SDK_CONFIG.timeout / 1000} seconds`));
      }, PI_SDK_CONFIG.timeout);

      authTimeoutRef.current = timeout;

      window.Pi.authenticate(scopes, {
        onIncompletePaymentFound: (payment) => {
          console.log('💳 Incomplete payment found:', payment);
          if (isMounted()) {
            setAuthStep('Processing incomplete payment...');
          }
        }
      }).then(authResult => {
        clearTimeout(timeout);
        resolve(authResult);
      }).catch(authError => {
        clearTimeout(timeout);
        
        if (retryCount < PI_SDK_CONFIG.maxRetries) {
          console.log(`🔄 Retrying authentication (${retryCount + 1}/${PI_SDK_CONFIG.maxRetries})...`);
          
          retryTimeoutRef.current = setTimeout(() => {
            authenticateWithRetry(scopes, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, PI_SDK_CONFIG.retryDelay * (retryCount + 1));
        } else {
          reject(authError);
        }
      });
    });
  }, []);

  // Connect user (username only)
  const connectUser = useCallback(async () => {
    if (!sdkReady) {
      throw new Error('Pi SDK not ready');
    }

    setLoading(true);
    setConnectionStatus('connecting');
    setError(null);
    setAuthStep('Connecting to Pi Network...');

    try {
      const authResult = await authenticateWithRetry(['username']);
      
      if (isMounted() && authResult.user) {
        setPiUser(authResult.user);
        setIsAuthenticated(true);
        setConnectionStatus('connected');
        setAuthStep('');
        console.log('✅ User connected:', authResult.user.username);
        return authResult.user;
      }
    } catch (error) {
      console.error('❌ User connection failed:', error);
      if (isMounted()) {
        setError(error.message);
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

  // Test connection (lightweight check)
  const testConnection = useCallback(async () => {
    if (!sdkReady) {
      throw new Error('Pi SDK not ready');
    }

    try {
      setAuthStep('Testing connection...');
      const testResult = await window.Pi.authenticate(['username'], {
        onIncompletePaymentFound: () => console.log('Test: Incomplete payment found')
      });
      
      if (isMounted()) {
        setAuthStep('');
      }
      
      console.log('✅ Connection test successful');
      return testResult;
    } catch (error) {
      if (isMounted()) {
        setAuthStep('');
      }
      console.error('❌ Connection test failed:', error);
      throw error;
    }
  }, [sdkReady]);

  // Get connection info for debugging
  const getConnectionInfo = useCallback(() => {
    return {
      sdkReady,
      isAuthenticated,
      hasPaymentAccess,
      connectionStatus,
      user: piUser,
      error,
      authStep,
      sdkVersion: window.Pi?.version || 'unknown',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
  }, [sdkReady, isAuthenticated, hasPaymentAccess, connectionStatus, piUser, error, authStep]);

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

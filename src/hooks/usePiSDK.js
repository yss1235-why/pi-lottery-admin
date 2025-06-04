// File path: src/hooks/usePiSDK.js - Clean Auto-Connect Version
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Clean Pi SDK Hook - Auto-connects seamlessly in background
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
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [authStep, setAuthStep] = useState('');
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const [userDeclined, setUserDeclined] = useState(false);
  
  // Refs for cleanup
  const authTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const autoConnectTimeoutRef = useRef(null);

  // Configuration
  const PI_SDK_CONFIG = {
    version: "2.0",
    sandbox: false,
    timeout: 30000,
    maxRetries: 2,
    retryDelay: 3000,
    autoConnectDelay: 2000
  };

  // Check if component is still mounted
  const isMounted = () => mountedRef.current;

  // Cleanup function
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (autoConnectTimeoutRef.current) clearTimeout(autoConnectTimeoutRef.current);
    };
  }, []);

  // Initialize Pi SDK
  const initializePiSDK = useCallback(async () => {
    try {
      if (!window.Pi) {
        throw new Error('Pi SDK not available. Please use Pi Browser.');
      }

      if (typeof window.Pi.authenticate !== 'function') {
        throw new Error('Pi SDK authenticate method not available');
      }

      // Initialize SDK
      try {
        await window.Pi.init({
          version: PI_SDK_CONFIG.version,
          sandbox: PI_SDK_CONFIG.sandbox
        });
      } catch (initError) {
        // Continue anyway - some environments throw warnings here
      }

      if (isMounted()) {
        setSdkReady(true);
        setError(null);
      }

    } catch (error) {
      if (isMounted()) {
        setError(`SDK not available: ${error.message}`);
        setSdkReady(false);
      }
    }
  }, []);

  // Auto-authenticate when SDK is ready
  const autoAuthenticate = useCallback(async (scopes = ['username'], retryCount = 0) => {
    if (autoConnectAttempted && !retryCount) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout - please refresh'));
      }, PI_SDK_CONFIG.timeout);

      authTimeoutRef.current = timeout;

      try {
        window.Pi.authenticate(scopes, {
          onIncompletePaymentFound: (payment) => {
            if (isMounted()) {
              setAuthStep('Processing incomplete payment...');
            }
          }
        }).then(authResult => {
          clearTimeout(timeout);
          setAutoConnectAttempted(true);
          resolve(authResult);
          
        }).catch(authError => {
          clearTimeout(timeout);
          
          // Check if user declined
          if (authError.message?.includes('denied') || 
              authError.message?.includes('cancelled') ||
              authError.message?.includes('rejected')) {
            setUserDeclined(true);
            setAutoConnectAttempted(true);
            reject(new Error('User declined connection'));
            return;
          }
          
          // Retry logic
          if (retryCount < PI_SDK_CONFIG.maxRetries) {
            const nextRetry = retryCount + 1;
            const delay = PI_SDK_CONFIG.retryDelay * nextRetry;
            
            if (isMounted()) {
              setAuthStep(`Connecting (attempt ${nextRetry + 1})...`);
            }
            
            retryTimeoutRef.current = setTimeout(() => {
              autoAuthenticate(scopes, nextRetry)
                .then(resolve)
                .catch(reject);
            }, delay);
          } else {
            setAutoConnectAttempted(true);
            reject(new Error(`Connection failed: ${authError.message}`));
          }
        });

      } catch (syncError) {
        clearTimeout(timeout);
        setAutoConnectAttempted(true);
        reject(new Error(`Connection failed: ${syncError.message}`));
      }
    });
  }, [autoConnectAttempted]);

  // Start auto-connection process when SDK is ready
  useEffect(() => {
    if (sdkReady && !autoConnectAttempted && !userDeclined && !isAuthenticated) {
      if (isMounted()) {
        setAuthStep('Connecting...');
        setConnectionStatus('connecting');
        setLoading(true);
      }

      autoConnectTimeoutRef.current = setTimeout(async () => {
        try {
          if (isMounted()) {
            setAuthStep('Connecting to Pi Network...');
          }

          const authResult = await autoAuthenticate(['username']);
          
          if (isMounted() && authResult && authResult.user) {
            setPiUser(authResult.user);
            setIsAuthenticated(true);
            setConnectionStatus('connected');
            setAuthStep('');
            setError(null);
            
            // Auto-request payment access
            setTimeout(() => {
              if (isMounted() && !hasPaymentAccess) {
                requestPaymentAccessAuto();
              }
            }, 1000);
          }
          
        } catch (autoError) {
          if (isMounted()) {
            setConnectionStatus('error');
            setAuthStep('');
            
            if (!userDeclined) {
              setError(`Connection failed: ${autoError.message}`);
            } else {
              setError('Connection declined');
            }
          }
        } finally {
          if (isMounted()) {
            setLoading(false);
          }
        }
      }, PI_SDK_CONFIG.autoConnectDelay);
    }
  }, [sdkReady, autoConnectAttempted, userDeclined, isAuthenticated, autoAuthenticate]);

  // Auto-request payment access
  const requestPaymentAccessAuto = useCallback(async () => {
    if (!isAuthenticated || hasPaymentAccess) return;

    try {
      if (isMounted()) {
        setAuthStep('Setting up payments...');
        setLoading(true);
      }

      const paymentAuthResult = await autoAuthenticate(['payments']);
      
      if (isMounted() && paymentAuthResult.user) {
        setPiUser(paymentAuthResult.user);
        setHasPaymentAccess(true);
        setAuthStep('');
      }
      
    } catch (paymentError) {
      if (isMounted()) {
        setAuthStep('');
        // Don't show error for payment access failure
      }
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, hasPaymentAccess, autoAuthenticate]);

  // Manual connection methods (fallback)
  const connectUser = useCallback(async () => {
    if (!sdkReady) {
      throw new Error('Pi SDK not ready');
    }

    setLoading(true);
    setConnectionStatus('connecting');
    setError(null);
    setUserDeclined(false);
    setAuthStep('Connecting...');

    try {
      const authResult = await autoAuthenticate(['username']);
      
      if (isMounted() && authResult && authResult.user) {
        setPiUser(authResult.user);
        setIsAuthenticated(true);
        setConnectionStatus('connected');
        setAuthStep('');
        return authResult.user;
      }
      
    } catch (error) {
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
  }, [sdkReady, autoAuthenticate]);

  const requestPaymentAccess = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('User must be connected first');
    }

    setLoading(true);
    setAuthStep('Requesting payment permissions...');

    try {
      const paymentAuthResult = await autoAuthenticate(['payments']);
      
      if (isMounted() && paymentAuthResult.user) {
        setPiUser(paymentAuthResult.user);
        setHasPaymentAccess(true);
        setAuthStep('');
        return paymentAuthResult.user;
      }
    } catch (error) {
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
  }, [isAuthenticated, autoAuthenticate]);

  const connectWallet = useCallback(async () => {
    try {
      await connectUser();
      await requestPaymentAccess();
      return piUser;
    } catch (error) {
      throw error;
    }
  }, [connectUser, requestPaymentAccess, piUser]);

  // Create payment
  const createPayment = useCallback(async (paymentData, callbacks = {}) => {
    if (!hasPaymentAccess) {
      throw new Error('Payment access required. Please connect wallet first.');
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    const enhancedCallbacks = {
      onReadyForServerApproval: (paymentId) => {
        callbacks.onReadyForServerApproval?.(paymentId);
      },
      
      onReadyForServerCompletion: (paymentId, txnId) => {
        callbacks.onReadyForServerCompletion?.(paymentId, txnId);
      },
      
      onCancel: (paymentId) => {
        callbacks.onCancel?.(paymentId);
      },
      
      onError: (error, paymentId) => {
        callbacks.onError?.(error, paymentId);
      }
    };

    try {
      return await window.Pi.createPayment(paymentData, enhancedCallbacks);
    } catch (error) {
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
    setAutoConnectAttempted(false);
    setUserDeclined(false);
    
    // Clear timeouts
    if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (autoConnectTimeoutRef.current) clearTimeout(autoConnectTimeoutRef.current);
  }, []);

  // Test connection
  const testConnection = useCallback(async () => {
    if (!sdkReady) {
      throw new Error('Pi SDK not ready');
    }

    try {
      setAuthStep('Testing connection...');
      const testResult = await autoAuthenticate(['username']);
      
      if (isMounted()) {
        setAuthStep('');
      }
      
      return testResult;
    } catch (error) {
      if (isMounted()) {
        setAuthStep('');
      }
      throw error;
    }
  }, [sdkReady, autoAuthenticate]);

  // Initialize SDK when component mounts
  useEffect(() => {
    const handlePiSDKReady = () => {
      initializePiSDK();
    };

    if (window.Pi) {
      initializePiSDK();
    } else {
      window.addEventListener('piSDKReady', handlePiSDKReady);
      
      // Fallback checks
      const timeouts = [1000, 3000, 5000].map((delay) => {
        return setTimeout(() => {
          if (window.Pi && !sdkReady) {
            initializePiSDK();
          }
        }, delay);
      });

      return () => {
        window.removeEventListener('piSDKReady', handlePiSDKReady);
        timeouts.forEach(timeout => clearTimeout(timeout));
      };
    }
  }, [initializePiSDK, sdkReady]);

  // Get connection info for debugging (minimal)
  const getConnectionInfo = useCallback(() => {
    return {
      sdkReady,
      isAuthenticated,
      hasPaymentAccess,
      connectionStatus,
      user: piUser ? { username: piUser.username, uid: piUser.uid } : null,
      error,
      autoConnectAttempted,
      userDeclined
    };
  }, [sdkReady, isAuthenticated, hasPaymentAccess, connectionStatus, piUser, error, autoConnectAttempted, userDeclined]);

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
    autoConnectAttempted,
    userDeclined,
    
    // Actions (mostly for manual fallback)
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
    needsPaymentAccess: isAuthenticated && !hasPaymentAccess,
    isAutoConnecting: loading && !autoConnectAttempted
  };
};

export default usePiSDK;

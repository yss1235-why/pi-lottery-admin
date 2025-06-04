// File path: src/hooks/usePiSDK.js - Fixed Payment Access
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Fixed Pi SDK Hook - Handles payment access properly
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

  // Auto-authenticate - FIXED to handle different response structures
  const autoAuthenticate = useCallback(async (scopes = ['username'], retryCount = 0) => {
    if (autoConnectAttempted && !retryCount && scopes.includes('username')) {
      return;
    }

    console.log('🔐 Authenticating with scopes:', scopes);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout - please refresh'));
      }, PI_SDK_CONFIG.timeout);

      authTimeoutRef.current = timeout;

      try {
        window.Pi.authenticate(scopes, {
          onIncompletePaymentFound: (payment) => {
            console.log('💳 Incomplete payment found:', payment);
            if (isMounted()) {
              setAuthStep('Processing incomplete payment...');
            }
          }
        }).then(authResult => {
          console.log('✅ Auth result received:', authResult);
          clearTimeout(timeout);
          
          if (scopes.includes('username')) {
            setAutoConnectAttempted(true);
          }
          
          resolve(authResult);
          
        }).catch(authError => {
          console.error('❌ Auth error:', authError);
          clearTimeout(timeout);
          
          // Check if user declined
          if (authError.message?.includes('denied') || 
              authError.message?.includes('cancelled') ||
              authError.message?.includes('rejected')) {
            setUserDeclined(true);
            if (scopes.includes('username')) {
              setAutoConnectAttempted(true);
            }
            reject(new Error('User declined connection'));
            return;
          }
          
          // Retry logic for username scope only
          if (retryCount < PI_SDK_CONFIG.maxRetries && scopes.includes('username')) {
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
            if (scopes.includes('username')) {
              setAutoConnectAttempted(true);
            }
            reject(new Error(`Connection failed: ${authError.message}`));
          }
        });

      } catch (syncError) {
        console.error('❌ Sync error:', syncError);
        clearTimeout(timeout);
        if (scopes.includes('username')) {
          setAutoConnectAttempted(true);
        }
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
            
            console.log('🎉 Auto-connection successful!');
            
            // Auto-request payment access after a short delay
            setTimeout(() => {
              if (isMounted() && !hasPaymentAccess) {
                requestPaymentAccessAuto();
              }
            }, 1000);
          }
          
        } catch (autoError) {
          console.error('❌ Auto-connection failed:', autoError);
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

  // FIXED: Auto-request payment access
  const requestPaymentAccessAuto = useCallback(async () => {
    if (!isAuthenticated || hasPaymentAccess) return;

    console.log('💰 Auto-requesting payment access...');

    try {
      if (isMounted()) {
        setAuthStep('Setting up payments...');
        setLoading(true);
      }

      const paymentAuthResult = await autoAuthenticate(['payments']);
      
      console.log('💰 Payment auth result:', paymentAuthResult);
      
      // FIXED: Handle different response structures
      if (isMounted()) {
        // If we get here, payment access was granted
        setHasPaymentAccess(true);
        setAuthStep('');
        
        // Keep existing user data if payment result doesn't include user
        if (paymentAuthResult && paymentAuthResult.user) {
          setPiUser(paymentAuthResult.user);
        }
        // If no user in payment result, keep existing piUser
        
        console.log('✅ Payment access granted automatically!');
      }
      
    } catch (paymentError) {
      console.error('❌ Auto payment access failed:', paymentError);
      if (isMounted()) {
        setAuthStep('');
        // Don't show error for auto payment access failure
        console.log('ℹ️ Payment access will be requested when needed');
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

  // FIXED: Request payment access
  const requestPaymentAccess = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('User must be connected first');
    }

    console.log('💰 Manually requesting payment access...');

    setLoading(true);
    setAuthStep('Requesting payment permissions...');

    try {
      const paymentAuthResult = await autoAuthenticate(['payments']);
      
      console.log('💰 Manual payment auth result:', paymentAuthResult);
      
      // FIXED: Handle payment access properly
      if (isMounted()) {
        // If we get here without error, payment access was granted
        setHasPaymentAccess(true);
        setAuthStep('');
        
        // Update user data if provided, otherwise keep existing
        if (paymentAuthResult && paymentAuthResult.user) {
          setPiUser(paymentAuthResult.user);
        }
        
        console.log('✅ Payment access granted manually!');
        return piUser; // Return existing user
      }
    } catch (error) {
      console.error('❌ Manual payment access failed:', error);
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
  }, [isAuthenticated, autoAuthenticate, piUser]);

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

    console.log('💰 Creating Pi payment:', paymentData);

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
    setAutoConnectAttempted(false);
    setUserDeclined(false);
    
    // Clear timeouts
    if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (autoConnectTimeoutRef.current) clearTimeout(autoConnectTimeoutRef.current);
    
    console.log('🔌 User disconnected');
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

// File path: src/hooks/usePiSDK.js - Auto-Connect Version (No Buttons Required)
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Auto-Connect Pi SDK Hook - Automatically attempts connection when app loads
 * The Pi Browser popup will still appear for user consent, but no button click needed
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
    maxRetries: 2, // Fewer retries for auto-connect
    retryDelay: 3000,
    autoConnectDelay: 2000 // Wait 2 seconds after SDK ready before auto-connecting
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
      console.log('🔍 Initializing Pi SDK for auto-connect...');
      
      if (!window.Pi) {
        throw new Error('Pi SDK not available. Please use Pi Browser.');
      }

      // Check required methods
      if (typeof window.Pi.authenticate !== 'function') {
        throw new Error('Pi SDK authenticate method not available');
      }

      // Initialize SDK
      try {
        await window.Pi.init({
          version: PI_SDK_CONFIG.version,
          sandbox: PI_SDK_CONFIG.sandbox
        });
        console.log('✅ Pi SDK initialized for auto-connect');
      } catch (initError) {
        console.warn('⚠️ SDK init warning (continuing anyway):', initError);
      }

      if (isMounted()) {
        setSdkReady(true);
        setError(null);
        console.log('🎯 Pi SDK ready - auto-connect will start soon...');
      }

    } catch (error) {
      console.error('❌ Pi SDK initialization failed:', error);
      if (isMounted()) {
        setError(`SDK Initialization Failed: ${error.message}`);
        setSdkReady(false);
      }
    }
  }, []);

  // Auto-authenticate when SDK is ready
  const autoAuthenticate = useCallback(async (scopes = ['username'], retryCount = 0) => {
    if (autoConnectAttempted && !retryCount) {
      console.log('🔄 Auto-connect already attempted, skipping...');
      return;
    }

    console.log(`🤖 Auto-authenticating (attempt ${retryCount + 1})...`);
    console.log('📋 Scopes:', scopes);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.warn(`⏰ Auto-authentication timeout after ${PI_SDK_CONFIG.timeout / 1000} seconds`);
        reject(new Error('Auto-authentication timeout - Pi Browser may need refresh'));
      }, PI_SDK_CONFIG.timeout);

      authTimeoutRef.current = timeout;

      try {
        console.log('🚀 Starting automatic Pi authentication...');
        
        window.Pi.authenticate(scopes, {
          onIncompletePaymentFound: (payment) => {
            console.log('💳 Incomplete payment found during auto-connect:', payment);
            if (isMounted()) {
              setAuthStep('Processing incomplete payment...');
            }
          }
        }).then(authResult => {
          console.log('✅ Auto-authentication successful!', {
            username: authResult.user?.username,
            uid: authResult.user?.uid
          });
          
          clearTimeout(timeout);
          setAutoConnectAttempted(true);
          resolve(authResult);
          
        }).catch(authError => {
          console.error('❌ Auto-authentication failed:', authError);
          clearTimeout(timeout);
          
          // Check if user declined
          if (authError.message?.includes('denied') || 
              authError.message?.includes('cancelled') ||
              authError.message?.includes('rejected')) {
            console.log('👤 User declined auto-connection');
            setUserDeclined(true);
            setAutoConnectAttempted(true);
            reject(new Error('User declined connection'));
            return;
          }
          
          // Retry logic for auto-connect
          if (retryCount < PI_SDK_CONFIG.maxRetries) {
            const nextRetry = retryCount + 1;
            const delay = PI_SDK_CONFIG.retryDelay * nextRetry;
            
            console.log(`🔄 Auto-connect retry ${nextRetry}/${PI_SDK_CONFIG.maxRetries} in ${delay/1000}s...`);
            
            if (isMounted()) {
              setAuthStep(`Auto-connecting (attempt ${nextRetry + 1})...`);
            }
            
            retryTimeoutRef.current = setTimeout(() => {
              autoAuthenticate(scopes, nextRetry)
                .then(resolve)
                .catch(reject);
            }, delay);
          } else {
            setAutoConnectAttempted(true);
            reject(new Error(`Auto-connection failed: ${authError.message}`));
          }
        });

      } catch (syncError) {
        console.error('❌ Auto-authentication sync error:', syncError);
        clearTimeout(timeout);
        setAutoConnectAttempted(true);
        reject(new Error(`Auto-connect failed: ${syncError.message}`));
      }
    });
  }, [autoConnectAttempted]);

  // Start auto-connection process when SDK is ready
  useEffect(() => {
    if (sdkReady && !autoConnectAttempted && !userDeclined && !isAuthenticated) {
      console.log('🤖 SDK ready - starting auto-connect sequence...');
      
      if (isMounted()) {
        setAuthStep('Starting automatic connection...');
        setConnectionStatus('connecting');
        setLoading(true);
      }

      // Delay auto-connect slightly to ensure everything is ready
      autoConnectTimeoutRef.current = setTimeout(async () => {
        try {
          console.log('🚀 Beginning auto-connect to Pi Network...');
          
          if (isMounted()) {
            setAuthStep('Connecting to Pi Network automatically...');
          }

          const authResult = await autoAuthenticate(['username']);
          
          if (isMounted() && authResult && authResult.user) {
            setPiUser(authResult.user);
            setIsAuthenticated(true);
            setConnectionStatus('connected');
            setAuthStep('');
            setError(null);
            
            console.log('🎉 Auto-connection successful!');
            
            // Optional: Auto-request payment access too
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
              setError(`Auto-connection failed: ${autoError.message}`);
            } else {
              setError('Connection declined. You can manually connect using the button below.');
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

    console.log('💰 Auto-requesting payment access...');
    
    try {
      if (isMounted()) {
        setAuthStep('Requesting payment permissions...');
        setLoading(true);
      }

      const paymentAuthResult = await autoAuthenticate(['payments']);
      
      if (isMounted() && paymentAuthResult.user) {
        setPiUser(paymentAuthResult.user);
        setHasPaymentAccess(true);
        setAuthStep('');
        console.log('💰 Payment access granted automatically!');
      }
      
    } catch (paymentError) {
      console.error('❌ Auto payment access failed:', paymentError);
      if (isMounted()) {
        setAuthStep('');
        // Don't set error for payment access failure - user can do it manually
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

    console.log('👆 Manual connection requested...');
    
    setLoading(true);
    setConnectionStatus('connecting');
    setError(null);
    setUserDeclined(false);
    setAuthStep('Connecting manually...');

    try {
      const authResult = await autoAuthenticate(['username']);
      
      if (isMounted() && authResult && authResult.user) {
        setPiUser(authResult.user);
        setIsAuthenticated(true);
        setConnectionStatus('connected');
        setAuthStep('');
        console.log('✅ Manual connection successful');
        return authResult.user;
      }
      
    } catch (error) {
      console.error('❌ Manual connection failed:', error);
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
        console.log('💰 Payment access granted');
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
  }, [isAuthenticated, autoAuthenticate]);

  const connectWallet = useCallback(async () => {
    try {
      await connectUser();
      await requestPaymentAccess();
      return piUser;
    } catch (error) {
      console.error('❌ Full wallet connection failed:', error);
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
    
    console.log('🔌 User disconnected - auto-connect reset');
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
      
      console.log('✅ Connection test successful');
      return testResult;
    } catch (error) {
      if (isMounted()) {
        setAuthStep('');
      }
      console.error('❌ Connection test failed:', error);
      throw error;
    }
  }, [sdkReady, autoAuthenticate]);

  // Initialize SDK when component mounts
  useEffect(() => {
    const handlePiSDKReady = () => {
      console.log('📡 Pi SDK ready event received');
      initializePiSDK();
    };

    if (window.Pi) {
      console.log('📦 Pi SDK already available, initializing...');
      initializePiSDK();
    } else {
      console.log('⏳ Waiting for Pi SDK...');
      window.addEventListener('piSDKReady', handlePiSDKReady);
      
      // Fallback checks
      const timeouts = [1000, 3000, 5000].map((delay, index) => {
        return setTimeout(() => {
          if (window.Pi && !sdkReady) {
            console.log(`📦 Pi SDK found in fallback check ${index + 1}`);
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
      autoConnectAttempted,
      userDeclined,
      sdkVersion: window.Pi?.version || 'unknown',
      sdkMethods: window.Pi ? Object.keys(window.Pi).sort() : [],
      config: PI_SDK_CONFIG,
      timestamp: new Date().toISOString()
    };
  }, [sdkReady, isAuthenticated, hasPaymentAccess, connectionStatus, piUser, error, authStep, autoConnectAttempted, userDeclined]);

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

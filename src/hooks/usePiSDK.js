// File path: src/hooks/usePiSDK.js - PRODUCTION VERSION
// ⚠️ WARNING: PRODUCTION MODE - REAL PI CRYPTOCURRENCY ⚠️
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Production Pi SDK Hook - Handles REAL Pi cryptocurrency transactions
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

  // PRODUCTION Configuration - REAL Pi Network
  const PI_SDK_CONFIG = {
    version: "2.0",
    sandbox: false,  // PRODUCTION MODE - REAL Pi!
    timeout: 45000,  // Increased timeout for production
    maxRetries: 3,   // More retries for production reliability
    retryDelay: 5000, // Longer delay for production
    autoConnectDelay: 3000, // Longer delay for production
    environment: 'production'
  };

  // Production warnings
  useEffect(() => {
    if (process.env.REACT_APP_PI_ENVIRONMENT === 'production') {
      console.warn('🚨 PRODUCTION MODE: Using REAL Pi cryptocurrency!');
      console.warn('💰 All transactions involve actual Pi tokens with real value');
      console.warn('⚠️ Ensure users understand they are gambling with real money');
    }
  }, []);

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

  // Initialize Pi SDK for PRODUCTION
  const initializePiSDK = useCallback(async () => {
    try {
      if (!window.Pi) {
        throw new Error('Pi SDK not available. Please use Pi Browser or Pi mobile app.');
      }

      if (typeof window.Pi.authenticate !== 'function') {
        throw new Error('Pi SDK authenticate method not available');
      }

      // Initialize SDK for PRODUCTION
      try {
        await window.Pi.init({
          version: PI_SDK_CONFIG.version,
          sandbox: PI_SDK_CONFIG.sandbox  // false for production
        });
        
        console.log('✅ Pi SDK initialized for PRODUCTION mode');
        console.warn('🚨 REAL Pi cryptocurrency mode active!');
      } catch (initError) {
        console.warn('⚠️ Pi SDK init warning (continuing anyway):', initError.message);
      }

      if (isMounted()) {
        setSdkReady(true);
        setError(null);
      }

    } catch (error) {
      console.error('❌ Pi SDK initialization failed:', error);
      if (isMounted()) {
        setError(`Pi SDK not available: ${error.message}`);
        setSdkReady(false);
      }
    }
  }, []);

  // Production-safe authentication with enhanced error handling
  const autoAuthenticate = useCallback(async (scopes = ['username'], retryCount = 0) => {
    if (autoConnectAttempted && !retryCount && scopes.includes('username')) {
      return;
    }

    console.log('🔐 PRODUCTION AUTH: Authenticating with scopes:', scopes);
    console.warn('💰 This will access REAL Pi cryptocurrency!');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Production authentication timeout - please try again'));
      }, PI_SDK_CONFIG.timeout);

      authTimeoutRef.current = timeout;

      try {
        window.Pi.authenticate(scopes, {
          onIncompletePaymentFound: (payment) => {
            console.log('💳 PRODUCTION: Incomplete payment found:', payment);
            console.warn('💰 This involves REAL Pi cryptocurrency!');
            if (isMounted()) {
              setAuthStep('Processing incomplete real Pi payment...');
            }
          }
        }).then(authResult => {
          console.log('✅ PRODUCTION AUTH successful:', authResult);
          console.warn('💰 User authenticated for REAL Pi transactions!');
          clearTimeout(timeout);
          
          if (scopes.includes('username')) {
            setAutoConnectAttempted(true);
          }
          
          resolve(authResult);
          
        }).catch(authError => {
          console.error('❌ PRODUCTION AUTH error:', authError);
          clearTimeout(timeout);
          
          // Check if user declined
          if (authError.message?.includes('denied') || 
              authError.message?.includes('cancelled') ||
              authError.message?.includes('rejected')) {
            setUserDeclined(true);
            if (scopes.includes('username')) {
              setAutoConnectAttempted(true);
            }
            reject(new Error('User declined real Pi cryptocurrency access'));
            return;
          }
          
          // Retry logic for production reliability
          if (retryCount < PI_SDK_CONFIG.maxRetries && scopes.includes('username')) {
            const nextRetry = retryCount + 1;
            const delay = PI_SDK_CONFIG.retryDelay * nextRetry;
            
            if (isMounted()) {
              setAuthStep(`Connecting to Pi Network (attempt ${nextRetry + 1})...`);
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
            reject(new Error(`Production connection failed: ${authError.message}`));
          }
        });

      } catch (syncError) {
        console.error('❌ PRODUCTION sync error:', syncError);
        clearTimeout(timeout);
        if (scopes.includes('username')) {
          setAutoConnectAttempted(true);
        }
        reject(new Error(`Production connection failed: ${syncError.message}`));
      }
    });
  }, [autoConnectAttempted]);

  // Auto-connect for production
  useEffect(() => {
    if (sdkReady && !autoConnectAttempted && !userDeclined && !isAuthenticated) {
      if (isMounted()) {
        setAuthStep('Connecting to Pi Network...');
        setConnectionStatus('connecting');
        setLoading(true);
      }

      autoConnectTimeoutRef.current = setTimeout(async () => {
        try {
          if (isMounted()) {
            setAuthStep('Connecting to REAL Pi Network...');
          }

          const authResult = await autoAuthenticate(['username']);
          
          if (isMounted() && authResult && authResult.user) {
            setPiUser(authResult.user);
            setIsAuthenticated(true);
            setConnectionStatus('connected');
            setAuthStep('');
            setError(null);
            
            console.log('🎉 PRODUCTION auto-connection successful!');
            console.warn('💰 User connected for REAL Pi transactions!');
            
            // Auto-request payment access for production
            setTimeout(() => {
              if (isMounted() && !hasPaymentAccess) {
                requestPaymentAccessAuto();
              }
            }, 2000);
          }
          
        } catch (autoError) {
          console.error('❌ PRODUCTION auto-connection failed:', autoError);
          if (isMounted()) {
            setConnectionStatus('error');
            setAuthStep('');
            
            if (!userDeclined) {
              setError(`Production connection failed: ${autoError.message}`);
            } else {
              setError('Real Pi cryptocurrency access declined');
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

  // Production payment access with enhanced warnings
  const requestPaymentAccessAuto = useCallback(async () => {
    if (!isAuthenticated || hasPaymentAccess) return;

    console.log('💰 PRODUCTION: Auto-requesting REAL Pi payment access...');
    console.warn('🚨 This enables REAL cryptocurrency transactions!');

    try {
      if (isMounted()) {
        setAuthStep('Setting up REAL Pi payments...');
        setLoading(true);
      }

      const paymentAuthResult = await autoAuthenticate(['payments']);
      
      console.log('💰 PRODUCTION payment auth result:', paymentAuthResult);
      console.warn('✅ REAL Pi payment access granted!');
      
      if (isMounted()) {
        setHasPaymentAccess(true);
        setAuthStep('');
        
        if (paymentAuthResult && paymentAuthResult.user) {
          setPiUser(paymentAuthResult.user);
        }
        
        console.log('✅ PRODUCTION payment access granted automatically!');
      }
      
    } catch (paymentError) {
      console.error('❌ PRODUCTION payment access failed:', paymentError);
      if (isMounted()) {
        setAuthStep('');
        console.log('ℹ️ REAL Pi payment access will be requested when needed');
      }
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, hasPaymentAccess, autoAuthenticate]);

  // Manual connection for production
  const connectUser = useCallback(async () => {
    if (!sdkReady) {
      throw new Error('Pi SDK not ready');
    }

    console.warn('💰 Manual connection to REAL Pi Network...');

    setLoading(true);
    setConnectionStatus('connecting');
    setError(null);
    setUserDeclined(false);
    setAuthStep('Connecting to REAL Pi Network...');

    try {
      const authResult = await autoAuthenticate(['username']);
      
      if (isMounted() && authResult && authResult.user) {
        setPiUser(authResult.user);
        setIsAuthenticated(true);
        setConnectionStatus('connected');
        setAuthStep('');
        console.warn('💰 User connected for REAL Pi transactions!');
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

  // Production payment access with warnings
  const requestPaymentAccess = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('User must be connected first');
    }

    console.log('💰 PRODUCTION: Manually requesting REAL Pi payment access...');
    console.warn('🚨 This enables REAL cryptocurrency transactions!');

    setLoading(true);
    setAuthStep('Requesting REAL Pi payment permissions...');

    try {
      const paymentAuthResult = await autoAuthenticate(['payments']);
      
      console.log('💰 PRODUCTION manual payment auth result:', paymentAuthResult);
      
      if (isMounted()) {
        setHasPaymentAccess(true);
        setAuthStep('');
        
        if (paymentAuthResult && paymentAuthResult.user) {
          setPiUser(paymentAuthResult.user);
        }
        
        console.log('✅ PRODUCTION payment access granted manually!');
        console.warn('💰 User can now make REAL Pi transactions!');
        return piUser;
      }
    } catch (error) {
      console.error('❌ PRODUCTION payment access failed:', error);
      if (isMounted()) {
        setError(`Real Pi payment access failed: ${error.message}`);
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
    console.warn('💰 Connecting wallet for REAL Pi transactions...');
    try {
      await connectUser();
      await requestPaymentAccess();
      return piUser;
    } catch (error) {
      throw error;
    }
  }, [connectUser, requestPaymentAccess, piUser]);

  // Create PRODUCTION payment with enhanced warnings
  const createPayment = useCallback(async (paymentData, callbacks = {}) => {
    if (!hasPaymentAccess) {
      throw new Error('Real Pi payment access required. Please connect wallet first.');
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    console.log('💰 PRODUCTION: Creating REAL Pi payment:', paymentData);
    console.warn('🚨 This involves REAL Pi cryptocurrency with actual value!');
    console.warn('💰 Amount:', paymentData.amount, 'Pi (REAL VALUE)');

    const enhancedCallbacks = {
      onReadyForServerApproval: (paymentId) => {
        console.log('📋 PRODUCTION payment ready for approval:', paymentId);
        console.warn('💰 Real Pi transaction pending...');
        callbacks.onReadyForServerApproval?.(paymentId);
      },
      
      onReadyForServerCompletion: (paymentId, txnId) => {
        console.log('✅ PRODUCTION payment completed:', { paymentId, txnId });
        console.warn('💰 REAL Pi cryptocurrency transferred!');
        callbacks.onReadyForServerCompletion?.(paymentId, txnId);
      },
      
      onCancel: (paymentId) => {
        console.log('❌ PRODUCTION payment cancelled:', paymentId);
        console.log('💰 No real Pi was transferred');
        callbacks.onCancel?.(paymentId);
      },
      
      onError: (error, paymentId) => {
        console.error('❌ PRODUCTION payment error:', { error, paymentId });
        console.error('💰 Real Pi transaction failed!');
        callbacks.onError?.(error, paymentId);
      }
    };

    try {
      return await window.Pi.createPayment(paymentData, enhancedCallbacks);
    } catch (error) {
      console.error('❌ PRODUCTION create payment failed:', error);
      throw error;
    }
  }, [hasPaymentAccess]);

  // Disconnect with production warnings
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from REAL Pi Network...');
    
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
    
    console.log('🔌 User disconnected from REAL Pi Network');
  }, []);

  // Test connection for production
  const testConnection = useCallback(async () => {
    if (!sdkReady) {
      throw new Error('Pi SDK not ready');
    }

    console.warn('💰 Testing REAL Pi Network connection...');

    try {
      setAuthStep('Testing REAL Pi connection...');
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
      
      // Enhanced fallback checks for production
      const timeouts = [2000, 5000, 8000].map((delay) => {
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

  // Get connection info for production debugging
  const getConnectionInfo = useCallback(() => {
    return {
      sdkReady,
      isAuthenticated,
      hasPaymentAccess,
      connectionStatus,
      user: piUser ? { username: piUser.username, uid: piUser.uid } : null,
      error,
      autoConnectAttempted,
      userDeclined,
      environment: 'PRODUCTION',
      realCurrency: true,
      warnings: [
        'Using REAL Pi cryptocurrency',
        'All transactions have real monetary value',
        'Users are gambling with actual money'
      ]
    };
  }, [sdkReady, isAuthenticated, hasPaymentAccess, connectionStatus, piUser, error, autoConnectAttempted, userDeclined]);

  // Return hook interface with production warnings
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
    needsPaymentAccess: isAuthenticated && !hasPaymentAccess,
    isAutoConnecting: loading && !autoConnectAttempted,
    
    // Production flags
    isProduction: true,
    usesRealCurrency: true,
    environment: 'production'
  };
};

export default usePiSDK;

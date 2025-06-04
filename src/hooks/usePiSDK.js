// File path: src/hooks/usePiSDK.js - Enhanced for Missing Pi Browser Popup Fix
import { useState, useEffect, useCallback, useRef } from 'react';

// Track initialization and popup issues
if (!window.PI_LOTTERY_START_TIME) {
  window.PI_LOTTERY_START_TIME = Date.now();
}

if (!window.PI_AUTH_ATTEMPTS) {
  window.PI_AUTH_ATTEMPTS = [];
}

/**
 * Enhanced Pi SDK Hook - Specifically fixes missing authentication popup issue
 * Common in Pi Browser when SDK doesn't properly trigger native authentication
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
  const [popupIssueDetected, setPopupIssueDetected] = useState(false);
  
  // Refs for cleanup
  const authTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const popupTimeoutRef = useRef(null);

  // Enhanced configuration for Pi Browser popup issues
  const PI_SDK_CONFIG = {
    version: "2.0",
    sandbox: true,
    timeout: 45000, // 45 seconds - optimized for popup detection
    maxRetries: 3,
    retryDelay: 5000,
    popupTimeout: 10000 // 10 seconds to detect if popup appears
  };

  // Check if component is still mounted
  const isMounted = () => mountedRef.current;

  // Cleanup function
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    };
  }, []);

  // Enhanced Pi Browser detection
  const detectPiBrowser = useCallback(() => {
    const userAgent = navigator.userAgent;
    const windowFeatures = {
      hasPi: !!window.Pi,
      hasWebView: userAgent.includes('wv'),
      isAndroid: userAgent.includes('Android'),
      isChrome: userAgent.includes('Chrome'),
      isPiBrowser: userAgent.includes('PiBrowser') || userAgent.includes('Pi Browser')
    };

    // More comprehensive Pi Browser detection
    const isPiBrowserLikely = 
      windowFeatures.hasPi || 
      windowFeatures.isPiBrowser || 
      (windowFeatures.hasWebView && windowFeatures.isAndroid && windowFeatures.isChrome);

    console.log('🔍 Browser Detection:', {
      userAgent,
      ...windowFeatures,
      isPiBrowserLikely,
      piSDKMethods: window.Pi ? Object.keys(window.Pi) : [],
      timestamp: new Date().toISOString()
    });

    return {
      ...windowFeatures,
      isPiBrowserLikely,
      confidence: windowFeatures.isPiBrowser ? 'high' : 
                  windowFeatures.hasPi ? 'medium' : 
                  isPiBrowserLikely ? 'low' : 'none'
    };
  }, []);

  // Initialize Pi SDK with enhanced popup detection
  const initializePiSDK = useCallback(async () => {
    try {
      console.log('🔍 Starting Pi SDK initialization...');
      
      const browserInfo = detectPiBrowser();
      console.log('📱 Browser analysis:', browserInfo);

      if (!window.Pi) {
        if (browserInfo.isPiBrowserLikely) {
          throw new Error('Pi SDK not loaded. Try refreshing the page or restarting Pi Browser.');
        } else {
          throw new Error('Please use the official Pi Browser to access this app.');
        }
      }

      // Test SDK methods availability
      const requiredMethods = ['init', 'authenticate'];
      const availableMethods = Object.keys(window.Pi);
      const missingMethods = requiredMethods.filter(method => !availableMethods.includes(method));

      console.log('📋 SDK Methods Check:', {
        required: requiredMethods,
        available: availableMethods,
        missing: missingMethods
      });

      if (missingMethods.length > 0) {
        throw new Error(`Pi SDK missing required methods: ${missingMethods.join(', ')}`);
      }

      // Initialize with popup-friendly settings
      console.log('⚙️ Initializing Pi SDK...');
      
      try {
        const initResult = await window.Pi.init({
          version: PI_SDK_CONFIG.version,
          sandbox: PI_SDK_CONFIG.sandbox
        });
        console.log('✅ Pi SDK init result:', initResult);
      } catch (initError) {
        console.warn('⚠️ SDK init returned error (but may still work):', initError);
        // Continue anyway - sometimes init "fails" but SDK still works
      }

      if (isMounted()) {
        setSdkReady(true);
        setError(null);
        setPopupIssueDetected(false);
        console.log('🎯 Pi SDK ready for authentication');
      }

    } catch (error) {
      console.error('❌ Pi SDK initialization failed:', error);
      if (isMounted()) {
        setError(error.message);
        setSdkReady(false);
      }
    }
  }, [detectPiBrowser]);

  // Listen for Pi SDK ready event with enhanced detection
  useEffect(() => {
    const handlePiSDKReady = () => {
      console.log('📡 Pi SDK ready event received');
      initializePiSDK();
    };

    // Immediate check
    if (window.Pi) {
      console.log('📦 Pi SDK already available');
      initializePiSDK();
    } else {
      console.log('⏳ Waiting for Pi SDK...');
      
      // Listen for SDK ready event
      window.addEventListener('piSDKReady', handlePiSDKReady);
      
      // Multiple fallback checks with increasing delays
      const checkIntervals = [1000, 2000, 3000, 5000];
      const timeouts = checkIntervals.map((delay, index) => {
        return setTimeout(() => {
          console.log(`🔄 Fallback check ${index + 1}/${checkIntervals.length}`);
          if (window.Pi && !sdkReady) {
            console.log('📦 Pi SDK found in fallback check');
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

  // Enhanced authentication with popup detection
  const authenticateWithPopupDetection = useCallback(async (scopes = ['username'], retryCount = 0) => {
    const attemptId = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔐 Authentication attempt ${attemptId}:`, {
      scopes,
      retryCount,
      maxRetries: PI_SDK_CONFIG.maxRetries,
      popupTimeout: PI_SDK_CONFIG.popupTimeout
    });

    // Record attempt for debugging
    window.PI_AUTH_ATTEMPTS.push({
      id: attemptId,
      timestamp: new Date().toISOString(),
      scopes,
      retryCount
    });

    return new Promise((resolve, reject) => {
      let authTimeout;
      let popupTimeout;
      let popupDetected = false;

      // Set up popup detection timeout
      popupTimeout = setTimeout(() => {
        if (!popupDetected) {
          console.warn('⚠️ No authentication popup detected after 10 seconds');
          if (isMounted()) {
            setPopupIssueDetected(true);
            setAuthStep('No popup detected. Pi Browser may need to be refreshed.');
          }
        }
      }, PI_SDK_CONFIG.popupTimeout);

      // Set up main authentication timeout
      authTimeout = setTimeout(() => {
        console.error(`⏰ Authentication timeout after ${PI_SDK_CONFIG.timeout / 1000} seconds`);
        clearTimeout(popupTimeout);
        
        if (!popupDetected) {
          reject(new Error('Authentication popup did not appear. Please refresh Pi Browser and try again.'));
        } else {
          reject(new Error('Authentication timed out. Please try again.'));
        }
      }, PI_SDK_CONFIG.timeout);

      // Store timeout refs
      authTimeoutRef.current = authTimeout;
      popupTimeoutRef.current = popupTimeout;

      // Enhanced authentication with user interaction detection
      console.log('🚀 Calling Pi.authenticate with popup detection...');

      try {
        // Create authentication promise
        const authPromise = window.Pi.authenticate(scopes, {
          onIncompletePaymentFound: (payment) => {
            console.log('💳 Incomplete payment found:', payment);
            popupDetected = true; // Some interaction occurred
            if (isMounted()) {
              setAuthStep('Processing incomplete payment...');
            }
          }
        });

        // Monitor for user interaction (popup likely appeared)
        const interactionEvents = ['focus', 'blur', 'visibilitychange'];
        const handleInteraction = () => {
          if (!popupDetected) {
            console.log('👆 User interaction detected - popup likely appeared');
            popupDetected = true;
            clearTimeout(popupTimeout);
            if (isMounted()) {
              setPopupIssueDetected(false);
              setAuthStep('Authentication popup detected. Please complete the request in Pi Browser.');
            }
          }
        };

        // Add event listeners for interaction detection
        interactionEvents.forEach(event => {
          window.addEventListener(event, handleInteraction, { once: true });
        });

        // Handle authentication result
        authPromise.then(authResult => {
          console.log('✅ Authentication successful:', {
            username: authResult.user?.username,
            uid: authResult.user?.uid,
            hasAccessToken: !!authResult.accessToken
          });

          clearTimeout(authTimeout);
          clearTimeout(popupTimeout);
          
          // Clean up event listeners
          interactionEvents.forEach(event => {
            window.removeEventListener(event, handleInteraction);
          });

          resolve(authResult);

        }).catch(authError => {
          console.error('❌ Authentication error:', authError);
          
          clearTimeout(authTimeout);
          clearTimeout(popupTimeout);
          
          // Clean up event listeners
          interactionEvents.forEach(event => {
            window.removeEventListener(event, handleInteraction);
          });

          // Enhanced retry logic
          if (retryCount < PI_SDK_CONFIG.maxRetries) {
            const nextRetry = retryCount + 1;
            const delay = PI_SDK_CONFIG.retryDelay * nextRetry;
            
            console.log(`🔄 Retrying authentication (${nextRetry}/${PI_SDK_CONFIG.maxRetries}) in ${delay/1000}s...`);
            
            if (isMounted()) {
              setAuthStep(`Retrying authentication (${nextRetry}/${PI_SDK_CONFIG.maxRetries})...`);
            }
            
            retryTimeoutRef.current = setTimeout(() => {
              authenticateWithPopupDetection(scopes, nextRetry)
                .then(resolve)
                .catch(reject);
            }, delay);
          } else {
            let errorMessage = authError.message || authError.toString();
            
            if (!popupDetected) {
              errorMessage = 'Authentication popup did not appear. This usually means Pi Browser needs to be refreshed or restarted.';
            }
            
            reject(new Error(`Authentication failed after ${PI_SDK_CONFIG.maxRetries + 1} attempts: ${errorMessage}`));
          }
        });

      } catch (syncError) {
        console.error('❌ Synchronous authentication error:', syncError);
        clearTimeout(authTimeout);
        clearTimeout(popupTimeout);
        
        reject(new Error(`Failed to start authentication: ${syncError.message}`));
      }
    });
  }, []);

  // Connect user with enhanced popup detection
  const connectUser = useCallback(async () => {
    if (!sdkReady) {
      throw new Error('Pi SDK not ready. Please wait for initialization to complete.');
    }

    const browserInfo = detectPiBrowser();
    
    console.log('🔗 Starting connection with browser info:', browserInfo);

    if (browserInfo.confidence === 'none') {
      throw new Error('Please use the official Pi Browser to connect your wallet.');
    }

    setLoading(true);
    setConnectionStatus('connecting');
    setError(null);
    setPopupIssueDetected(false);
    setAuthStep('Starting Pi Network connection...');

    try {
      // Give user clear instructions
      if (isMounted()) {
        setAuthStep('Please look for the Pi Browser authentication popup...');
      }

      const authResult = await authenticateWithPopupDetection(['username']);
      
      if (isMounted() && authResult && authResult.user) {
        setPiUser(authResult.user);
        setIsAuthenticated(true);
        setConnectionStatus('connected');
        setAuthStep('');
        setPopupIssueDetected(false);
        
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
        setError(error.message);
        setConnectionStatus('error');
        setAuthStep('');
        
        // Set popup issue flag for specific error types
        if (error.message.includes('popup') || error.message.includes('appear')) {
          setPopupIssueDetected(true);
        }
      }
      
      throw error;
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [sdkReady, detectPiBrowser, authenticateWithPopupDetection]);

  // Request payment access
  const requestPaymentAccess = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('User must be connected first');
    }

    setLoading(true);
    setAuthStep('Requesting payment permissions...');
    setPopupIssueDetected(false);

    try {
      const paymentAuthResult = await authenticateWithPopupDetection(['payments']);
      
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
        
        if (error.message.includes('popup') || error.message.includes('appear')) {
          setPopupIssueDetected(true);
        }
      }
      throw error;
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, authenticateWithPopupDetection]);

  // Full connection (username + payments)
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
    setPopupIssueDetected(false);
    
    // Clear timeouts
    if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    
    console.log('🔌 User disconnected');
  }, []);

  // Enhanced test connection with popup detection
  const testConnection = useCallback(async () => {
    if (!sdkReady) {
      throw new Error('Pi SDK not ready');
    }

    console.log('🧪 Starting enhanced connection test...');
    
    try {
      setAuthStep('Testing Pi Browser authentication...');
      setPopupIssueDetected(false);
      
      const browserInfo = detectPiBrowser();
      console.log('🔍 Browser info for test:', browserInfo);

      const testResult = await authenticateWithPopupDetection(['username']);
      
      if (isMounted()) {
        setAuthStep('');
      }
      
      console.log('✅ Connection test successful');
      return testResult;
      
    } catch (error) {
      if (isMounted()) {
        setAuthStep('');
        if (error.message.includes('popup')) {
          setPopupIssueDetected(true);
        }
      }
      console.error('❌ Connection test failed:', error);
      throw error;
    }
  }, [sdkReady, detectPiBrowser, authenticateWithPopupDetection]);

  // Pi Browser refresh helper
  const refreshPiBrowser = useCallback(() => {
    console.log('🔄 Attempting Pi Browser refresh...');
    
    // Clear all state
    disconnect();
    
    // Clear any stored auth attempts
    window.PI_AUTH_ATTEMPTS = [];
    
    // Force page reload after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }, [disconnect]);

  // Enhanced debugging info
  const getConnectionInfo = useCallback(() => {
    const browserInfo = detectPiBrowser();
    
    return {
      // Basic state
      sdkReady,
      isAuthenticated,
      hasPaymentAccess,
      connectionStatus,
      user: piUser,
      error,
      authStep,
      popupIssueDetected,
      
      // Enhanced browser detection
      browser: browserInfo,
      
      // SDK information
      sdkVersion: window.Pi?.version || 'unknown',
      sdkMethods: window.Pi ? Object.keys(window.Pi).sort() : [],
      sdkAvailable: !!window.Pi,
      
      // Authentication attempts
      authAttempts: window.PI_AUTH_ATTEMPTS.slice(-5), // Last 5 attempts
      
      // Configuration
      config: PI_SDK_CONFIG,
      
      // Performance and environment
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - window.PI_LOTTERY_START_TIME,
      online: navigator.onLine,
      
      // Network info
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : 'unknown'
    };
  }, [sdkReady, isAuthenticated, hasPaymentAccess, connectionStatus, piUser, error, authStep, popupIssueDetected, detectPiBrowser]);

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
    popupIssueDetected, // New state for popup detection
    
    // Actions
    connectUser,
    requestPaymentAccess,
    connectWallet,
    createPayment,
    disconnect,
    testConnection,
    refreshPiBrowser, // New method for browser refresh
    
    // Utilities
    getConnectionInfo,
    clearError: () => setError(null),
    detectPiBrowser,
    
    // Computed values
    canConnect: sdkReady && !loading,
    isFullyConnected: isAuthenticated && hasPaymentAccess,
    needsPaymentAccess: isAuthenticated && !hasPaymentAccess
  };
};

export default usePiSDK;

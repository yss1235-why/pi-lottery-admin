// File path: src/hooks/usePiPayments.js - PRODUCTION VERSION
// ⚠️ WARNING: PRODUCTION MODE - REAL PI CRYPTOCURRENCY ⚠️
import { useState } from 'react';

const usePiPayments = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Production configuration with enhanced security
  const getConfig = () => {
    const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
    const region = process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || 'us-central1';
    const localPort = process.env.REACT_APP_FIREBASE_EMULATOR_PORT || '5001';
    
    if (!projectId) {
      throw new Error('Firebase project ID not configured. Please set REACT_APP_FIREBASE_PROJECT_ID in your environment variables.');
    }

    return {
      projectId,
      region,
      localPort,
      isDevelopment: process.env.NODE_ENV === 'development',
      apiTimeout: 60000, // 60 seconds for production reliability
      enableRetry: true,
      maxRetries: 3, // More retries for production
      piSlug: process.env.REACT_APP_PI_APP_SLUG || 'lottery-app-7c168369969f97a4',
      environment: 'PRODUCTION',
      realCurrency: true
    };
  };

  // Production Firebase Functions URL
  const getFunctionsBaseUrl = () => {
    const config = getConfig();
    
    if (config.isDevelopment && process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true') {
      // Local development with emulator
      return `http://localhost:${config.localPort}/${config.projectId}/${config.region}`;
    }
    
    // Production Firebase Functions
    return `https://${config.region}-${config.projectId}.cloudfunctions.net`;
  };

  // Enhanced API call for production with security headers
  const apiCall = async (functionName, data, options = {}) => {
    const config = getConfig();
    const baseUrl = getFunctionsBaseUrl();
    const url = `${baseUrl}/${functionName}`;
    
    console.log(`🔗 PRODUCTION API Call: ${url}`);
    console.warn(`💰 Using REAL Pi cryptocurrency transactions!`);
    console.log(`📤 Request data:`, data);
    console.log(`🏷️ Pi Slug: ${config.piSlug}`);
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Pi-App-Slug': config.piSlug,
        'X-Production-Mode': 'true',
        'X-Real-Currency': 'true',
        'X-Environment': 'production',
        ...options.headers
      },
      body: JSON.stringify({
        ...data,
        piSlug: config.piSlug,
        environment: 'production',
        realCurrency: true,
        timestamp: Date.now()
      })
    };

    let lastError;
    const maxAttempts = config.enableRetry ? config.maxRetries : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔗 PRODUCTION API Call (attempt ${attempt}/${maxAttempts}): ${functionName}`);
        console.warn(`💰 Real Pi transaction attempt ${attempt}`);
        
        // Enhanced timeout for production
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.error(`⏰ PRODUCTION timeout (${config.apiTimeout}ms) for ${functionName}`);
          controller.abort();
        }, config.apiTimeout);
        
        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log(`📡 PRODUCTION Response status: ${response.status} for ${functionName}`);

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: response.statusText };
          }
          throw new Error(errorData.error || `PRODUCTION API Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`✅ PRODUCTION API Success (attempt ${attempt}): ${functionName}`, result);
        console.warn(`💰 Real Pi transaction processed successfully!`);
        return result;

      } catch (fetchError) {
        lastError = fetchError;
        
        if (fetchError.name === 'AbortError') {
          console.error(`⏰ PRODUCTION timeout (attempt ${attempt}/${maxAttempts}): ${functionName}`);
        } else {
          console.error(`⚠️ PRODUCTION API Error (attempt ${attempt}/${maxAttempts}): ${fetchError.message}`);
        }
        
        if (attempt < maxAttempts) {
          const delay = Math.min(3000 * attempt, 10000); // 3s, 6s, 9s max 10s
          console.log(`⏳ PRODUCTION retry in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`PRODUCTION API failed after ${maxAttempts} attempts: ${lastError.message}`);
  };

  // Create lottery payment with REAL Pi cryptocurrency
  const createLotteryPayment = async (piUser, lottery, onSuccess, onError) => {
    if (!piUser || !lottery) {
      throw new Error('User and lottery data required for real Pi transaction');
    }

    // Validate production configuration
    try {
      getConfig();
    } catch (configError) {
      if (onError) onError(configError);
      throw configError;
    }

    setLoading(true);
    setError(null);

    // PRODUCTION WARNING
    console.warn('🚨 PRODUCTION PAYMENT: Starting REAL Pi cryptocurrency transaction!');
    console.warn('💰 This involves actual Pi tokens with monetary value!');
    console.warn('🎰 User is gambling with real money!');

    try {
      console.log('💰 PRODUCTION payment process for:', {
        user: piUser.username,
        lottery: lottery.title,
        amount: lottery.entryFee,
        currency: 'PI (REAL)',
        environment: 'PRODUCTION'
      });

      // Enhanced payment data for production
      const paymentData = {
        amount: parseFloat(lottery.entryFee),
        memo: `REAL Pi Lottery: ${lottery.title}`,
        metadata: {
          lotteryId: lottery.id,
          userId: piUser.uid,
          username: piUser.username,
          timestamp: Date.now(),
          type: 'lottery_entry',
          environment: 'production',
          realCurrency: true,
          currencyType: 'PI_MAINNET',
          piSlug: getConfig().piSlug,
          version: process.env.REACT_APP_BUILD_VERSION || '2.0.0',
          warningAccepted: true // User accepted real money gambling
        }
      };

      // Validate payment amount (real money!)
      if (!paymentData.amount || paymentData.amount <= 0) {
        throw new Error('Invalid lottery entry fee for real Pi transaction');
      }

      // Additional production validation
      if (paymentData.amount > 1000) {
        console.warn('⚠️ Large real Pi amount:', paymentData.amount);
      }

      const paymentCallbacks = {
        onReadyForServerApproval: async (paymentId) => {
          console.log('💰 PRODUCTION payment ready for approval:', paymentId);
          console.warn('🚨 REAL Pi cryptocurrency transaction pending approval!');
          
          try {
            console.log('🔄 PRODUCTION: Calling approvePayment function...');
            const approvalResult = await apiCall('approvePayment', {
              paymentId,
              lotteryId: lottery.id,
              userUid: piUser.uid,
              environment: 'production',
              realCurrency: true
            });
            
            console.log('✅ PRODUCTION payment approved:', approvalResult);
            console.warn('💰 Real Pi transaction approved!');
          } catch (approvalError) {
            console.error('❌ PRODUCTION approval failed:', approvalError);
            console.error('💰 Real Pi transaction approval failed!');
            if (onError) onError(approvalError);
          }
        },

        onReadyForServerCompletion: async (paymentId, txnId) => {
          console.log('🎉 PRODUCTION payment completion ready:', { paymentId, txnId });
          console.warn('🚨 REAL Pi cryptocurrency about to be transferred!');
          
          try {
            console.log('🔄 PRODUCTION: Calling completePayment function...');
            const completionResult = await apiCall('completePayment', {
              paymentId,
              txnId,
              lotteryId: lottery.id,
              userUid: piUser.uid,
              environment: 'production',
              realCurrency: true,
              amount: paymentData.amount
            });
            
            console.log('✅ PRODUCTION payment completed successfully:', completionResult);
            console.warn('💰 REAL Pi cryptocurrency transferred successfully!');
            console.warn('🎰 User has spent real money on lottery!');
            
            if (onSuccess) onSuccess(completionResult);
            
          } catch (completionError) {
            console.error('❌ PRODUCTION payment completion failed:', completionError);
            console.error('💰 Real Pi transaction completion failed!');
            if (onError) onError(completionError);
          }
        },

        onCancel: (paymentId) => {
          console.log('❌ PRODUCTION payment cancelled by user:', paymentId);
          console.log('💰 No real Pi was transferred (user cancelled)');
          const cancelError = new Error('Real Pi payment was cancelled by user');
          if (onError) onError(cancelError);
        },

        onError: (error, paymentId) => {
          console.error('❌ PRODUCTION Pi SDK payment error:', { error, paymentId });
          console.error('💰 REAL Pi transaction failed!');
          const enhancedError = new Error(`Real Pi payment failed: ${error.message || error}`);
          if (onError) onError(enhancedError);
        }
      };

      // Create payment with Pi SDK (PRODUCTION)
      if (!window.Pi || typeof window.Pi.createPayment !== 'function') {
        throw new Error('Pi SDK not available. Please use Pi Browser or Pi mobile app for real transactions.');
      }

      console.log('💳 PRODUCTION: Creating REAL Pi payment with data:', paymentData);
      console.warn('🚨 This is a REAL Pi cryptocurrency transaction!');
      
      const payment = await window.Pi.createPayment(paymentData, paymentCallbacks);
      console.log('💳 PRODUCTION payment created successfully:', payment);
      console.warn('💰 Real Pi payment initiated!');
      
      return payment;

    } catch (createError) {
      console.error('❌ PRODUCTION: Failed to create real Pi payment:', createError);
      console.error('💰 Real Pi transaction creation failed!');
      setError(createError.message);
      if (onError) onError(createError);
      throw createError;
    } finally {
      setLoading(false);
    }
  };

  // Distribute prize with REAL Pi cryptocurrency
  const distributePrize = async (winner, lotteryId, onSuccess, onError) => {
    // Validate production configuration
    try {
      getConfig();
    } catch (configError) {
      if (onError) onError(configError);
      throw configError;
    }

    setLoading(true);
    setError(null);

    // PRODUCTION WARNING for prize distribution
    console.warn('🚨 PRODUCTION PRIZE: Distributing REAL Pi cryptocurrency!');
    console.warn('💰 This involves actual Pi tokens with monetary value!');
    console.warn('🏆 Sending real money to winner!');

    try {
      console.log('💰 PRODUCTION prize distribution to winner:', {
        position: winner.position,
        amount: winner.prize,
        winnerUid: winner.winner.uid,
        currency: 'PI (REAL)',
        environment: 'PRODUCTION'
      });

      // Validate prize data (real money!)
      if (!winner.prize || winner.prize <= 0) {
        throw new Error('Invalid prize amount for real Pi distribution');
      }

      if (!winner.winner || !winner.winner.uid) {
        throw new Error('Invalid winner data for real Pi distribution');
      }

      // Additional production validation
      if (winner.prize > 10000) {
        console.warn('⚠️ Large real Pi prize amount:', winner.prize);
      }

      const distributionResult = await apiCall('distributePrize', {
        recipientUid: winner.winner.uid,
        amount: parseFloat(winner.prize),
        memo: `REAL Pi Lottery Prize - Position #${winner.position}`,
        lotteryId: lotteryId,
        winnerPosition: winner.position,
        environment: 'production',
        realCurrency: true,
        prizeType: 'REAL_PI_CRYPTOCURRENCY'
      });

      console.log('✅ PRODUCTION prize distributed successfully:', distributionResult);
      console.warn('💰 REAL Pi cryptocurrency sent to winner!');
      console.warn('🏆 Real money prize distributed!');
      
      if (onSuccess) onSuccess(distributionResult);
      
      return distributionResult;

    } catch (distributionError) {
      console.error('❌ PRODUCTION prize distribution failed:', distributionError);
      console.error('💰 Real Pi prize distribution failed!');
      setError(distributionError.message);
      if (onError) onError(distributionError);
      throw distributionError;
    } finally {
      setLoading(false);
    }
  };

  // Production health check
  const healthCheck = async () => {
    try {
      const config = getConfig();
      const baseUrl = getFunctionsBaseUrl();
      
      console.log('🔍 PRODUCTION health check:', `${baseUrl}/healthCheck`);
      console.warn('🚨 Testing REAL Pi cryptocurrency backend...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s for production
      
      const response = await fetch(`${baseUrl}/healthCheck`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Pi-App-Slug': config.piSlug,
          'X-Production-Mode': 'true',
          'X-Real-Currency': 'true'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`PRODUCTION health check failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ PRODUCTION backend health check passed:', result);
      console.warn('💰 Real Pi cryptocurrency backend is operational!');
      return result;
      
    } catch (healthError) {
      console.error('❌ PRODUCTION backend health check failed:', healthError);
      console.error('💰 Real Pi cryptocurrency backend error!');
      throw healthError;
    }
  };

  return {
    loading,
    error,
    createLotteryPayment,
    distributePrize,
    healthCheck,
    clearError: () => setError(null),
    
    // Utility functions with production info
    getBackendUrl: getFunctionsBaseUrl,
    getConfig: () => {
      const config = getConfig();
      return {
        projectId: config.projectId,
        region: config.region,
        environment: 'PRODUCTION',
        realCurrency: true,
        backendUrl: getFunctionsBaseUrl(),
        piSlug: config.piSlug,
        warnings: [
          'Using REAL Pi cryptocurrency',
          'All transactions involve actual monetary value',
          'Users are gambling with real money',
          'Prizes are paid in real Pi cryptocurrency'
        ]
      };
    },
    
    // Production flags
    isProduction: true,
    usesRealCurrency: true,
    environment: 'production'
  };
};

export default usePiPayments;

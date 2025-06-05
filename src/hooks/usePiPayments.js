// File path: src/hooks/usePiPayments.js - Updated with Access Token Support
import { useState } from 'react';

const usePiPayments = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get configuration from environment variables
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
      apiTimeout: 45000, // 45 seconds for Firebase cold starts
      enableRetry: true,
      maxRetries: 2,
      piSlug: 'lottery-app-7c168369969f97a4' // Your Pi Network slug
    };
  };

  // Get Firebase Functions URL based on environment
  const getFunctionsBaseUrl = () => {
    const config = getConfig();
    
    if (config.isDevelopment && process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true') {
      // Local Firebase emulator
      return `http://localhost:${config.localPort}/${config.projectId}/${config.region}`;
    }
    
    // Production Firebase Functions
    return `https://${config.region}-${config.projectId}.cloudfunctions.net`;
  };

  // Get Pi access token from SDK
  const getPiAccessToken = async () => {
    try {
      if (!window.Pi) {
        throw new Error('Pi SDK not available');
      }

      // Get access token from Pi SDK - this might need to be implemented
      // For now, we'll try to get it from the Pi user object
      return null; // Placeholder - Pi SDK doesn't expose access token directly
    } catch (error) {
      console.warn('⚠️ Could not get Pi access token:', error.message);
      return null;
    }
  };

  // Enhanced API call helper with proper timeout handling
  const apiCall = async (functionName, data, options = {}) => {
    const config = getConfig();
    const baseUrl = getFunctionsBaseUrl();
    const url = `${baseUrl}/${functionName}`;
    
    console.log(`🔗 Calling Firebase Function: ${url}`);
    console.log(`📤 Request data:`, data);
    
    // Get Pi access token
    const accessToken = await getPiAccessToken();
    if (accessToken) {
      console.log('🔑 Including Pi access token in request');
    }
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Pi-App-Slug': config.piSlug,
        ...(accessToken && { 'Pi-Access-Token': accessToken }),
        ...options.headers
      },
      body: JSON.stringify({
        ...data,
        piSlug: config.piSlug,
        ...(accessToken && { accessToken })
      })
    };

    let lastError;
    const maxAttempts = config.enableRetry ? config.maxRetries : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔗 API Call (attempt ${attempt}/${maxAttempts}): ${functionName}`);
        
        // Proper timeout implementation with AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`⏰ Request timeout (${config.apiTimeout}ms) for ${functionName}`);
          controller.abort();
        }, config.apiTimeout);
        
        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log(`📡 Response status: ${response.status} for ${functionName}`);

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: response.statusText };
          }
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`✅ API Success (attempt ${attempt}): ${functionName}`, result);
        return result;

      } catch (fetchError) {
        lastError = fetchError;
        
        if (fetchError.name === 'AbortError') {
          console.warn(`⏰ Request timeout (attempt ${attempt}/${maxAttempts}): ${functionName}`);
        } else {
          console.warn(`⚠️ API Error (attempt ${attempt}/${maxAttempts}): ${fetchError.message}`);
        }
        
        if (attempt < maxAttempts) {
          const delay = Math.min(2000 * attempt, 5000); // 2s, 4s max
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`API call failed after ${maxAttempts} attempts: ${lastError.message}`);
  };

  // Create lottery payment with enhanced Pi API integration
  const createLotteryPayment = async (piUser, lottery, onSuccess, onError) => {
    if (!piUser || !lottery) {
      throw new Error('User and lottery data required');
    }

    // Validate required environment configuration
    try {
      getConfig();
    } catch (configError) {
      if (onError) onError(configError);
      throw configError;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('💰 Starting payment process for:', {
        user: piUser.username,
        lottery: lottery.title,
        amount: lottery.entryFee,
        piSlug: getConfig().piSlug
      });

      const paymentData = {
        amount: parseFloat(lottery.entryFee),
        memo: `Pi Lottery: ${lottery.title}`,
        metadata: {
          lotteryId: lottery.id,
          userId: piUser.uid,
          username: piUser.username,
          timestamp: Date.now(),
          type: 'lottery_entry',
          piSlug: getConfig().piSlug,
          version: process.env.REACT_APP_BUILD_VERSION || '1.0.0'
        }
      };

      // Validate payment data
      if (!paymentData.amount || paymentData.amount <= 0) {
        throw new Error('Invalid lottery entry fee');
      }

      const paymentCallbacks = {
        onReadyForServerApproval: async (paymentId) => {
          console.log('💰 Payment ready for approval:', paymentId);
          
          try {
            console.log('🔄 Calling approvePayment function...');
            const approvalResult = await apiCall('approvePayment', {
              paymentId,
              lotteryId: lottery.id,
              userUid: piUser.uid
            });
            
            console.log('✅ Payment approved by Firebase Functions:', approvalResult);
          } catch (approvalError) {
            console.error('❌ Firebase Functions approval failed:', approvalError);
            if (onError) onError(approvalError);
          }
        },

        onReadyForServerCompletion: async (paymentId, txnId) => {
          console.log('🎉 Payment completion ready:', { paymentId, txnId });
          
          try {
            console.log('🔄 Calling completePayment function...');
            const completionResult = await apiCall('completePayment', {
              paymentId,
              txnId,
              lotteryId: lottery.id,
              userUid: piUser.uid
            });
            
            console.log('✅ Payment completed successfully:', completionResult);
            if (onSuccess) onSuccess(completionResult);
            
          } catch (completionError) {
            console.error('❌ Payment completion failed:', completionError);
            if (onError) onError(completionError);
          }
        },

        onCancel: async (paymentId) => {
          console.log('❌ Payment cancelled by user:', paymentId);
          
          try {
            await apiCall('cancelPayment', { paymentId });
            console.log('✅ Cancellation processed');
          } catch (cancelError) {
            console.error('❌ Cancellation processing failed:', cancelError);
          }
          
          const cancelError = new Error('Payment was cancelled by user');
          if (onError) onError(cancelError);
        },

        onError: async (error, paymentId) => {
          console.error('❌ Pi SDK payment error:', { error, paymentId });
          
          try {
            await apiCall('handlePaymentError', { 
              paymentId, 
              errorDetails: error 
            });
            console.log('✅ Error handling processed');
          } catch (errorHandlingError) {
            console.error('❌ Error handling failed:', errorHandlingError);
          }
          
          const enhancedError = new Error(`Payment failed: ${error.message || error}`);
          if (onError) onError(enhancedError);
        },

        onIncompletePaymentFound: async (paymentDTO) => {
          console.log('🔄 Incomplete payment found:', paymentDTO);
          
          try {
            // Try to complete the incomplete payment
            if (paymentDTO.transaction && paymentDTO.transaction.txid) {
              await apiCall('completePayment', {
                paymentId: paymentDTO.identifier,
                txnId: paymentDTO.transaction.txid,
                lotteryId: lottery.id,
                userUid: piUser.uid
              });
              
              console.log('✅ Incomplete payment completed');
              if (onSuccess) onSuccess({ paymentId: paymentDTO.identifier });
            }
          } catch (incompleteError) {
            console.error('❌ Incomplete payment handling failed:', incompleteError);
            if (onError) onError(incompleteError);
          }
        }
      };

      // Create payment with Pi SDK
      if (!window.Pi || typeof window.Pi.createPayment !== 'function') {
        throw new Error('Pi SDK not available. Please use Pi Browser.');
      }

      console.log('💳 Creating Pi payment with data:', paymentData);
      const payment = await window.Pi.createPayment(paymentData, paymentCallbacks);
      console.log('💳 Payment created successfully:', payment);
      
      return payment;

    } catch (createError) {
      console.error('❌ Failed to create payment:', createError);
      setError(createError.message);
      if (onError) onError(createError);
      throw createError;
    } finally {
      setLoading(false);
    }
  };

  // Distribute prize (unchanged)
  const distributePrize = async (winner, lotteryId, onSuccess, onError) => {
    try {
      getConfig();
    } catch (configError) {
      if (onError) onError(configError);
      throw configError;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('💰 Distributing prize to winner:', {
        position: winner.position,
        amount: winner.prize,
        winnerUid: winner.winner.uid,
        piSlug: getConfig().piSlug
      });

      if (!winner.prize || winner.prize <= 0) {
        throw new Error('Invalid prize amount');
      }

      if (!winner.winner || !winner.winner.uid) {
        throw new Error('Invalid winner data');
      }

      const distributionResult = await apiCall('distributePrize', {
        recipientUid: winner.winner.uid,
        amount: parseFloat(winner.prize),
        memo: `Pi Lottery Prize - Position #${winner.position}`,
        lotteryId: lotteryId,
        winnerPosition: winner.position
      });

      console.log('✅ Prize distributed successfully:', distributionResult);
      if (onSuccess) onSuccess(distributionResult);
      
      return distributionResult;

    } catch (distributionError) {
      console.error('❌ Prize distribution failed:', distributionError);
      setError(distributionError.message);
      if (onError) onError(distributionError);
      throw distributionError;
    } finally {
      setLoading(false);
    }
  };

  // Health check function
  const healthCheck = async () => {
    try {
      const config = getConfig();
      const baseUrl = getFunctionsBaseUrl();
      
      console.log('🔍 Testing health check:', `${baseUrl}/healthCheck`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${baseUrl}/healthCheck`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Pi-App-Slug': config.piSlug
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Backend health check passed:', result);
      return result;
      
    } catch (healthError) {
      console.error('❌ Backend health check failed:', healthError);
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
    // Utility functions
    getBackendUrl: getFunctionsBaseUrl,
    getConfig: () => {
      const config = getConfig();
      // Return safe config info (no sensitive data)
      return {
        projectId: config.projectId,
        region: config.region,
        environment: config.isDevelopment ? 'development' : 'production',
        backendUrl: getFunctionsBaseUrl(),
        piSlug: config.piSlug
      };
    }
  };
};

export default usePiPayments;

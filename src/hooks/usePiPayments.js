// src/hooks/usePiPayments.js - Simple Payment Integration Hook
import { useState } from 'react';

const usePiPayments = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get API URL based on environment
  const getApiUrl = () => {
    if (process.env.NODE_ENV === 'production') {
      return process.env.REACT_APP_API_URL_PRODUCTION || 'https://your-backend-domain.com';
    }
    return process.env.REACT_APP_API_URL || 'http://localhost:8000';
  };

  // API call helper
  const apiCall = async (endpoint, data) => {
    const response = await fetch(`${getApiUrl()}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'API request failed');
    }

    return response.json();
  };

  // Create lottery payment
  const createLotteryPayment = async (piUser, lottery, onSuccess, onError) => {
    if (!piUser || !lottery) {
      throw new Error('User and lottery data required');
    }

    setLoading(true);
    setError(null);

    try {
      const paymentData = {
        amount: lottery.entryFee,
        memo: `Lottery Entry: ${lottery.title}`,
        metadata: {
          lotteryId: lottery.id,
          userId: piUser.uid,
          username: piUser.username,
          timestamp: Date.now(),
          type: 'lottery_entry'
        }
      };

      const paymentCallbacks = {
        onReadyForServerApproval: async (paymentId) => {
          console.log('💰 Payment ready for approval:', paymentId);
          
          try {
            await apiCall('/api/payments/approve', {
              paymentId,
              lotteryId: lottery.id,
              userUid: piUser.uid
            });
            
            console.log('✅ Payment approved by backend');
          } catch (approvalError) {
            console.error('❌ Backend approval failed:', approvalError);
            if (onError) onError(approvalError);
          }
        },

        onReadyForServerCompletion: async (paymentId, txnId) => {
          console.log('🎉 Payment completion ready:', { paymentId, txnId });
          
          try {
            const result = await apiCall('/api/payments/complete', {
              paymentId,
              txnId,
              lotteryId: lottery.id,
              userUid: piUser.uid
            });
            
            console.log('✅ Payment completed successfully:', result);
            if (onSuccess) onSuccess(result);
            
          } catch (completionError) {
            console.error('❌ Payment completion failed:', completionError);
            if (onError) onError(completionError);
          }
        },

        onCancel: (paymentId) => {
          console.log('❌ Payment cancelled:', paymentId);
          const cancelError = new Error('Payment was cancelled');
          if (onError) onError(cancelError);
        },

        onError: (error, paymentId) => {
          console.error('❌ Payment error:', { error, paymentId });
          if (onError) onError(error);
        }
      };

      // Create payment with Pi SDK
      const payment = await window.Pi.createPayment(paymentData, paymentCallbacks);
      console.log('💳 Payment created:', payment);
      
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

  // Distribute prize (for admin)
  const distributePrize = async (winner, lotteryId, onSuccess, onError) => {
    setLoading(true);
    setError(null);

    try {
      console.log('💰 Distributing prize to:', winner);

      const result = await apiCall('/api/prizes/distribute', {
        recipientUid: winner.winner.uid,
        amount: winner.prize,
        memo: `Lottery Prize - Position #${winner.position}`,
        lotteryId: lotteryId,
        winnerPosition: winner.position
      });

      console.log('✅ Prize distributed successfully:', result);
      if (onSuccess) onSuccess(result);
      
      return result;

    } catch (distributionError) {
      console.error('❌ Prize distribution failed:', distributionError);
      setError(distributionError.message);
      if (onError) onError(distributionError);
      throw distributionError;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createLotteryPayment,
    distributePrize,
    clearError: () => setError(null)
  };
};

export default usePiPayments;

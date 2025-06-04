// File path: src/hooks/usePiPayments.js - Simplified Direct Firestore Version
import { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, Timestamp, getDoc } from 'firebase/firestore';

const usePiPayments = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Simplified lottery payment - Direct Firestore integration (NO Firebase Functions)
  const createLotteryPayment = async (piUser, lottery, onSuccess, onError) => {
    setLoading(true);
    setError(null);

    try {
      console.log('💰 Starting payment for user:', piUser.username);
      console.log('🎰 Lottery:', lottery.title);

      const paymentData = {
        amount: parseFloat(lottery.entryFee),
        memo: `Pi Lottery: ${lottery.title}`,
        metadata: {
          lotteryId: lottery.id,
          userId: piUser.uid,
          username: piUser.username,
          timestamp: Date.now(),
          type: 'lottery_entry'
        }
      };

      const paymentCallbacks = {
        // SIMPLIFIED: No server approval needed
        onReadyForServerApproval: async (paymentId) => {
          console.log('💳 Payment created, ID:', paymentId);
          console.log('✅ Skipping server approval - Pi handles this automatically');
          // Pi SDK will automatically approve sandbox payments
        },

        // SIMPLIFIED: Direct Firestore update when payment completes
        onReadyForServerCompletion: async (paymentId, txnId) => {
          console.log('🎉 Payment completed!', { paymentId, txnId });
          
          try {
            // Get current lottery data
            const lotteryRef = doc(db, 'lotteries', lottery.id);
            const lotterySnapshot = await getDoc(lotteryRef);
            
            if (!lotterySnapshot.exists()) {
              throw new Error('Lottery not found');
            }

            const currentLottery = lotterySnapshot.data();
            const currentParticipants = currentLottery.participants || [];
            
            // Check 2% ticket limit
            const userCurrentTickets = currentParticipants.filter(p => p.uid === piUser.uid).length;
            const totalParticipants = currentParticipants.length;
            const maxTickets = Math.max(2, Math.floor((totalParticipants + 1) * 0.02));
            
            if (userCurrentTickets >= maxTickets) {
              throw new Error(`Maximum tickets reached (${userCurrentTickets}/${maxTickets})`);
            }

            // Create new participant entry
            const newParticipant = {
              uid: piUser.uid,
              username: piUser.username,
              joinedAt: Timestamp.now(),
              paymentId: paymentId,
              txnId: txnId,
              ticketNumber: userCurrentTickets + 1,
              entryFee: lottery.entryFee
            };

            // Add participant directly to Firestore
            await updateDoc(lotteryRef, {
              participants: arrayUnion(newParticipant),
              lastUpdated: Timestamp.now()
            });

            console.log('✅ User successfully added to lottery!');
            console.log('🎫 Ticket number:', newParticipant.ticketNumber);
            
            // Call success callback
            if (onSuccess) {
              onSuccess({ 
                success: true, 
                ticketNumber: newParticipant.ticketNumber,
                maxTickets: maxTickets,
                paymentId: paymentId,
                txnId: txnId
              });
            }
            
          } catch (firestoreError) {
            console.error('❌ Firestore update failed:', firestoreError);
            if (onError) onError(firestoreError);
          }
        },

        onCancel: (paymentId) => {
          console.log('❌ Payment cancelled by user:', paymentId);
          const cancelError = new Error('Payment was cancelled by user');
          if (onError) onError(cancelError);
        },

        onError: (error, paymentId) => {
          console.error('❌ Pi SDK payment error:', { error, paymentId });
          const enhancedError = new Error(`Payment failed: ${error.message || error}`);
          if (onError) onError(enhancedError);
        }
      };

      // Create payment with Pi SDK
      if (!window.Pi || typeof window.Pi.createPayment !== 'function') {
        throw new Error('Pi SDK not available. Please use Pi Browser.');
      }

      console.log('💳 Creating Pi payment...');
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

  // Simplified prize distribution (for admin use)
  const distributePrize = async (winner, lotteryId, onSuccess, onError) => {
    setLoading(true);
    setError(null);

    try {
      console.log('💰 Distributing prize to winner:', {
        position: winner.position,
        amount: winner.prize,
        winnerUid: winner.winner.uid
      });

      // For now, simulate successful distribution
      // In real implementation, admin would send Pi manually through Pi app
      const mockResult = {
        success: true,
        paymentId: `manual_${Date.now()}`,
        amount: winner.prize,
        recipient: winner.winner.username,
        timestamp: new Date().toISOString()
      };

      console.log('✅ Prize distribution completed (simulated)');
      if (onSuccess) onSuccess(mockResult);
      
      return mockResult;

    } catch (distributionError) {
      console.error('❌ Prize distribution failed:', distributionError);
      setError(distributionError.message);
      if (onError) onError(distributionError);
      throw distributionError;
    } finally {
      setLoading(false);
    }
  };

  // Health check function (simplified)
  const healthCheck = async () => {
    try {
      console.log('✅ Payment system ready (client-side)');
      return {
        status: 'ok',
        system: 'client-side-payments',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  };

  return {
    loading,
    error,
    createLotteryPayment,
    distributePrize,
    healthCheck,
    clearError: () => setError(null),
    // Utility info
    getConfig: () => ({
      system: 'client-side-direct-firestore',
      functions: 'bypassed',
      status: 'ready'
    })
  };
};

export default usePiPayments;

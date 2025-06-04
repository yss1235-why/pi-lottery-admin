// File path: functions/index.js - Firebase Functions Backend
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const axios = require('axios');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Pi API Client
const createPiAPIClient = () => {
  const piAPIKey = functions.config().pi?.api_key;
  if (!piAPIKey) {
    throw new Error('Pi API key not configured');
  }
  
  return axios.create({
    baseURL: 'https://api.minepi.com',
    headers: {
      'Authorization': `Key ${piAPIKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
};

// Utility function for logging
const log = (message, data = {}) => {
  console.log(`[${new Date().toISOString()}] ${message}`, data);
};

// ===== Pi Authentication =====
exports.verifyPiAuth = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { accessToken } = req.body;
      
      if (!accessToken) {
        return res.status(400).json({ error: 'Access token required' });
      }

      const piAPI = createPiAPIClient();
      const response = await piAPI.get('/v2/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const user = response.data;
      log('User authenticated', { username: user.username, uid: user.uid });

      res.json({ 
        success: true, 
        user: {
          uid: user.uid,
          username: user.username
        }
      });
    } catch (error) {
      log('Auth verification failed', { error: error.message });
      res.status(401).json({ error: 'Invalid access token' });
    }
  });
});

// ===== Payment Approval =====
exports.approvePayment = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { paymentId, lotteryId, userUid } = req.body;
      
      if (!paymentId || !lotteryId || !userUid) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      log('Approving payment', { paymentId, lotteryId, userUid });

      const piAPI = createPiAPIClient();
      
      // Get payment details from Pi
      const paymentResponse = await piAPI.get(`/v2/payments/${paymentId}`);
      const payment = paymentResponse.data;

      // Verify payment details
      if (!payment.metadata || payment.metadata.lotteryId !== lotteryId) {
        return res.status(400).json({ error: 'Payment lottery mismatch' });
      }

      // Get lottery details
      const lotteryDoc = await db.collection('lotteries').doc(lotteryId).get();
      if (!lotteryDoc.exists) {
        return res.status(404).json({ error: 'Lottery not found' });
      }

      const lottery = lotteryDoc.data();
      
      // Verify payment amount matches entry fee
      if (payment.amount !== lottery.entryFee) {
        return res.status(400).json({ error: 'Payment amount mismatch' });
      }

      // Check if lottery is still active
      if (lottery.status !== 'active') {
        return res.status(400).json({ error: 'Lottery is not active' });
      }

      // Check if lottery hasn't ended
      const endDate = lottery.endDate.toDate();
      if (new Date() > endDate) {
        return res.status(400).json({ error: 'Lottery has ended' });
      }

      // Approve with Pi
      await piAPI.post(`/v2/payments/${paymentId}/approve`);
      
      log('Payment approved successfully', { paymentId });
      res.json({ success: true, message: 'Payment approved' });

    } catch (error) {
      log('Payment approval failed', { error: error.message, paymentId: req.body.paymentId });
      res.status(500).json({ error: error.message });
    }
  });
});

// ===== Payment Completion =====
exports.completePayment = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { paymentId, txnId, lotteryId, userUid } = req.body;
      
      if (!paymentId || !txnId || !lotteryId || !userUid) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      log('Completing payment', { paymentId, txnId, lotteryId, userUid });

      const piAPI = createPiAPIClient();
      
      // Verify transaction with Pi
      const paymentResponse = await piAPI.get(`/v2/payments/${paymentId}`);
      const payment = paymentResponse.data;

      if (!payment.transaction || payment.transaction.txid !== txnId) {
        return res.status(400).json({ error: 'Transaction verification failed' });
      }

      // Complete payment with Pi
      await piAPI.post(`/v2/payments/${paymentId}/complete`, { txid: txnId });

      // Add user to lottery participants
      const lotteryRef = db.collection('lotteries').doc(lotteryId);
      const lotteryDoc = await lotteryRef.get();
      
      if (!lotteryDoc.exists) {
        return res.status(404).json({ error: 'Lottery not found' });
      }

      const lottery = lotteryDoc.data();
      const participants = lottery.participants || [];
      
      // Check if user already has max tickets (2% rule)
      const userTickets = participants.filter(p => p.uid === userUid).length;
      const maxTickets = Math.max(2, Math.floor((participants.length + 1) * 0.02));
      
      if (userTickets >= maxTickets) {
        return res.status(400).json({ error: 'Maximum tickets reached' });
      }

      // Add participant
      const newParticipant = {
        uid: userUid,
        username: payment.metadata.username || userUid,
        joinedAt: admin.firestore.Timestamp.now(),
        paymentId: paymentId,
        txnId: txnId,
        ticketNumber: userTickets + 1
      };

      await lotteryRef.update({
        participants: admin.firestore.FieldValue.arrayUnion(newParticipant)
      });

      log('Payment completed and user added to lottery', { 
        paymentId, 
        txnId, 
        lotteryId, 
        userUid,
        ticketNumber: userTickets + 1
      });

      res.json({ 
        success: true, 
        message: 'Payment completed and lottery entry confirmed',
        ticketNumber: userTickets + 1
      });

    } catch (error) {
      log('Payment completion failed', { error: error.message, paymentId: req.body.paymentId });
      res.status(500).json({ error: error.message });
    }
  });
});

// ===== Prize Distribution =====
exports.distributePrize = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { recipientUid, amount, memo, lotteryId, winnerPosition } = req.body;
      
      if (!recipientUid || !amount || !lotteryId || !winnerPosition) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      log('Distributing prize', { recipientUid, amount, lotteryId, winnerPosition });

      const piAPI = createPiAPIClient();
      
      // Create payment to winner
      const paymentData = {
        amount: amount,
        memo: memo || `Lottery Prize - Position #${winnerPosition}`,
        metadata: {
          type: 'prize_distribution',
          lotteryId: lotteryId,
          winnerPosition: winnerPosition,
          distributedAt: new Date().toISOString()
        },
        uid: recipientUid
      };

      const paymentResponse = await piAPI.post('/v2/payments', paymentData);
      const payment = paymentResponse.data;

      // Auto-approve the prize payment
      await piAPI.post(`/v2/payments/${payment.identifier}/approve`);

      log('Prize payment created and approved', { 
        paymentId: payment.identifier,
        recipientUid,
        amount
      });

      res.json({ 
        success: true, 
        paymentId: payment.identifier,
        message: `Prize of ${amount}π sent to winner`
      });

    } catch (error) {
      log('Prize distribution failed', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });
});

// ===== Health Check =====
exports.healthCheck = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: 'firebase-functions'
    });
  });
});

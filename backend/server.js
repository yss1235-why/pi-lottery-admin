// backend/server.js - Simple Production Backend for Pi Lottery
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

const db = admin.firestore();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Pi API Client
const piAPI = axios.create({
  baseURL: 'https://api.minepi.com',
  headers: {
    'Authorization': `Key ${process.env.PI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Simple logging
const log = (message, data = {}) => {
  console.log(`[${new Date().toISOString()}] ${message}`, data);
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ===== Pi Authentication =====
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    // Verify with Pi API
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

// ===== Payment Approval =====
app.post('/api/payments/approve', async (req, res) => {
  try {
    const { paymentId, lotteryId, userUid } = req.body;
    
    if (!paymentId || !lotteryId || !userUid) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    log('Approving payment', { paymentId, lotteryId, userUid });

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

// ===== Payment Completion =====
app.post('/api/payments/complete', async (req, res) => {
  try {
    const { paymentId, txnId, lotteryId, userUid } = req.body;
    
    if (!paymentId || !txnId || !lotteryId || !userUid) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    log('Completing payment', { paymentId, txnId, lotteryId, userUid });

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

// ===== Prize Distribution =====
app.post('/api/prizes/distribute', async (req, res) => {
  try {
    const { recipientUid, amount, memo, lotteryId, winnerPosition } = req.body;
    
    if (!recipientUid || !amount || !lotteryId || !winnerPosition) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    log('Distributing prize', { recipientUid, amount, lotteryId, winnerPosition });

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

// ===== Error Handling =====
app.use((error, req, res, next) => {
  log('Unhandled error', { error: error.message, stack: error.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  log(`🚀 Pi Lottery Backend running on port ${PORT}`);
  log('Environment:', {
    nodeEnv: process.env.NODE_ENV,
    frontendUrl: process.env.FRONTEND_URL,
    hasFirebaseConfig: !!process.env.FIREBASE_PROJECT_ID,
    hasPiApiKey: !!process.env.PI_API_KEY
  });
});

module.exports = app;

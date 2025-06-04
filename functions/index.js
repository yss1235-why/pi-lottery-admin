// File path: functions/index.js - Secure Firebase Functions with Environment Variables
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const axios = require('axios');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Get configuration from environment
const getConfig = () => {
  const config = functions.config();
  
  return {
    piApiKey: config.pi?.api_key,
    piApiUrl: config.pi?.api_url || 'https://api.minepi.com',
    allowedOrigins: config.app?.allowed_origins?.split(',') || ['https://localhost:3000'],
    environment: config.app?.environment || 'development',
    maxTicketsPerUser: parseInt(config.lottery?.max_tickets_per_user) || 100,
    ticketLimitPercentage: parseFloat(config.lottery?.ticket_limit_percentage) || 2,
    platformFeeMin: parseFloat(config.lottery?.platform_fee_min) || 0.01,
    platformFeeMax: parseFloat(config.lottery?.platform_fee_max) || 0.5
  };
};

// Create Pi API Client with environment configuration
const createPiAPIClient = () => {
  const config = getConfig();
  
  if (!config.piApiKey) {
    throw new Error('Pi API key not configured. Please run: firebase functions:config:set pi.api_key="your_key"');
  }
  
  return axios.create({
    baseURL: config.piApiUrl,
    headers: {
      'Authorization': `Key ${config.piApiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
};

// Enhanced CORS with environment-based origins
const corsWithConfig = (req, res, callback) => {
  const config = getConfig();
  const corsOptions = {
    origin: (origin, corsCallback) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return corsCallback(null, true);
      
      if (config.allowedOrigins.includes(origin)) {
        corsCallback(null, true);
      } else {
        corsCallback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  };
  
  return cors(corsOptions)(req, res, callback);
};

// Utility function for logging with environment context
const log = (message, data = {}) => {
  const config = getConfig();
  const logData = {
    ...data,
    environment: config.environment,
    timestamp: new Date().toISOString()
  };
  console.log(`[${config.environment.toUpperCase()}] ${message}`, logData);
};

// Input validation helper
const validateInput = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};

// ===== Health Check =====
exports.healthCheck = functions.https.onRequest((req, res) => {
  return corsWithConfig(req, res, () => {
    const config = getConfig();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.environment,
      service: 'pi-lottery-functions'
    });
  });
});

// ===== Pi Authentication Verification =====
exports.verifyPiAuth = functions.https.onRequest((req, res) => {
  return corsWithConfig(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      validateInput(req.body, ['accessToken']);
      const { accessToken } = req.body;

      const piAPI = createPiAPIClient();
      const response = await piAPI.get('/v2/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const user = response.data;
      log('User authenticated', { 
        username: user.username, 
        uid: user.uid,
        method: 'pi_auth_verification'
      });

      res.json({ 
        success: true, 
        user: {
          uid: user.uid,
          username: user.username
        }
      });
    } catch (error) {
      log('Auth verification failed', { 
        error: error.message,
        method: 'pi_auth_verification'
      });
      res.status(401).json({ error: 'Invalid access token' });
    }
  });
});

// ===== Payment Approval =====
exports.approvePayment = functions.https.onRequest((req, res) => {
  return corsWithConfig(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      validateInput(req.body, ['paymentId', 'lotteryId', 'userUid']);
      const { paymentId, lotteryId, userUid } = req.body;

      log('Processing payment approval', { 
        paymentId, 
        lotteryId, 
        userUid,
        method: 'payment_approval'
      });

      const piAPI = createPiAPIClient();
      const config = getConfig();
      
      // Get payment details from Pi
      const paymentResponse = await piAPI.get(`/v2/payments/${paymentId}`);
      const payment = paymentResponse.data;

      // Verify payment metadata
      if (!payment.metadata || payment.metadata.lotteryId !== lotteryId) {
        log('Payment lottery mismatch', { paymentId, lotteryId });
        return res.status(400).json({ error: 'Payment lottery mismatch' });
      }

      // Get lottery details from Firestore
      const lotteryDoc = await db.collection('lotteries').doc(lotteryId).get();
      if (!lotteryDoc.exists) {
        log('Lottery not found', { lotteryId });
        return res.status(404).json({ error: 'Lottery not found' });
      }

      const lottery = lotteryDoc.data();
      
      // Validate payment amount
      if (payment.amount !== lottery.entryFee) {
        log('Payment amount mismatch', { 
          paymentAmount: payment.amount, 
          lotteryFee: lottery.entryFee 
        });
        return res.status(400).json({ error: 'Payment amount mismatch' });
      }

      // Validate lottery status
      if (lottery.status !== 'active') {
        log('Lottery not active', { lotteryId, status: lottery.status });
        return res.status(400).json({ error: 'Lottery is not active' });
      }

      // Check lottery end time
      const endDate = lottery.endDate.toDate();
      if (new Date() > endDate) {
        log('Lottery has ended', { lotteryId, endDate });
        return res.status(400).json({ error: 'Lottery has ended' });
      }

      // Validate platform fee constraints
      const platformFee = lottery.platformFee || 0;
      if (platformFee < config.platformFeeMin || platformFee > config.platformFeeMax) {
        log('Invalid platform fee', { platformFee, min: config.platformFeeMin, max: config.platformFeeMax });
        return res.status(400).json({ error: 'Invalid platform fee configuration' });
      }

      // Approve payment with Pi Network
      await piAPI.post(`/v2/payments/${paymentId}/approve`);
      
      log('Payment approved successfully', { 
        paymentId, 
        lotteryId,
        method: 'payment_approval'
      });
      
      res.json({ success: true, message: 'Payment approved' });

    } catch (error) {
      log('Payment approval failed', { 
        error: error.message, 
        paymentId: req.body.paymentId,
        method: 'payment_approval'
      });
      res.status(500).json({ error: 'Payment approval failed' });
    }
  });
});

// ===== Payment Completion =====
exports.completePayment = functions.https.onRequest((req, res) => {
  return corsWithConfig(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      validateInput(req.body, ['paymentId', 'txnId', 'lotteryId', 'userUid']);
      const { paymentId, txnId, lotteryId, userUid } = req.body;

      log('Processing payment completion', { 
        paymentId, 
        txnId, 
        lotteryId, 
        userUid,
        method: 'payment_completion'
      });

      const piAPI = createPiAPIClient();
      const config = getConfig();
      
      // Verify transaction with Pi Network
      const paymentResponse = await piAPI.get(`/v2/payments/${paymentId}`);
      const payment = paymentResponse.data;

      if (!payment.transaction || payment.transaction.txid !== txnId) {
        log('Transaction verification failed', { paymentId, txnId });
        return res.status(400).json({ error: 'Transaction verification failed' });
      }

      // Complete payment with Pi Network
      await piAPI.post(`/v2/payments/${paymentId}/complete`, { txid: txnId });

      // Update lottery participants in Firestore
      const lotteryRef = db.collection('lotteries').doc(lotteryId);
      const lotteryDoc = await lotteryRef.get();
      
      if (!lotteryDoc.exists) {
        log('Lottery not found during completion', { lotteryId });
        return res.status(404).json({ error: 'Lottery not found' });
      }

      const lottery = lotteryDoc.data();
      const participants = lottery.participants || [];
      
      // Apply ticket limit constraints
      const userTickets = participants.filter(p => p.uid === userUid).length;
      const totalParticipants = participants.length + 1;
      const maxTickets = Math.max(
        parseInt(config.lottery?.min_tickets_per_user) || 2,
        Math.floor(totalParticipants * (config.ticketLimitPercentage / 100))
      );
      
      if (userTickets >= maxTickets) {
        log('Maximum tickets reached', { 
          userUid, 
          userTickets, 
          maxTickets,
          ticketLimitPercentage: config.ticketLimitPercentage
        });
        return res.status(400).json({ error: 'Maximum tickets reached for this lottery' });
      }

      // Create new participant entry
      const newParticipant = {
        uid: userUid,
        username: payment.metadata.username || `User_${userUid.substring(0, 8)}`,
        joinedAt: admin.firestore.Timestamp.now(),
        paymentId: paymentId,
        txnId: txnId,
        ticketNumber: userTickets + 1,
        entryFee: payment.amount
      };

      // Add participant to lottery
      await lotteryRef.update({
        participants: admin.firestore.FieldValue.arrayUnion(newParticipant),
        lastUpdated: admin.firestore.Timestamp.now()
      });

      log('Payment completed and user added to lottery', { 
        paymentId, 
        txnId, 
        lotteryId, 
        userUid,
        ticketNumber: userTickets + 1,
        totalParticipants: totalParticipants,
        method: 'payment_completion'
      });

      res.json({ 
        success: true, 
        message: 'Payment completed and lottery entry confirmed',
        ticketNumber: userTickets + 1,
        maxTickets: maxTickets,
        totalParticipants: totalParticipants
      });

    } catch (error) {
      log('Payment completion failed', { 
        error: error.message, 
        paymentId: req.body.paymentId,
        method: 'payment_completion'
      });
      res.status(500).json({ error: 'Payment completion failed' });
    }
  });
});

// ===== Prize Distribution =====
exports.distributePrize = functions.https.onRequest((req, res) => {
  return corsWithConfig(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      validateInput(req.body, ['recipientUid', 'amount', 'lotteryId', 'winnerPosition']);
      const { recipientUid, amount, memo, lotteryId, winnerPosition } = req.body;

      log('Processing prize distribution', { 
        recipientUid, 
        amount, 
        lotteryId, 
        winnerPosition,
        method: 'prize_distribution'
      });

      const piAPI = createPiAPIClient();
      
      // Create payment to winner
      const paymentData = {
        amount: parseFloat(amount),
        memo: memo || `Prize - Position #${winnerPosition}`,
        metadata: {
          type: 'prize_distribution',
          lotteryId: lotteryId,
          winnerPosition: winnerPosition,
          distributedAt: new Date().toISOString(),
          service: 'pi-lottery'
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
        amount,
        lotteryId,
        winnerPosition,
        method: 'prize_distribution'
      });

      res.json({ 
        success: true, 
        paymentId: payment.identifier,
        amount: amount,
        message: `Prize of ${amount}π sent to winner`
      });

    } catch (error) {
      log('Prize distribution failed', { 
        error: error.message,
        recipientUid: req.body.recipientUid,
        amount: req.body.amount,
        method: 'prize_distribution'
      });
      res.status(500).json({ error: 'Prize distribution failed' });
    }
  });
});

// ===== Error Handler =====
process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection', { reason: reason.toString(), promise });
});

process.on('uncaughtException', (error) => {
  log('Uncaught Exception', { error: error.toString(), stack: error.stack });
});

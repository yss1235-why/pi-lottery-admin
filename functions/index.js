// functions/index.js - Fixed for Firebase v2 (no functions.config())
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Simple CORS - Allow all origins
const corsHandler = cors({ origin: true });

// ===== Health Check =====
exports.healthCheck = functions.https.onRequest((req, res) => {
  corsHandler(req, res, () => {
    console.log('Health check called from:', req.headers.origin);
    
    try {
      res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'pi-lottery-functions',
        message: 'Firebase Functions v2 are working!',
        origin: req.headers.origin
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({ 
        status: 'error', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// ===== Payment Approval =====
exports.approvePayment = functions.https.onRequest((req, res) => {
  corsHandler(req, res, () => {
    console.log('🔥 approvePayment called:', req.body);
    console.log('🔥 Headers:', req.headers);
    
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { paymentId, lotteryId, userUid } = req.body;
      
      if (!paymentId || !lotteryId || !userUid) {
        console.error('❌ Missing required fields');
        return res.status(400).json({ error: 'Missing required fields' });
      }

      console.log('🔥 Processing approval for:', { paymentId, lotteryId, userUid });

      // For now, just approve without Pi API validation
      // TODO: Add Pi API integration when credentials are available
      console.log('✅ Payment approved (simplified)');
      
      res.status(200).json({ 
        success: true, 
        message: 'Payment approved',
        paymentId: paymentId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Payment approval failed:', error);
      res.status(500).json({ 
        error: 'Payment approval failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// ===== Payment Completion =====
exports.completePayment = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    console.log('🔥 completePayment called:', req.body);
    
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { paymentId, txnId, lotteryId, userUid } = req.body;
      
      if (!paymentId || !txnId || !lotteryId || !userUid) {
        console.error('❌ Missing required fields');
        return res.status(400).json({ error: 'Missing required fields' });
      }

      console.log('🔥 Processing completion for:', { paymentId, txnId, lotteryId, userUid });

      // Update lottery participants in Firestore
      const lotteryRef = db.collection('lotteries').doc(lotteryId);
      const lotteryDoc = await lotteryRef.get();
      
      if (!lotteryDoc.exists) {
        console.error('❌ Lottery not found:', lotteryId);
        return res.status(404).json({ error: 'Lottery not found' });
      }

      const lottery = lotteryDoc.data();
      const participants = lottery.participants || [];
      
      // Check ticket limits (2% system)
      const userTickets = participants.filter(p => p.uid === userUid).length;
      const totalParticipants = participants.length + 1;
      const maxTickets = Math.max(2, Math.floor(totalParticipants * 0.02)); // 2% system
      
      if (userTickets >= maxTickets) {
        console.error('❌ Maximum tickets reached:', { userUid, userTickets, maxTickets });
        return res.status(400).json({ error: 'Maximum tickets reached for this lottery' });
      }

      // Create new participant entry
      const newParticipant = {
        uid: userUid,
        username: `User_${userUid.substring(0, 8)}`,
        joinedAt: admin.firestore.Timestamp.now(),
        paymentId: paymentId,
        txnId: txnId,
        ticketNumber: userTickets + 1,
        entryFee: lottery.entryFee || 1
      };

      // Add participant to lottery
      await lotteryRef.update({
        participants: admin.firestore.FieldValue.arrayUnion(newParticipant),
        lastUpdated: admin.firestore.Timestamp.now()
      });

      console.log('✅ Payment completed and user added to lottery');

      res.status(200).json({ 
        success: true, 
        message: 'Payment completed and lottery entry confirmed',
        ticketNumber: newParticipant.ticketNumber,
        maxTickets: maxTickets,
        totalParticipants: totalParticipants,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Payment completion failed:', error);
      res.status(500).json({ 
        error: 'Payment completion failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// ===== Prize Distribution =====
exports.distributePrize = functions.https.onRequest((req, res) => {
  corsHandler(req, res, () => {
    console.log('🔥 distributePrize called:', req.body);
    
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { recipientUid, amount, lotteryId, winnerPosition } = req.body;
      
      if (!recipientUid || !amount || !lotteryId || !winnerPosition) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      console.log('🔥 Processing prize distribution:', { recipientUid, amount, lotteryId, winnerPosition });

      // For now, just return success - real Pi API integration would go here
      console.log('✅ Prize distribution simulated');
      
      res.status(200).json({ 
        success: true, 
        paymentId: `mock_payment_${Date.now()}`,
        amount: amount,
        message: `Prize of ${amount}π sent to winner`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Prize distribution failed:', error);
      res.status(500).json({ 
        error: 'Prize distribution failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// ===== Auth Verification =====
exports.verifyPiAuth = functions.https.onRequest((req, res) => {
  corsHandler(req, res, () => {
    console.log('🔥 verifyPiAuth called:', req.body);
    
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { accessToken } = req.body;
      
      if (!accessToken) {
        return res.status(400).json({ error: 'Missing access token' });
      }

      console.log('🔥 Processing auth verification');

      // For now, just return success - real Pi API integration would go here
      console.log('✅ Auth verification simulated');
      
      res.status(200).json({ 
        success: true, 
        user: {
          uid: `user_${Date.now()}`,
          username: `TestUser_${Date.now().toString().slice(-4)}`
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Auth verification failed:', error);
      res.status(500).json({ 
        error: 'Auth verification failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
});

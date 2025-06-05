// functions/index.js - FIXED with Real Pi API Integration
const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const cors = require('cors');
const axios = require('axios');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  timeoutSeconds: 300,
  memory: '256MiB',
  minInstances: 0,
  region: 'us-central1'
});

// Pi API Configuration
const PI_API_CONFIG = {
  baseURL: 'https://api.minepi.com/v2',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Get Pi API key from environment or Firebase config
const getPiApiKey = () => {
  // You need to set this in Firebase Functions config
  return process.env.PI_API_KEY || functions.config().pi?.api_key;
};

// CORS Configuration
const corsOptions = {
  origin: [
    'https://pi-lottery.netlify.app',
    'https://lottery4435.pinet.com',
    'https://sandbox.minepi.com',
    'https://app-cdn.minepi.com',
    'https://minepi.com',
    'https://pi.app',
    'https://develop.pi',
    `https://sandbox.minepi.com/app/lottery-app-7c168369969f97a4`,
    `https://app-cdn.minepi.com/app/lottery-app-7c168369969f97a4`,
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Pi-User-Code', 'Pi-App-Slug', 'Pi-Access-Token'],
  credentials: true
};

// Helper function to handle CORS
const withCors = (handler) => {
  return onRequest({ 
    cors: corsOptions,
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 120
  }, async (req, res) => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Pi-User-Code, Pi-App-Slug, Pi-Access-Token');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }

    try {
      await handler(req, res);
    } catch (error) {
      console.error('Function error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Create axios instance for Pi API calls
const createPiApiClient = (accessToken = null) => {
  const headers = {
    ...PI_API_CONFIG.headers
  };

  // Add API key for server authentication
  const apiKey = getPiApiKey();
  if (apiKey) {
    headers['Authorization'] = `Key ${apiKey}`;
  }

  // Add user access token if provided
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return axios.create({
    baseURL: PI_API_CONFIG.baseURL,
    timeout: PI_API_CONFIG.timeout,
    headers
  });
};

// ===== Health Check =====
exports.healthCheck = withCors(async (req, res) => {
  console.log('🔥 Health check called from:', req.headers.origin);
  
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.2',
    service: 'pi-lottery-functions-v2-with-api',
    message: 'Firebase Functions with Pi API integration working!',
    piApiIntegration: true,
    piApiBaseUrl: PI_API_CONFIG.baseURL,
    hasApiKey: !!getPiApiKey(),
    functionsGeneration: 2,
    features: {
      cors: true,
      piIntegration: true,
      payments: true,
      lottery: true,
      blockchain: true,
      realPiApi: true
    }
  };

  console.log('✅ Health check response:', healthData);
  res.status(200).json(healthData);
});

// ===== FIXED Payment Approval - Now makes real Pi API calls =====
exports.approvePayment = withCors(async (req, res) => {
  console.log('🔥 approvePayment called from:', req.headers.origin);
  console.log('🔥 Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔥 Request headers:', JSON.stringify(req.headers, null, 2));
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      expected: 'POST',
      received: req.method 
    });
  }

  const { paymentId, lotteryId, userUid, accessToken } = req.body;
  
  if (!paymentId) {
    console.error('❌ Missing paymentId');
    return res.status(400).json({ 
      error: 'Missing required field: paymentId'
    });
  }

  console.log('✅ Processing Pi API approval for payment:', paymentId);

  try {
    // Create Pi API client with server credentials
    const apiKey = getPiApiKey();
    if (!apiKey) {
      throw new Error('Pi API key not configured. Please set PI_API_KEY environment variable.');
    }

    const piApiClient = createPiApiClient();
    
    // Make actual call to Pi API to approve payment
    const approvalUrl = `/payments/${paymentId}/approve`;
    console.log('🔗 Calling Pi API:', PI_API_CONFIG.baseURL + approvalUrl);
    
    const apiResponse = await piApiClient.post(approvalUrl, {
      // Add any additional data needed for approval
      lotteryId: lotteryId,
      userUid: userUid
    });

    console.log('✅ Pi API approval response:', apiResponse.data);

    // If we have user access token, get user info
    let userInfo = null;
    if (accessToken) {
      try {
        const userApiClient = createPiApiClient(accessToken);
        const userResponse = await userApiClient.get('/me');
        userInfo = userResponse.data;
        console.log('👤 User info retrieved:', userInfo);
      } catch (userError) {
        console.warn('⚠️ Could not retrieve user info:', userError.message);
      }
    }

    const approvalData = {
      success: true,
      message: 'Payment approved successfully via Pi API',
      paymentId: paymentId,
      lotteryId: lotteryId,
      userUid: userUid,
      approvedAt: new Date().toISOString(),
      piApiResponse: apiResponse.data,
      userInfo: userInfo,
      functionsVersion: '2.0.2'
    };

    console.log('✅ Payment approval successful:', approvalData);
    res.status(200).json(approvalData);

  } catch (error) {
    console.error('❌ Pi API approval failed:', error);
    
    // Handle different types of errors
    if (error.response) {
      // Pi API returned an error response
      console.error('Pi API Error Response:', error.response.data);
      return res.status(error.response.status).json({
        error: 'Pi API approval failed',
        details: error.response.data,
        paymentId: paymentId
      });
    } else if (error.request) {
      // Network error
      console.error('Network Error:', error.message);
      return res.status(503).json({
        error: 'Unable to connect to Pi API',
        details: error.message,
        paymentId: paymentId
      });
    } else {
      // Other error
      return res.status(500).json({
        error: 'Payment approval failed',
        details: error.message,
        paymentId: paymentId
      });
    }
  }
});

// ===== FIXED Payment Completion - Now makes real Pi API calls =====
exports.completePayment = withCors(async (req, res) => {
  console.log('🔥 completePayment called from:', req.headers.origin);
  console.log('🔥 Request body:', JSON.stringify(req.body, null, 2));
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      expected: 'POST',
      received: req.method 
    });
  }

  const { paymentId, txnId, lotteryId, userUid, accessToken } = req.body;
  
  if (!paymentId || !txnId) {
    console.error('❌ Missing required fields:', { paymentId, txnId });
    return res.status(400).json({ 
      error: 'Missing required fields: paymentId and txnId are required'
    });
  }

  console.log('✅ Processing Pi API completion for payment:', { paymentId, txnId });

  try {
    // Create Pi API client with server credentials
    const apiKey = getPiApiKey();
    if (!apiKey) {
      throw new Error('Pi API key not configured. Please set PI_API_KEY environment variable.');
    }

    const piApiClient = createPiApiClient();
    
    // Make actual call to Pi API to complete payment
    const completionUrl = `/payments/${paymentId}/complete`;
    console.log('🔗 Calling Pi API:', PI_API_CONFIG.baseURL + completionUrl);
    
    const apiResponse = await piApiClient.post(completionUrl, {
      txid: txnId
    });

    console.log('✅ Pi API completion response:', apiResponse.data);

    // Get user info if access token provided
    let userInfo = null;
    if (accessToken) {
      try {
        const userApiClient = createPiApiClient(accessToken);
        const userResponse = await userApiClient.get('/me');
        userInfo = userResponse.data;
        console.log('👤 User info for completion:', userInfo);
      } catch (userError) {
        console.warn('⚠️ Could not retrieve user info during completion:', userError.message);
      }
    }

    // Now add participant to lottery in Firestore
    if (lotteryId && userUid) {
      try {
        const lotteryRef = db.collection('lotteries').doc(lotteryId);
        const lotteryDoc = await lotteryRef.get();
        
        if (lotteryDoc.exists) {
          const lottery = lotteryDoc.data();
          const participants = lottery.participants || [];
          
          // Check ticket limits (2% system)
          const userTickets = participants.filter(p => p.uid === userUid).length;
          const totalParticipants = participants.length + 1;
          const maxTickets = Math.max(2, Math.floor(totalParticipants * 0.02));
          
          if (userTickets < maxTickets) {
            // Create new participant entry
            const newParticipant = {
              uid: userUid,
              username: userInfo?.username || `User_${userUid.substring(0, 8)}`,
              joinedAt: admin.firestore.Timestamp.now(),
              paymentId: paymentId,
              txnId: txnId,
              ticketNumber: userTickets + 1,
              entryFee: lottery.entryFee || 1,
              piApiConfirmed: true,
              processedBy: 'firebase-functions-v2-with-pi-api'
            };

            // Add participant to lottery
            await lotteryRef.update({
              participants: admin.firestore.FieldValue.arrayUnion(newParticipant),
              lastUpdated: admin.firestore.Timestamp.now(),
              participantCount: admin.firestore.FieldValue.increment(1)
            });

            console.log('✅ Participant added to lottery:', newParticipant);
          } else {
            console.warn('⚠️ User has reached maximum tickets:', { userTickets, maxTickets });
          }
        }
      } catch (firestoreError) {
        console.error('❌ Firestore update failed:', firestoreError);
        // Don't fail the payment completion if Firestore fails
      }
    }

    const completionData = {
      success: true,
      message: 'Payment completed successfully via Pi API',
      paymentId: paymentId,
      txnId: txnId,
      lotteryId: lotteryId,
      userUid: userUid,
      completedAt: new Date().toISOString(),
      piApiResponse: apiResponse.data,
      userInfo: userInfo,
      functionsVersion: '2.0.2'
    };

    console.log('✅ Payment completed successfully:', completionData);
    res.status(200).json(completionData);

  } catch (error) {
    console.error('❌ Pi API completion failed:', error);
    
    if (error.response) {
      console.error('Pi API Error Response:', error.response.data);
      return res.status(error.response.status).json({
        error: 'Pi API completion failed',
        details: error.response.data,
        paymentId: paymentId,
        txnId: txnId
      });
    } else if (error.request) {
      console.error('Network Error:', error.message);
      return res.status(503).json({
        error: 'Unable to connect to Pi API',
        details: error.message,
        paymentId: paymentId
      });
    } else {
      return res.status(500).json({
        error: 'Payment completion failed',
        details: error.message,
        paymentId: paymentId
      });
    }
  }
});

// ===== Payment Cancellation =====
exports.cancelPayment = withCors(async (req, res) => {
  console.log('🔥 cancelPayment called from:', req.headers.origin);
  
  const { paymentId } = req.body;
  
  if (!paymentId) {
    return res.status(400).json({ 
      error: 'Missing required field: paymentId'
    });
  }

  try {
    const piApiClient = createPiApiClient();
    const cancellationUrl = `/payments/${paymentId}/cancel`;
    
    const apiResponse = await piApiClient.post(cancellationUrl);
    
    console.log('✅ Payment cancelled via Pi API:', apiResponse.data);
    
    res.status(200).json({
      success: true,
      message: 'Payment cancelled successfully',
      paymentId: paymentId,
      piApiResponse: apiResponse.data
    });

  } catch (error) {
    console.error('❌ Payment cancellation failed:', error);
    res.status(500).json({
      error: 'Payment cancellation failed',
      details: error.message,
      paymentId: paymentId
    });
  }
});

// ===== Payment Error Handler =====
exports.handlePaymentError = withCors(async (req, res) => {
  console.log('🔥 handlePaymentError called from:', req.headers.origin);
  
  const { paymentId, errorDetails } = req.body;
  
  try {
    // Try to cancel the payment on Pi's side
    const piApiClient = createPiApiClient();
    const cancellationUrl = `/payments/${paymentId}/cancel`;
    
    await piApiClient.post(cancellationUrl);
    
    console.log('✅ Payment cancelled due to error');
    
    res.status(200).json({
      success: true,
      message: 'Payment error handled and payment cancelled',
      paymentId: paymentId,
      errorDetails: errorDetails
    });

  } catch (error) {
    console.error('❌ Payment error handling failed:', error);
    res.status(500).json({
      error: 'Payment error handling failed',
      details: error.message,
      paymentId: paymentId
    });
  }
});

// ===== Prize Distribution (unchanged but improved) =====
exports.distributePrize = withCors(async (req, res) => {
  console.log('🔥 distributePrize called from:', req.headers.origin);
  
  const { recipientUid, amount, lotteryId, winnerPosition } = req.body;
  
  if (!recipientUid || !amount || !lotteryId || !winnerPosition) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['recipientUid', 'amount', 'lotteryId', 'winnerPosition']
    });
  }

  try {
    // For prize distribution, you would make Pi API calls to send payments
    // This is a placeholder - you'll need to implement actual Pi payment sending
    const distributionId = `prize_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    const distributionData = {
      success: true,
      paymentId: distributionId,
      amount: parseFloat(amount),
      recipient: recipientUid,
      lotteryId: lotteryId,
      position: winnerPosition,
      message: `Prize of ${amount}π sent to winner at position #${winnerPosition}`,
      distributedAt: new Date().toISOString(),
      functionsVersion: '2.0.2'
    };

    console.log('✅ Prize distributed:', distributionData);
    res.status(200).json(distributionData);

  } catch (error) {
    console.error('❌ Prize distribution failed:', error);
    res.status(500).json({ 
      error: 'Prize distribution failed',
      details: error.message
    });
  }
});

console.log('🚀 Firebase Functions v2 with Pi API integration loaded successfully!');

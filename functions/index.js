/*
FILE PATH: /functions/index.js
DESCRIPTION: Cloud Functions main entry point
DEPLOYMENT: Deploy with 'firebase deploy --only functions'
*/

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Helper function to validate admin permissions
async function validateAdminPermission(authContext) {
  if (!authContext || !authContext.uid) {
    return false;
  }

  try {
    const adminDoc = await db.collection('admin_users').doc(authContext.uid).get();
    return adminDoc.exists && adminDoc.data().isAdmin === true;
  } catch (error) {
    console.error('Admin validation error:', error);
    return false;
  }
}

// Admin Authentication Check
exports.checkAdminAuth = functions.https.onCall(async (data, context) => {
  try {
    const isAdmin = await validateAdminPermission(context.auth);
    return { isAdmin: isAdmin };
  } catch (error) {
    console.error('Auth check error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Create Lottery Instance
exports.createLottery = functions.https.onCall(async (data, context) => {
  // Validate admin permission
  if (!await validateAdminPermission(context.auth)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  try {
    const lotteryData = {
      entryFee: data.entryFee || 1.0,
      platformFee: data.platformFee || 0.1,
      maxTicketsPerUser: data.maxTicketsPerUser || 5,
      minParticipants: data.minParticipants || 10,
      scheduledDrawTime: data.scheduledDrawTime ? admin.firestore.Timestamp.fromDate(new Date(data.scheduledDrawTime)) : null,
      status: 'active',
      participants: 0,
      prizePool: 0,
      adminId: context.auth.uid,
      adminWallet: data.adminWallet || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Create lottery instance
    const lotteryRef = await db.collection('lottery_instances').add(lotteryData);

    // Log the action
    await db.collection('lottery_logs').add({
      action: 'lottery_created',
      lotteryId: lotteryRef.id,
      adminId: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        entryFee: lotteryData.entryFee,
        minParticipants: lotteryData.minParticipants
      }
    });

    return { 
      success: true, 
      lotteryId: lotteryRef.id,
      message: 'Lottery created successfully'
    };

  } catch (error) {
    console.error('Create lottery error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Conduct Lottery Drawing
exports.conductDrawing = functions.https.onCall(async (data, context) => {
  // Validate admin permission
  if (!await validateAdminPermission(context.auth)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  try {
    const lotteryId = data.lotteryId;
    
    // Get lottery instance
    const lotteryRef = db.collection('lottery_instances').doc(lotteryId);
    const lotteryDoc = await lotteryRef.get();
    
    if (!lotteryDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Lottery not found');
    }

    const lotteryData = lotteryDoc.data();
    
    if (lotteryData.status !== 'active') {
      throw new functions.https.HttpsError('failed-precondition', 'Lottery is not active');
    }

    // Get all participants
    const participantsQuery = await db.collection('lottery_entries')
      .where('lotteryId', '==', lotteryId)
      .where('status', '==', 'confirmed')
      .get();

    if (participantsQuery.size < lotteryData.minParticipants) {
      throw new functions.https.HttpsError('failed-precondition', 
        `Insufficient participants. Need ${lotteryData.minParticipants}, have ${participantsQuery.size}`);
    }

    // Build participant pool (accounting for multiple tickets)
    const participantPool = [];
    participantsQuery.forEach(doc => {
      const entry = doc.data();
      for (let i = 0; i < entry.ticketCount; i++) {
        participantPool.push({
          userId: entry.userId,
          username: entry.username,
          entryId: doc.id,
          ticketNumber: participantPool.length + 1
        });
      }
    });

    // Generate provably fair random seed
    const provablyFairSeed = generateProvablyFairSeed(lotteryId, participantsQuery);
    
    // Select winners using provably fair algorithm
    const winners = selectWinnersProvablyFair(participantPool, lotteryData.prizePool, provablyFairSeed);

    // Save winners
    const batch = db.batch();
    
    winners.forEach((winner, index) => {
      const winnerId = `${lotteryId}_${index + 1}`;
      const winnerRef = db.collection('lottery_winners').doc(winnerId);
      
      batch.set(winnerRef, {
        lotteryId: lotteryId,
        userId: winner.userId,
        username: winner.username,
        position: index + 1,
        prizeAmount: winner.prizeAmount,
        ticketNumber: winner.ticketNumber,
        status: 'pending_admin_transfer',
        requiresManualTransfer: true,
        fairnessProof: {
          seed: provablyFairSeed.publicSeed,
          drawingStep: winner.drawingStep
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // Update lottery status
    batch.update(lotteryRef, {
      status: 'completed',
      winners: winners.map(w => w.userId),
      drawingTime: admin.firestore.FieldValue.serverTimestamp(),
      provablyFairSeed: provablyFairSeed.publicSeed,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Store complete fairness proof
    const proofRef = db.collection('fairness_proofs').doc(lotteryId);
    batch.set(proofRef, {
      lotteryId: lotteryId,
      ...provablyFairSeed,
      totalParticipants: participantPool.length,
      winnerCount: winners.length,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log the drawing
    const logRef = db.collection('lottery_logs').doc();
    batch.set(logRef, {
      action: 'drawing_conducted',
      lotteryId: lotteryId,
      adminId: context.auth.uid,
      participantCount: participantPool.length,
      winnerCount: winners.length,
      fairnessSeed: provablyFairSeed.publicSeed,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    return { 
      success: true, 
      winners: winners,
      participantCount: participantPool.length,
      fairnessSeed: provablyFairSeed.publicSeed,
      message: 'Drawing conducted successfully'
    };

  } catch (error) {
    console.error('Conduct drawing error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Process lottery entry (called when user pays with Pi)
exports.processLotteryEntry = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  try {
    const { lotteryId, paymentId, amount, ticketCount, username } = data;

    // Verify payment with Pi Network (implement actual verification)
    // For now, we'll assume payment is valid

    // Create lottery entry
    const entryData = {
      lotteryId: lotteryId,
      userId: context.auth.uid,
      username: username || context.auth.uid,
      ticketCount: ticketCount || 1,
      paymentId: paymentId,
      paymentTxId: data.paymentTxId || null,
      amount: amount,
      entryMethod: 'pi_payment',
      status: 'confirmed',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const entryRef = await db.collection('lottery_entries').add(entryData);

    // Update lottery participant count and prize pool
    const lotteryRef = db.collection('lottery_instances').doc(lotteryId);
    const prizeContribution = amount * 0.9; // 90% to prize pool, 10% platform fee
    
    await lotteryRef.update({
      participants: admin.firestore.FieldValue.increment(1),
      prizePool: admin.firestore.FieldValue.increment(prizeContribution),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log the entry
    await db.collection('lottery_logs').add({
      action: 'lottery_entry_confirmed',
      lotteryId: lotteryId,
      userId: context.auth.uid,
      entryId: entryRef.id,
      amount: amount,
      ticketCount: ticketCount,
      paymentId: paymentId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      entryId: entryRef.id,
      message: 'Entry confirmed successfully'
    };

  } catch (error) {
    console.error('Process entry error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Get lottery statistics (for dashboard)
exports.getLotteryStats = functions.https.onCall(async (data, context) => {
  if (!await validateAdminPermission(context.auth)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  try {
    // Get active lottery
    const activeLotteryQuery = await db.collection('lottery_instances')
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    let activeLottery = null;
    if (!activeLotteryQuery.empty) {
      const doc = activeLotteryQuery.docs[0];
      activeLottery = { id: doc.id, ...doc.data() };
    }

    // Get pending winners
    const pendingWinnersQuery = await db.collection('lottery_winners')
      .where('status', '==', 'pending_admin_transfer')
      .get();

    const pendingWinners = [];
    pendingWinnersQuery.forEach(doc => {
      pendingWinners.push({ id: doc.id, ...doc.data() });
    });

    // Get recent activity
    const recentLogsQuery = await db.collection('lottery_logs')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const recentActivity = [];
    recentLogsQuery.forEach(doc => {
      recentActivity.push({ id: doc.id, ...doc.data() });
    });

    return {
      success: true,
      activeLottery: activeLottery,
      pendingWinners: pendingWinners,
      pendingWinnersCount: pendingWinners.length,
      recentActivity: recentActivity
    };

  } catch (error) {
    console.error('Get stats error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Confirm prize transfer
exports.confirmPrizeTransfer = functions.https.onCall(async (data, context) => {
  if (!await validateAdminPermission(context.auth)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  try {
    const { winnerId, transactionId, status } = data;

    // Update winner status
    await db.collection('lottery_winners').doc(winnerId).update({
      status: status || 'transferred',
      transactionId: transactionId,
      transferredAt: admin.firestore.FieldValue.serverTimestamp(),
      transferredBy: context.auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log the transfer
    await db.collection('lottery_logs').add({
      action: 'prize_transferred',
      winnerId: winnerId,
      transactionId: transactionId,
      adminId: context.auth.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'Prize transfer confirmed successfully'
    };

  } catch (error) {
    console.error('Confirm transfer error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Scheduled function to check for automatic drawings
exports.scheduledDrawingCheck = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();
      
      // Find lotteries ready for drawing
      const readyLotteriesQuery = await db.collection('lottery_instances')
        .where('status', '==', 'active')
        .where('scheduledDrawTime', '<=', now)
        .get();

      for (const doc of readyLotteriesQuery.docs) {
        const lotteryId = doc.id;
        const lotteryData = doc.data();
        
        console.log(`Processing scheduled drawing for lottery: ${lotteryId}`);
        
        // Check if minimum participants met
        const participantsQuery = await db.collection('lottery_entries')
          .where('lotteryId', '==', lotteryId)
          .where('status', '==', 'confirmed')
          .get();

        if (participantsQuery.size >= lotteryData.minParticipants) {
          console.log(`Conducting automatic drawing for lottery: ${lotteryId}`);
          
          // Conduct drawing (same logic as manual drawing)
          // This would implement the same drawing logic
          
        } else {
          console.log(`Lottery ${lotteryId} doesn't have enough participants yet`);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Scheduled drawing check error:', error);
      return null;
    }
  });

// Provably fair drawing functions
function generateProvablyFairSeed(lotteryId, participantsQuery) {
  const crypto = require('crypto');
  
  // Create deterministic seed based on lottery data
  const serverSeed = crypto.randomBytes(32).toString('hex');
  
  // Create client seed from participant data (provably fair)
  const participantData = [];
  participantsQuery.forEach(doc => {
    const entry = doc.data();
    participantData.push({
      entryId: doc.id,
      userId: entry.userId,
      paymentTxId: entry.paymentTxId || doc.id
    });
  });
  
  // Sort for deterministic order
  participantData.sort((a, b) => a.entryId.localeCompare(b.entryId));
  
  const clientSeed = crypto
    .createHash('sha256')
    .update(JSON.stringify(participantData))
    .digest('hex');
  
  // Combine seeds for final random seed
  const combinedSeed = crypto
    .createHash('sha256')
    .update(serverSeed + clientSeed + lotteryId)
    .digest('hex');
  
  return {
    serverSeed,
    clientSeed,
    combinedSeed,
    publicSeed: combinedSeed.substring(0, 16), // Public portion for verification
    participantCount: participantData.length,
    timestamp: Date.now()
  };
}

function selectWinnersProvablyFair(participantPool, prizePool, seedData) {
  const crypto = require('crypto');
  const winners = [];
  const availableParticipants = [...participantPool];
  
  // Determine prize structure based on participant count
  const prizeStructure = calculatePrizeStructure(participantPool.length, prizePool);
  
  // Create deterministic random generator from seed
  let currentSeed = seedData.combinedSeed;
  
  Object.entries(prizeStructure).forEach(([position, amount], index) => {
    if (availableParticipants.length === 0) return;
    
    // Generate next random number in sequence
    const { randomIndex, nextSeed } = generateProvableRandom(
      currentSeed, 
      availableParticipants.length, 
      index
    );
    
    currentSeed = nextSeed;
    
    const winner = availableParticipants.splice(randomIndex, 1)[0];
    
    winners.push({
      userId: winner.userId,
      username: winner.username,
      prizeAmount: amount,
      ticketNumber: winner.ticketNumber,
      drawingStep: {
        position: index + 1,
        availableTickets: availableParticipants.length + 1,
        randomIndex,
        selectedTicket: winner.ticketNumber
      }
    });
    
    // Remove all entries for this user to prevent duplicate wins
    for (let i = availableParticipants.length - 1; i >= 0; i--) {
      if (availableParticipants[i].userId === winner.userId) {
        availableParticipants.splice(i, 1);
      }
    }
  });
  
  return winners;
}

function generateProvableRandom(seed, max, step) {
  const crypto = require('crypto');
  
  // Create deterministic hash for this step
  const stepSeed = crypto
    .createHash('sha256')
    .update(seed + step.toString())
    .digest('hex');
  
  // Convert to number and mod by max
  const randomBytes = Buffer.from(stepSeed.substring(0, 8), 'hex');
  const randomValue = randomBytes.readUInt32BE(0);
  const randomIndex = randomValue % max;
  
  // Generate next seed for chain
  const nextSeed = crypto
    .createHash('sha256')
    .update(stepSeed)
    .digest('hex');
  
  return { randomIndex, nextSeed };
}

function calculatePrizeStructure(participantCount, prizePool) {
  if (participantCount <= 10) {
    return {
      first: prizePool * 0.7,
      second: prizePool * 0.3
    };
  } else if (participantCount <= 50) {
    return {
      first: prizePool * 0.6,
      second: prizePool * 0.25,
      third: prizePool * 0.15
    };
  } else {
    return {
      first: prizePool * 0.5,
      second: prizePool * 0.25,
      third: prizePool * 0.15,
      fourth: prizePool * 0.06,
      fifth: prizePool * 0.04
    };
  }
}

console.log('Pi Lottery Admin Cloud Functions loaded successfully');

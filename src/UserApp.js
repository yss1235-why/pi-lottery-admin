// File path: src/UserApp.js - Complete Fixed Version
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';

import { 
  LegalModal, 
  LegalFooter, 
  useConsentTracking,
  LEGAL_VERSIONS 
} from './components/LegalComponents';

// Enhanced Pi Wallet hook (fixed build errors)
const usePiWallet = () => {
  const [piUser, setPiUser] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionStep, setConnectionStep] = useState('');
  const [debugInfo, setDebugInfo] = useState({});

  // Authentication with timeout and retry
  const connectWithTimeout = async (timeoutMs = 25000, retryCount = 0) => {
    const maxRetries = 3;
    
    return new Promise(async (resolve, reject) => {
      let timeoutId;
      let authCompleted = false;

      // Set timeout
      const timeout = setTimeout(() => {
        if (!authCompleted) {
          authCompleted = true;
          reject(new Error(`Authentication timeout after ${timeoutMs/1000} seconds`));
        }
      }, timeoutMs);
      timeoutId = timeout;

      try {
        setConnectionStep(`Authenticating... (attempt ${retryCount + 1}/${maxRetries + 1})`);
        
        console.log(`🔐 Starting authentication attempt ${retryCount + 1}`);
        
        // Try authentication with minimal scope first
        const authResult = await window.Pi.authenticate(['username'], {
          onIncompletePaymentFound: (payment) => {
            console.log('💳 Incomplete payment found:', payment);
            setConnectionStep('Found incomplete payment, processing...');
          }
        });

        // Clear timeout if successful
        if (timeoutId) clearTimeout(timeoutId);
        
        if (!authCompleted) {
          authCompleted = true;
          console.log('✅ Authentication successful:', authResult);
          resolve(authResult);
        }

      } catch (authError) {
        // Clear timeout
        if (timeoutId) clearTimeout(timeoutId);
        
        if (!authCompleted) {
          authCompleted = true;
          console.error(`❌ Authentication attempt ${retryCount + 1} failed:`, authError);
          
          // Retry logic
          if (retryCount < maxRetries) {
            console.log(`🔄 Retrying authentication in 2 seconds...`);
            setTimeout(() => {
              connectWithTimeout(timeoutMs, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, 2000);
          } else {
            reject(authError);
          }
        }
      }
    });
  };

  // Enhanced permission request
  const requestPaymentPermission = async () => {
    try {
      setConnectionStep('Requesting payment permissions...');
      
      // Request payment permission separately
      const paymentAuthResult = await window.Pi.authenticate(['payments'], {
        onIncompletePaymentFound: (payment) => {
          console.log('💳 Incomplete payment during permission request:', payment);
        }
      });

      console.log('✅ Payment permission granted:', paymentAuthResult);
      return paymentAuthResult;
      
    } catch (permError) {
      console.error('❌ Payment permission failed:', permError);
      throw new Error(`Payment permission failed: ${permError.message}`);
    }
  };

  // Main connection function
  const connectWallet = async () => {
    setError('');
    setLoading(true);
    setConnectionStep('Initializing...');
    
    try {
      // Step 1: Verify Pi SDK
      if (!window.Pi) {
        throw new Error('Pi SDK not available');
      }

      setConnectionStep('Checking Pi SDK status...');
      
      // Step 2: Initialize if needed
      try {
        await window.Pi.init({ 
          version: "2.0", 
          sandbox: true,
          timeout: 20000  // 20 second timeout
        });
        console.log('✅ Pi SDK initialized');
      } catch (initError) {
        console.warn('⚠️ SDK init warning (might already be initialized):', initError);
        // Continue anyway - SDK might already be initialized
      }

      setConnectionStep('Connecting to Pi Network...');
      
      // Step 3: Authenticate with timeout
      const authResult = await connectWithTimeout(25000); // 25 second timeout
      
      setConnectionStep('Authentication successful!');
      
      // Step 4: Request payment permission if needed
      let finalUser = authResult.user;
      try {
        const paymentAuth = await requestPaymentPermission();
        finalUser = paymentAuth.user;
        console.log('✅ Payment permissions granted');
      } catch (permError) {
        console.warn('⚠️ Payment permission failed, continuing with basic auth:', permError);
        // Continue with basic auth - user can try payments later
      }

      // Step 5: Success
      setPiUser(finalUser);
      setWalletConnected(true);
      setConnectionStep('');
      
      // Update debug info
      setDebugInfo({
        connectedAt: new Date().toISOString(),
        user: finalUser,
        hasPaymentPermission: !!finalUser.accessToken,
        authMethod: 'timeout_retry'
      });
      
      console.log('🎉 Wallet connected successfully:', finalUser);
      
    } catch (connectionError) {
      console.error('❌ Wallet connection failed:', connectionError);
      setError(`Connection failed: ${connectionError.message}`);
      setConnectionStep('');
      
      // Update debug info with error
      setDebugInfo(prev => ({
        ...prev,
        lastError: {
          message: connectionError.message,
          timestamp: new Date().toISOString(),
          stack: connectionError.stack
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  // Quick connection test (username only)
  const testConnection = async () => {
    try {
      setConnectionStep('Testing connection...');
      
      const testResult = await window.Pi.authenticate(['username'], {
        onIncompletePaymentFound: () => console.log('Test: incomplete payment found')
      });
      
      console.log('✅ Connection test successful:', testResult);
      setConnectionStep('');
      return testResult;
      
    } catch (testError) {
      console.error('❌ Connection test failed:', testError);
      setConnectionStep('');
      throw testError;
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setPiUser(null);
    setWalletConnected(false);
    setError('');
    setConnectionStep('');
    setDebugInfo({});
    console.log('🔌 Wallet disconnected');
  };

  return {
    piUser,
    walletConnected,
    loading,
    error,
    connectionStep,
    debugInfo,
    connectWallet,
    testConnection,
    disconnectWallet,
    requestPaymentPermission,
    isSDKReady: !!window.Pi,
    canConnect: !!window.Pi && !loading,
    setError
  };
};

function UserApp() {
  // Legal modal / consent tracking state
  const [legalModal, setLegalModal] = useState({ isOpen: false, type: 'privacy' });
  const { recordConsent } = useConsentTracking();

  const openLegal = (type) => {
    setLegalModal({ isOpen: true, type });
  };

  const closeLegal = () => {
    setLegalModal({ isOpen: false, type: 'privacy' });
  };

  const handleLegalAccept = (type) => {
    recordConsent(type);
    console.log(`User accepted ${type}`);
    closeLegal();
  };

  // Use enhanced Pi wallet hook
  const {
    piUser,
    walletConnected,
    loading,
    error,
    connectionStep,
    debugInfo,
    connectWallet,
    testConnection,
    disconnectWallet,
    requestPaymentPermission,
    isSDKReady,
    canConnect,
    setError
  } = usePiWallet();

  // App state
  const [success, setSuccess] = useState('');
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Lottery data
  const [activeLotteries, setActiveLotteries] = useState([]);
  const [myEntries, setMyEntries] = useState([]);
  const [completedLotteries, setCompletedLotteries] = useState([]);
  
  // User stats
  const [userStats, setUserStats] = useState({
    totalEntered: 0,
    totalSpent: 0,
    totalWon: 0,
    winCount: 0
  });

  // Check for debug mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
      setShowDebugPanel(true);
    }
  }, []);

  // Load data functions
  useEffect(() => {
    loadActiveLotteries();
    loadCompletedLotteries();
  }, []);

  useEffect(() => {
    if (walletConnected && piUser) {
      loadMyEntries();
      calculateUserStats();
    }
  }, [walletConnected, piUser]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadActiveLotteries();
      if (walletConnected) {
        loadMyEntries();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [walletConnected]);

  // Data loading functions with error handling for missing indexes
  const loadActiveLotteries = async () => {
    try {
      const lotteriesRef = collection(db, 'lotteries');
      
      // Try the indexed query first
      try {
        const q = query(
          lotteriesRef, 
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        const lotteries = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const endDate = data.endDate?.toDate?.() || new Date(data.endDate);
          
          if (endDate > new Date()) {
            lotteries.push({
              id: doc.id,
              ...data,
              endDate,
              createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
            });
          }
        });
        
        setActiveLotteries(lotteries);
        
      } catch (indexError) {
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
          console.warn('⚠️ Firebase index not ready, using fallback query:', indexError.message);
          
          // Fallback: Get all lotteries and filter client-side
          const fallbackSnapshot = await getDocs(lotteriesRef);
          const lotteries = [];
          
          fallbackSnapshot.forEach((doc) => {
            const data = doc.data();
            const endDate = data.endDate?.toDate?.() || new Date(data.endDate);
            
            if (data.status === 'active' && endDate > new Date()) {
              lotteries.push({
                id: doc.id,
                ...data,
                endDate,
                createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
              });
            }
          });
          
          // Sort client-side
          lotteries.sort((a, b) => b.createdAt - a.createdAt);
          setActiveLotteries(lotteries);
          
        } else {
          throw indexError;
        }
      }
      
    } catch (loadError) {
      console.error('Error loading active lotteries:', loadError);
      // Don't show error to user for index issues
      if (!loadError.message?.includes('index')) {
        setError('Failed to load lotteries. Please refresh the page.');
      }
    }
  };

  const loadMyEntries = async () => {
    if (!piUser) return;
    
    try {
      const lotteriesRef = collection(db, 'lotteries');
      const querySnapshot = await getDocs(lotteriesRef);
      
      const entries = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants) {
          const userEntries = data.participants.filter(p => p.uid === piUser.uid);
          if (userEntries.length > 0) {
            entries.push({
              lotteryId: doc.id,
              lotteryTitle: data.title,
              entryFee: data.entryFee,
              ticketCount: userEntries.length,
              status: data.status,
              endDate: data.endDate?.toDate?.() || new Date(data.endDate),
              winners: data.winners || [],
              totalParticipants: data.participants.length
            });
          }
        }
      });
      
      setMyEntries(entries);
    } catch (loadError) {
      console.error('Error loading my entries:', loadError);
    }
  };

  const loadCompletedLotteries = async () => {
    try {
      const lotteriesRef = collection(db, 'lotteries');
      
      // Try indexed query first
      try {
        const q = query(
          lotteriesRef,
          where('status', '==', 'completed'),
          orderBy('drawnAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        const completed = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          completed.push({
            id: doc.id,
            ...data,
            endDate: data.endDate?.toDate?.() || new Date(data.endDate),
            drawnAt: data.drawnAt?.toDate?.() || new Date(data.drawnAt)
          });
        });
        
        setCompletedLotteries(completed.slice(0, 10));
        
      } catch (indexError) {
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
          console.warn('⚠️ Firebase index not ready for completed lotteries, using fallback');
          
          // Fallback: Get all and filter client-side
          const fallbackSnapshot = await getDocs(lotteriesRef);
          const completed = [];
          
          fallbackSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.status === 'completed' && data.drawnAt) {
              completed.push({
                id: doc.id,
                ...data,
                endDate: data.endDate?.toDate?.() || new Date(data.endDate),
                drawnAt: data.drawnAt?.toDate?.() || new Date(data.drawnAt)
              });
            }
          });
          
          // Sort client-side
          completed.sort((a, b) => b.drawnAt - a.drawnAt);
          setCompletedLotteries(completed.slice(0, 10));
          
        } else {
          throw indexError;
        }
      }
      
    } catch (loadError) {
      console.error('Error loading completed lotteries:', loadError);
    }
  };

  const calculateUserStats = () => {
    let totalEntered = 0;
    let totalSpent = 0;
    let totalWon = 0;
    let winCount = 0;

    myEntries.forEach(entry => {
      totalEntered += entry.ticketCount;
      totalSpent += entry.ticketCount * entry.entryFee;
      
      if (entry.winners && entry.winners.length > 0) {
        const userWins = entry.winners.filter(w => w.winner.uid === piUser.uid);
        if (userWins.length > 0) {
          winCount += userWins.length;
          totalWon += userWins.reduce((sum, win) => sum + win.prize, 0);
        }
      }
    });

    setUserStats({
      totalEntered,
      totalSpent: totalSpent.toFixed(2),
      totalWon: totalWon.toFixed(2),
      winCount
    });
  };

  // Ticket system functions
  const calculateMaxTicketsForUser = (totalParticipants) => {
    return Math.max(2, Math.floor(totalParticipants * 0.02));
  };

  const getUserTicketCount = (lottery) => {
    if (!piUser || !lottery.participants) return 0;
    return lottery.participants.filter(p => p.uid === piUser.uid).length;
  };

  const canBuyMoreTickets = (lottery) => {
    const userTickets = getUserTicketCount(lottery);
    const maxTickets = calculateMaxTicketsForUser(lottery.participants.length + 1);
    return userTickets < maxTickets;
  };

  // Enhanced lottery participation with payment permission check
  const joinLottery = async (lotteryId, lottery) => {
    if (!walletConnected) {
      setError('Please connect your Pi wallet first');
      return;
    }

    // Check if user has payment permission
    if (!debugInfo.hasPaymentPermission) {
      try {
        setSuccess('Requesting payment permission...');
        await requestPaymentPermission();
        setSuccess('Payment permission granted! You can now join lotteries.');
      } catch (permissionError) {
        setError(`Payment permission required: ${permissionError.message}`);
        return;
      }
    }

    const userTickets = getUserTicketCount(lottery);
    const maxTickets = calculateMaxTicketsForUser(lottery.participants.length + 1);
    
    if (userTickets >= maxTickets) {
      setError(`You've reached your ticket limit (${maxTickets} tickets max)`);
      return;
    }

    try {
      setSuccess('');
      setError('');

      console.log('💰 Creating Pi payment for lottery entry...');

      const paymentData = {
        amount: lottery.entryFee,
        memo: `Lottery Entry: ${lottery.title}`,
        metadata: {
          lotteryId,
          userId: piUser.uid,
          ticketNumber: userTickets + 1
        }
      };

      console.log('💳 Payment data:', paymentData);

      const paymentCallbacks = {
        onReadyForServerApproval: (paymentId) => {
          console.log('✅ Payment ready for approval:', paymentId);
        },
        onReadyForServerCompletion: async (paymentId, txnId) => {
          console.log('🎉 Payment completed:', paymentId, txnId);
          
          try {
            // Add user to lottery participants
            const lotteryRef = doc(db, 'lotteries', lotteryId);
            await updateDoc(lotteryRef, {
              participants: arrayUnion({
                uid: piUser.uid,
                username: piUser.username,
                joinedAt: Timestamp.now(),
                paymentId: paymentId,
                txnId: txnId,
                ticketNumber: userTickets + 1
              })
            });

            setSuccess(`🎫 Ticket purchased! You now have ${userTickets + 1} tickets in this lottery.`);
            
            // Refresh data
            loadActiveLotteries();
            loadMyEntries();
          } catch (updateError) {
            console.error('❌ Error updating lottery:', updateError);
            setError('Payment successful but error updating lottery. Please refresh.');
          }
        },
        onCancel: (paymentId) => {
          console.log('❌ Payment cancelled:', paymentId);
          setError('Payment cancelled');
        },
        onError: (paymentError, paymentId) => {
          console.error('❌ Payment error:', paymentError, paymentId);
          setError(`Payment failed: ${paymentError.message || paymentError}`);
        }
      };

      await window.Pi.createPayment(paymentData, paymentCallbacks);

    } catch (joinError) {
      console.error('❌ Join lottery error:', joinError);
      setError(`Failed to join lottery: ${joinError.message}`);
    }
  };

  // Utility functions
  const formatTimeRemaining = (endDate) => {
    const now = new Date();
    const diff = endDate - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const calculateCurrentPrizes = (lottery) => {
    const participantCount = lottery.participants?.length || 0;
    const totalCollected = participantCount * lottery.entryFee;
    const platformFee = participantCount * (lottery.platformFee || 0.1);
    const prizePool = totalCollected - platformFee;
    
    const getWinnerCount = (count) => {
      if (count < 10) return 1;
      if (count < 25) return 3;
      if (count < 50) return 5;
      if (count < 100) return 7;
      if (count < 200) return 10;
      if (count < 500) return 15;
      if (count < 1000) return 20;
      return 25;
    };

    const winnerCount = getWinnerCount(participantCount);
    
    const getPercentages = (count) => {
      const distributions = {
        1: [100],
        3: [60, 30, 10],
        5: [40, 25, 20, 10, 5],
        7: [30, 20, 15, 12, 10, 8, 5],
        10: [25, 18, 14, 11, 9, 7, 6, 4, 3, 3],
        15: [20, 15, 12, 10, 8, 7, 6, 5, 4, 3, 3, 2, 2, 2, 1],
        20: [18, 14, 11, 8, 7, 6, 5, 4.5, 4, 3.5, 3, 2.8, 2.5, 2.2, 2, 1.8, 1.5, 1.2, 1, 1],
        25: [15, 12, 9, 7, 6, 5, 4.5, 4, 3.5, 3.2, 3, 2.8, 2.5, 2.3, 2.1, 2, 1.8, 1.6, 1.4, 1.3, 1.2, 1.1, 1, 1, 1]
      };
      return distributions[count] || [100];
    };

    const percentages = getPercentages(winnerCount);
    const prizes = percentages.map(p => (prizePool * p / 100).toFixed(2));

    return { prizePool, winnerCount, prizes, winChance: (winnerCount / Math.max(participantCount, 1) * 100).toFixed(1) };
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Enhanced connection test function
  const handleTestConnection = async () => {
    try {
      setSuccess('Testing Pi connection...');
      const result = await testConnection();
      setSuccess(`✅ Connection test successful! User: ${result.user.username}`);
    } catch (testError) {
      setError(`❌ Connection test failed: ${testError.message}`);
    }
  };

  return (
    <div className="container">
      {/* Header with Enhanced Connection Status */}
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0 }}>🎰 Pi Lottery</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>Provably fair lotteries with Pi cryptocurrency</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Debug button */}
          <button 
            onClick={() => setShowDebugPanel(true)}
            style={{
              background: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            🔧 Debug
          </button>
          
          {walletConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', color: 'white' }}>👤 {piUser.username}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  {debugInfo.hasPaymentPermission ? 'Full Access' : 'Basic Access'}
                </div>
              </div>
              <button onClick={disconnectWallet} className="button secondary" style={{ padding: '8px 16px' }}>
                🔌 Disconnect
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={connectWallet}
                className="button success"
                disabled={!isSDKReady || loading}
                style={{ padding: '12px 20px' }}
              >
                {loading ? `🔄 ${connectionStep || 'Connecting...'}` : isSDKReady ? '🔗 Connect Pi Wallet' : '⏳ Loading Pi SDK...'}
              </button>
              
              {/* Test connection button */}
              {isSDKReady && !walletConnected && !loading && (
                <button 
                  onClick={handleTestConnection}
                  className="button secondary"
                  style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                >
                  🧪 Test Connection
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Connection Status Panel */}
      {(connectionStep || error || (!isSDKReady && !loading)) && (
        <div className="card" style={{
          background: error ? '#f8d7da' : connectionStep ? '#fff3cd' : '#d1ecf1',
          border: `2px solid ${error ? '#f5c6cb' : connectionStep ? '#ffeaa7' : '#bee5eb'}`
        }}>
          <h3>🔗 Connection Status</h3>
          {connectionStep && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '3px solid #f3f3f3',
                borderTop: '3px solid #6f42c1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span>{connectionStep}</span>
            </div>
          )}
          
          {error && (
            <div style={{ color: '#721c24', marginBottom: '10px' }}>
              ❌ {error}
            </div>
          )}
          
          {!isSDKReady && !loading && (
            <div style={{ color: '#0c5460' }}>
              ⚠️ Pi SDK not ready. Ensure you're using Pi Browser.
            </div>
          )}
          
          {/* Troubleshooting tips */}
          {error && (
            <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '10px' }}>
              <strong>💡 Try these solutions:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                <li>Clear Pi Browser cache and restart the app</li>
                <li>Check your internet connection</li>
                <li>Log out and back into the Pi app</li>
                <li>Test connection with the "Test Connection" button first</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {success && (
        <div className="success">
          {success}
          <button onClick={clearMessages} style={{float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}}>×</button>
        </div>
      )}

      {/* User Stats */}
      {walletConnected && (
        <div className="stats-grid">
          <div className="stat-card purple">
            <div className="stat-number">{userStats.totalEntered}</div>
            <div className="stat-label">Tickets Bought</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-number">{userStats.totalSpent} π</div>
            <div className="stat-label">Total Spent</div>
          </div>
          <div className="stat-card green">
            <div className="stat-number">{userStats.totalWon} π</div>
            <div className="stat-label">Total Won</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-number">{userStats.winCount}</div>
            <div className="stat-label">Prizes Won</div>
          </div>
        </div>
      )}

      {/* Active Lotteries */}
      <div className="card">
        <h2>🎲 Available Lotteries</h2>
        {!walletConnected && (
          <div className="warning" style={{ margin: '0 0 20px 0' }}>
            <strong>🔗 Connect your Pi wallet to join lotteries and track your entries</strong>
          </div>
        )}
        
        {activeLotteries.length === 0 ? (
          <p style={{textAlign: 'center', color: '#6c757d', padding: '40px'}}>
            No active lotteries at the moment. Check back soon!
          </p>
        ) : (
          <div className="lottery-list">
            {activeLotteries.map((lottery) => {
              const userTickets = getUserTicketCount(lottery);
              const participantCount = lottery.participants?.length || 0;
              const maxUserTickets = calculateMaxTicketsForUser(participantCount + 1);
              const canBuyMore = canBuyMoreTickets(lottery);
              const prizeInfo = calculateCurrentPrizes(lottery);

              return (
                <div key={lottery.id} className="lottery-item">
                  <div className="lottery-header">
                    <h3 className="lottery-title">
                      {lottery.title}
                      {lottery.lotteryType && lottery.lotteryType !== 'standard' && (
                        <span style={{fontSize: '0.8rem', color: '#6c757d', marginLeft: '10px'}}>
                          📅 {lottery.lotteryType}
                        </span>
                      )}
                    </h3>
                    <span className="lottery-status status-active">
                      ⏰ {formatTimeRemaining(lottery.endDate)}
                    </span>
                  </div>

                  {lottery.description && (
                    <p style={{color: '#6c757d', marginBottom: '15px'}}>
                      {lottery.description}
                    </p>
                  )}

                  {/* Live Prize Pool */}
                  <div className="success" style={{margin: '15px 0'}}>
                    <h4>💰 Current Prize Pool: {prizeInfo.prizePool.toFixed(2)}π</h4>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginTop: '10px'}}>
                      {prizeInfo.prizes.slice(0, 5).map((prize, index) => (
                        <div key={index} style={{textAlign: 'center'}}>
                          <div style={{fontWeight: 'bold'}}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'} {prize}π
                          </div>
                          <div style={{fontSize: '0.8rem', color: '#6c757d'}}>
                            {index + 1 === 1 ? '1st' : index + 1 === 2 ? '2nd' : index + 1 === 3 ? '3rd' : `${index + 1}th`}
                          </div>
                        </div>
                      ))}
                      {prizeInfo.winnerCount > 5 && (
                        <div style={{textAlign: 'center', fontSize: '0.9rem', color: '#6c757d'}}>
                          +{prizeInfo.winnerCount - 5} more prizes
                        </div>
                      )}
                    </div>
                    <div style={{marginTop: '10px', textAlign: 'center'}}>
                      <strong>🎯 Win Chance: {prizeInfo.winChance}%</strong>
                    </div>
                  </div>

                  <div className="lottery-details">
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">Entry Fee</div>
                      <div className="lottery-detail-value">{lottery.entryFee}π</div>
                    </div>
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">Participants</div>
                      <div className="lottery-detail-value">{participantCount}</div>
                    </div>
                    {walletConnected && (
                      <div className="lottery-detail">
                        <div className="lottery-detail-label">Your Tickets</div>
                        <div className="lottery-detail-value">{userTickets}/{maxUserTickets}</div>
                      </div>
                    )}
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">Winners</div>
                      <div className="lottery-detail-value">{prizeInfo.winnerCount}</div>
                    </div>
                  </div>

                  {/* Provably Fair Info */}
                  <div className="success" style={{margin: '15px 0'}}>
                    <h4>🔒 Provably Fair Guarantee:</h4>
                    <p><strong>Bitcoin Block:</strong> #{lottery.provablyFair?.commitmentBlock}</p>
                    <p>Winners selected using future Bitcoin block hash - impossible to manipulate!</p>
                  </div>

                  <div className="lottery-actions">
                    {!walletConnected ? (
                      <div style={{textAlign: 'center', padding: '15px'}}>
                        <span style={{color: '#6c757d', fontWeight: 'bold'}}>
                          🔗 Connect Pi wallet to join this lottery
                        </span>
                      </div>
                    ) : canBuyMore ? (
                      <button 
                        onClick={() => joinLottery(lottery.id, lottery)}
                        className="button success full-width"
                        disabled={loading}
                      >
                        {loading ? '🔄 Processing...' : `🎫 Buy Ticket (${lottery.entryFee}π)`}
                      </button>
                    ) : (
                      <div style={{textAlign: 'center', padding: '15px'}}>
                        <span style={{color: '#6c757d', fontWeight: 'bold'}}>
                          ✅ Maximum tickets reached ({userTickets}/{maxUserTickets})
                        </span>
                        <div style={{fontSize: '0.9rem', color: '#6c757d', marginTop: '5px'}}>
                          You can buy more tickets as other users join!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 10000,
          color: 'white',
          padding: '20px',
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>🔧 Pi Browser Debug Panel</h2>
              <button 
                onClick={() => setShowDebugPanel(false)}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px'
                }}
              >
                ✕ Close
              </button>
            </div>
            
            <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px' }}>
              <h3>Connection Debug Info:</h3>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '10px 0' }}>
                {JSON.stringify({
                  piSDKAvailable: isSDKReady,
                  walletConnected,
                  connectionStep,
                  error,
                  debugInfo,
                  userAgent: navigator.userAgent,
                  timestamp: new Date().toISOString()
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Legal Modal and Footer */}
      <LegalModal
        isOpen={legalModal.isOpen}
        onClose={closeLegal}
        type={legalModal.type}
        onAccept={handleLegalAccept}
        showAcceptButton={true}
      />

      <LegalFooter onOpenLegal={openLegal} />
    </div>
  );
}

export default UserApp;

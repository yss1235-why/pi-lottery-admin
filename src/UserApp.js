// File path: src/UserApp.js - Improved with Enhanced Pi SDK Integration
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

import usePiSDK from './hooks/usePiSDK'; // Use the new enhanced hook
import { 
  LegalModal, 
  LegalFooter, 
  useConsentTracking 
} from './components/LegalComponents';

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

  // Use enhanced Pi SDK hook
  const {
    piUser,
    isAuthenticated,
    hasPaymentAccess,
    loading,
    error,
    sdkReady,
    connectionStatus,
    authStep,
    connectUser,
    requestPaymentAccess,
    connectWallet,
    createPayment,
    disconnect,
    testConnection,
    getConnectionInfo,
    clearError,
    canConnect,
    isFullyConnected,
    needsPaymentAccess
  } = usePiSDK();

  // App state
  const [success, setSuccess] = useState('');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [joiningLottery, setJoiningLottery] = useState(false);

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
    if (isAuthenticated && piUser) {
      loadMyEntries();
      calculateUserStats();
    }
  }, [isAuthenticated, piUser]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadActiveLotteries();
      if (isAuthenticated) {
        loadMyEntries();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Data loading functions with improved error handling
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
          console.warn('⚠️ Firebase index not ready, using fallback query');
          
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
      if (!loadError.message?.includes('index')) {
        setSuccess('⚠️ Failed to load lotteries. Please refresh the page.');
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

  // Enhanced lottery participation with new Pi SDK
  const joinLottery = async (lotteryId, lottery) => {
    if (!isAuthenticated) {
      setSuccess('Please connect to Pi Network first');
      return;
    }

    // Check if user has payment access
    if (!hasPaymentAccess) {
      try {
        setSuccess('Requesting payment permission...');
        await requestPaymentAccess();
        setSuccess('Payment permission granted! You can now join lotteries.');
      } catch (permissionError) {
        setSuccess(`Payment permission required: ${permissionError.message}`);
        return;
      }
    }

    const userTickets = getUserTicketCount(lottery);
    const maxTickets = calculateMaxTicketsForUser(lottery.participants.length + 1);
    
    if (userTickets >= maxTickets) {
      setSuccess(`You've reached your ticket limit (${maxTickets} tickets max)`);
      return;
    }

    setJoiningLottery(true);
    setSuccess('');
    clearError();

    try {
      console.log('💰 Joining lottery:', lottery.title);

      const paymentData = {
        amount: lottery.entryFee,
        memo: `Lottery Entry: ${lottery.title}`,
        metadata: {
          lotteryId,
          userId: piUser.uid,
          ticketNumber: userTickets + 1,
          timestamp: Date.now()
        }
      };

      const paymentCallbacks = {
        onReadyForServerApproval: (paymentId) => {
          console.log('✅ Payment approved:', paymentId);
          setSuccess('Payment approved, processing entry...');
        },
        
        onReadyForServerCompletion: async (paymentId, txnId) => {
          console.log('🎉 Payment completed:', { paymentId, txnId });
          
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

            setSuccess(`🎫 Ticket purchased! You now have ${userTickets + 1} tickets in "${lottery.title}"`);
            
            // Refresh data
            loadActiveLotteries();
            loadMyEntries();
          } catch (updateError) {
            console.error('❌ Error updating lottery:', updateError);
            setSuccess('Payment successful but error updating lottery. Please refresh.');
          }
        },
        
        onCancel: (paymentId) => {
          console.log('❌ Payment cancelled:', paymentId);
          setSuccess('Payment cancelled');
        },
        
        onError: (paymentError, paymentId) => {
          console.error('❌ Payment error:', { paymentError, paymentId });
          setSuccess(`Payment failed: ${paymentError.message || paymentError}`);
        }
      };

      await createPayment(paymentData, paymentCallbacks);

    } catch (joinError) {
      console.error('❌ Join lottery error:', joinError);
      setSuccess(`Failed to join lottery: ${joinError.message}`);
    } finally {
      setJoiningLottery(false);
    }
  };

  // Enhanced connection handlers
  const handleConnectUser = async () => {
    try {
      await connectUser();
      setSuccess(`✅ Connected to Pi Network! Welcome, ${piUser?.username || 'User'}`);
    } catch (connectError) {
      console.error('Connection failed:', connectError);
    }
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      setSuccess(`💰 Wallet connected! You can now participate in lotteries.`);
    } catch (connectError) {
      console.error('Wallet connection failed:', connectError);
    }
  };

  const handleTestConnection = async () => {
    try {
      setSuccess('Testing Pi connection...');
      const result = await testConnection();
      setSuccess(`✅ Connection test successful! User: ${result.user.username}`);
    } catch (testError) {
      setSuccess(`❌ Connection test failed: ${testError.message}`);
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

    return { 
      prizePool, 
      winnerCount, 
      prizes, 
      winChance: (winnerCount / Math.max(participantCount, 1) * 100).toFixed(1) 
    };
  };

  const clearMessages = () => {
    clearError();
    setSuccess('');
  };

  // Get status color for connection
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#28a745';
      case 'connecting': return '#ffc107';
      case 'error': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div className="container">
      {/* Enhanced Header with Better Connection Status */}
      <div className="header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        position: 'relative'
      }}>
        <div>
          <h1 style={{ margin: 0 }}>🎰 Pi Lottery</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
            Provably fair lotteries with Pi cryptocurrency
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Enhanced Connection Status Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            fontSize: '0.9rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: getStatusColor(),
              animation: connectionStatus === 'connecting' ? 'pulse 2s infinite' : 'none'
            }}></div>
            <span style={{ color: 'white' }}>
              {connectionStatus === 'connected' && isFullyConnected && '🔗 Fully Connected'}
              {connectionStatus === 'connected' && needsPaymentAccess && '⚠️ Payment Access Needed'}
              {connectionStatus === 'connecting' && '🔄 Connecting...'}
              {connectionStatus === 'error' && '❌ Connection Error'}
              {connectionStatus === 'disconnected' && '⭕ Disconnected'}
            </span>
          </div>

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
          
          {/* Enhanced Connection Controls */}
          {isFullyConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', color: 'white' }}>
                  👤 {piUser.username}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  💰 Payment Ready
                </div>
              </div>
              <button onClick={disconnect} className="button danger" style={{ padding: '8px 16px' }}>
                🔌 Disconnect
              </button>
            </div>
          ) : isAuthenticated && needsPaymentAccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ textAlign: 'right', marginBottom: '5px' }}>
                <div style={{ fontWeight: 'bold', color: 'white', fontSize: '0.9rem' }}>
                  👤 {piUser.username}
                </div>
              </div>
              <button 
                onClick={requestPaymentAccess}
                className="button warning"
                disabled={loading}
                style={{ padding: '10px 16px' }}
              >
                {loading ? '🔄 Requesting...' : '💰 Enable Payments'}
              </button>
              <button onClick={disconnect} className="button secondary" style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
                🔌 Disconnect
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={handleConnectWallet}
                className="button success"
                disabled={!canConnect}
                style={{ padding: '12px 20px' }}
              >
                {loading ? `🔄 ${authStep || 'Connecting...'}` : 
                 canConnect ? '🔗 Connect Pi Wallet' : 
                 '⏳ Loading Pi SDK...'}
              </button>
              
              {/* Test connection button */}
              {sdkReady && !isAuthenticated && !loading && (
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

      {/* Enhanced Connection Status Panel */}
      {(authStep || error || (!sdkReady && !loading)) && (
        <div className="card" style={{
          background: error ? '#f8d7da' : authStep ? '#fff3cd' : '#d1ecf1',
          border: `2px solid ${error ? '#f5c6cb' : authStep ? '#ffeaa7' : '#bee5eb'}`
        }}>
          <h3>🔗 Connection Status</h3>
          
          {authStep && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '3px solid #f3f3f3',
                borderTop: '3px solid #6f42c1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span>{authStep}</span>
            </div>
          )}
          
          {error && (
            <div style={{ color: '#721c24', marginBottom: '10px' }}>
              ❌ {error}
              <button 
                onClick={clearError}
                style={{ 
                  marginLeft: '10px', 
                  background: 'none', 
                  border: 'none', 
                  color: 'inherit', 
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Clear
              </button>
            </div>
          )}
          
          {!sdkReady && !loading && (
            <div style={{ color: '#0c5460' }}>
              ⚠️ Pi SDK not ready. Please ensure you're using Pi Browser.
            </div>
          )}
          
          {/* Enhanced Troubleshooting */}
          {error && (
            <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '10px' }}>
              <strong>💡 Troubleshooting:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                <li>Try refreshing the page</li>
                <li>Ensure you're using the latest Pi Browser</li>
                <li>Check your internet connection</li>
                <li>Log out and back into the Pi app</li>
                <li>Clear Pi Browser cache and restart</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {success && (
        <div className="success">
          {success}
          <button onClick={clearMessages} style={{
            float: 'right', 
            background: 'none', 
            border: 'none', 
            color: 'inherit', 
            cursor: 'pointer'
          }}>×</button>
        </div>
      )}

      {/* User Stats */}
      {isAuthenticated && (
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
        {!isFullyConnected && (
          <div className="warning" style={{ margin: '0 0 20px 0' }}>
            <strong>
              {!isAuthenticated && '🔗 Connect to Pi Network to join lotteries'}
              {isAuthenticated && needsPaymentAccess && '💰 Enable payment access to join lotteries'}
            </strong>
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
                    <div style={{
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                      gap: '10px', 
                      marginTop: '10px'
                    }}>
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
                    {isAuthenticated && (
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

                  {/* Enhanced Action Buttons */}
                  <div className="lottery-actions">
                    {!isAuthenticated ? (
                      <div style={{textAlign: 'center', padding: '15px'}}>
                        <span style={{color: '#6c757d', fontWeight: 'bold'}}>
                          🔗 Connect to Pi Network to join this lottery
                        </span>
                      </div>
                    ) : needsPaymentAccess ? (
                      <div style={{textAlign: 'center', padding: '15px'}}>
                        <span style={{color: '#856404', fontWeight: 'bold'}}>
                          💰 Enable payment access to join lotteries
                        </span>
                      </div>
                    ) : canBuyMore ? (
                      <button 
                        onClick={() => joinLottery(lottery.id, lottery)}
                        className="button success full-width"
                        disabled={joiningLottery || loading}
                        style={{
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {joiningLottery ? (
                          <span>
                            <span style={{
                              display: 'inline-block',
                              width: '16px',
                              height: '16px',
                              border: '2px solid #ffffff40',
                              borderTop: '2px solid #ffffff',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite',
                              marginRight: '8px'
                            }}></span>
                            Processing Payment...
                          </span>
                        ) : (
                          `🎫 Buy Ticket (${lottery.entryFee}π)`
                        )}
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

      {/* My Entries Section */}
      {myEntries.length > 0 && (
        <div className="card">
          <h2>🎫 My Lottery Entries</h2>
          <div className="lottery-list">
            {myEntries.map((entry) => (
              <div key={entry.lotteryId} className="lottery-item">
                <div className="lottery-header">
                  <h3 className="lottery-title">{entry.lotteryTitle}</h3>
                  <span className={`lottery-status status-${entry.status}`}>
                    {entry.status === 'active' && `⏰ ${formatTimeRemaining(entry.endDate)}`}
                    {entry.status === 'ended' && '🔴 Ended'}
                    {entry.status === 'completed' && '🏆 Completed'}
                  </span>
                </div>
                
                <div className="lottery-details">
                  <div className="lottery-detail">
                    <div className="lottery-detail-label">My Tickets</div>
                    <div className="lottery-detail-value">{entry.ticketCount}</div>
                  </div>
                  <div className="lottery-detail">
                    <div className="lottery-detail-label">Total Spent</div>
                    <div className="lottery-detail-value">{(entry.ticketCount * entry.entryFee).toFixed(2)}π</div>
                  </div>
                  <div className="lottery-detail">
                    <div className="lottery-detail-label">Total Participants</div>
                    <div className="lottery-detail-value">{entry.totalParticipants}</div>
                  </div>
                  <div className="lottery-detail">
                    <div className="lottery-detail-label">My Win Chance</div>
                    <div className="lottery-detail-value">
                      {((entry.ticketCount / entry.totalParticipants) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Show results if completed */}
                {entry.status === 'completed' && entry.winners.length > 0 && (
                  <div className="winners-display">
                    <h4>🏆 Results:</h4>
                    {entry.winners.some(w => w.winner.uid === piUser.uid) ? (
                      <div className="success" style={{padding: '15px', textAlign: 'center'}}>
                        <strong>🎉 Congratulations! You won!</strong>
                        {entry.winners
                          .filter(w => w.winner.uid === piUser.uid)
                          .map((win, index) => (
                            <div key={index} style={{marginTop: '10px'}}>
                              Position #{win.position}: {win.prize}π
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <div style={{padding: '15px', textAlign: 'center', color: '#6c757d'}}>
                        No win this time. Better luck next lottery!
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Winners */}
      {completedLotteries.length > 0 && (
        <div className="card">
          <h2>🏆 Recent Winners</h2>
          <div className="lottery-list">
            {completedLotteries.slice(0, 5).map((lottery) => (
              <div key={lottery.id} className="lottery-item winner-item">
                <div className="lottery-header">
                  <h3 className="lottery-title">{lottery.title}</h3>
                  <span className="lottery-status status-completed">
                    🏆 Completed
                  </span>
                </div>
                
                {lottery.winners && lottery.winners.length > 0 && (
                  <div className="winners-display">
                    <h4>Winners:</h4>
                    <div style={{display: 'grid', gap: '8px'}}>
                      {lottery.winners.slice(0, 3).map((winner, index) => (
                        <div key={index} style={{
                          display: 'flex', 
                          justifyContent: 'space-between',
                          padding: '8px',
                          background: '#f8f9fa',
                          borderRadius: '6px'
                        }}>
                          <span>
                            {winner.position === 1 ? '🥇' : winner.position === 2 ? '🥈' : winner.position === 3 ? '🥉' : '🏅'} 
                            #{winner.position} - {winner.winner.username}
                          </span>
                          <span style={{fontWeight: 'bold', color: '#007bff'}}>
                            {winner.prize}π
                          </span>
                        </div>
                      ))}
                      {lottery.winners.length > 3 && (
                        <div style={{textAlign: 'center', color: '#6c757d', fontSize: '0.9rem'}}>
                          +{lottery.winners.length - 3} more winners
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Debug Panel */}
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
              <h2>🔧 Enhanced Pi SDK Debug Panel</h2>
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
              <h3>Pi SDK Connection Info:</h3>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '10px 0' }}>
                {JSON.stringify(getConnectionInfo(), null, 2)}
              </pre>
              
              <div style={{ marginTop: '20px' }}>
                <button 
                  onClick={handleTestConnection}
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    marginRight: '10px'
                  }}
                >
                  🧪 Test Connection
                </button>
                
                <button 
                  onClick={() => console.log('Pi SDK:', window.Pi)}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px'
                  }}
                >
                  📋 Log Pi SDK to Console
                </button>
              </div>
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

      {/* Add CSS for animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default UserApp;

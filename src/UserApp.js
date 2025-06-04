// File path: src/UserApp.js - Enhanced with Pi Browser Optimizations
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  orderBy
} from 'firebase/firestore';

import usePiSDK from './hooks/usePiSDK';
import usePiPayments from './hooks/usePiPayments';
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

  // Enhanced Pi SDK hook with Pi Browser optimizations
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
    disconnect,
    testConnection,
    quickFix, // New quick fix method
    getConnectionInfo,
    clearError,
    canConnect,
    isFullyConnected,
    needsPaymentAccess
  } = usePiSDK();

  // Payment hook for backend integration
  const { 
    createLotteryPayment, 
    loading: paymentLoading, 
    error: paymentError,
    clearError: clearPaymentError
  } = usePiPayments();

  // App state
  const [success, setSuccess] = useState('');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [joiningLottery, setJoiningLottery] = useState(false);
  const [showPiBrowserHelp, setShowPiBrowserHelp] = useState(false);

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

  // Auto-show Pi Browser help if there are connection issues
  useEffect(() => {
    if (error && error.includes('timeout') && !showPiBrowserHelp) {
      setShowPiBrowserHelp(true);
    }
  }, [error, showPiBrowserHelp]);

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

  // Data loading functions (simplified for space - same as before)
  const loadActiveLotteries = async () => {
    try {
      const lotteriesRef = collection(db, 'lotteries');
      const q = query(lotteriesRef, where('status', '==', 'active'));
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
    } catch (error) {
      console.error('Error loading lotteries:', error);
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
    } catch (error) {
      console.error('Error loading my entries:', error);
    }
  };

  const loadCompletedLotteries = async () => {
    try {
      const lotteriesRef = collection(db, 'lotteries');
      const q = query(lotteriesRef, where('status', '==', 'completed'));
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
    } catch (error) {
      console.error('Error loading completed lotteries:', error);
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

  // Enhanced connection handlers with Pi Browser support
  const handleConnectUser = async () => {
    try {
      clearMessages();
      await connectUser();
      setSuccess(`✅ Connected to Pi Network! Welcome, ${piUser?.username || 'User'}`);
    } catch (connectError) {
      console.error('Connection failed:', connectError);
      setShowPiBrowserHelp(true);
    }
  };

  const handleConnectWallet = async () => {
    try {
      clearMessages();
      await connectWallet();
      setSuccess(`💰 Wallet connected! You can now participate in lotteries.`);
    } catch (connectError) {
      console.error('Wallet connection failed:', connectError);
      setShowPiBrowserHelp(true);
    }
  };

  const handleTestConnection = async () => {
    try {
      clearMessages();
      setSuccess('Testing Pi Browser connection...');
      const result = await testConnection();
      setSuccess(`✅ Connection test successful! User: ${result.user.username}`);
    } catch (testError) {
      setSuccess(`❌ Connection test failed: ${testError.message}`);
      setShowPiBrowserHelp(true);
    }
  };

  // New quick fix handler
  const handleQuickFix = async () => {
    try {
      clearMessages();
      setSuccess('Running Pi Browser quick fix...');
      const success = await quickFix();
      if (success) {
        setSuccess('✅ Quick fix completed! Try connecting again.');
      }
    } catch (fixError) {
      setSuccess(`❌ Quick fix failed: ${fixError.message}`);
    }
  };

  // Join lottery function (simplified for space)
  const joinLottery = async (lotteryId, lottery) => {
    if (!isAuthenticated) {
      setSuccess('Please connect to Pi Network first');
      return;
    }

    if (!hasPaymentAccess) {
      try {
        setSuccess('Requesting payment permission...');
        await requestPaymentAccess();
        setSuccess('Payment permission granted!');
      } catch (permissionError) {
        setSuccess(`Payment permission required: ${permissionError.message}`);
        return;
      }
    }

    setJoiningLottery(true);
    clearMessages();

    try {
      await createLotteryPayment(
        piUser,
        lottery,
        (result) => {
          setSuccess(`🎫 Ticket purchased for "${lottery.title}"!`);
          loadActiveLotteries();
          loadMyEntries();
        },
        (error) => {
          setSuccess(`Failed to join lottery: ${error.message}`);
        }
      );
    } catch (joinError) {
      setSuccess(`Failed to join lottery: ${joinError.message}`);
    } finally {
      setJoiningLottery(false);
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

  const clearMessages = () => {
    clearError();
    clearPaymentError();
    setSuccess('');
  };

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
      {/* Enhanced Header */}
      <div className="header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ margin: 0 }}>🎰 Pi Lottery</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
            Provably fair lotteries with Pi cryptocurrency
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Enhanced Connection Status */}
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

          {/* Enhanced Controls */}
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
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={handleConnectWallet}
                className="button success"
                disabled={!canConnect || loading}
                style={{ padding: '12px 20px' }}
              >
                {loading ? `🔄 ${authStep || 'Connecting...'}` : 
                 canConnect ? '🔗 Connect Pi Wallet' : 
                 '⏳ Loading Pi SDK...'}
              </button>
              
              {/* Pi Browser Help Button */}
              {(error || !sdkReady) && (
                <button 
                  onClick={() => setShowPiBrowserHelp(true)}
                  className="button warning"
                  style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                >
                  🆘 Pi Browser Help
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Pi Browser Help Panel */}
      {showPiBrowserHelp && (
        <div className="card" style={{
          background: '#fff3cd',
          border: '2px solid #ffeaa7',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h3>🆘 Pi Browser Connection Help</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <strong>Common Solutions:</strong>
                <ol style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li>Try the <strong>Quick Fix</strong> button below</li>
                  <li>Refresh the page and try again</li>
                  <li>Close and reopen Pi Browser</li>
                  <li>Check your internet connection</li>
                  <li>Update Pi Browser to the latest version</li>
                  <li>Clear Pi Browser cache in settings</li>
                </ol>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  onClick={handleQuickFix}
                  className="button warning"
                  disabled={loading}
                >
                  {loading ? '🔄 Fixing...' : '🔧 Quick Fix'}
                </button>
                
                <button 
                  onClick={handleTestConnection}
                  className="button secondary"
                  disabled={!sdkReady}
                >
                  🧪 Test Connection
                </button>
                
                <button 
                  onClick={() => setShowDebugPanel(true)}
                  className="button secondary"
                >
                  🔍 Show Debug Info
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setShowPiBrowserHelp(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '5px'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Connection Status Panel */}
      {(authStep || error || paymentError) && (
        <div className="card" style={{
          background: (error || paymentError) ? '#f8d7da' : '#fff3cd',
          border: `2px solid ${(error || paymentError) ? '#f5c6cb' : '#ffeaa7'}`
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
          
          {(error || paymentError) && (
            <div style={{ color: '#721c24', marginBottom: '10px' }}>
              ❌ {error || paymentError}
              <button 
                onClick={clearMessages}
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
            {activeLotteries.map((lottery) => (
              <div key={lottery.id} className="lottery-item">
                <div className="lottery-header">
                  <h3 className="lottery-title">{lottery.title}</h3>
                  <span className="lottery-status status-active">
                    ⏰ {formatTimeRemaining(lottery.endDate)}
                  </span>
                </div>

                <div className="lottery-details">
                  <div className="lottery-detail">
                    <div className="lottery-detail-label">Entry Fee</div>
                    <div className="lottery-detail-value">{lottery.entryFee}π</div>
                  </div>
                  <div className="lottery-detail">
                    <div className="lottery-detail-label">Participants</div>
                    <div className="lottery-detail-value">{lottery.participants?.length || 0}</div>
                  </div>
                </div>

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
                  ) : (
                    <button 
                      onClick={() => joinLottery(lottery.id, lottery)}
                      className="button success full-width"
                      disabled={joiningLottery || loading || paymentLoading}
                    >
                      {(joiningLottery || paymentLoading) ? (
                        '🔄 Processing Payment...'
                      ) : (
                        `🎫 Buy Ticket (${lottery.entryFee}π)`
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Debug Panel */}
      {showDebugPanel && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.95)',
          zIndex: 10000,
          color: 'white',
          padding: '20px',
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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
              <h3>Enhanced Pi SDK Connection Info:</h3>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '10px 0', fontSize: '11px' }}>
                {JSON.stringify(getConnectionInfo(), null, 2)}
              </pre>
              
              <div style={{ marginTop: '20px' }}>
                <button 
                  onClick={handleQuickFix}
                  style={{
                    background: '#ffc107',
                    color: 'black',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    marginRight: '10px'
                  }}
                >
                  🔧 Quick Fix
                </button>
                
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
                  onClick={() => console.log('Pi SDK Debug:', getConnectionInfo())}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px'
                  }}
                >
                  📋 Log to Console
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legal Components */}
      <LegalModal
        isOpen={legalModal.isOpen}
        onClose={closeLegal}
        type={legalModal.type}
        onAccept={handleLegalAccept}
        showAcceptButton={true}
      />

      <LegalFooter onOpenLegal={openLegal} />

      {/* CSS Animations */}
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

// File path: src/UserApp.js - Auto-Connect Version (No Button Required)
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
  // Legal modal state
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

  // Auto-connect Pi SDK hook
  const {
    piUser,
    isAuthenticated,
    hasPaymentAccess,
    loading,
    error,
    sdkReady,
    connectionStatus,
    authStep,
    autoConnectAttempted,
    userDeclined,
    connectUser, // Manual fallback
    requestPaymentAccess,
    disconnect,
    testConnection,
    getConnectionInfo,
    clearError,
    isFullyConnected,
    needsPaymentAccess,
    isAutoConnecting
  } = usePiSDK();

  // Payment hook
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
  const [showManualOptions, setShowManualOptions] = useState(false);

  // Lottery data
  const [activeLotteries, setActiveLotteries] = useState([]);
  const [myEntries, setMyEntries] = useState([]);
  const [userStats, setUserStats] = useState({
    totalEntered: 0,
    totalSpent: 0,
    totalWon: 0,
    winCount: 0
  });

  // Show manual options if auto-connect fails or user declines
  useEffect(() => {
    if ((autoConnectAttempted && !isAuthenticated) || userDeclined || error) {
      setShowManualOptions(true);
    }
  }, [autoConnectAttempted, isAuthenticated, userDeclined, error]);

  // Check for debug mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
      setShowDebugPanel(true);
    }
  }, []);

  // Load data
  useEffect(() => {
    loadActiveLotteries();
  }, []);

  useEffect(() => {
    if (isAuthenticated && piUser) {
      loadMyEntries();
      calculateUserStats();
    }
  }, [isAuthenticated, piUser]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      loadActiveLotteries();
      if (isAuthenticated) {
        loadMyEntries();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Clear messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Data loading functions
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

  // Manual connection handlers (fallback)
  const handleManualConnect = async () => {
    try {
      clearMessages();
      setShowManualOptions(false);
      await connectUser();
      setSuccess(`✅ Connected to Pi Network! Welcome, ${piUser?.username || 'User'}`);
    } catch (connectError) {
      console.error('Manual connection failed:', connectError);
      setShowManualOptions(true);
    }
  };

  const handleTestConnection = async () => {
    try {
      clearMessages();
      setSuccess('Testing Pi connection...');
      const result = await testConnection();
      setSuccess(`✅ Test successful! User: ${result.user.username}`);
    } catch (testError) {
      setSuccess(`❌ Test failed: ${testError.message}`);
    }
  };

  // Join lottery function
  const joinLottery = async (lotteryId, lottery) => {
    if (!isAuthenticated) {
      setSuccess('Please wait for connection to complete');
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
      {/* Header */}
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
          {/* Auto-Connect Status Indicator */}
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
              animation: isAutoConnecting ? 'pulse 2s infinite' : 'none'
            }}></div>
            <span style={{ color: 'white' }}>
              {isFullyConnected && '🔗 Auto-Connected'}
              {isAutoConnecting && '🤖 Auto-Connecting...'}
              {connectionStatus === 'error' && '❌ Connection Failed'}
              {userDeclined && '👤 Connection Declined'}
              {!sdkReady && '⏳ Loading...'}
            </span>
          </div>

          {/* User Info or Manual Connect Option */}
          {isFullyConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', color: 'white' }}>
                  👤 {piUser.username}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  🤖 Auto-Connected
                </div>
              </div>
              <button onClick={disconnect} className="button danger" style={{ padding: '8px 16px' }}>
                🔌 Disconnect
              </button>
            </div>
          ) : showManualOptions ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={handleManualConnect}
                className="button warning"
                disabled={loading}
                style={{ padding: '10px 16px' }}
              >
                {loading ? '🔄 Connecting...' : '👆 Manual Connect'}
              </button>
              <button 
                onClick={() => setShowDebugPanel(true)}
                className="button secondary"
                style={{ padding: '6px 12px', fontSize: '0.9rem' }}
              >
                🔍 Debug Info
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'right', color: 'white', fontSize: '0.9rem' }}>
              <div>🤖 Auto-connecting...</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                No button needed!
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Connect Status Panel */}
      {isAutoConnecting && (
        <div className="card" style={{
          background: '#d1ecf1',
          border: '2px solid #bee5eb',
          marginBottom: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h3>🤖 Connecting Automatically</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '3px solid #f3f3f3',
                borderTop: '3px solid #6f42c1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span>{authStep || 'Connecting to Pi Network...'}</span>
            </div>
            
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              padding: '15px',
              margin: '15px 0'
            }}>
              <strong>🔔 Look for the Pi Browser popup!</strong>
              <br />
              A popup will appear asking you to approve the connection.
              <br />
              <em>You still need to give your consent - this is for your security.</em>
            </div>
            
            <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
              If no popup appears within 30 seconds, manual options will be shown.
            </div>
          </div>
        </div>
      )}

      {/* User Declined Panel */}
      {userDeclined && (
        <div className="card" style={{
          background: '#f8d7da',
          border: '2px solid #f5c6cb',
          marginBottom: '20px'
        }}>
          <h3>👤 Connection Declined</h3>
          <p>
            You declined the Pi Network connection. This is completely fine!
            <br />
            You can manually connect anytime using the button above.
          </p>
          <div style={{ marginTop: '15px' }}>
            <button 
              onClick={handleManualConnect}
              className="button success"
              disabled={loading}
            >
              {loading ? '🔄 Connecting...' : '🔗 Connect Now'}
            </button>
          </div>
        </div>
      )}

      {/* Connection Error Panel */}
      {error && autoConnectAttempted && (
        <div className="card" style={{
          background: '#f8d7da',
          border: '2px solid #f5c6cb',
          marginBottom: '20px'
        }}>
          <h3>❌ Auto-Connect Failed</h3>
          <div style={{ color: '#721c24', marginBottom: '15px' }}>
            <strong>Error:</strong> {error}
          </div>
          
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '15px'
          }}>
            <strong>💡 This might help:</strong>
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              <li>Refresh the page</li>
              <li>Close and reopen Pi Browser</li>
              <li>Try the manual connect button</li>
            </ul>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleManualConnect}
              className="button warning"
              disabled={loading}
            >
              {loading ? '🔄 Connecting...' : '👆 Try Manual Connect'}
            </button>
            
            <button 
              onClick={handleTestConnection}
              className="button secondary"
            >
              🧪 Test Connection
            </button>
            
            <button 
              onClick={() => window.location.reload()}
              className="button secondary"
            >
              🔄 Refresh Page
            </button>
          </div>
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
        
        {/* Connection Status for Lotteries */}
        {!isFullyConnected && (
          <div className="warning" style={{ margin: '0 0 20px 0' }}>
            <strong>
              {isAutoConnecting && '🤖 Auto-connecting to Pi Network... Please wait.'}
              {userDeclined && '👤 Connection declined. Click "Connect Now" above to join lotteries.'}
              {error && autoConnectAttempted && '❌ Connection failed. Try manual connect above.'}
              {!isAuthenticated && !isAutoConnecting && !error && '🔗 Connecting to Pi Network...'}
              {isAuthenticated && needsPaymentAccess && '💰 Payment access needed for lottery participation'}
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
                  {isAutoConnecting ? (
                    <div style={{textAlign: 'center', padding: '15px'}}>
                      <span style={{color: '#6c757d', fontWeight: 'bold'}}>
                        🤖 Auto-connecting... Please wait
                      </span>
                    </div>
                  ) : !isAuthenticated ? (
                    <div style={{textAlign: 'center', padding: '15px'}}>
                      <span style={{color: '#721c24', fontWeight: 'bold'}}>
                        {userDeclined ? '👤 Connection declined - use manual connect above' :
                         error ? '❌ Connection failed - try manual connect above' :
                         '🔗 Waiting for Pi Network connection...'}
                      </span>
                    </div>
                  ) : needsPaymentAccess ? (
                    <div style={{textAlign: 'center', padding: '15px'}}>
                      <span style={{color: '#856404', fontWeight: 'bold'}}>
                        💰 Payment access will be requested automatically
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

      {/* Debug Panel */}
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
          fontSize: '11px'
        }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>🔧 Auto-Connect Debug Panel</h2>
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
              <h3>Auto-Connect Debug Info:</h3>
              <pre style={{ whiteSpace: 'pre-wrap', margin: '10px 0', fontSize: '10px' }}>
                {JSON.stringify(getConnectionInfo(), null, 2)}
              </pre>
              
              <div style={{ marginTop: '20px' }}>
                <button 
                  onClick={handleManualConnect}
                  style={{
                    background: '#ffc107',
                    color: 'black',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    marginRight: '10px'
                  }}
                >
                  👆 Manual Connect
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
                  onClick={() => console.log('Auto-Connect Debug:', getConnectionInfo())}
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

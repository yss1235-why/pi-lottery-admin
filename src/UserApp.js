// File path: src/UserApp.js - Clean Version
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
    closeLegal();
  };

  // Pi SDK hook - background connection
  const {
    piUser,
    isAuthenticated,
    hasPaymentAccess,
    loading,
    error,
    requestPaymentAccess,
    disconnect,
    clearError,
    isFullyConnected
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
  const [joiningLottery, setJoiningLottery] = useState(false);

  // Lottery data
  const [activeLotteries, setActiveLotteries] = useState([]);
  const [myEntries, setMyEntries] = useState([]);
  const [userStats, setUserStats] = useState({
    totalEntered: 0,
    totalSpent: 0,
    totalWon: 0,
    winCount: 0
  });

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

  // Join lottery function
  const joinLottery = async (lotteryId, lottery) => {
    if (!isAuthenticated) {
      setSuccess('Connecting to Pi Network...');
      return;
    }

    if (!hasPaymentAccess) {
      try {
        setSuccess('Setting up payments...');
        await requestPaymentAccess();
      } catch (permissionError) {
        setSuccess(`Payment setup failed: ${permissionError.message}`);
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
          setSuccess(`🎫 Successfully joined "${lottery.title}"!`);
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

  const calculateMaxTickets = (lottery) => {
    if (!lottery.participants) return 2;
    const totalParticipants = lottery.participants.length;
    return Math.max(2, Math.floor(totalParticipants * 0.02));
  };

  const getUserTicketsForLottery = (lottery) => {
    if (!lottery.participants || !piUser) return 0;
    return lottery.participants.filter(p => p.uid === piUser.uid).length;
  };

  // Show loading screen while connecting
  if (loading && !isAuthenticated) {
    return (
      <div className="container">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '50vh',
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #6f42c1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }}></div>
          <h3 style={{ color: '#6f42c1', marginBottom: '10px' }}>
            🎰 Pi Lottery
          </h3>
          <p style={{ color: '#6c757d' }}>
            Connecting to Pi Network...
          </p>
        </div>
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div>
          <h1>🎰 Pi Lottery</h1>
          <p>Provably fair lotteries with Pi cryptocurrency</p>
        </div>
        
        {/* User info - clean and simple */}
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '10px 16px', 
              borderRadius: '20px',
              color: 'white'
            }}>
              👤 {piUser.username}
            </div>
            <button 
              onClick={disconnect} 
              className="button secondary"
              style={{ padding: '8px 16px' }}
            >
              Logout
            </button>
          </div>
        ) : error ? (
          <div style={{ color: 'white', textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
              ❌ Connection failed
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="button warning"
              style={{ padding: '8px 16px' }}
            >
              🔄 Retry
            </button>
          </div>
        ) : (
          <div style={{ color: 'white', fontSize: '0.9rem' }}>
            🔗 Connecting...
          </div>
        )}
      </div>

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

      {error && (
        <div className="error">
          Connection issue: {error}
          <button onClick={() => window.location.reload()} style={{
            float: 'right', 
            background: 'none', 
            border: 'none', 
            color: 'inherit', 
            cursor: 'pointer'
          }}>🔄 Retry</button>
        </div>
      )}

      {/* User Stats - only show when authenticated */}
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
        
        {activeLotteries.length === 0 ? (
          <p style={{textAlign: 'center', color: '#6c757d', padding: '40px'}}>
            No active lotteries at the moment. Check back soon!
          </p>
        ) : (
          <div className="lottery-list">
            {activeLotteries.map((lottery) => {
              const userTickets = getUserTicketsForLottery(lottery);
              const maxTickets = calculateMaxTickets(lottery);
              const canBuyMore = userTickets < maxTickets;
              
              return (
                <div key={lottery.id} className="lottery-item">
                  <div className="lottery-header">
                    <h3 className="lottery-title">{lottery.title}</h3>
                    <span className="lottery-status status-active">
                      ⏰ {formatTimeRemaining(lottery.endDate)}
                    </span>
                  </div>

                  {lottery.description && (
                    <p style={{ color: '#6c757d', margin: '10px 0' }}>
                      {lottery.description}
                    </p>
                  )}

                  <div className="lottery-details">
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">Entry Fee</div>
                      <div className="lottery-detail-value">{lottery.entryFee}π</div>
                    </div>
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">Participants</div>
                      <div className="lottery-detail-value">{lottery.participants?.length || 0}</div>
                    </div>
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">Prize Pool</div>
                      <div className="lottery-detail-value">
                        {((lottery.participants?.length || 0) * lottery.entryFee - 
                          (lottery.participants?.length || 0) * (lottery.platformFee || 0.1)).toFixed(2)}π
                      </div>
                    </div>
                    {isAuthenticated && userTickets > 0 && (
                      <div className="lottery-detail">
                        <div className="lottery-detail-label">My Tickets</div>
                        <div className="lottery-detail-value">{userTickets}/{maxTickets}</div>
                      </div>
                    )}
                  </div>

                  <div className="lottery-actions">
                    {!isAuthenticated ? (
                      <div style={{textAlign: 'center', padding: '15px', color: '#6c757d'}}>
                        🔗 Connecting to Pi Network...
                      </div>
                    ) : !canBuyMore ? (
                      <div style={{textAlign: 'center', padding: '15px'}}>
                        <span style={{color: '#28a745', fontWeight: 'bold'}}>
                          ✅ Maximum tickets purchased ({userTickets}/{maxTickets})
                        </span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => joinLottery(lottery.id, lottery)}
                        className="button success full-width"
                        disabled={joiningLottery || loading || paymentLoading}
                      >
                        {(joiningLottery || paymentLoading) ? (
                          '🔄 Processing...'
                        ) : (
                          `🎫 Buy Ticket (${lottery.entryFee}π)`
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Entries - only show when authenticated and has entries */}
      {isAuthenticated && myEntries.length > 0 && (
        <div className="card">
          <h2>🎟️ My Lottery Entries</h2>
          <div className="lottery-list">
            {myEntries.map((entry) => (
              <div key={entry.lotteryId} className="lottery-item">
                <div className="lottery-header">
                  <h3 className="lottery-title">{entry.lotteryTitle}</h3>
                  <span className={`lottery-status status-${entry.status}`}>
                    {entry.status === 'active' && '🟢 Active'}
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
                    <div className="lottery-detail-label">Amount Spent</div>
                    <div className="lottery-detail-value">{(entry.ticketCount * entry.entryFee).toFixed(2)}π</div>
                  </div>
                  <div className="lottery-detail">
                    <div className="lottery-detail-label">Total Participants</div>
                    <div className="lottery-detail-value">{entry.totalParticipants}</div>
                  </div>
                  {entry.status === 'active' && (
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">Time Left</div>
                      <div className="lottery-detail-value">{formatTimeRemaining(entry.endDate)}</div>
                    </div>
                  )}
                </div>

                {/* Show winnings if any */}
                {entry.winners && entry.winners.length > 0 && (
                  (() => {
                    const userWins = entry.winners.filter(w => w.winner.uid === piUser.uid);
                    if (userWins.length > 0) {
                      return (
                        <div className="winners-section" style={{
                          background: '#d4edda',
                          border: '2px solid #c3e6cb',
                          borderRadius: '8px',
                          padding: '15px',
                          marginTop: '15px'
                        }}>
                          <h4 style={{ margin: '0 0 10px 0', color: '#155724' }}>
                            🎉 Congratulations! You Won!
                          </h4>
                          {userWins.map((win, index) => (
                            <div key={index} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 0'
                            }}>
                              <span>
                                {win.position === 1 ? '🥇' : win.position === 2 ? '🥈' : win.position === 3 ? '🥉' : '🏅'} 
                                Position #{win.position}
                              </span>
                              <span style={{ fontWeight: 'bold', color: '#155724' }}>
                                {win.prize}π
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()
                )}
              </div>
            ))}
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
      `}</style>
    </div>
  );
}

export default UserApp;

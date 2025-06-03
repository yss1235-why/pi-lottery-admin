// File path: src/UserApp.js - STREAMLINED USER INTERFACE COMPONENT
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

function UserApp() {
  // Legal modal / consent tracking state
  const [legalModal, setLegalModal] = useState({ isOpen: false, type: 'privacy' });
  const { recordConsent, hasConsent } = useConsentTracking();

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

  // Pi Wallet state
  const [piUser, setPiUser] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [piSDKLoaded, setPiSDKLoaded] = useState(false);

  // App state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  // Pi SDK initialization
  useEffect(() => {
    const initializePiSDK = async () => {
      try {
        if (window.Pi) {
          console.log('🔧 Initializing Pi SDK for users...');
          
          const config = {
            version: "2.0",
            sandbox: true,
            development: true,
            timeout: 45000,
            environment: 'sandbox'
          };
          
          await window.Pi.init(config);
          setPiSDKLoaded(true);
          console.log('✅ Pi SDK loaded for users');
          
        } else {
          console.warn('⚠️ Pi SDK not loaded - retrying...');
          setTimeout(initializePiSDK, 3000);
        }
      } catch (error) {
        console.error('❌ Pi SDK initialization error:', error);
        setPiSDKLoaded(false);
      }
    };

    setTimeout(initializePiSDK, 1000);
  }, []);

  // Load active lotteries immediately on component mount
  useEffect(() => {
    loadActiveLotteries();
    loadCompletedLotteries();
  }, []);

  // Load user data when wallet is connected
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

  // Pi wallet connection
  const connectWallet = async () => {
    setError('');
    console.log('🔗 Connecting user Pi wallet...');
    
    try {
      if (!window.Pi || !piSDKLoaded) {
        throw new Error('Pi SDK not loaded');
      }

      setLoading(true);
      
      const authResult = await window.Pi.authenticate(['payments'], (payment) => {
        console.log('Incomplete payment found:', payment);
      });

      setPiUser(authResult.user);
      setWalletConnected(true);
      setSuccess(`🎉 Welcome ${authResult.user.username}! You can now join lotteries.`);
      
    } catch (error) {
      console.error('❌ Pi wallet connection failed:', error);
      setError(`Connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setPiUser(null);
    setWalletConnected(false);
    setMyEntries([]);
    setUserStats({
      totalEntered: 0,
      totalSpent: 0,
      totalWon: 0,
      winCount: 0
    });
    setSuccess('Wallet disconnected');
  };

  // Data loading functions
  const loadActiveLotteries = async () => {
    try {
      const lotteriesRef = collection(db, 'lotteries');
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
        
        // Only show lotteries that haven't ended
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
      console.error('Error loading active lotteries:', error);
      setError('Error loading lotteries');
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
      
      setCompletedLotteries(completed.slice(0, 10)); // Show last 10
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
      
      // Check if user won
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
    const maxTickets = calculateMaxTicketsForUser(lottery.participants.length + 1); // +1 for potential new ticket
    return userTickets < maxTickets;
  };

  // Lottery participation
  const joinLottery = async (lotteryId, lottery) => {
    if (!walletConnected) {
      setError('Please connect your Pi wallet first');
      return;
    }

    const userTickets = getUserTicketCount(lottery);
    const maxTickets = calculateMaxTicketsForUser(lottery.participants.length + 1);
    
    if (userTickets >= maxTickets) {
      setError(`You've reached your ticket limit (${maxTickets} tickets max)`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Create Pi payment
      const paymentData = {
        amount: lottery.entryFee,
        memo: `Lottery Entry: ${lottery.title}`,
        metadata: {
          lotteryId,
          userId: piUser.uid,
          ticketNumber: userTickets + 1
        }
      };

      console.log('💰 Creating Pi payment:', paymentData);

      const payment = await window.Pi.createPayment(paymentData, {
        onReadyForServerApproval: (paymentId) => {
          console.log('Payment ready for approval:', paymentId);
        },
        onReadyForServerCompletion: async (paymentId, txnId) => {
          console.log('Payment completed:', paymentId, txnId);
          
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
        },
        onCancel: (paymentId) => {
          console.log('Payment cancelled:', paymentId);
          setError('Payment cancelled');
        },
        onError: (error, paymentId) => {
          console.error('Payment error:', error, paymentId);
          setError(`Payment failed: ${error.message}`);
        }
      });

    } catch (error) {
      console.error('Join lottery error:', error);
      setError(`Failed to join lottery: ${error.message}`);
    } finally {
      setLoading(false);
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
    
    // Calculate winner count
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
    
    // Prize percentages
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

  return (
    <div className="container">
      {/* Top Navigation Bar */}
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0 }}>🎰 Pi Lottery</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>Provably fair lotteries with Pi cryptocurrency</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {walletConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', color: 'white' }}>👤 {piUser.username}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Connected</div>
              </div>
              <button onClick={disconnectWallet} className="button secondary" style={{ padding: '8px 16px' }}>
                🔌 Disconnect
              </button>
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              className="button success"
              disabled={!piSDKLoaded || loading}
              style={{ padding: '12px 20px' }}
            >
              {loading ? '🔄 Connecting...' : piSDKLoaded ? '🔗 Connect Pi Wallet' : '⏳ Loading...'}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="error">
          {error}
          <button onClick={clearMessages} style={{float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}}>×</button>
        </div>
      )}
      {success && (
        <div className="success">
          {success}
          <button onClick={clearMessages} style={{float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}}>×</button>
        </div>
      )}

      {/* User Stats (only show when wallet connected) */}
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

      {/* Active Lotteries - Always Shown */}
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

                  {/* 2% Ticket System Info */}
                  <div className="warning" style={{margin: '15px 0'}}>
                    <h4>🎫 Fair Ticket System (2% Max):</h4>
                    <p>Users can buy up to {maxUserTickets} tickets ({((maxUserTickets / Math.max(participantCount, 1)) * 100).toFixed(1)}% of total)</p>
                    <p>This ensures fair play - no single user can dominate the lottery!</p>
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

      {/* My Entries (only show when wallet connected) */}
      {walletConnected && myEntries.length > 0 && (
        <div className="card">
          <h2>📊 My Lottery Entries</h2>
          <div className="lottery-list">
            {myEntries.map((entry) => {
              const isWinner = entry.winners.some(w => w.winner.uid === piUser.uid);
              const userWins = entry.winners.filter(w => w.winner.uid === piUser.uid);
              const totalWinnings = userWins.reduce((sum, win) => sum + win.prize, 0);

              return (
                <div key={entry.lotteryId} className="lottery-item" style={{
                  border: isWinner ? '2px solid #28a745' : '1px solid #e9ecef'
                }}>
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
                      <div className="lottery-detail-label">Spent</div>
                      <div className="lottery-detail-value">{(entry.ticketCount * entry.entryFee).toFixed(2)}π</div>
                    </div>
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">Total Participants</div>
                      <div className="lottery-detail-value">{entry.totalParticipants}</div>
                    </div>
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">My Share</div>
                      <div className="lottery-detail-value">{((entry.ticketCount / entry.totalParticipants) * 100).toFixed(1)}%</div>
                    </div>
                  </div>

                  {isWinner && (
                    <div className="success" style={{margin: '15px 0'}}>
                      <h4>🏆 CONGRATULATIONS! You Won!</h4>
                      {userWins.map((win, index) => (
                        <div key={index} style={{marginBottom: '5px'}}>
                          <strong>
                            {win.position === 1 ? '🥇 1st' : win.position === 2 ? '🥈 2nd' : win.position === 3 ? '🥉 3rd' : `🏅 ${win.position}th`} 
                            Place: {win.prize}π
                          </strong>
                        </div>
                      ))}
                      <p><strong>Total Winnings: {totalWinnings.toFixed(2)}π</strong></p>
                    </div>
                  )}

                  {entry.status === 'completed' && !isWinner && (
                    <div style={{color: '#6c757d', fontStyle: 'italic', textAlign: 'center', padding: '10px'}}>
                      Better luck next time! 🍀
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Winners */}
      {completedLotteries.length > 0 && (
        <div className="card">
          <h2>🏆 Recent Winners</h2>
          <div className="lottery-list">
            {completedLotteries.slice(0, 5).map((lottery) => (
              <div key={lottery.id} className="lottery-item">
                <div className="lottery-header">
                  <h3 className="lottery-title">{lottery.title}</h3>
                  <span style={{fontSize: '0.9rem', color: '#6c757d'}}>
                    Completed: {lottery.drawnAt.toLocaleDateString()}
                  </span>
                </div>

                {lottery.winners && lottery.winners.length > 0 && (
                  <div className="winners-display">
                    <h4>🎯 Winners:</h4>
                    <div style={{display: 'grid', gap: '8px', marginTop: '10px'}}>
                      {lottery.winners.slice(0, 5).map((winner, index) => (
                        <div key={index} style={{
                          display: 'flex', 
                          justifyContent: 'space-between',
                          padding: '8px',
                          background: '#f8f9fa',
                          borderRadius: '6px'
                        }}>
                          <span>
                            {winner.position === 1 ? '🥇' : winner.position === 2 ? '🥈' : winner.position === 3 ? '🥉' : '🏅'} 
                            {winner.winner.username}
                          </span>
                          <span style={{fontWeight: 'bold'}}>{winner.prize}π</span>
                        </div>
                      ))}
                      {lottery.winners.length > 5 && (
                        <div style={{textAlign: 'center', color: '#6c757d', fontSize: '0.9rem'}}>
                          +{lottery.winners.length - 5} more winners
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Verification Link */}
                {lottery.provablyFair?.blockHash && (
                  <div style={{marginTop: '15px', textAlign: 'center'}}>
                    <a 
                      href={`https://blockstream.info/block/${lottery.provablyFair.blockHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button secondary"
                      style={{fontSize: '0.9rem', padding: '8px 16px'}}
                    >
                      🔗 Verify Results on Blockchain
                    </a>
                  </div>
                )}
              </div>
            ))}
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

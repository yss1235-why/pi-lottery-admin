// File path: src/UserApp.js - PRODUCTION USER INTERFACE
// ⚠️ WARNING: PRODUCTION MODE - REAL PI CRYPTOCURRENCY ⚠️
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

  // PRODUCTION warning and consent state
  const [showProductionWarning, setShowProductionWarning] = useState(true);
  const [productionConsent, setProductionConsent] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [legalityConfirmed, setLegalityConfirmed] = useState(false);

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

  // Production configuration check
  const getConfig = () => {
    return {
      isProduction: process.env.REACT_APP_PI_ENVIRONMENT === 'production',
      realMoney: process.env.REACT_APP_REAL_MONEY_MODE === 'true',
      platformName: process.env.REACT_APP_PLATFORM_NAME || 'Pi Lottery',
      minEntryFee: parseFloat(process.env.REACT_APP_MIN_ENTRY_FEE) || 0.1,
      maxEntryFee: parseFloat(process.env.REACT_APP_MAX_ENTRY_FEE) || 1000,
      ticketLimitPercentage: parseFloat(process.env.REACT_APP_TICKET_LIMIT_PERCENTAGE) || 2
    };
  };

  // Check production consent on mount
  useEffect(() => {
    const config = getConfig();
    if (config.isProduction || config.realMoney) {
      console.warn('🚨 USER INTERFACE: PRODUCTION MODE ACTIVE!');
      console.warn('💰 Users will gamble with REAL Pi cryptocurrency!');
      
      // Check if user has given production consent
      const consent = localStorage.getItem('user-production-consent');
      const ageVerify = localStorage.getItem('user-age-verified');
      const legalConfirm = localStorage.getItem('user-legality-confirmed');
      
      if (consent && ageVerify && legalConfirm) {
        setProductionConsent(true);
        setAgeVerified(true);
        setLegalityConfirmed(true);
        setShowProductionWarning(false);
      }
    } else {
      setShowProductionWarning(false);
    }
  }, []);

  // Pi SDK hook - background connection for PRODUCTION
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

  // Payment hook for PRODUCTION
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

  // Handle PRODUCTION consent process
  const handleProductionConsent = () => {
    if (!ageVerified) {
      alert('You must verify you are 18+ years old to continue.');
      return;
    }
    
    if (!legalityConfirmed) {
      alert('You must confirm gambling is legal in your jurisdiction to continue.');
      return;
    }

    console.warn('💰 User gave consent for REAL Pi gambling!');
    localStorage.setItem('user-production-consent', 'true');
    localStorage.setItem('user-age-verified', 'true');
    localStorage.setItem('user-legality-confirmed', 'true');
    
    setProductionConsent(true);
    setShowProductionWarning(false);
  };

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

  // Join lottery function with PRODUCTION warnings
  const joinLottery = async (lotteryId, lottery) => {
    const config = getConfig();
    
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

    // PRODUCTION warning before spending real money
    if (config.isProduction || config.realMoney) {
      const confirmText = `⚠️ REAL MONEY WARNING ⚠️\n\n` +
        `You are about to spend ${lottery.entryFee}π of REAL Pi cryptocurrency.\n\n` +
        `This is actual money with real value that you will lose if you don't win.\n\n` +
        `Are you sure you want to continue?`;
        
      if (!window.confirm(confirmText)) {
        setSuccess('Transaction cancelled - no real Pi was spent');
        return;
      }
      
      console.warn('💰 User confirmed spending REAL Pi cryptocurrency!');
      console.warn(`💸 Amount: ${lottery.entryFee}π (actual monetary value)`);
    }

    setJoiningLottery(true);
    clearMessages();

    try {
      await createLotteryPayment(
        piUser,
        lottery,
        (result) => {
          if (config.isProduction) {
            setSuccess(`🎫 Successfully spent ${lottery.entryFee}π REAL Pi on "${lottery.title}"! You are now gambling with real money.`);
          } else {
            setSuccess(`🎫 Successfully joined "${lottery.title}"!`);
          }
          loadActiveLotteries();
          loadMyEntries();
        },
        (error) => {
          if (config.isProduction) {
            setSuccess(`Failed to spend real Pi: ${error.message}`);
          } else {
            setSuccess(`Failed to join lottery: ${error.message}`);
          }
        }
      );
    } catch (joinError) {
      if (config.isProduction) {
        setSuccess(`Failed to spend real Pi: ${joinError.message}`);
      } else {
        setSuccess(`Failed to join lottery: ${joinError.message}`);
      }
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

  // PRODUCTION Warning Modal
  if (showProductionWarning && !productionConsent) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
        overflow: 'auto',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '4px solid #dc3545'
        }}>
          <h1 style={{color: '#dc3545', marginBottom: '20px', fontSize: '2.5rem', textAlign: 'center'}}>
            🚨 REAL MONEY GAMBLING WARNING
          </h1>
          
          <div style={{
            background: '#f8d7da',
            border: '3px solid #dc3545',
            borderRadius: '12px',
            padding: '25px',
            marginBottom: '25px',
            textAlign: 'left'
          }}>
            <h2 style={{color: '#721c24', marginBottom: '15px', fontSize: '1.5rem'}}>
              ⚠️ CRITICAL: REAL Pi CRYPTOCURRENCY GAMBLING
            </h2>
            <ul style={{color: '#721c24', lineHeight: '1.8', fontSize: '1.1rem'}}>
              <li><strong>REAL MONEY:</strong> This platform uses actual Pi cryptocurrency with real monetary value</li>
              <li><strong>GAMBLING RISK:</strong> You can lose all money you spend - there are no guarantees of winning</li>
              <li><strong>NO REFUNDS:</strong> All Pi payments are final and cannot be refunded</li>
              <li><strong>ADDICTION RISK:</strong> Gambling can be addictive and financially devastating</li>
              <li><strong>LEGAL RISK:</strong> Online gambling may be illegal in your jurisdiction</li>
            </ul>
          </div>

          <div style={{
            background: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '25px'
          }}>
            <h3 style={{color: '#856404', marginBottom: '15px'}}>
              📋 MANDATORY REQUIREMENTS:
            </h3>
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '10px', color: '#856404', fontSize: '1.1rem'}}>
                <input 
                  type="checkbox" 
                  checked={ageVerified}
                  onChange={(e) => setAgeVerified(e.target.checked)}
                  style={{transform: 'scale(1.5)'}}
                />
                <strong>I am 18+ years old and have valid government ID to prove it</strong>
              </label>
            </div>
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '10px', color: '#856404', fontSize: '1.1rem'}}>
                <input 
                  type="checkbox" 
                  checked={legalityConfirmed}
                  onChange={(e) => setLegalityConfirmed(e.target.checked)}
                  style={{transform: 'scale(1.5)'}}
                />
                <strong>Online gambling with real money is legal in my jurisdiction</strong>
              </label>
            </div>
          </div>

          <div style={{
            background: '#d4edda',
            border: '2px solid #28a745',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '25px'
          }}>
            <h3 style={{color: '#155724', marginBottom: '10px'}}>
              🛡️ RESPONSIBLE GAMBLING COMMITMENT:
            </h3>
            <ul style={{color: '#155724', lineHeight: '1.6'}}>
              <li>I will only gamble money I can afford to lose completely</li>
              <li>I will set strict spending limits and stick to them</li>
              <li>I will never borrow money to gamble</li>
              <li>I will seek help if gambling becomes a problem</li>
              <li>I understand this is entertainment, not an investment</li>
            </ul>
          </div>

          <div style={{textAlign: 'center'}}>
            <button
              onClick={handleProductionConsent}
              disabled={!ageVerified || !legalityConfirmed}
              style={{
                background: (ageVerified && legalityConfirmed) ? '#dc3545' : '#6c757d',
                color: 'white',
                border: 'none',
                padding: '20px 40px',
                borderRadius: '12px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                cursor: (ageVerified && legalityConfirmed) ? 'pointer' : 'not-allowed',
                width: '100%',
                marginBottom: '15px'
              }}
            >
              {(ageVerified && legalityConfirmed) ? 
                '✅ I UNDERSTAND THE RISKS - PROCEED TO REAL MONEY GAMBLING' : 
                '❌ PLEASE COMPLETE ALL REQUIREMENTS ABOVE'
              }
            </button>
            
            <p style={{
              fontSize: '0.9rem',
              color: '#6c757d',
              lineHeight: '1.5'
            }}>
              By clicking above, you acknowledge you understand this platform involves 
              real money gambling with Pi cryptocurrency, you meet all legal requirements, 
              and you accept full responsibility for any financial losses.
            </p>
            
            <div style={{marginTop: '15px'}}>
              <button
                onClick={() => window.location.href = '/responsible-gambling'}
                style={{
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  marginRight: '10px',
                  cursor: 'pointer'
                }}
              >
                🆘 Get Gambling Help
              </button>
              
              <button
                onClick={() => window.close()}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                🚪 Leave Site
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading screen while connecting
  if (loading && !isAuthenticated) {
    const config = getConfig();
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
            🎰 {config.platformName}
          </h3>
          <p style={{ color: '#6c757d' }}>
            Connecting to {config.isProduction ? 'REAL ' : ''}Pi Network...
          </p>
          {config.isProduction && (
            <p style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '0.9rem' }}>
              PRODUCTION MODE - Real Pi cryptocurrency
            </p>
          )}
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

  const config = getConfig();

  return (
    <div className="container">
      {/* Header with PRODUCTION warnings */}
      <div className="header">
        <div>
          <h1>🎰 {config.platformName}</h1>
          <p>
            {config.isProduction ? 
              'REAL Pi cryptocurrency lotteries - actual monetary value' : 
              'Provably fair lotteries with Pi cryptocurrency'
            }
          </p>
          {config.isProduction && (
            <div style={{
              background: 'rgba(220, 53, 69, 0.2)',
              border: '2px solid #dc3545',
              borderRadius: '8px',
              padding: '10px',
              marginTop: '10px',
              color: 'white',
              fontSize: '0.9rem'
            }}>
              <strong>🚨 PRODUCTION MODE:</strong> Using REAL Pi cryptocurrency with actual monetary value
            </div>
          )}
        </div>
        
        {/* User info with PRODUCTION indicators */}
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ 
              background: 'rgba(255,255,255,0.1)', 
              padding: '10px 16px', 
              borderRadius: '20px',
              color: 'white'
            }}>
              👤 {piUser.username}
              {config.isProduction && (
                <div style={{fontSize: '0.8rem', color: '#ffeb3b'}}>
                  💰 Real Pi Mode
                </div>
              )}
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
            🔗 Connecting to {config.isProduction ? 'REAL ' : ''}Pi...
          </div>
        )}
      </div>

      {/* Messages with PRODUCTION context */}
      {success && (
        <div className={config.isProduction && success.includes('real') || success.includes('REAL') ? 'warning' : 'success'}>
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

      {/* User Stats with PRODUCTION labels */}
      {isAuthenticated && (
        <div className="stats-grid">
          <div className="stat-card purple">
            <div className="stat-number">{userStats.totalEntered}</div>
            <div className="stat-label">Tickets Bought</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-number">
              {userStats.totalSpent} π
              {config.isProduction && <div style={{fontSize: '0.7rem', color: '#856404'}}>REAL Pi</div>}
            </div>
            <div className="stat-label">Total Spent</div>
          </div>
          <div className="stat-card green">
            <div className="stat-number">
              {userStats.totalWon} π
              {config.isProduction && <div style={{fontSize: '0.7rem', color: '#155724'}}>REAL Pi</div>}
            </div>
            <div className="stat-label">Total Won</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-number">{userStats.winCount}</div>
            <div className="stat-label">Prizes Won</div>
          </div>
        </div>
      )}

      {/* Available Lotteries with PRODUCTION warnings */}
      <div className="card">
        <h2>
          🎲 Available Lotteries
          {config.isProduction && (
            <span style={{
              background: '#dc3545',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              marginLeft: '10px'
            }}>
              REAL Pi
            </span>
          )}
        </h2>
        
        {config.isProduction && (
          <div className="warning" style={{marginBottom: '20px'}}>
            <strong>🚨 REAL MONEY WARNING:</strong> All lotteries use actual Pi cryptocurrency. 
            You can lose real money. Entry fees range {config.minEntryFee}π - {config.maxEntryFee}π (REAL VALUE).
          </div>
        )}
        
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
                    <h3 className="lottery-title">
                      {lottery.title}
                      {config.isProduction && (
                        <span style={{
                          background: '#dc3545',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          marginLeft: '8px'
                        }}>
                          REAL Pi
                        </span>
                      )}
                    </h3>
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
                      <div className="lottery-detail-value">
                        {lottery.entryFee}π
                        {config.isProduction && <div style={{fontSize: '0.7rem', color: '#dc3545'}}>REAL Pi</div>}
                      </div>
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
                        {config.isProduction && <div style={{fontSize: '0.7rem', color: '#dc3545'}}>REAL Pi</div>}
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
                        🔗 Connecting to {config.isProduction ? 'REAL ' : ''}Pi Network...
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
                        style={{
                          background: config.isProduction ? '#dc3545' : '#28a745',
                          fontSize: config.isProduction ? '1rem' : '1rem'
                        }}
                      >
                        {(joiningLottery || paymentLoading) ? (
                          config.isProduction ? '🔄 Spending REAL Pi...' : '🔄 Processing...'
                        ) : (
                          config.isProduction ? 
                            `🚨 Spend ${lottery.entryFee}π REAL Pi` : 
                            `🎫 Buy Ticket (${lottery.entryFee}π)`
                        )}
                      </button>
                    )}
                    
                    {config.isProduction && canBuyMore && isAuthenticated && (
                      <p style={{
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        color: '#dc3545',
                        marginTop: '8px',
                        fontWeight: 'bold'
                      }}>
                        ⚠️ This will spend real Pi cryptocurrency with actual value
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Entries with PRODUCTION indicators */}
      {isAuthenticated && myEntries.length > 0 && (
        <div className="card">
          <h2>
            🎟️ My Lottery Entries
            {config.isProduction && (
              <span style={{
                background: '#dc3545',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                marginLeft: '10px'
              }}>
                REAL Pi Spent
              </span>
            )}
          </h2>
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
                    <div className="lottery-detail-value">
                      {(entry.ticketCount * entry.entryFee).toFixed(2)}π
                      {config.isProduction && <div style={{fontSize: '0.7rem', color: '#dc3545'}}>REAL Pi</div>}
                    </div>
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

                {/* Show winnings with PRODUCTION labels */}
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
                            🎉 Congratulations! You Won {config.isProduction ? 'REAL Pi!' : '!'}
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
                                {config.isProduction && <span style={{fontSize: '0.8rem', color: '#dc3545'}}> (REAL)</span>}
                              </span>
                            </div>
                          ))}
                          {config.isProduction && (
                            <p style={{
                              margin: '10px 0 0 0',
                              fontSize: '0.9rem',
                              color: '#856404',
                              fontStyle: 'italic'
                            }}>
                              💰 You won real Pi cryptocurrency with actual monetary value!
                            </p>
                          )}
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

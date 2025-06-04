// File path: src/App.js - Clean Admin Interface
import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';

import usePiSDK from './hooks/usePiSDK';

function App() {
  // Authentication state
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pi SDK hook for admin
  const {
    piUser: adminPiUser,
    isAuthenticated: adminWalletConnected,
    hasPaymentAccess: adminHasPaymentAccess,
    loading: piLoading,
    error: piError,
    createPayment,
    clearError: clearPiError,
    isFullyConnected: adminFullyConnected
  } = usePiSDK();

  // Lottery data
  const [lotteries, setLotteries] = useState([]);
  const [stats, setStats] = useState({
    totalLotteries: 0,
    activeParticipants: 0,
    totalPiCollected: 0,
    winnersDrawn: 0
  });

  // New lottery form
  const [newLottery, setNewLottery] = useState({
    title: '',
    description: '',
    entryFee: '',
    endDate: '',
    maxParticipants: '',
    platformFee: 0.1,
    platformFeePercent: 10,
    minWinners: 3,
    maxTicketsPerUser: 2,
    lotteryType: 'standard'
  });

  // Bitcoin API state
  const [currentBitcoinBlock, setCurrentBitcoinBlock] = useState(null);

  // Prize distribution state
  const [distributingPrizes, setDistributingPrizes] = useState(false);
  const [distributionResults, setDistributionResults] = useState({});

  // Check admin email
  const isAdmin = user && user.email === process.env.REACT_APP_ADMIN_EMAIL;

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Get current Bitcoin block height
  useEffect(() => {
    fetchCurrentBitcoinBlock();
    const interval = setInterval(fetchCurrentBitcoinBlock, 600000);
    return () => clearInterval(interval);
  }, []);

  // Load data when user is authenticated
  useEffect(() => {
    if (isAdmin) {
      loadLotteries();
      calculateStats();
    }
  }, [isAdmin]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Bitcoin API functions
  const fetchCurrentBitcoinBlock = async () => {
    try {
      const response = await fetch('https://blockstream.info/api/blocks/tip/height');
      const height = await response.json();
      setCurrentBitcoinBlock(height);
    } catch (error) {
      console.error('Error fetching Bitcoin block height:', error);
      setCurrentBitcoinBlock(Math.floor((Date.now() - 1609459200000) / 600000) + 665000);
    }
  };

  const fetchBitcoinBlockHash = async (blockHeight) => {
    try {
      const response = await fetch(`https://blockstream.info/api/block-height/${blockHeight}`);
      const blockHash = await response.text();
      
      const blockResponse = await fetch(`https://blockstream.info/api/block/${blockHash}`);
      const blockData = await blockResponse.json();
      
      return {
        hash: blockData.id,
        height: blockData.height,
        timestamp: blockData.timestamp,
        merkleRoot: blockData.merkle_root
      };
    } catch (error) {
      console.error('Error fetching Bitcoin block data:', error);
      throw new Error('Could not fetch Bitcoin block data');
    }
  };

  // Calculate commitment block
  const calculateCommitmentBlock = (currentBlock, endDate, lotteryType) => {
    const now = new Date();
    const end = new Date(endDate);
    const hoursUntilEnd = (end - now) / (1000 * 60 * 60);
    
    const blocksUntilEnd = Math.ceil(hoursUntilEnd * 6);
    
    let safetyMargin;
    switch (lotteryType) {
      case 'daily':
        safetyMargin = Math.max(1, Math.min(3, Math.ceil(blocksUntilEnd * 0.05)));
        break;
      case 'weekly':
        safetyMargin = Math.max(3, Math.min(12, Math.ceil(blocksUntilEnd * 0.1)));
        break;
      case 'monthly':
        safetyMargin = Math.max(6, Math.min(24, Math.ceil(blocksUntilEnd * 0.15)));
        break;
      default:
        safetyMargin = Math.max(1, Math.min(6, Math.ceil(blocksUntilEnd * 0.1)));
    }
    
    const commitmentBlock = currentBlock + blocksUntilEnd + safetyMargin;
    
    return commitmentBlock;
  };

  // Provably fair functions
  const generateProvablyFairWinners = (blockHash, lotteryId, participants, winnerCount) => {
    const winners = [];
    const remainingParticipants = [...participants];
    
    for (let position = 1; position <= winnerCount; position++) {
      const combinedString = blockHash + lotteryId + position + 'WINNER_SALT';
      
      let hash = 0;
      for (let i = 0; i < combinedString.length; i++) {
        const char = combinedString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      const randomIndex = Math.abs(hash) % remainingParticipants.length;
      const selectedWinner = remainingParticipants[randomIndex];
      
      winners.push({
        position,
        winner: selectedWinner,
        verificationData: {
          seed: combinedString,
          hash: hash.toString(16),
          randomIndex,
          selectedFrom: remainingParticipants.length
        }
      });
      
      remainingParticipants.splice(randomIndex, 1);
    }
    
    return winners;
  };

  const calculateWinnerCount = (participantCount, minWinners = 1) => {
    if (participantCount < 10) return Math.max(1, minWinners);
    if (participantCount < 25) return Math.max(3, minWinners);
    if (participantCount < 50) return Math.max(5, minWinners);
    if (participantCount < 100) return Math.max(7, minWinners);
    if (participantCount < 200) return Math.max(10, minWinners);
    if (participantCount < 500) return Math.max(15, minWinners);
    if (participantCount < 1000) return Math.max(20, minWinners);
    return Math.max(25, minWinners);
  };

  const calculatePrizeDistribution = (participantCount, entryFee, platformFee, winnerCount) => {
    const totalCollected = participantCount * entryFee;
    const totalPlatformFee = participantCount * platformFee;
    const prizePool = totalCollected - totalPlatformFee;
    
    const getDistributionPercentages = (count) => {
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
    
    const percentages = getDistributionPercentages(winnerCount);
    const prizes = percentages.map(percentage => 
      Math.round(prizePool * (percentage / 100) * 100) / 100
    );
    
    return prizes;
  };

  // Auth functions
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setSuccess('Successfully logged in!');
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found') {
        setError('Admin account not found. Please check your credentials.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Invalid password');
      } else {
        setError('Login failed: ' + error.message);
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSuccess('Successfully logged out!');
      setLotteries([]);
    } catch (error) {
      setError('Error logging out');
      console.error('Logout error:', error);
    }
  };

  // Prize distribution with Pi SDK
  const distributePrizeToWinner = async (winner, lotteryId) => {
    if (!adminFullyConnected) {
      setError('Admin wallet must be connected to distribute prizes');
      return;
    }

    try {
      setDistributingPrizes(true);
      
      const paymentData = {
        amount: winner.prize,
        memo: `Lottery Prize - Position #${winner.position}`,
        metadata: {
          lotteryId,
          winnerPosition: winner.position,
          distributedBy: adminPiUser.uid,
          timestamp: Date.now()
        }
      };

      const paymentCallbacks = {
        onReadyForServerApproval: (paymentId) => {
          setSuccess(`Payment approved for ${winner.winner.username}: ${winner.prize}π`);
        },
        
        onReadyForServerCompletion: async (paymentId, txnId) => {
          try {
            // Update lottery document
            await updateDoc(doc(db, 'lotteries', lotteryId), {
              [`winners.${winner.position - 1}.paid`]: true,
              [`winners.${winner.position - 1}.paidAt`]: Timestamp.now(),
              [`winners.${winner.position - 1}.paymentId`]: paymentId,
              [`winners.${winner.position - 1}.txnId`]: txnId,
              [`winners.${winner.position - 1}.distributedBy`]: adminPiUser.uid
            });

            setDistributionResults(prev => ({
              ...prev,
              [`${lotteryId}-${winner.position}`]: {
                success: true,
                paymentId: paymentId,
                txnId: txnId,
                timestamp: new Date()
              }
            }));

            setSuccess(`✅ Prize distributed to ${winner.winner.username}: ${winner.prize}π`);
            loadLotteries();
          } catch (updateError) {
            console.error('Error updating lottery:', updateError);
            setError('Payment successful but database update failed. Please refresh.');
          }
        },
        
        onCancel: (paymentId) => {
          setError('Prize distribution cancelled');
        },
        
        onError: (error, paymentId) => {
          setError(`Prize distribution failed: ${error.message || error}`);
        }
      };

      await createPayment(paymentData, paymentCallbacks);

    } catch (error) {
      console.error('Prize distribution error:', error);
      setError(`Failed to distribute prize: ${error.message}`);
      
      setDistributionResults(prev => ({
        ...prev,
        [`${lotteryId}-${winner.position}`]: {
          success: false,
          error: error.message,
          timestamp: new Date()
        }
      }));
    } finally {
      setDistributingPrizes(false);
    }
  };

  // Lottery management functions
  const loadLotteries = async () => {
    try {
      setError('');
      const lotteriesRef = collection(db, 'lotteries');
      const q = query(lotteriesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const lotteriesData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        lotteriesData.push({
          id: doc.id,
          ...data,
          endDate: data.endDate?.toDate?.() || new Date(data.endDate),
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
        });
      });
      
      setLotteries(lotteriesData);
    } catch (error) {
      console.error('Load lotteries error:', error);
      setError('Error loading lotteries: ' + error.message);
    }
  };

  const calculateStats = async () => {
    try {
      const lotteriesRef = collection(db, 'lotteries');
      const querySnapshot = await getDocs(lotteriesRef);
      
      let totalLotteries = 0;
      let activeParticipants = 0;
      let totalPiCollected = 0;
      let winnersDrawn = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalLotteries++;
        
        if (data.participants) {
          activeParticipants += data.participants.length;
          totalPiCollected += (data.participants.length * parseFloat(data.entryFee || 0));
        }
        
        if (data.winners && data.winners.length > 0) {
          winnersDrawn += data.winners.length;
        }
      });

      setStats({
        totalLotteries,
        activeParticipants,
        totalPiCollected: totalPiCollected.toFixed(2),
        winnersDrawn
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const createLottery = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!newLottery.title.trim()) {
        throw new Error('Lottery title is required');
      }
      if (!newLottery.entryFee || parseFloat(newLottery.entryFee) <= 0) {
        throw new Error('Entry fee must be greater than 0');
      }
      if (!newLottery.endDate) {
        throw new Error('End date is required');
      }
      
      const endDate = new Date(newLottery.endDate);
      if (endDate <= new Date()) {
        throw new Error('End date must be in the future');
      }

      const commitmentBlock = calculateCommitmentBlock(
        currentBitcoinBlock, 
        newLottery.endDate, 
        newLottery.lotteryType
      );

      const lotteriesRef = collection(db, 'lotteries');
      await addDoc(lotteriesRef, {
        ...newLottery,
        entryFee: parseFloat(newLottery.entryFee),
        platformFee: parseFloat(newLottery.platformFee),
        maxParticipants: parseInt(newLottery.maxParticipants) || null,
        minWinners: parseInt(newLottery.minWinners),
        endDate: Timestamp.fromDate(endDate),
        createdAt: Timestamp.now(),
        participants: [],
        status: 'active',
        winners: [],
        provablyFair: {
          commitmentBlock: commitmentBlock,
          committedAt: Timestamp.now(),
          blockDataFetched: false,
          blockHash: null,
          verified: false,
          lotteryType: newLottery.lotteryType
        },
        ticketSystem: {
          maxTicketsPerUser: newLottery.maxTicketsPerUser,
          dynamicLimit: true,
          limitPercentage: 2
        }
      });

      setSuccess(`✅ ${newLottery.lotteryType} lottery created! Provably fair block: #${commitmentBlock}`);
      
      setNewLottery({
        title: '',
        description: '',
        entryFee: '',
        endDate: '',
        maxParticipants: '',
        platformFee: 0.1,
        platformFeePercent: 10,
        minWinners: 3,
        maxTicketsPerUser: 2,
        lotteryType: 'standard'
      });
      
      loadLotteries();
      calculateStats();
    } catch (error) {
      console.error('Create lottery error:', error);
      setError('Error creating lottery: ' + error.message);
    }
    setLoading(false);
  };

  const drawWinner = async (lotteryId) => {
    const lottery = lotteries.find(l => l.id === lotteryId);
    if (!lottery || !lottery.participants || lottery.participants.length === 0) {
      setError('No participants to draw from');
      return;
    }

    if (lottery.winners && lottery.winners.length > 0) {
      setError('Winners already drawn for this lottery');
      return;
    }

    setLoading(true);
    try {
      const blockData = await fetchBitcoinBlockHash(lottery.provablyFair.commitmentBlock);
      
      const winnerCount = calculateWinnerCount(
        lottery.participants.length, 
        lottery.minWinners || 1
      );
      
      const winners = generateProvablyFairWinners(
        blockData.hash, 
        lotteryId, 
        lottery.participants, 
        winnerCount
      );
      
      const prizes = calculatePrizeDistribution(
        lottery.participants.length,
        lottery.entryFee,
        lottery.platformFee || 0.1,
        winnerCount
      );
      
      const winnersWithPrizes = winners.map((winner, index) => ({
        ...winner,
        prize: prizes[index],
        paid: false,
        paidAt: null,
        paymentId: null,
        txnId: null
      }));

      const lotteryRef = doc(db, 'lotteries', lotteryId);
      await updateDoc(lotteryRef, {
        winners: winnersWithPrizes,
        status: 'completed',
        drawnAt: Timestamp.now(),
        provablyFair: {
          ...lottery.provablyFair,
          blockDataFetched: true,
          blockHash: blockData.hash,
          blockHeight: blockData.height,
          blockTimestamp: blockData.timestamp,
          verified: true,
          totalParticipants: lottery.participants.length,
          winnerCount: winnerCount
        }
      });

      setSuccess(`🎉 ${winnerCount} winners drawn using Bitcoin block #${blockData.height}!`);
      loadLotteries();
      calculateStats();
    } catch (error) {
      console.error('Draw winner error:', error);
      setError('Error drawing winners: ' + error.message);
    }
    setLoading(false);
  };

  const endLottery = async (lotteryId) => {
    try {
      const lotteryRef = doc(db, 'lotteries', lotteryId);
      await updateDoc(lotteryRef, {
        status: 'ended',
        endedAt: Timestamp.now()
      });

      setSuccess('Lottery ended successfully');
      loadLotteries();
    } catch (error) {
      console.error('End lottery error:', error);
      setError('Error ending lottery: ' + error.message);
    }
  };

  // Utility functions
  const getLotteryStatus = (lottery) => {
    if (lottery.winners && lottery.winners.length > 0) return 'completed';
    if (lottery.status === 'ended') return 'ended';
    if (new Date() > lottery.endDate) return 'ended';
    return 'active';
  };

  const formatDate = (date) => {
    if (!date) return 'Invalid Date';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
    clearPiError();
  };

  // Main loading state
  if (loading && !user && !isAdmin) {
    return (
      <div className="container">
        <div className="loading">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  // Login form for non-admin users
  if (!isAdmin) {
    return (
      <div className="container">
        <div className="header">
          <h1>🎰 Pi Lottery Admin</h1>
          <p>Administrator Access Required</p>
        </div>

        <div className="card">
          <div className="login-form">
            <div className="login-header">
              <h2>🔐 Admin Login</h2>
              <p>Please sign in to access the admin dashboard</p>
            </div>

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

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your admin email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>

              <button 
                type="submit" 
                className="button full-width"
                disabled={loading}
              >
                {loading ? '🔄 Signing in...' : '🔑 Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main admin dashboard
  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1>🎰 Pi Lottery Admin Dashboard</h1>
        <p>Manage provably fair lotteries with manual prize distribution</p>
      </div>

      {/* Admin Info & Controls */}
      <div className="card">
        <div className="logged-in-header">
          <div className="admin-info">
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span>✅ Admin: {user.email}</span>
              {adminFullyConnected && (
                <span style={{color: '#28a745', fontSize: '0.9rem'}}>
                  💰 Wallet Connected ({adminPiUser.username})
                </span>
              )}
            </div>
            {currentBitcoinBlock && (
              <div style={{fontSize: '0.9rem', color: '#6c757d', marginTop: '5px'}}>
                📦 Bitcoin Block: #{currentBitcoinBlock}
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="button secondary">
            🚪 Logout
          </button>
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
      {piError && (
        <div className="error">
          Pi Wallet Error: {piError}
          <button onClick={clearPiError} style={{float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}}>×</button>
        </div>
      )}

      {/* Dashboard Stats */}
      <div className="stats-grid">
        <div className="stat-card purple">
          <div className="stat-number">{stats.totalLotteries}</div>
          <div className="stat-label">Total Lotteries</div>
        </div>
        <div className="stat-card green">
          <div className="stat-number">{stats.activeParticipants}</div>
          <div className="stat-label">Total Participants</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-number">{stats.totalPiCollected} π</div>
          <div className="stat-label">Pi Collected</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-number">{stats.winnersDrawn}</div>
          <div className="stat-label">Winners Drawn</div>
        </div>
      </div>

      {/* Create New Lottery */}
      <div className="card">
        <h2>🎰 Create New Lottery</h2>
        <form onSubmit={createLottery}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="title">Lottery Title</label>
              <input
                type="text"
                id="title"
                value={newLottery.title}
                onChange={(e) => setNewLottery({...newLottery, title: e.target.value})}
                required
                placeholder="e.g., Daily Pi Lottery"
              />
            </div>
            <div className="form-group">
              <label htmlFor="lotteryType">Lottery Type</label>
              <select
                id="lotteryType"
                value={newLottery.lotteryType}
                onChange={(e) => setNewLottery({...newLottery, lotteryType: e.target.value})}
              >
                <option value="standard">Standard Lottery</option>
                <option value="daily">Daily Lottery (24 hours)</option>
                <option value="weekly">Weekly Lottery (7 days)</option>
                <option value="monthly">Monthly Lottery (30 days)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="entryFee">Entry Fee (π)</label>
              <input
                type="number"
                id="entryFee"
                step="0.01"
                min="0.01"
                value={newLottery.entryFee}
                onChange={(e) => setNewLottery({...newLottery, entryFee: e.target.value})}
                required
                placeholder="1.00"
              />
            </div>
            <div className="form-group">
              <label htmlFor="platformFee">Platform Fee (π per entry)</label>
              <input
                type="number"
                id="platformFee"
                step="0.01"
                min="0"
                max="1"
                value={newLottery.platformFee}
                onChange={(e) => setNewLottery({...newLottery, platformFee: parseFloat(e.target.value) || 0})}
                placeholder="0.10"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={newLottery.description}
              onChange={(e) => setNewLottery({...newLottery, description: e.target.value})}
              placeholder="Describe your lottery..."
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="endDate">End Date & Time</label>
              <input
                type="datetime-local"
                id="endDate"
                value={newLottery.endDate}
                onChange={(e) => setNewLottery({...newLottery, endDate: e.target.value})}
                required
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="minWinners">Minimum Winners</label>
              <select
                id="minWinners"
                value={newLottery.minWinners}
                onChange={(e) => setNewLottery({...newLottery, minWinners: parseInt(e.target.value)})}
              >
                <option value={1}>1 Winner</option>
                <option value={3}>3 Winners</option>
                <option value={5}>5 Winners</option>
                <option value={7}>7 Winners</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="button success full-width"
            disabled={loading}
          >
            {loading ? '🔄 Creating...' : '🔒 Create Provably Fair Lottery'}
          </button>
        </form>
      </div>

      {/* All Lotteries */}
      <div className="card">
        <h2>📋 All Lotteries</h2>
        {lotteries.length === 0 ? (
          <p style={{textAlign: 'center', color: '#6c757d', padding: '40px'}}>
            No lotteries created yet.
          </p>
        ) : (
          <div className="lottery-list">
            {lotteries.map((lottery) => {
              const status = getLotteryStatus(lottery);
              const participantCount = lottery.participants ? lottery.participants.length : 0;
              const totalPrize = ((participantCount * lottery.entryFee) - (participantCount * (lottery.platformFee || 0.1))).toFixed(2);
              const hasWinners = lottery.winners && lottery.winners.length > 0;

              return (
                <div key={lottery.id} className="lottery-item">
                  <div className="lottery-header">
                    <h3 className="lottery-title">
                      {lottery.title}
                      {lottery.lotteryType && lottery.lotteryType !== 'standard' && (
                        <span style={{fontSize: '0.8rem', color: '#6c757d', marginLeft: '10px'}}>
                          ({lottery.lotteryType})
                        </span>
                      )}
                    </h3>
                    <span className={`lottery-status status-${status}`}>
                      {status === 'active' && '🟢 Active'}
                      {status === 'ended' && '🔴 Ended'}
                      {status === 'completed' && '🏆 Completed'}
                    </span>
                  </div>

                  <div className="lottery-details">
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">Entry Fee</div>
                      <div className="lottery-detail-value">{lottery.entryFee} π</div>
                    </div>
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">Participants</div>
                      <div className="lottery-detail-value">{participantCount}</div>
                    </div>
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">Prize Pool</div>
                      <div className="lottery-detail-value">{totalPrize} π</div>
                    </div>
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">End Date</div>
                      <div className="lottery-detail-value">{formatDate(lottery.endDate)}</div>
                    </div>
                  </div>

                  {/* Winners and Prize Distribution */}
                  {hasWinners && (
                    <div className="winners-section" style={{margin: '20px 0'}}>
                      <h4>🏆 Winners & Prize Distribution</h4>
                      <div className="winners-grid" style={{display: 'grid', gap: '10px', marginTop: '15px'}}>
                        {lottery.winners.map((winner, index) => (
                          <div key={index} className="winner-item" style={{
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '15px',
                            background: '#f8f9fa',
                            borderRadius: '8px',
                            border: winner.paid ? '2px solid #28a745' : '2px solid #ffc107'
                          }}>
                            <div className="winner-info">
                              <span style={{fontWeight: 'bold'}}>
                                {winner.position === 1 ? '🥇' : winner.position === 2 ? '🥈' : winner.position === 3 ? '🥉' : '🏅'} 
                                #{winner.position}
                              </span>
                              <span style={{marginLeft: '10px'}}>
                                {winner.winner.username || winner.winner.uid}
                              </span>
                              <span style={{marginLeft: '10px', fontWeight: 'bold', color: '#007bff'}}>
                                {winner.prize}π
                              </span>
                            </div>
                            <div className="winner-actions">
                              {winner.paid ? (
                                <div style={{textAlign: 'right'}}>
                                  <span style={{color: '#28a745', fontWeight: 'bold', fontSize: '0.9rem'}}>
                                    ✅ Paid
                                  </span>
                                  {winner.paidAt && (
                                    <div style={{fontSize: '0.8rem', color: '#6c757d'}}>
                                      {formatDate(winner.paidAt.toDate())}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => distributePrizeToWinner(winner, lottery.id)}
                                  className="button success"
                                  disabled={!adminFullyConnected || distributingPrizes}
                                  style={{padding: '8px 16px', fontSize: '0.9rem'}}
                                >
                                  {distributingPrizes ? '🔄 Sending...' : `💰 Send ${winner.prize}π`}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lottery Actions */}
                  <div className="lottery-actions">
                    {status === 'active' && (
                      <button 
                        onClick={() => endLottery(lottery.id)}
                        className="button warning"
                      >
                        ⏹️ End Lottery
                      </button>
                    )}
                    
                    {(status === 'ended' || status === 'active') && participantCount > 0 && !hasWinners && (
                      <button 
                        onClick={() => drawWinner(lottery.id)}
                        className="button success"
                        disabled={loading}
                      >
                        {loading ? '🔄 Drawing...' : '🎯 Draw Winners'}
                      </button>
                    )}

                    {participantCount === 0 && (
                      <span style={{color: '#6c757d', fontStyle: 'italic'}}>
                        No participants yet
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

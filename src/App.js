// File path: src/App.js - Complete Admin Interface with Environment Variables
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
import usePiPayments from './hooks/usePiPayments';

function App() {
  // Authentication state
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Configuration from environment variables
  const getConfig = () => {
    return {
      adminEmail: process.env.REACT_APP_ADMIN_EMAIL,
      superAdminEmails: process.env.REACT_APP_SUPER_ADMIN_EMAILS?.split(',') || [],
      platformName: process.env.REACT_APP_PLATFORM_NAME || 'Pi Lottery Admin',
      defaultPlatformFee: parseFloat(process.env.REACT_APP_DEFAULT_PLATFORM_FEE) || 0.1,
      maxEntryFee: parseFloat(process.env.REACT_APP_MAX_ENTRY_FEE) || 1000,
      minEntryFee: parseFloat(process.env.REACT_APP_MIN_ENTRY_FEE) || 0.01,
      maxLotteryDuration: parseInt(process.env.REACT_APP_MAX_LOTTERY_DURATION_DAYS) || 30,
      minLotteryDuration: parseInt(process.env.REACT_APP_MIN_LOTTERY_DURATION_HOURS) || 1,
      bitcoinApiPrimary: process.env.REACT_APP_BITCOIN_API_PRIMARY || 'https://blockstream.info/api',
      bitcoinApiFallback: process.env.REACT_APP_BITCOIN_API_FALLBACK || 'https://blockstream.info/testnet/api',
      ticketLimitPercentage: parseFloat(process.env.REACT_APP_TICKET_LIMIT_PERCENTAGE) || 2,
      enableDebugMode: process.env.REACT_APP_ENABLE_DEBUG_MODE === 'true',
      sessionTimeout: parseInt(process.env.REACT_APP_ADMIN_SESSION_TIMEOUT_MINUTES) || 480
    };
  };

  // Pi SDK hook for admin
  const {
    piUser: adminPiUser,
    isAuthenticated: adminWalletConnected,
    hasPaymentAccess: adminHasPaymentAccess,
    loading: piLoading,
    error: piError,
    connectWallet,
    clearError: clearPiError,
    isFullyConnected: adminFullyConnected
  } = usePiSDK();

  // Payment hook for prize distribution
  const { 
    distributePrize, 
    loading: paymentLoading, 
    error: paymentError,
    clearError: clearPaymentError
  } = usePiPayments();

  // Lottery data
  const [lotteries, setLotteries] = useState([]);
  const [stats, setStats] = useState({
    totalLotteries: 0,
    activeParticipants: 0,
    totalPiCollected: 0,
    winnersDrawn: 0
  });

  // New lottery form with environment-based defaults
  const [newLottery, setNewLottery] = useState(() => {
    const config = getConfig();
    return {
      title: '',
      description: '',
      entryFee: config.minEntryFee.toString(),
      endDate: '',
      maxParticipants: '',
      platformFee: config.defaultPlatformFee,
      platformFeePercent: config.defaultPlatformFee * 100,
      minWinners: 3,
      maxTicketsPerUser: 2,
      lotteryType: 'standard'
    };
  });

  // Bitcoin API state
  const [currentBitcoinBlock, setCurrentBitcoinBlock] = useState(null);

  // Prize distribution state
  const [distributingPrizes, setDistributingPrizes] = useState(false);
  const [distributionResults, setDistributionResults] = useState({});

  // Check admin authorization
  const isAdmin = () => {
    const config = getConfig();
    if (!user || !user.email) return false;
    
    // Check primary admin email
    if (config.adminEmail && user.email === config.adminEmail) return true;
    
    // Check super admin emails
    if (config.superAdminEmails.includes(user.email)) return true;
    
    return false;
  };

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Session timeout handler
  useEffect(() => {
    if (isAdmin()) {
      const config = getConfig();
      const timeout = setTimeout(() => {
        setSuccess('Session expired for security. Please log in again.');
        handleLogout();
      }, config.sessionTimeout * 60 * 1000);

      return () => clearTimeout(timeout);
    }
  }, [user]);

  // Get current Bitcoin block height with environment-configured endpoints
  useEffect(() => {
    fetchCurrentBitcoinBlock();
    const interval = setInterval(fetchCurrentBitcoinBlock, 600000); // 10 minutes
    return () => clearInterval(interval);
  }, []);

  // Load data when user is authenticated
  useEffect(() => {
    if (isAdmin()) {
      loadLotteries();
    }
  }, [user]);

  // Calculate stats when lotteries change
  useEffect(() => {
    if (isAdmin() && lotteries.length >= 0) {
      calculateStats();
    }
  }, [lotteries, user]);

  // Clear messages after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 
        parseInt(process.env.REACT_APP_NOTIFICATION_DURATION_MS) || 5000
      );
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Bitcoin API functions with environment configuration
  const fetchCurrentBitcoinBlock = async () => {
    const config = getConfig();
    
    try {
      console.log('📦 Fetching current Bitcoin block height...');
      const response = await fetch(`${config.bitcoinApiPrimary}/blocks/tip/height`, {
        timeout: 15000
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const height = await response.json();
      if (typeof height !== 'number' || height < 700000) {
        throw new Error(`Invalid block height: ${height}`);
      }
      
      setCurrentBitcoinBlock(height);
      console.log('✅ Current Bitcoin block height:', height);
      
    } catch (primaryError) {
      console.warn('⚠️ Primary Bitcoin API failed, trying fallback...', primaryError.message);
      
      try {
        const response = await fetch(`${config.bitcoinApiFallback}/blocks/tip/height`, {
          timeout: 15000
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const height = await response.json();
        setCurrentBitcoinBlock(height);
        console.log('✅ Bitcoin block height from fallback:', height);
        
      } catch (fallbackError) {
        console.error('❌ All Bitcoin APIs failed:', fallbackError);
        
        // Estimated fallback based on time
        const genesisTime = 1231006505000; // Bitcoin genesis block timestamp
        const avgBlockTime = 10 * 60 * 1000; // 10 minutes
        const estimatedHeight = Math.floor((Date.now() - genesisTime) / avgBlockTime);
        
        setCurrentBitcoinBlock(estimatedHeight);
        console.warn('🔄 Using estimated block height:', estimatedHeight);
      }
    }
  };

  const fetchBitcoinBlockHash = async (blockHeight) => {
    const config = getConfig();
    
    try {
      const response = await fetch(`${config.bitcoinApiPrimary}/block-height/${blockHeight}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blockHash = await response.text();
      
      const blockResponse = await fetch(`${config.bitcoinApiPrimary}/block/${blockHash}`);
      if (!blockResponse.ok) throw new Error(`HTTP ${blockResponse.status}`);
      
      const blockData = await blockResponse.json();
      
      return {
        hash: blockData.id,
        height: blockData.height,
        timestamp: blockData.timestamp,
        merkleRoot: blockData.merkle_root
      };
      
    } catch (primaryError) {
      console.warn('⚠️ Primary Bitcoin API failed for block data, trying fallback...');
      
      const response = await fetch(`${config.bitcoinApiFallback}/block-height/${blockHeight}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blockHash = await response.text();
      
      const blockResponse = await fetch(`${config.bitcoinApiFallback}/block/${blockHash}`);
      if (!blockResponse.ok) throw new Error(`HTTP ${blockResponse.status}`);
      
      const blockData = await blockResponse.json();
      
      return {
        hash: blockData.id,
        height: blockData.height,
        timestamp: blockData.timestamp,
        merkleRoot: blockData.merkle_root
      };
    }
  };

  // Calculate commitment block with environment-based safety margins
  const calculateCommitmentBlock = (currentBlock, endDate, lotteryType) => {
    const now = new Date();
    const end = new Date(endDate);
    const hoursUntilEnd = (end - now) / (1000 * 60 * 60);
    
    const blocksUntilEnd = Math.ceil(hoursUntilEnd * 6); // ~6 blocks per hour
    
    // Get safety margin percentages from environment
    let safetyMarginPercent;
    switch (lotteryType) {
      case 'daily':
        safetyMarginPercent = parseFloat(process.env.REACT_APP_DAILY_LOTTERY_MARGIN_PERCENT) || 5;
        break;
      case 'weekly':
        safetyMarginPercent = parseFloat(process.env.REACT_APP_WEEKLY_LOTTERY_MARGIN_PERCENT) || 10;
        break;
      case 'monthly':
        safetyMarginPercent = parseFloat(process.env.REACT_APP_MONTHLY_LOTTERY_MARGIN_PERCENT) || 15;
        break;
      default:
        safetyMarginPercent = parseFloat(process.env.REACT_APP_STANDARD_LOTTERY_MARGIN_PERCENT) || 10;
    }
    
    const minSafetyMargin = parseInt(process.env.REACT_APP_MIN_BLOCK_SAFETY_MARGIN) || 1;
    const maxSafetyMargin = parseInt(process.env.REACT_APP_MAX_BLOCK_SAFETY_MARGIN) || 12;
    
    const safetyMargin = Math.max(
      minSafetyMargin,
      Math.min(maxSafetyMargin, Math.ceil(blocksUntilEnd * (safetyMarginPercent / 100)))
    );
    
    const commitmentBlock = currentBlock + blocksUntilEnd + safetyMargin;
    
    if (process.env.REACT_APP_ENABLE_DEBUG_MODE === 'true') {
      console.log(`📊 Commitment block calculation for ${lotteryType} lottery:`, {
        currentBlock,
        hoursUntilEnd: hoursUntilEnd.toFixed(2),
        blocksUntilEnd,
        safetyMarginPercent,
        safetyMargin,
        commitmentBlock
      });
    }
    
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

  // Data management functions
  const loadLotteries = async () => {
    try {
      const lotteriesRef = collection(db, 'lotteries');
      const q = query(lotteriesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const lotteryList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        lotteryList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          endDate: data.endDate?.toDate() || new Date(),
          drawnAt: data.drawnAt?.toDate() || null
        });
      });
      
      setLotteries(lotteryList);
      console.log('✅ Loaded lotteries:', lotteryList.length);
      
    } catch (error) {
      console.error('❌ Error loading lotteries:', error);
      setError('Failed to load lotteries');
    }
  };

  const calculateStats = () => {
    try {
      let totalLotteries = 0;
      let activeParticipants = 0;
      let totalPiCollected = 0;
      let winnersDrawn = 0;

      lotteries.forEach(lottery => {
        totalLotteries++;
        
        if (lottery.participants) {
          activeParticipants += lottery.participants.length;
          totalPiCollected += lottery.participants.length * lottery.entryFee;
        }
        
        if (lottery.winners && lottery.winners.length > 0) {
          winnersDrawn += lottery.winners.length;
        }
      });

      setStats({
        totalLotteries,
        activeParticipants,
        totalPiCollected: totalPiCollected.toFixed(2),
        winnersDrawn
      });
      
    } catch (error) {
      console.error('❌ Error calculating stats:', error);
    }
  };

  // Auth functions with enhanced security
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const config = getConfig();
      
      // Validate admin email before attempting login
      if (!config.adminEmail && !config.superAdminEmails.includes(email)) {
        throw new Error('Admin email not configured. Please check environment variables.');
      }

      await signInWithEmailAndPassword(auth, email, password);
      
      // Double-check authorization after login
      if (!config.adminEmail && !config.superAdminEmails.includes(email)) {
        await signOut(auth);
        throw new Error('Unauthorized: This email is not configured as an admin.');
      }

      setSuccess(`Welcome to ${config.platformName}!`);
      setEmail('');
      setPassword('');
      
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/user-not-found') {
        setError('Admin account not found. Please check your credentials.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Invalid password.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait before trying again.');
      } else {
        setError(error.message);
      }
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSuccess('Successfully logged out!');
      setLotteries([]);
      setStats({
        totalLotteries: 0,
        activeParticipants: 0,
        totalPiCollected: 0,
        winnersDrawn: 0
      });
    } catch (error) {
      setError('Error logging out');
      console.error('Logout error:', error);
    }
  };

  // Lottery management functions
  const createLottery = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const config = getConfig();
      
      // Validate inputs
      if (!newLottery.title || !newLottery.endDate) {
        throw new Error('Title and end date are required');
      }

      const entryFee = parseFloat(newLottery.entryFee);
      if (entryFee < config.minEntryFee || entryFee > config.maxEntryFee) {
        throw new Error(`Entry fee must be between ${config.minEntryFee}π and ${config.maxEntryFee}π`);
      }

      const endDate = new Date(newLottery.endDate);
      if (endDate <= new Date()) {
        throw new Error('End date must be in the future');
      }

      // Check max duration
      const maxEndDate = new Date();
      maxEndDate.setDate(maxEndDate.getDate() + config.maxLotteryDuration);
      if (endDate > maxEndDate) {
        throw new Error(`Lottery duration cannot exceed ${config.maxLotteryDuration} days`);
      }

      // Calculate commitment block
      const commitmentBlock = calculateCommitmentBlock(
        currentBitcoinBlock, 
        newLottery.endDate, 
        newLottery.lotteryType
      );

      // Create lottery document
      const lotteryData = {
        title: newLottery.title,
        description: newLottery.description || '',
        entryFee: entryFee,
        platformFee: parseFloat(newLottery.platformFee),
        endDate: Timestamp.fromDate(endDate),
        maxParticipants: newLottery.maxParticipants ? parseInt(newLottery.maxParticipants) : null,
        minWinners: parseInt(newLottery.minWinners),
        maxTicketsPerUser: parseInt(newLottery.maxTicketsPerUser),
        lotteryType: newLottery.lotteryType,
        status: 'active',
        participants: [],
        winners: [],
        createdAt: Timestamp.now(),
        createdBy: user.email,
        provablyFair: {
          commitmentBlock: commitmentBlock,
          blockHash: null,
          verified: false
        }
      };

      // Add to Firestore
      await addDoc(collection(db, 'lotteries'), lotteryData);
      
      setSuccess(`✅ Lottery "${newLottery.title}" created successfully!`);
      
      // Reset form
      const defaultConfig = getConfig();
      setNewLottery({
        title: '',
        description: '',
        entryFee: defaultConfig.minEntryFee.toString(),
        endDate: '',
        maxParticipants: '',
        platformFee: defaultConfig.defaultPlatformFee,
        platformFeePercent: defaultConfig.defaultPlatformFee * 100,
        minWinners: 3,
        maxTicketsPerUser: 2,
        lotteryType: 'standard'
      });
      
      // Reload lotteries
      loadLotteries();
      
    } catch (error) {
      console.error('❌ Error creating lottery:', error);
      setError(error.message);
    }
    
    setLoading(false);
  };

  // Draw winners for a lottery
  const drawWinners = async (lotteryId) => {
    setError('');
    setLoading(true);

    try {
      const lottery = lotteries.find(l => l.id === lotteryId);
      if (!lottery) {
        throw new Error('Lottery not found');
      }

      if (lottery.status !== 'active') {
        throw new Error('Lottery is not active');
      }

      if (!lottery.participants || lottery.participants.length === 0) {
        throw new Error('No participants in this lottery');
      }

      // Check if lottery has ended
      if (new Date() < lottery.endDate) {
        throw new Error('Lottery has not ended yet');
      }

      // Fetch Bitcoin block data
      const blockData = await fetchBitcoinBlockHash(lottery.provablyFair.commitmentBlock);
      
      // Calculate winners
      const winnerCount = calculateWinnerCount(lottery.participants.length, lottery.minWinners);
      const winners = generateProvablyFairWinners(
        blockData.hash, 
        lotteryId, 
        lottery.participants, 
        winnerCount
      );
      
      // Calculate prizes
      const prizes = calculatePrizeDistribution(
        lottery.participants.length,
        lottery.entryFee,
        lottery.platformFee,
        winnerCount
      );
      
      // Add prize amounts to winners
      const winnersWithPrizes = winners.map((winner, index) => ({
        ...winner,
        prize: prizes[index] || 0,
        paid: false,
        paidAt: null,
        paymentId: null
      }));

      // Update lottery in Firestore
      const lotteryRef = doc(db, 'lotteries', lotteryId);
      await updateDoc(lotteryRef, {
        status: 'ended',
        winners: winnersWithPrizes,
        drawnAt: Timestamp.now(),
        provablyFair: {
          ...lottery.provablyFair,
          blockHash: blockData.hash,
          verified: true,
          blockData: blockData
        }
      });

      setSuccess(`🎉 Drew ${winnerCount} winners for "${lottery.title}"!`);
      loadLotteries();
      
    } catch (error) {
      console.error('❌ Error drawing winners:', error);
      setError(error.message);
    }
    
    setLoading(false);
  };

  // Prize distribution
  const handleDistributePrize = async (lotteryId, winner) => {
    setDistributingPrizes(true);
    
    try {
      await distributePrize(
        winner,
        lotteryId,
        (result) => {
          setDistributionResults(prev => ({
            ...prev,
            [winner.winner.uid]: { success: true, paymentId: result.paymentId }
          }));
          
          // Update lottery to mark prize as paid
          const lotteryRef = doc(db, 'lotteries', lotteryId);
          const lottery = lotteries.find(l => l.id === lotteryId);
          const updatedWinners = lottery.winners.map(w => 
            w.winner.uid === winner.winner.uid 
              ? { ...w, paid: true, paidAt: Timestamp.now(), paymentId: result.paymentId }
              : w
          );
          
          updateDoc(lotteryRef, { winners: updatedWinners });
          loadLotteries();
          
          setSuccess(`💰 Prize sent to ${winner.winner.username}!`);
        },
        (error) => {
          setDistributionResults(prev => ({
            ...prev,
            [winner.winner.uid]: { success: false, error: error.message }
          }));
          setError(`Failed to send prize: ${error.message}`);
        }
      );
    } catch (error) {
      setError(`Prize distribution failed: ${error.message}`);
    }
    
    setDistributingPrizes(false);
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
    clearPiError();
    clearPaymentError();
  };

  // Utility functions
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

  // Main loading state
  if (loading && !user) {
    return (
      <div className="container">
        <div className="loading">
          <h2>Loading {getConfig().platformName}...</h2>
        </div>
      </div>
    );
  }

  // Login form for non-admin users
  if (!isAdmin()) {
    const config = getConfig();
    
    return (
      <div className="container">
        <div className="header">
          <h1>🎰 {config.platformName}</h1>
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
                <label htmlFor="email">Admin Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your admin email"
                />
                <small>Only configured admin emails can access this dashboard</small>
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

            {!config.adminEmail && config.superAdminEmails.length === 0 && (
              <div className="warning" style={{marginTop: '20px'}}>
                <strong>⚠️ Configuration Required:</strong><br />
                Please set REACT_APP_ADMIN_EMAIL in your environment variables.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main admin dashboard
  const config = getConfig();
  
  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1>🎰 {config.platformName}</h1>
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
          <div style={{display: 'flex', gap: '10px'}}>
            {!adminFullyConnected && (
              <button 
                onClick={connectWallet} 
                className="button success"
                disabled={piLoading}
              >
                {piLoading ? '🔄 Connecting...' : '💰 Connect Wallet'}
              </button>
            )}
            <button onClick={handleLogout} className="button secondary">
              🚪 Logout
            </button>
          </div>
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
        <div className="warning">
          Pi Wallet: {piError}
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

      {/* Create New Lottery Form */}
      <div className="card">
        <h2>🎰 Create New Lottery</h2>
        <p style={{color: '#6c757d', marginBottom: '20px'}}>
          Create provably fair lotteries with Bitcoin blockchain randomness
        </p>
        
        <div className="warning" style={{marginBottom: '20px'}}>
          <strong>Configuration:</strong> Entry fees: {config.minEntryFee}π - {config.maxEntryFee}π | 
          Max duration: {config.maxLotteryDuration} days | 
          Ticket limit: {config.ticketLimitPercentage}%
        </div>
        
        <form onSubmit={createLottery}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="title">Lottery Title *</label>
              <input
                type="text"
                id="title"
                value={newLottery.title}
                onChange={(e) => setNewLottery({...newLottery, title: e.target.value})}
                required
                placeholder="Enter lottery title"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="lotteryType">Lottery Type</label>
              <select
                id="lotteryType"
                value={newLottery.lotteryType}
                onChange={(e) => setNewLottery({...newLottery, lotteryType: e.target.value})}
              >
                <option value="standard">Standard</option>
                <option value="daily">Daily (24 hours)</option>
                <option value="weekly">Weekly (7 days)</option>
                <option value="monthly">Monthly (30 days)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={newLottery.description}
              onChange={(e) => setNewLottery({...newLottery, description: e.target.value})}
              placeholder="Optional lottery description"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="entryFee">Entry Fee (π) *</label>
              <input
                type="number"
                id="entryFee"
                value={newLottery.entryFee}
                onChange={(e) => setNewLottery({...newLottery, entryFee: e.target.value})}
                min={config.minEntryFee}
                max={config.maxEntryFee}
                step="0.01"
                required
              />
              <small>Range: {config.minEntryFee}π - {config.maxEntryFee}π</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="platformFeePercent">Platform Fee (%)</label>
              <input
                type="number"
                id="platformFeePercent"
                value={newLottery.platformFeePercent}
                onChange={(e) => {
                  const percent = parseFloat(e.target.value);
                  setNewLottery({
                    ...newLottery, 
                    platformFeePercent: percent,
                    platformFee: (percent / 100) * parseFloat(newLottery.entryFee)
                  });
                }}
                min="1"
                max="50"
                step="0.1"
              />
              <small>Fee: {newLottery.platformFee.toFixed(3)}π per ticket</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="endDate">End Date & Time *</label>
              <input
                type="datetime-local"
                id="endDate"
                value={newLottery.endDate}
                onChange={(e) => setNewLottery({...newLottery, endDate: e.target.value})}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="minWinners">Minimum Winners</label>
              <input
                type="number"
                id="minWinners"
                value={newLottery.minWinners}
                onChange={(e) => setNewLottery({...newLottery, minWinners: parseInt(e.target.value)})}
                min="1"
                max="25"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="maxParticipants">Max Participants (optional)</label>
              <input
                type="number"
                id="maxParticipants"
                value={newLottery.maxParticipants}
                onChange={(e) => setNewLottery({...newLottery, maxParticipants: e.target.value})}
                min="2"
                placeholder="Leave empty for unlimited"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="maxTicketsPerUser">Max Tickets Per User</label>
              <input
                type="number"
                id="maxTicketsPerUser"
                value={newLottery.maxTicketsPerUser}
                onChange={(e) => setNewLottery({...newLottery, maxTicketsPerUser: parseInt(e.target.value)})}
                min="1"
                max="100"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="button success full-width"
            disabled={loading || !currentBitcoinBlock}
          >
            {loading ? '🔄 Creating...' : '🎰 Create Lottery'}
          </button>
        </form>
      </div>

      {/* Manage Existing Lotteries */}
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h2>🎟️ Manage Lotteries</h2>
          <button 
            onClick={loadLotteries} 
            className="button secondary"
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>

        {lotteries.length === 0 ? (
          <p style={{textAlign: 'center', color: '#6c757d', padding: '40px'}}>
            No lotteries created yet. Create your first lottery above!
          </p>
        ) : (
          <div className="lottery-list">
            {lotteries.map((lottery) => (
              <div key={lottery.id} className="lottery-item">
                <div className="lottery-header">
                  <h3 className="lottery-title">{lottery.title}</h3>
                  <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    <span className={`lottery-status status-${lottery.status}`}>
                      {lottery.status === 'active' && `⏰ ${formatTimeRemaining(lottery.endDate)}`}
                      {lottery.status === 'ended' && '🔴 Ended'}
                      {lottery.status === 'completed' && '🏆 Completed'}
                    </span>
                  </div>
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
                        (lottery.participants?.length || 0) * lottery.platformFee).toFixed(2)}π
                    </div>
                  </div>
                  <div className="lottery-detail">
                    <div className="lottery-detail-label">Created</div>
                    <div className="lottery-detail-value">{formatDate(lottery.createdAt)}</div>
                  </div>
                </div>

                {/* Bitcoin commitment info */}
                <div className="provably-fair-section">
                  <h4>🔒 Provably Fair Info</h4>
                  <div style={{fontSize: '0.9rem', color: '#6c757d'}}>
                    <div>Commitment Block: #{lottery.provablyFair?.commitmentBlock}</div>
                    {lottery.provablyFair?.blockHash && (
                      <div>Block Hash: {lottery.provablyFair.blockHash.substring(0, 20)}...</div>
                    )}
                    <div>Verified: {lottery.provablyFair?.verified ? '✅ Yes' : '⏳ Pending'}</div>
                  </div>
                </div>

                {/* Winners display */}
                {lottery.winners && lottery.winners.length > 0 && (
                  <div className="winners-section">
                    <h4>🏆 Winners ({lottery.winners.length})</h4>
                    <div className="winners-grid">
                      {lottery.winners.map((winner, index) => (
                        <div key={index} className={`winner-item ${winner.paid ? 'paid' : ''}`}>
                          <div className="winner-info">
                            <div style={{fontWeight: 'bold'}}>
                              {winner.position === 1 ? '🥇' : winner.position === 2 ? '🥈' : winner.position === 3 ? '🥉' : '🏅'} 
                              #{winner.position}
                            </div>
                            <div>{winner.winner.username}</div>
                            <div className="prize-amount">{winner.prize}π</div>
                          </div>
                          <div className="winner-actions">
                            {winner.paid ? (
                              <span style={{color: '#28a745', fontWeight: 'bold'}}>✅ Paid</span>
                            ) : adminFullyConnected ? (
                              <button 
                                onClick={() => handleDistributePrize(lottery.id, winner)}
                                className="button success"
                                disabled={distributingPrizes || paymentLoading}
                              >
                                {distributingPrizes ? '💰 Sending...' : '💰 Send Prize'}
                              </button>
                            ) : (
                              <span style={{color: '#ffc107'}}>⚠️ Connect wallet to pay</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lottery actions */}
                <div className="lottery-actions">
                  {lottery.status === 'active' && new Date() >= lottery.endDate && (
                    <button 
                      onClick={() => drawWinners(lottery.id)}
                      className="button warning"
                      disabled={loading}
                    >
                      {loading ? '🎲 Drawing...' : '🎲 Draw Winners'}
                    </button>
                  )}
                  
                  {lottery.status === 'active' && new Date() < lottery.endDate && (
                    <div style={{color: '#28a745', fontWeight: 'bold'}}>
                      ⏰ Active - ends {formatTimeRemaining(lottery.endDate)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

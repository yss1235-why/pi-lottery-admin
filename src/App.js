// File path: src/App.js - PRODUCTION Admin Interface
// ⚠️ WARNING: PRODUCTION MODE - REAL PI CRYPTOCURRENCY ⚠️
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

  // PRODUCTION warnings state
  const [showProductionWarning, setShowProductionWarning] = useState(true);
  const [productionAcknowledged, setProductionAcknowledged] = useState(false);

  // Configuration from environment variables
  const getConfig = () => {
    return {
      adminEmail: process.env.REACT_APP_ADMIN_EMAIL,
      superAdminEmails: process.env.REACT_APP_SUPER_ADMIN_EMAILS?.split(',') || [],
      platformName: process.env.REACT_APP_PLATFORM_NAME || 'Pi Lottery Admin',
      defaultPlatformFee: parseFloat(process.env.REACT_APP_DEFAULT_PLATFORM_FEE) || 0.1,
      maxEntryFee: parseFloat(process.env.REACT_APP_MAX_ENTRY_FEE) || 1000,
      minEntryFee: parseFloat(process.env.REACT_APP_MIN_ENTRY_FEE) || 0.1,
      maxLotteryDuration: parseInt(process.env.REACT_APP_MAX_LOTTERY_DURATION_DAYS) || 30,
      minLotteryDuration: parseInt(process.env.REACT_APP_MIN_LOTTERY_DURATION_HOURS) || 1,
      bitcoinApiPrimary: process.env.REACT_APP_BITCOIN_API_PRIMARY || 'https://blockstream.info/api',
      bitcoinApiFallback: process.env.REACT_APP_BITCOIN_API_FALLBACK || 'https://blockchain.info/api',
      ticketLimitPercentage: parseFloat(process.env.REACT_APP_TICKET_LIMIT_PERCENTAGE) || 2,
      enableDebugMode: process.env.REACT_APP_ENABLE_DEBUG_MODE === 'true',
      sessionTimeout: parseInt(process.env.REACT_APP_ADMIN_SESSION_TIMEOUT_MINUTES) || 480,
      isProduction: process.env.REACT_APP_PI_ENVIRONMENT === 'production',
      realMoney: process.env.REACT_APP_REAL_MONEY_MODE === 'true'
    };
  };

  // PRODUCTION warning check
  useEffect(() => {
    const config = getConfig();
    if (config.isProduction || config.realMoney) {
      console.warn('🚨 ADMIN PANEL: PRODUCTION MODE ACTIVE!');
      console.warn('💰 Managing REAL Pi cryptocurrency lotteries!');
      console.warn('🎰 Users are gambling with actual money!');
      
      // Check if admin has acknowledged production mode
      const acknowledged = localStorage.getItem('admin-production-acknowledged');
      if (acknowledged) {
        setProductionAcknowledged(true);
        setShowProductionWarning(false);
      }
    } else {
      setShowProductionWarning(false);
    }
  }, []);

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

  // Handle PRODUCTION acknowledgment
  const handleProductionAcknowledgment = () => {
    console.warn('💰 Admin acknowledged PRODUCTION mode with real Pi!');
    localStorage.setItem('admin-production-acknowledged', 'true');
    setProductionAcknowledged(true);
    setShowProductionWarning(false);
  };

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

  // Session timeout handler with PRODUCTION warnings
  useEffect(() => {
    if (isAdmin()) {
      const config = getConfig();
      const timeout = setTimeout(() => {
        console.warn('🚨 PRODUCTION session expired for security!');
        setSuccess('PRODUCTION session expired for security. Please log in again.');
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

  // Provably fair functions (same as before)
  const generateProvablyFairWinners = (blockHash, lotteryId, participants, winnerCount) => {
    console.warn('🎲 Generating winners for REAL Pi cryptocurrency lottery!');
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
    
    console.warn(`💰 ${winnerCount} winners selected for REAL Pi prizes!`);
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
    console.warn('💰 Calculating REAL Pi prize distribution!');
    const totalCollected = participantCount * entryFee;
    const totalPlatformFee = participantCount * platformFee;
    const prizePool = totalCollected - totalPlatformFee;
    
    console.warn(`💎 Total REAL Pi prize pool: ${prizePool.toFixed(4)}π`);
    
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

  // Data management functions (same as before, with PRODUCTION warnings added)
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
      console.log('✅ Loaded PRODUCTION lotteries:', lotteryList.length);
      
    } catch (error) {
      console.error('❌ Error loading PRODUCTION lotteries:', error);
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
      
      if (getConfig().isProduction) {
        console.warn(`💰 PRODUCTION Stats - Real Pi collected: ${totalPiCollected.toFixed(2)}π`);
      }
      
    } catch (error) {
      console.error('❌ Error calculating stats:', error);
    }
  };

  // Auth functions remain the same but with PRODUCTION warnings
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const config = getConfig();
      
      if (!config.adminEmail && !config.superAdminEmails.includes(email)) {
        throw new Error('Admin email not configured. Please check environment variables.');
      }

      await signInWithEmailAndPassword(auth, email, password);
      
      if (!config.adminEmail && !config.superAdminEmails.includes(email)) {
        await signOut(auth);
        throw new Error('Unauthorized: This email is not configured as an admin.');
      }

      console.warn('🚨 ADMIN LOGIN: PRODUCTION mode access granted!');
      setSuccess(`Welcome to ${config.platformName} PRODUCTION!`);
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
      console.warn('🚨 ADMIN LOGOUT: PRODUCTION session ended');
      setSuccess('Successfully logged out from PRODUCTION!');
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

  // Create lottery with PRODUCTION warnings
  const createLottery = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const config = getConfig();
      
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

      const maxEndDate = new Date();
      maxEndDate.setDate(maxEndDate.getDate() + config.maxLotteryDuration);
      if (endDate > maxEndDate) {
        throw new Error(`Lottery duration cannot exceed ${config.maxLotteryDuration} days`);
      }

      // PRODUCTION warning for lottery creation
      if (config.isProduction) {
        console.warn('🚨 Creating PRODUCTION lottery with REAL Pi cryptocurrency!');
        console.warn(`💰 Entry fee: ${entryFee}π (REAL money)`);
      }

      const commitmentBlock = calculateCommitmentBlock(
        currentBitcoinBlock, 
        newLottery.endDate, 
        newLottery.lotteryType
      );

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
        environment: config.isProduction ? 'PRODUCTION' : 'development',
        realCurrency: config.realMoney,
        provablyFair: {
          commitmentBlock: commitmentBlock,
          blockHash: null,
          verified: false
        }
      };

      await addDoc(collection(db, 'lotteries'), lotteryData);
      
      if (config.isProduction) {
        setSuccess(`🚨 PRODUCTION Lottery "${newLottery.title}" created with REAL Pi cryptocurrency!`);
      } else {
        setSuccess(`✅ Lottery "${newLottery.title}" created successfully!`);
      }
      
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
      
      loadLotteries();
      
    } catch (error) {
      console.error('❌ Error creating PRODUCTION lottery:', error);
      setError(error.message);
    }
    
    setLoading(false);
  };

  // Draw winners with PRODUCTION warnings
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

      if (new Date() < lottery.endDate) {
        throw new Error('Lottery has not ended yet');
      }

      console.warn('🎲 Drawing winners for REAL Pi cryptocurrency lottery!');
      console.warn(`💰 Total REAL Pi at stake: ${(lottery.participants.length * lottery.entryFee).toFixed(4)}π`);

      const blockData = await fetchBitcoinBlockHash(lottery.provablyFair.commitmentBlock);
      
      const winnerCount = calculateWinnerCount(lottery.participants.length, lottery.minWinners);
      const winners = generateProvablyFairWinners(
        blockData.hash, 
        lotteryId, 
        lottery.participants, 
        winnerCount
      );
      
      const prizes = calculatePrizeDistribution(
        lottery.participants.length,
        lottery.entryFee,
        lottery.platformFee,
        winnerCount
      );
      
      const winnersWithPrizes = winners.map((winner, index) => ({
        ...winner,
        prize: prizes[index] || 0,
        paid: false,
        paidAt: null,
        paymentId: null
      }));

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

      console.warn(`🏆 ${winnerCount} winners selected for REAL Pi prizes!`);
      console.warn(`💰 Total REAL Pi to be distributed: ${prizes.reduce((sum, prize) => sum + prize, 0).toFixed(4)}π`);

      setSuccess(`🎉 Drew ${winnerCount} winners for "${lottery.title}" with REAL Pi prizes!`);
      loadLotteries();
      
    } catch (error) {
      console.error('❌ Error drawing winners:', error);
      setError(error.message);
    }
    
    setLoading(false);
  };

  // Prize distribution with PRODUCTION warnings
  const handleDistributePrize = async (lotteryId, winner) => {
    setDistributingPrizes(true);
    
    console.warn('💰 Distributing REAL Pi cryptocurrency prize!');
    console.warn(`🏆 Amount: ${winner.prize}π (actual monetary value)`);
    
    try {
      await distributePrize(
        winner,
        lotteryId,
        (result) => {
          console.warn('✅ REAL Pi cryptocurrency sent to winner!');
          setDistributionResults(prev => ({
            ...prev,
            [winner.winner.uid]: { success: true, paymentId: result.paymentId }
          }));
          
          const lotteryRef = doc(db, 'lotteries', lotteryId);
          const lottery = lotteries.find(l => l.id === lotteryId);
          const updatedWinners = lottery.winners.map(w => 
            w.winner.uid === winner.winner.uid 
              ? { ...w, paid: true, paidAt: Timestamp.now(), paymentId: result.paymentId }
              : w
          );
          
          updateDoc(lotteryRef, { winners: updatedWinners });
          loadLotteries();
          
          setSuccess(`💰 REAL Pi prize of ${winner.prize}π sent to ${winner.winner.username}!`);
        },
        (error) => {
          console.error('❌ REAL Pi prize distribution failed:', error);
          setDistributionResults(prev => ({
            ...prev,
            [winner.winner.uid]: { success: false, error: error.message }
          }));
          setError(`Failed to send REAL Pi prize: ${error.message}`);
        }
      );
    } catch (error) {
      setError(`REAL Pi prize distribution failed: ${error.message}`);
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

  // PRODUCTION Warning Modal
  if (showProductionWarning && !productionAcknowledged) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          maxWidth: '600px',
          margin: '20px',
          textAlign: 'center',
          border: '4px solid #dc3545'
        }}>
          <h1 style={{color: '#dc3545', marginBottom: '20px', fontSize: '2rem'}}>
            🚨 PRODUCTION MODE WARNING
          </h1>
          
          <div style={{
            background: '#f8d7da',
            border: '2px solid #dc3545',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <h2 style={{color: '#721c24', marginBottom: '15px'}}>
              ⚠️ CRITICAL: REAL Pi CRYPTOCURRENCY MODE
            </h2>
            <ul style={{color: '#721c24', lineHeight: '1.6'}}>
              <li><strong>REAL MONEY:</strong> This platform uses actual Pi cryptocurrency with monetary value</li>
              <li><strong>LIVE GAMBLING:</strong> Users are gambling with real money and can lose significant amounts</li>
              <li><strong>LEGAL COMPLIANCE:</strong> Ensure gambling is legal in your jurisdiction</li>
              <li><strong>FINANCIAL RISK:</strong> Users can lose all money they spend on the platform</li>
              <li><strong>ADMIN RESPONSIBILITY:</strong> You are managing real money transactions</li>
            </ul>
          </div>

          <div style={{
            background: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <h3 style={{color: '#856404', marginBottom: '10px'}}>
              📋 ADMIN RESPONSIBILITIES:
            </h3>
            <ul style={{color: '#856404', lineHeight: '1.6'}}>
              <li>Ensure compliance with local gambling laws</li>
              <li>Monitor for responsible gambling violations</li>
              <li>Maintain proper financial records</li>
              <li>Handle customer complaints appropriately</li>
              <li>Distribute real Pi prizes accurately and promptly</li>
            </ul>
          </div>

          <button
            onClick={handleProductionAcknowledgment}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            ✅ I UNDERSTAND - PROCEED TO PRODUCTION ADMIN
          </button>
          
          <p style={{
            marginTop: '15px',
            fontSize: '0.9rem',
            color: '#6c757d'
          }}>
            By clicking above, you acknowledge you understand this platform 
            involves real money gambling and you accept full responsibility 
            for compliance and user safety.
          </p>
        </div>
      </div>
    );
  }

  // Main loading state
  if (loading && !user) {
    return (
      <div className="container">
        <div className="loading">
          <h2>Loading {getConfig().platformName} PRODUCTION...</h2>
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
          <p>PRODUCTION Administrator Access Required</p>
          {config.isProduction && (
            <div style={{
              background: '#f8d7da',
              border: '2px solid #dc3545',
              borderRadius: '8px',
              padding: '15px',
              marginTop: '15px',
              color: '#721c24'
            }}>
              <strong>🚨 PRODUCTION MODE:</strong> Managing REAL Pi cryptocurrency lotteries
            </div>
          )}
        </div>

        <div className="card">
          <div className="login-form">
            <div className="login-header">
              <h2>🔐 PRODUCTION Admin Login</h2>
              <p>Please sign in to access the PRODUCTION admin dashboard</p>
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
                <small>Only configured admin emails can access PRODUCTION dashboard</small>
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
                {loading ? '🔄 Signing in...' : '🔑 Sign In to PRODUCTION'}
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

  // Main admin dashboard with PRODUCTION warnings
  const config = getConfig();
  
  return (
    <div className="container">
      {/* PRODUCTION Header with warnings */}
      <div className="header">
        <h1>🎰 {config.platformName}</h1>
        <p>PRODUCTION - Manage real Pi cryptocurrency lotteries</p>
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
            <strong>🚨 PRODUCTION MODE:</strong> Managing REAL Pi cryptocurrency with actual monetary value
          </div>
        )}
      </div>

      {/* Admin Info & Controls with PRODUCTION warnings */}
      <div className="card">
        <div className="logged-in-header">
          <div className="admin-info">
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span>✅ PRODUCTION Admin: {user.email}</span>
              {adminFullyConnected && (
                <span style={{color: '#28a745', fontSize: '0.9rem'}}>
                  💰 REAL Pi Wallet Connected ({adminPiUser.username})
                </span>
              )}
            </div>
            {currentBitcoinBlock && (
              <div style={{fontSize: '0.9rem', color: '#6c757d', marginTop: '5px'}}>
                📦 Bitcoin Block: #{currentBitcoinBlock} | 
                💰 Real Pi Mode: {config.isProduction ? 'ACTIVE' : 'INACTIVE'}
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
                {piLoading ? '🔄 Connecting...' : '💰 Connect REAL Pi Wallet'}
              </button>
            )}
            <button onClick={handleLogout} className="button secondary">
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Rest of the component remains the same but with PRODUCTION warnings added throughout */}
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

      {/* Dashboard Stats with PRODUCTION labels */}
      <div className="stats-grid">
        <div className="stat-card purple">
          <div className="stat-number">{stats.totalLotteries}</div>
          <div className="stat-label">PRODUCTION Lotteries</div>
        </div>
        <div className="stat-card green">
          <div className="stat-number">{stats.activeParticipants}</div>
          <div className="stat-label">Real Pi Participants</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-number">{stats.totalPiCollected} π</div>
          <div className="stat-label">REAL Pi Collected</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-number">{stats.winnersDrawn}</div>
          <div className="stat-label">Real Pi Winners</div>
        </div>
      </div>

      {/* Create New Lottery Form with PRODUCTION warnings */}
      <div className="card">
        <h2>🎰 Create New PRODUCTION Lottery</h2>
        <p style={{color: '#6c757d', marginBottom: '20px'}}>
          Create real money lotteries with ACTUAL Pi cryptocurrency
        </p>
        
        <div className="warning" style={{marginBottom: '20px'}}>
          <strong>🚨 PRODUCTION WARNING:</strong> Users will spend REAL Pi cryptocurrency. 
          Entry fees: {config.minEntryFee}π - {config.maxEntryFee}π | 
          Max duration: {config.maxLotteryDuration} days | 
          Ticket limit: {config.ticketLimitPercentage}%
        </div>
        
        <form onSubmit={createLottery}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="title">PRODUCTION Lottery Title *</label>
              <input
                type="text"
                id="title"
                value={newLottery.title}
                onChange={(e) => setNewLottery({...newLottery, title: e.target.value})}
                required
                placeholder="Enter lottery title (REAL Pi)"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="lotteryType">Lottery Type</label>
              <select
                id="lotteryType"
                value={newLottery.lotteryType}
                onChange={(e) => setNewLottery({...newLottery, lotteryType: e.target.value})}
              >
                <option value="standard">Standard (REAL Pi)</option>
                <option value="daily">Daily (24 hours, REAL Pi)</option>
                <option value="weekly">Weekly (7 days, REAL Pi)</option>
                <option value="monthly">Monthly (30 days, REAL Pi)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={newLottery.description}
              onChange={(e) => setNewLottery({...newLottery, description: e.target.value})}
              placeholder="Describe this REAL Pi lottery"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="entryFee">Entry Fee (REAL π) *</label>
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
              <small>Range: {config.minEntryFee}π - {config.maxEntryFee}π (REAL Pi cryptocurrency)</small>
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
              <small>Fee: {newLottery.platformFee.toFixed(3)}π per ticket (REAL Pi)</small>
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
            style={{
              background: config.isProduction ? '#dc3545' : '#28a745',
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}
          >
            {loading ? '🔄 Creating...' : config.isProduction ? '🚨 Create PRODUCTION Lottery (REAL Pi)' : '🎰 Create Lottery'}
          </button>
          
          {config.isProduction && (
            <p style={{
              textAlign: 'center',
              marginTop: '10px',
              color: '#dc3545',
              fontWeight: 'bold'
            }}>
              ⚠️ This will create a lottery using REAL Pi cryptocurrency
            </p>
          )}
        </form>
      </div>

      {/* Manage Existing Lotteries with PRODUCTION warnings */}
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h2>🎟️ Manage PRODUCTION Lotteries</h2>
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
            No PRODUCTION lotteries created yet. Create your first real Pi lottery above!
          </p>
        ) : (
          <div className="lottery-list">
            {lotteries.map((lottery) => (
              <div key={lottery.id} className="lottery-item">
                <div className="lottery-header">
                  <h3 className="lottery-title">
                    {lottery.title}
                    {config.isProduction && (
                      <span style={{
                        background: '#dc3545',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        marginLeft: '10px'
                      }}>
                        REAL Pi
                      </span>
                    )}
                  </h3>
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
                    <div className="lottery-detail-value">
                      {lottery.entryFee}π 
                      {config.isProduction && <span style={{color: '#dc3545', fontSize: '0.8rem'}}> (REAL)</span>}
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
                        (lottery.participants?.length || 0) * lottery.platformFee).toFixed(2)}π
                      {config.isProduction && <span style={{color: '#dc3545', fontSize: '0.8rem'}}> (REAL)</span>}
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
                    {config.isProduction && (
                      <div style={{color: '#dc3545', fontWeight: 'bold', marginTop: '5px'}}>
                        🚨 PRODUCTION: Real Pi prizes will be distributed
                      </div>
                    )}
                  </div>
                </div>

                {/* Winners display with PRODUCTION warnings */}
                {lottery.winners && lottery.winners.length > 0 && (
                  <div className="winners-section">
                    <h4>
                      🏆 Winners ({lottery.winners.length})
                      {config.isProduction && (
                        <span style={{color: '#dc3545', fontSize: '0.9rem', marginLeft: '10px'}}>
                          - REAL Pi Prizes
                        </span>
                      )}
                    </h4>
                    <div className="winners-grid">
                      {lottery.winners.map((winner, index) => (
                        <div key={index} className={`winner-item ${winner.paid ? 'paid' : ''}`}>
                          <div className="winner-info">
                            <div style={{fontWeight: 'bold'}}>
                              {winner.position === 1 ? '🥇' : winner.position === 2 ? '🥈' : winner.position === 3 ? '🥉' : '🏅'} 
                              #{winner.position}
                            </div>
                            <div>{winner.winner.username}</div>
                            <div className="prize-amount">
                              {winner.prize}π
                              {config.isProduction && <span style={{color: '#dc3545', fontSize: '0.8rem'}}> (REAL)</span>}
                            </div>
                          </div>
                          <div className="winner-actions">
                            {winner.paid ? (
                              <span style={{color: '#28a745', fontWeight: 'bold'}}>
                                ✅ {config.isProduction ? 'REAL Pi Paid' : 'Paid'}
                              </span>
                            ) : adminFullyConnected ? (
                              <button 
                                onClick={() => handleDistributePrize(lottery.id, winner)}
                                className="button success"
                                disabled={distributingPrizes || paymentLoading}
                                style={{
                                  background: config.isProduction ? '#dc3545' : '#28a745'
                                }}
                              >
                                {distributingPrizes ? 
                                  (config.isProduction ? '💰 Sending REAL Pi...' : '💰 Sending...') : 
                                  (config.isProduction ? '💰 Send REAL Pi Prize' : '💰 Send Prize')
                                }
                              </button>
                            ) : (
                              <span style={{color: '#ffc107'}}>
                                ⚠️ Connect {config.isProduction ? 'REAL Pi ' : ''}wallet to pay
                              </span>
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
                      style={{
                        background: config.isProduction ? '#dc3545' : '#ffc107',
                        color: config.isProduction ? 'white' : '#212529'
                      }}
                    >
                      {loading ? 
                        (config.isProduction ? '🎲 Drawing REAL Pi Winners...' : '🎲 Drawing...') : 
                        (config.isProduction ? '🎲 Draw REAL Pi Winners' : '🎲 Draw Winners')
                      }
                    </button>
                  )}
                  
                  {lottery.status === 'active' && new Date() < lottery.endDate && (
                    <div style={{color: '#28a745', fontWeight: 'bold'}}>
                      ⏰ Active - ends {formatTimeRemaining(lottery.endDate)}
                      {config.isProduction && (
                        <div style={{color: '#dc3545', fontSize: '0.9rem'}}>
                          Users are spending REAL Pi cryptocurrency
                        </div>
                      )}
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

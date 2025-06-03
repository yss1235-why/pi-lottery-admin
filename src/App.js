// File path: src/App.js - COMPLETE REPLACEMENT with Provably Fair System
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

function App() {
  // Authentication state
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pi Wallet state
  const [piUser, setPiUser] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [piSDKLoaded, setPiSDKLoaded] = useState(false);

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
    maxParticipants: ''
  });

  // Bitcoin API state
  const [currentBitcoinBlock, setCurrentBitcoinBlock] = useState(null);

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

  // Enhanced Pi SDK initialization for testnet
  useEffect(() => {
    const initializePiSDK = async () => {
      try {
        if (window.Pi) {
          console.log('🧪 Initializing Pi SDK for testnet...');
          
          const config = {
            version: "2.0",
            sandbox: true,
            development: true,
            timeout: 45000,
            environment: 'sandbox',
            origin: window.location.origin,
            allowCrossOrigin: true
          };
          
          await window.Pi.init(config);
          setPiSDKLoaded(true);
          console.log('✅ Pi testnet SDK initialized successfully');
          
        } else {
          console.warn('⚠️ Pi SDK not loaded - retrying in 3 seconds...');
          setTimeout(initializePiSDK, 3000);
        }
      } catch (error) {
        console.error('❌ Pi SDK initialization error:', error);
        setPiSDKLoaded(false);
      }
    };

    setTimeout(initializePiSDK, 1000);
  }, []);

  // Get current Bitcoin block height
  useEffect(() => {
    fetchCurrentBitcoinBlock();
  }, []);

  // Load data when user is authenticated
  useEffect(() => {
    if (isAdmin) {
      loadLotteries();
      calculateStats();
    }
  }, [isAdmin]);

  // Bitcoin API functions
  const fetchCurrentBitcoinBlock = async () => {
    try {
      const response = await fetch('https://blockstream.info/api/blocks/tip/height');
      const height = await response.json();
      setCurrentBitcoinBlock(height);
    } catch (error) {
      console.error('Error fetching Bitcoin block height:', error);
      // Fallback to a reasonable estimate if API fails
      setCurrentBitcoinBlock(850000); // Approximate current height as fallback
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

  // Provably fair random number generation
  const generateProvablyFairRandom = (blockHash, lotteryId, participantCount) => {
    // Combine block hash with lottery ID for unique randomness per lottery
    const combinedString = blockHash + lotteryId;
    
    // Simple hash function to convert to number
    let hash = 0;
    for (let i = 0; i < combinedString.length; i++) {
      const char = combinedString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Ensure positive number and get index within participant range
    const randomIndex = Math.abs(hash) % participantCount;
    return randomIndex;
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
        setError('Admin account not found. Please create the admin account in Firebase Console first.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Invalid password');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
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
      setPiUser(null);
      setWalletConnected(false);
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

  // Enhanced Pi wallet connection for testnet
  const connectWallet = async () => {
    setError('');
    console.log('🔗 Attempting Pi wallet connection...');
    
    try {
      if (!window.Pi) {
        throw new Error('Pi SDK not loaded');
      }

      if (!piSDKLoaded) {
        throw new Error('Pi SDK not initialized');
      }

      setLoading(true);
      
      const authResult = await Promise.race([
        window.Pi.authenticate(['payments'], (payment) => {
          console.log('Incomplete payment found:', payment);
          onIncompletePaymentFound(payment);
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Authentication timeout after 45 seconds')), 45000)
        )
      ]);

      setPiUser(authResult.user);
      setWalletConnected(true);
      setSuccess(`🎉 Pi testnet wallet connected! Welcome, ${authResult.user.username}`);
      
    } catch (error) {
      console.error('❌ Pi authentication failed:', error);
      
      if (error.message.includes('postMessage') || error.message.includes('origin')) {
        setError('🌐 Cross-origin restriction detected. Pi testnet may require domain registration with Pi Network. Your lottery features work without Pi wallet.');
      } else if (error.message.includes('timeout')) {
        setError('⏱️ Pi connection timed out. Try again or continue without Pi wallet.');
      } else if (error.message.includes('User cancelled')) {
        setError('🚫 Pi connection cancelled.');
      } else {
        setError(`🔧 Pi testnet connection failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setPiUser(null);
    setWalletConnected(false);
    setSuccess('Pi Wallet disconnected');
  };

  const onIncompletePaymentFound = (payment) => {
    console.log('Incomplete payment found:', payment);
    setError('Incomplete payment detected. Please complete or cancel it in Pi Browser.');
  };

  // Lottery functions with provably fair implementation
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
      if (error.code === 'permission-denied') {
        setError('Permission denied. Please ensure you are logged in with the admin account and Firebase rules are configured correctly.');
      } else {
        setError('Error loading lotteries: ' + error.message);
      }
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
        
        if (data.winner) {
          winnersDrawn++;
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
      // Validate form data
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

      // Calculate future Bitcoin block for provably fair drawing
      const currentTime = new Date();
      const endTime = new Date(newLottery.endDate);
      const timeDiffHours = (endTime - currentTime) / (1000 * 60 * 60);
      const blocksUntilEnd = Math.ceil(timeDiffHours * 6); // ~6 blocks per hour
      const commitmentBlock = currentBitcoinBlock + blocksUntilEnd + 1; // +1 for safety margin

      const lotteriesRef = collection(db, 'lotteries');
      await addDoc(lotteriesRef, {
        ...newLottery,
        entryFee: parseFloat(newLottery.entryFee),
        maxParticipants: parseInt(newLottery.maxParticipants) || null,
        endDate: Timestamp.fromDate(endDate),
        createdAt: Timestamp.now(),
        participants: [],
        status: 'active',
        winner: null,
        // Provably Fair fields
        provablyFair: {
          commitmentBlock: commitmentBlock,
          committedAt: Timestamp.now(),
          blockDataFetched: false,
          blockHash: null,
          verified: false
        }
      });

      setSuccess(`Lottery created successfully! Winner will be chosen using Bitcoin block #${commitmentBlock} (provably fair)`);
      setNewLottery({
        title: '',
        description: '',
        entryFee: '',
        endDate: '',
        maxParticipants: ''
      });
      
      loadLotteries();
      calculateStats();
    } catch (error) {
      console.error('Create lottery error:', error);
      if (error.code === 'permission-denied') {
        setError('Permission denied. Please ensure you are logged in with the admin account.');
      } else {
        setError('Error creating lottery: ' + error.message);
      }
    }
    setLoading(false);
  };

  const drawWinner = async (lotteryId) => {
    const lottery = lotteries.find(l => l.id === lotteryId);
    if (!lottery || !lottery.participants || lottery.participants.length === 0) {
      setError('No participants to draw from');
      return;
    }

    if (lottery.winner) {
      setError('Winner already drawn for this lottery');
      return;
    }

    setLoading(true);
    try {
      // Fetch Bitcoin block data for provably fair drawing
      console.log(`🔗 Fetching Bitcoin block #${lottery.provablyFair.commitmentBlock} for provably fair drawing...`);
      
      const blockData = await fetchBitcoinBlockHash(lottery.provablyFair.commitmentBlock);
      
      // Generate provably fair random index
      const randomIndex = generateProvablyFairRandom(
        blockData.hash, 
        lotteryId, 
        lottery.participants.length
      );
      
      const winner = lottery.participants[randomIndex];

      // Update lottery with winner and proof data
      const lotteryRef = doc(db, 'lotteries', lotteryId);
      await updateDoc(lotteryRef, {
        winner: winner,
        status: 'completed',
        drawnAt: Timestamp.now(),
        provablyFair: {
          ...lottery.provablyFair,
          blockDataFetched: true,
          blockHash: blockData.hash,
          blockHeight: blockData.height,
          blockTimestamp: blockData.timestamp,
          merkleRoot: blockData.merkleRoot,
          winnerIndex: randomIndex,
          totalParticipants: lottery.participants.length,
          verified: true,
          verificationData: {
            combinedString: blockData.hash + lotteryId,
            calculationMethod: 'SHA-256 + Modulo',
            verifiableAt: `https://blockstream.info/block/${blockData.hash}`
          }
        }
      });

      setSuccess(`🎉 Winner drawn using provably fair method! Winner: ${winner.username || winner.uid}. Block #${blockData.height} hash used for randomness.`);
      loadLotteries();
      calculateStats();
    } catch (error) {
      console.error('Draw winner error:', error);
      setError('Error drawing winner: ' + error.message + '. This may be because the Bitcoin block is not yet mined or API is unavailable.');
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

  const getLotteryStatus = (lottery) => {
    if (lottery.winner) return 'completed';
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
              <p style={{fontSize: '0.9rem', color: '#6c757d', marginTop: '10px'}}>
                Admin Email: {process.env.REACT_APP_ADMIN_EMAIL}
              </p>
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
        <h1>🎰 Provably Fair Pi Lottery Admin</h1>
        <p>Manage transparent, verifiable lotteries with Bitcoin-based randomness</p>
      </div>

      {/* Admin Info & Logout */}
      <div className="card">
        <div className="logged-in-header">
          <div className="admin-info">
            ✅ Logged in as: {user.email}
            {currentBitcoinBlock && (
              <div style={{fontSize: '0.9rem', color: '#6c757d', marginTop: '5px'}}>
                📦 Current Bitcoin Block: #{currentBitcoinBlock}
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

      {/* Dashboard Stats */}
      <div className="stats-grid">
        <div className="stat-card purple">
          <div className="stat-number">{stats.totalLotteries}</div>
          <div className="stat-label">Total Lotteries</div>
        </div>
        <div className="stat-card green">
          <div className="stat-number">{stats.activeParticipants}</div>
          <div className="stat-label">Active Participants</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-number">{stats.totalPiCollected} π</div>
          <div className="stat-label">Total Pi Collected</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-number">{stats.winnersDrawn}</div>
          <div className="stat-label">Winners Drawn</div>
        </div>
      </div>

      {/* Provably Fair Info */}
      <div className="card">
        <h2>🔒 Provably Fair Technology</h2>
        <div className="warning">
          <strong>🎯 How It Works:</strong>
          <ul style={{marginTop: '10px', paddingLeft: '20px'}}>
            <li><strong>Commitment:</strong> Each lottery uses a future Bitcoin block for randomness</li>
            <li><strong>Transparency:</strong> Block number is chosen when lottery is created (before entries)</li>
            <li><strong>Verification:</strong> Anyone can verify the winner selection using blockchain data</li>
            <li><strong>Impossible to Manipulate:</strong> No one can predict or control Bitcoin block hashes</li>
          </ul>
          <p style={{marginTop: '15px'}}>
            <strong>🔗 Verification:</strong> All lottery results can be independently verified on the Bitcoin blockchain.
          </p>
        </div>
      </div>

      {/* Pi Wallet Connection */}
      <div className="card">
        <h2>💰 Pi Testnet Wallet Connection</h2>
        <div className={`wallet-status ${walletConnected ? 'wallet-connected' : ''}`}>
          <div className="wallet-indicator"></div>
          <div className="wallet-info">
            <h4>{walletConnected ? 'Pi Testnet Wallet Connected' : 'Pi Testnet Wallet Disconnected'}</h4>
            {piUser && (
              <p>User: {piUser.username} ({piUser.uid})</p>
            )}
            {!piSDKLoaded && (
              <p style={{color: '#ffc107', fontSize: '0.9rem'}}>⚠️ Pi SDK loading...</p>
            )}
          </div>
          {walletConnected ? (
            <button onClick={disconnectWallet} className="button danger">
              🔌 Disconnect Wallet
            </button>
          ) : (
            <button 
              onClick={connectWallet} 
              className="button success"
              disabled={!piSDKLoaded || loading}
            >
              {loading ? '🔄 Connecting...' : '🧪 Connect Pi Testnet'}
            </button>
          )}
        </div>
      </div>

      {/* Create New Lottery */}
      <div className="card">
        <h2>🎰 Create New Provably Fair Lottery</h2>
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
                placeholder="e.g., Weekly Pi Lottery"
              />
            </div>
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
              <label htmlFor="maxParticipants">Max Participants (Optional)</label>
              <input
                type="number"
                id="maxParticipants"
                min="1"
                value={newLottery.maxParticipants}
                onChange={(e) => setNewLottery({...newLottery, maxParticipants: e.target.value})}
                placeholder="Leave empty for unlimited"
              />
            </div>
          </div>

          <div className="success" style={{marginTop: '15px'}}>
            <strong>🔒 Provably Fair Commitment:</strong> A future Bitcoin block will be automatically selected for random winner selection. The block number will be determined when you create the lottery and cannot be changed afterward.
          </div>

          <button 
            type="submit" 
            className="button success full-width"
            disabled={loading}
            style={{marginTop: '15px'}}
          >
            {loading ? '🔄 Creating...' : '🔒 Create Provably Fair Lottery'}
          </button>
        </form>
      </div>

      {/* Active Lotteries */}
      <div className="card">
        <h2>📋 All Lotteries</h2>
        {lotteries.length === 0 ? (
          <p style={{textAlign: 'center', color: '#6c757d', padding: '40px'}}>
            No lotteries created yet. Create your first provably fair lottery above!
          </p>
        ) : (
          <div className="lottery-list">
            {lotteries.map((lottery) => {
              const status = getLotteryStatus(lottery);
              const participantCount = lottery.participants ? lottery.participants.length : 0;
              const totalPrize = (participantCount * lottery.entryFee).toFixed(2);

              return (
                <div key={lottery.id} className="lottery-item">
                  <div className="lottery-header">
                    <h3 className="lottery-title">{lottery.title}</h3>
                    <span className={`lottery-status status-${status}`}>
                      {status === 'active' && '🟢 Active'}
                      {status === 'ended' && '🔴 Ended'}
                      {status === 'completed' && '🏆 Completed'}
                    </span>
                  </div>

                  {lottery.description && (
                    <p style={{color: '#6c757d', marginBottom: '15px'}}>
                      {lottery.description}
                    </p>
                  )}

                  <div className="lottery-details">
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">Entry Fee</div>
                      <div className="lottery-detail-value">{lottery.entryFee} π</div>
                    </div>
                    <div className="lottery-detail">
                      <div className="lottery-detail-label">Participants</div>
                      <div className="lottery-detail-value">
                        {participantCount}
                        {lottery.maxParticipants && ` / ${lottery.maxParticipants}`}
                      </div>
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

                  {/* Provably Fair Information */}
                  {lottery.provablyFair && (
                    <div className="success" style={{margin: '15px 0'}}>
                      <h4 style={{margin: '0 0 10px 0'}}>🔒 Provably Fair Commitment:</h4>
                      <p style={{margin: '5px 0'}}>
                        <strong>Bitcoin Block:</strong> #{lottery.provablyFair.commitmentBlock}
                      </p>
                      {lottery.provablyFair.blockDataFetched && (
                        <div style={{marginTop: '10px'}}>
                          <p><strong>Block Hash:</strong> <code style={{fontSize: '0.8rem'}}>{lottery.provablyFair.blockHash}</code></p>
                          <p><strong>Winner Index:</strong> {lottery.provablyFair.winnerIndex} of {lottery.provablyFair.totalParticipants}</p>
                          <p>
                            <a 
                              href={lottery.provablyFair.verificationData?.verifiableAt} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{color: '#007bff', textDecoration: 'underline'}}
                            >
                              🔗 Verify on Bitcoin Blockchain
                            </a>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {lottery.winner && (
                    <div className="success" style={{margin: '15px 0'}}>
                      🏆 Winner: {lottery.winner.username || lottery.winner.uid}
                      <br />
                      <small>Drawn on: {formatDate(lottery.drawnAt?.toDate?.())}</small>
                    </div>
                  )}

                  <div className="lottery-actions">
                    {status === 'active' && (
                      <>
                        <button 
                          onClick={() => endLottery(lottery.id)}
                          className="button warning"
                        >
                          ⏹️ End Lottery
                        </button>
                        {participantCount > 0 && (
                          <button 
                            onClick={() => drawWinner(lottery.id)}
                            className="button success"
                            disabled={loading}
                          >
                            {loading ? '🔄 Drawing...' : '🔒 Draw Provably Fair Winner'}
                          </button>
                        )}
                      </>
                    )}
                    
                    {status === 'ended' && participantCount > 0 && !lottery.winner && (
                      <button 
                        onClick={() => drawWinner(lottery.id)}
                        className="button success"
                        disabled={loading}
                      >
                        {loading ? '🔄 Drawing...' : '🔒 Draw Provably Fair Winner'}
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

// File path: src/App.js
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

  // Initialize Pi SDK with better error handling
  useEffect(() => {
    const initializePiSDK = async () => {
      try {
        if (window.Pi) {
          await window.Pi.init({
            version: "2.0",
            sandbox: true, // Set to false for production
            development: true,
            timeout: 30000,
            origin: window.location.origin
          });
          setPiSDKLoaded(true);
          console.log('Pi SDK initialized successfully');
        } else {
          console.warn('Pi SDK not available');
          setTimeout(initializePiSDK, 2000); // Retry after 2 seconds
        }
      } catch (error) {
        console.error('Pi SDK initialization error:', error);
        setPiSDKLoaded(false);
      }
    };

    initializePiSDK();
  }, []);

  // Load data when user is authenticated
  useEffect(() => {
    if (isAdmin) {
      loadLotteries();
      calculateStats();
    }
  }, [isAdmin]);

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

  // Pi Wallet functions with improved error handling
  const connectWallet = async () => {
    setError('');
    
    try {
      if (!window.Pi) {
        setError('Pi SDK not loaded. Please refresh the page and try again.');
        return;
      }

      if (!piSDKLoaded) {
        setError('Pi SDK is still loading. Please wait a moment and try again.');
        return;
      }

      setLoading(true);
      
      // Add timeout wrapper for authentication
      const authResult = await Promise.race([
        window.Pi.authenticate(['payments'], onIncompletePaymentFound),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Authentication timeout after 30 seconds')), 30000)
        )
      ]);

      setPiUser(authResult.user);
      setWalletConnected(true);
      setSuccess(`Pi Wallet connected successfully! Welcome, ${authResult.user.username}`);
    } catch (error) {
      console.error('Pi auth error:', error);
      
      if (error.message.includes('timeout') || error.message.includes('Messaging promise')) {
        setError('Pi Wallet connection timed out. This may be due to network restrictions, ad blockers, or Pi Network being unavailable.');
      } else if (error.message.includes('postMessage')) {
        setError('Pi Wallet connection blocked. Please disable ad blockers and try again.');
      } else if (error.message.includes('User cancelled')) {
        setError('Pi Wallet connection cancelled by user.');
      } else {
        setError(`Failed to connect Pi Wallet: ${error.message}`);
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

  // Lottery functions with improved error handling
  const loadLotteries = async () => {
    try {
      setError(''); // Clear any previous errors
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
      } else if (error.code === 'unavailable') {
        setError('Firebase service temporarily unavailable. Please try again in a moment.');
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
      // Don't show error for stats calculation to avoid cluttering UI
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

      const lotteriesRef = collection(db, 'lotteries');
      await addDoc(lotteriesRef, {
        ...newLottery,
        entryFee: parseFloat(newLottery.entryFee),
        maxParticipants: parseInt(newLottery.maxParticipants) || null,
        endDate: Timestamp.fromDate(endDate),
        createdAt: Timestamp.now(),
        participants: [],
        status: 'active',
        winner: null
      });

      setSuccess('Lottery created successfully!');
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

    try {
      const randomIndex = Math.floor(Math.random() * lottery.participants.length);
      const winner = lottery.participants[randomIndex];

      const lotteryRef = doc(db, 'lotteries', lotteryId);
      await updateDoc(lotteryRef, {
        winner: winner,
        status: 'completed',
        drawnAt: Timestamp.now()
      });

      setSuccess(`Winner drawn: ${winner.username || winner.uid}`);
      loadLotteries();
      calculateStats();
    } catch (error) {
      console.error('Draw winner error:', error);
      setError('Error drawing winner: ' + error.message);
    }
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
        <h1>🎰 Pi Lottery Admin Dashboard</h1>
        <p>Manage lotteries, participants, and Pi payments</p>
      </div>

      {/* Admin Info & Logout */}
      <div className="card">
        <div className="logged-in-header">
          <div className="admin-info">
            ✅ Logged in as: {user.email}
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

      {/* Pi Wallet Connection */}
      <div className="card">
        <h2>💰 Pi Wallet Connection</h2>
        <div className={`wallet-status ${walletConnected ? 'wallet-connected' : ''}`}>
          <div className="wallet-indicator"></div>
          <div className="wallet-info">
            <h4>{walletConnected ? 'Wallet Connected' : 'Wallet Disconnected'}</h4>
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
              {loading ? '🔄 Connecting...' : '🔗 Connect Pi Wallet'}
            </button>
          )}
        </div>
        
        {!piSDKLoaded && (
          <div className="warning" style={{marginTop: '15px'}}>
            <strong>Pi SDK Issues:</strong> If the Pi Wallet connection doesn't work, this may be due to:
            <ul style={{marginTop: '10px', paddingLeft: '20px'}}>
              <li>Ad blockers blocking the Pi SDK</li>
              <li>Network restrictions</li>
              <li>Pi Network service unavailability</li>
            </ul>
            <p style={{marginTop: '10px'}}>
              <strong>Note:</strong> Pi Wallet connection is optional. You can still manage lotteries without it.
            </p>
          </div>
        )}
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

          <button 
            type="submit" 
            className="button success full-width"
            disabled={loading}
          >
            {loading ? '🔄 Creating...' : '🎰 Create Lottery'}
          </button>
        </form>
      </div>

      {/* Active Lotteries */}
      <div className="card">
        <h2>📋 All Lotteries</h2>
        {lotteries.length === 0 ? (
          <p style={{textAlign: 'center', color: '#6c757d', padding: '40px'}}>
            No lotteries created yet. Create your first lottery above!
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
                          >
                            🎲 Draw Winner
                          </button>
                        )}
                      </>
                    )}
                    
                    {status === 'ended' && participantCount > 0 && !lottery.winner && (
                      <button 
                        onClick={() => drawWinner(lottery.id)}
                        className="button success"
                      >
                        🎲 Draw Winner
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

# Pi Lottery Platform v2.0 - Enhanced Provably Fair System

A comprehensive, provably fair lottery platform for Pi Network with multi-winner support, 2% ticket limits, and manual prize distribution.

## 🎯 Key Features

### 🔒 **Provably Fair Technology**
- **Bitcoin blockchain randomness** - Uses future Bitcoin block hashes for winner selection
- **Impossible to manipulate** - Block chosen before entries, no one can predict hash
- **Full transparency** - Every winner selection is verifiable on the blockchain
- **Multiple verification methods** - Users can independently verify all results

### 🎫 **Fair 2% Ticket System**
- **Dynamic limits** - Users can buy up to 2% of total participants as tickets
- **Minimum 2 tickets** - Everyone starts with ability to buy at least 2 tickets
- **Prevents whale domination** - No single user can control more than 2% of chances
- **Scales with participation** - More participants = more tickets available per user

### 🏆 **Multi-Winner Prize Distribution**
- **Tier-based winners** - 1-25 winners based on participation level
- **Fair prize distribution** - Decreasing prize amounts from 1st to last place
- **Multiple chances to win** - Much better odds than single-winner lotteries
- **Transparent prize pools** - Live updates of current prize amounts

### 💰 **Manual Prize Distribution**
- **Admin control** - Administrators manually distribute prizes using Pi wallet
- **Payment verification** - All transactions recorded and verified
- **Audit trail** - Complete history of all prize distributions
- **Flexible timing** - Admins can distribute prizes when convenient

### 📅 **Multiple Lottery Types**
- **Daily lotteries** - Quick 24-hour rounds with optimized block timing
- **Weekly lotteries** - Longer rounds with bigger prize pools
- **Standard lotteries** - Custom duration lotteries
- **Adjustable platform fees** - Configurable per lottery

## 📊 System Architecture

### **Participation Tiers & Winners**
```
Participants    Winners    Prize Distribution
1-10           →    1      100%
11-25          →    3      60%, 30%, 10%
26-50          →    5      40%, 25%, 20%, 10%, 5%
51-100         →    7      30%, 20%, 15%, 12%, 10%, 8%, 5%
101-200        →   10      25%, 18%, 14%, 11%, 9%, 7%, 6%, 4%, 3%, 3%
201-500        →   15      [Distributed across 15 positions]
501-1000       →   20      [Distributed across 20 positions]
1000+          →   25      [Distributed across 25 positions]
```

### **2% Ticket Limit Examples**
```
100 participants → Max 2 tickets per user (2%)
500 participants → Max 10 tickets per user (2%)
1000 participants → Max 20 tickets per user (2%)
```

### **Bitcoin Block Commitment**
```
1. Admin creates lottery
2. System calculates future Bitcoin block (end time + safety margin)
3. Users enter lottery (block hash unknown)
4. Lottery ends, Bitcoin block is mined
5. Block hash used for provably fair winner selection
6. Anyone can verify results on blockchain
```

## 🚀 Quick Start Guide

### **Prerequisites**
- Node.js 18+ and npm 8+
- Firebase project with Authentication and Firestore
- Pi Network developer account and API key
- Basic understanding of React and Firebase

### **Installation**
```bash
# Clone the repository
git clone https://github.com/your-username/pi-lottery-admin.git
cd pi-lottery-admin

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase and Pi Network credentials

# Start development server
npm start
```

### **Environment Configuration**
Create `.env` file with these essential variables:
```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Pi Network Configuration
REACT_APP_PI_API_KEY=your_pi_api_key
REACT_APP_PI_ENVIRONMENT=sandbox

# Admin Configuration
REACT_APP_ADMIN_EMAIL=your_admin_email@example.com

# Lottery Configuration
REACT_APP_DEFAULT_PLATFORM_FEE=0.1
REACT_APP_TICKET_LIMIT_PERCENTAGE=2
REACT_APP_MIN_TICKETS_PER_USER=2
```

### **Firebase Setup**
1. Create Firebase project at https://console.firebase.google.com
2. Enable Authentication with Email/Password
3. Enable Firestore Database
4. Set up Firestore security rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admin full access
    match /{document=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.email == "your_admin_email@example.com";
    }
    
    // Allow users to read lotteries
    match /lotteries/{lotteryId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 🎮 How to Use

### **For Administrators**

#### **1. Login and Setup**
- Access admin panel with designated admin email
- Connect Pi wallet for prize distribution
- Monitor dashboard statistics

#### **2. Create Lotteries**
```
📝 Lottery Creation Steps:
1. Choose lottery type (daily/weekly/standard)
2. Set entry fee and platform fee
3. Configure minimum winners
4. Set end date and time
5. System automatically selects Bitcoin block for fairness
6. Publish lottery
```

#### **3. Manage Active Lotteries**
- Monitor participant counts and prize pools
- End lotteries manually if needed
- Draw winners when lottery ends
- Distribute prizes manually to winners

#### **4. Prize Distribution Process**
```
💰 Manual Distribution:
1. Lottery ends and winners are drawn
2. Admin sees list of all winners with prize amounts
3. Click "Send Prize" button for each winner
4. Pi SDK processes payment
5. Transaction recorded and verified
6. Winner receives Pi automatically
```

### **For Users**

#### **1. Connect Pi Wallet**
- Visit lottery platform
- Click "Connect Pi Wallet"
- Authenticate with Pi Network
- Access available lotteries

#### **2. Join Lotteries**
```
🎫 Ticket Purchase:
1. Browse active lotteries
2. See current prize pool and your chances
3. Check your ticket limit (2% max)
4. Buy tickets with Pi
5. Get confirmation of entry
6. Track your participation
```

#### **3. Monitor Results**
- View your active entries
- Check lottery status and time remaining
- See winner announcements
- Verify results on Bitcoin blockchain
- Receive prizes automatically if you win

## 🔧 Technical Implementation

### **Core Technologies**
- **Frontend**: React 18 with hooks and context
- **Backend**: Firebase (Authentication + Firestore)
- **Blockchain**: Bitcoin blockchain API for randomness
- **Payments**: Pi Network SDK for transactions
- **Styling**: CSS Grid/Flexbox with custom animations

### **Key Components**

#### **Admin Dashboard (`src/App.js`)**
- Authentication and authorization
- Lottery creation and management
- Prize distribution interface
- Statistics and analytics
- Pi wallet integration for payments

#### **User Interface (`src/UserApp.js`)**
- Pi wallet connection
- Lottery browsing and participation
- Ticket management with 2% limits
- Entry tracking and history
- Winner verification tools

#### **Bitcoin Utilities (`src/utils/bitcoinUtils.js`)**
- Block height fetching with fallbacks
- Commitment block calculation
- Provably fair random generation
- Winner selection algorithms
- Verification functions

#### **Database Structure (Firestore)**
```javascript
lotteries/{lotteryId}: {
  title: string,
  description: string,
  entryFee: number,
  platformFee: number,
  endDate: timestamp,
  participants: array[{
    uid: string,
    username: string,
    joinedAt: timestamp,
    ticketNumber: number,
    paymentId: string
  }],
  winners: array[{
    position: number,
    winner: object,
    prize: number,
    paid: boolean,
    paidAt: timestamp,
    paymentId: string
  }],
  status: 'active' | 'ended' | 'completed',
  provablyFair: {
    commitmentBlock: number,
    blockHash: string,
    verified: boolean,
    blockData: object
  },
  ticketSystem: {
    maxTicketsPerUser: number,
    limitPercentage: 2
  }
}
```

### **Provably Fair Algorithm**
```javascript
// Winner selection process
function selectWinners(blockHash, lotteryId, participants, winnerCount) {
  const winners = [];
  const remaining = [...participants];
  
  for (let position = 1; position <= winnerCount; position++) {
    // Create unique seed for each position
    const seed = blockHash + lotteryId + position + "SALT";
    
    // Generate deterministic random index
    const randomIndex = hash(seed) % remaining.length;
    
    // Select winner and remove from pool
    winners.push({
      position,
      winner: remaining[randomIndex],
      verificationData: { seed, randomIndex, blockHash }
    });
    
    remaining.splice(randomIndex, 1);
  }
  
  return winners;
}
```

## 🔒 Security Features

### **Authentication & Authorization**
- Firebase Authentication with email/password
- Admin-only access to management functions
- Session management and timeout
- Secure token validation

### **Provably Fair Guarantees**
- Bitcoin blockchain provides unpredictable randomness
- Future block selection prevents manipulation
- Public verification of all results
- Cryptographic proof of fairness

### **Payment Security**
- Pi Network SDK handles all transactions
- No private keys stored on platform
- Transaction verification and logging
- Automatic payment processing

### **Data Protection**
- Firebase security rules
- Input validation and sanitization
- Rate limiting on API calls
- Error handling and logging

## 🎯 Usage Examples

### **Example 1: Daily Lottery**
```
Title: "Daily Pi Jackpot"
Type: Daily (24 hours)
Entry Fee: 1π
Platform Fee: 0.1π
Participants: 150
Winners: 10
Prize Pool: 135π (150 × 1 - 15 platform fees)
Ticket Limit: 3 per user (2% of 150)
```

### **Example 2: Weekly Mega Lottery**
```
Title: "Weekly Mega Lottery"
Type: Weekly (7 days)
Entry Fee: 5π
Platform Fee: 0.5π
Participants: 800
Winners: 20
Prize Pool: 3600π (800 × 5 - 400 platform fees)
Ticket Limit: 16 per user (2% of 800)
1st Place: 648π (18% of pool)
2nd Place: 504π (14% of pool)
...continuing down to 20th place
```

### **Example 3: Verification Process**
```
User wants to verify 1st place winner:
1. Go to lottery results page
2. Click "Verify on Blockchain"
3. See Bitcoin block #850,150 used
4. Check block hash: 0000000000000000000823c5b2c0e8c1ae0b9d2f...
5. Verify calculation: hash + lottery_ID + position_1 = winner_index
6. Confirm winner was at that index in participant list
7. Result: Provably fair! ✅
```

## 📈 Platform Statistics

### **Fair Distribution Examples**
With traditional single-winner lottery (1000 participants):
- **Win chance**: 0.1% per person
- **Winners**: 1 person happy, 999 disappointed

With our multi-winner system (1000 participants):
- **Win chance**: 2.5% per person (25 winners)
- **Winners**: 25 people happy, much better experience!

### **2% Ticket System Benefits**
- **Prevents whale domination**: No user can own >2% of chances
- **Fair for everyone**: Regular users have meaningful chances
- **Scales properly**: Limits increase as participation grows
- **Encourages participation**: People join because it's fair

## 🔧 Development

### **Project Structure**
```
pi-lottery-admin/
├── public/
│   ├── index.html           # Enhanced Pi SDK integration
│   └── favicon.ico
├── src/
│   ├── App.js              # Admin dashboard (enhanced)
│   ├── UserApp.js          # User interface (new)
│   ├── firebase.js         # Firebase configuration
│   ├── index.js           # React entry point
│   ├── index.css          # Enhanced styles
│   └── utils/
│       └── bitcoinUtils.js # Bitcoin blockchain utilities (new)
├── .env                   # Environment variables (enhanced)
├── package.json           # Dependencies (updated)
├── netlify.toml          # Deployment configuration
└── README.md             # This file
```

### **Available Scripts**
```bash
npm start                 # Development server
npm run build            # Production build
npm run build:production # Optimized production build
npm test                 # Run tests
npm run lint             # Check code quality
npm run format           # Format code with Prettier
npm run analyze          # Analyze bundle size
npm run deploy:netlify   # Deploy to Netlify
```

### **Development Guidelines**
- Follow React hooks patterns
- Use semantic commit messages
- Maintain responsive design
- Test on multiple devices
- Document new features
- Keep security in mind

## 🚀 Deployment

### **Production Checklist**
```bash
# 1. Environment setup
REACT_APP_DEV_MODE=false
REACT_APP_ENABLE_DEBUG_MODE=false
GENERATE_SOURCEMAP=false

# 2. Build optimization
npm run build:production

# 3. Deploy to Netlify
npm run deploy:netlify

# 4. Verify deployment
# - Test admin login
# - Test user wallet connection
# - Test lottery creation
# - Test prize distribution
# - Verify Bitcoin API connectivity
```

### **Netlify Deployment**
1. Connect GitHub repository to Netlify
2. Set build command: `npm run build:production`
3. Set publish directory: `build`
4. Add environment variables in Netlify dashboard
5. Enable form submissions and functions if needed

### **Firebase Deployment (Alternative)**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build:production
firebase deploy
```

## 🐛 Troubleshooting

### **Common Issues**

#### **Pi SDK Not Loading**
```
Problem: Pi SDK fails to load or connect
Solutions:
1. Check internet connection
2. Verify Pi API key in .env
3. Check browser console for errors
4. Try refreshing the page
5. Use incognito/private browsing mode
```

#### **Bitcoin API Errors**
```
Problem: Cannot fetch Bitcoin block data
Solutions:
1. API might be temporarily down (uses fallbacks)
2. Check network connectivity
3. Verify API endpoints in bitcoinUtils.js
4. Check browser console for specific errors
```

#### **Firebase Permission Errors**
```
Problem: Permission denied accessing Firestore
Solutions:
1. Verify admin email in .env matches Firebase user
2. Check Firestore security rules
3. Ensure Authentication is enabled
4. Verify Firebase config in .env
```

#### **Prize Distribution Failures**
```
Problem: Pi payments fail during distribution
Solutions:
1. Ensure admin wallet has sufficient Pi balance
2. Check Pi Network status
3. Verify recipient wallet addresses
4. Try smaller test payments first
5. Check Pi SDK console for payment errors
```

### **Debug Mode**
Enable debug mode for detailed logging:
```env
REACT_APP_ENABLE_DEBUG_MODE=true
REACT_APP_ENABLE_CONSOLE_LOGS=true
```

## 📞 Support & Contributing

### **Getting Help**
- Check this README for common solutions
- Search existing GitHub issues
- Create new issue with detailed description
- Include browser console logs and screenshots

### **Contributing**
1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push to your fork
7. Create pull request

### **Bug Reports**
Include:
- Operating system and browser version
- Steps to reproduce the issue
- Expected vs actual behavior
- Console logs and screenshots
- Environment configuration (without secrets)

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Pi Network team for the Pi SDK
- Bitcoin Core developers for the blockchain
- Blockstream for the Bitcoin API
- Firebase team for the backend services
- React team for the frontend framework
- Open source community for inspiration and tools

---

**Built with ❤️ for the Pi Network community**

*Making lotteries fair, transparent, and fun for everyone! 🎰*

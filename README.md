# Pi Lottery Admin Dashboard

A simple, single-page React application for managing Pi Network lotteries.

## 📁 Project Structure

```
pi-lottery-admin/
├── public/
│   └── index.html           # Main HTML file with Pi SDK
├── src/
│   ├── App.js              # Main component with all functionality
│   ├── firebase.js         # Firebase configuration
│   ├── index.js           # React entry point
│   └── index.css          # All styles
├── .env                   # Environment variables
├── package.json           # Dependencies
└── README.md              # This file
```

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory with your Firebase and Pi Network credentials:

```env
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_PI_API_KEY=your_pi_api_key
REACT_APP_ADMIN_EMAIL=your_admin_email@example.com
```

### 3. Firebase Setup
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password)
3. Enable Firestore Database
4. Copy your config values to the `.env` file

### 4. Run the Application
```bash
npm start
```

The app will open at `http://localhost:3000`

## 🎯 Features

### 🔒 Admin Authentication
- Secure login with email/password
- Only designated admin email can access
- Session management with Firebase Auth

### 📊 Dashboard Stats
- Total lotteries created
- Active participants across all lotteries
- Total Pi collected
- Winners drawn count

### 🎰 Lottery Management
- Create new lotteries with customizable:
  - Title and description
  - Entry fee in Pi
  - End date/time
  - Maximum participants (optional)
- View all active and completed lotteries
- End lotteries manually
- Draw random winners
- Track participation and prize pools

### 💰 Pi Wallet Integration
- Connect/disconnect Pi wallet
- Authentication with Pi SDK
- Ready for payment processing

### 📱 Responsive Design
- Works on desktop, tablet, and mobile
- Clean, modern interface
- Intuitive single-page layout

## 🛠️ Technical Details

### Built With
- **React 18** - Frontend framework
- **Firebase** - Authentication and database
- **Pi SDK** - Pi Network integration
- **CSS Grid/Flexbox** - Responsive layout

### Database Structure (Firestore)
```
lotteries/
├── {lotteryId}/
│   ├── title: string
│   ├── description: string
│   ├── entryFee: number
│   ├── endDate: timestamp
│   ├── maxParticipants: number (optional)
│   ├── participants: array
│   ├── status: 'active' | 'ended' | 'completed'
│   ├── winner: object (when drawn)
│   ├── createdAt: timestamp
│   └── drawnAt: timestamp (when winner drawn)
```

## 🎮 How to Use

### Admin Access
1. Navigate to the app
2. Login with the admin email configured in `.env`
3. Access the full dashboard

### Creating Lotteries
1. Fill out the "Create New Lottery" form
2. Set entry fee, end date, and optional max participants
3. Click "Create Lottery"

### Managing Lotteries
1. View all lotteries in the list below
2. See real-time participant counts and prize pools
3. End lotteries manually or let them expire
4. Draw winners randomly from participants

### Pi Wallet
1. Click "Connect Pi Wallet" to authenticate
2. Required for processing payments (future feature)
3. Displays connected user information

## 🔧 Customization

### Styling
- All styles are in `src/index.css`
- Easy to modify colors, spacing, and layout
- CSS custom properties for theme colors

### Configuration
- Admin email in `.env` file
- Firebase settings in `src/firebase.js`
- Pi SDK settings in `src/App.js`

## 🚀 Deployment

### Netlify (Recommended)
1. Push code to GitHub
2. Connect repository to Netlify
3. Set environment variables in Netlify dashboard
4. Auto-deploy on git push

### Manual Build
```bash
npm run build
# Upload 'build' folder to any static host
```

## 🔒 Security Notes

- Admin access restricted to designated email
- Firebase security rules should be configured
- Pi payments require proper validation
- Environment variables keep secrets secure

## 📝 Development Notes

- Single-page design for simplicity
- All state managed with React hooks
- No external state management needed
- Minimal dependencies for easier maintenance

## 🐛 Troubleshooting

### Common Issues
1. **Pi SDK not loading**: Check internet connection and Pi SDK URL
2. **Firebase errors**: Verify config in `.env` file
3. **Admin access denied**: Confirm email matches `REACT_APP_ADMIN_EMAIL`
4. **Styling issues**: Clear browser cache and reload

### Debug Mode
- Open browser dev tools
- Check console for Firebase/Pi SDK errors
- Verify network requests in Network tab

## 📈 Future Enhancements

- [ ] Automatic payment processing with Pi SDK
- [ ] Email notifications for winners
- [ ] Lottery templates and scheduling
- [ ] Advanced analytics and reporting
- [ ] Multi-admin support
- [ ] Participant management interface

## 📞 Support

For issues or questions:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Ensure Firebase project is properly configured
4. Test Pi wallet connection

---

**Built for simplicity and effectiveness** 🎯

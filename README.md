# Pi Lottery Admin Platform

**FILE PATH: /README.md**  
**DESCRIPTION: Complete setup and deployment guide**

A secure, admin-only lottery management system with Pi Network integration for cryptocurrency prize distribution.

## 🚀 Quick Start

### 1. **Upload Files to GitHub**
```
pi-lottery-admin/
├── index.html                 # ✅ Main admin webpage
├── firestore.rules           # ✅ Database security rules  
├── storage.rules             # ✅ Storage security rules
├── firebase.json             # ✅ Firebase configuration
├── .env                      # ✅ Environment variables template
├── functions/
│   ├── index.js              # ✅ Cloud Functions code
│   └── package.json          # ✅ Functions dependencies
└── README.md                 # ✅ This file
```

### 2. **Firebase Console Setup**

#### A. Deploy Security Rules
1. **Firestore Rules:**
   - Go to Firebase Console → Firestore Database → Rules
   - Copy content from `firestore.rules` file
   - Click "Publish"

2. **Storage Rules:**
   - Go to Firebase Console → Storage → Rules  
   - Copy content from `storage.rules` file
   - Click "Publish"

#### B. Create Admin User
1. **Authentication:**
   - Go to Firebase Console → Authentication → Users
   - Click "Add user"
   - Email: `yursccc@gmail.com` (or your preferred admin email)
   - Password: Create a secure password
   - **Copy the User UID**

2. **Admin Collection:**
   - Go to Firestore Database → Data
   - Create collection: `admin_users`
   - Document ID: Paste the User UID from step above
   - Add fields:
     ```
     isAdmin: boolean → true
     email: string → yursccc@gmail.com
     permissions: array → ["manage_lottery", "conduct_drawing", "distribute_prizes"]
     createdAt: timestamp → [current time]
     createdBy: string → system
     ```

### 3. **Deploy Cloud Functions**

#### Option 1: Firebase CLI (Recommended)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Clone your repository
git clone your-github-repo-url
cd pi-lottery-admin

# Login to Firebase
firebase login

# Initialize project (if not done)
firebase init functions
# - Select existing project: pi-lottery-901c4
# - Language: JavaScript
# - ESLint: Yes
# - Install dependencies: Yes

# Deploy functions
cd functions
npm install
cd ..
firebase deploy --only functions
```

#### Option 2: Local Upload
1. Download your repository files
2. Follow Firebase CLI steps above locally
3. Deploy from your local machine

### 4. **Deploy Admin Webpage**

#### Option 1: Netlify (Current Setup)
- ✅ **Already configured!** Your environment variables are set
- Upload `index.html` to your GitHub repository
- Netlify will automatically deploy

#### Option 2: Firebase Hosting
```bash
# Initialize hosting
firebase init hosting
# - Public directory: public
# - Single page app: Yes

# Move index.html to public directory
mkdir public
cp index.html public/

# Deploy
firebase deploy --only hosting
```

### 5. **Test Your Setup**

1. **Access Admin Panel:**
   - Visit your Netlify URL or Firebase hosting URL
   - Should see the login screen

2. **Test Login:**
   - Email: ``
   - Password: [the password you created]
   - Should see admin dashboard after login

3. **Test Pi Wallet (Optional):**
   - Open in Pi Browser
   - Click "Connect Pi Wallet"
   - Should prompt for Pi authentication

## 🔧 Configuration

### Firebase Project Settings
- **Project ID:** `pi-lottery-901c4`
- **Region:** Your selected region
- **Billing:** Blaze plan (required for Cloud Functions)

### Environment Variables (Already Set in Netlify)
```bash
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_PI_API_KEY=
REACT_APP_PI_SANDBOX=true
REACT_APP_ADMIN_EMAIL=
```

## 🎯 Features

### Admin Functions
- ✅ **Secure Admin Authentication**
- ✅ **Pi Wallet Integration**
- ✅ **Lottery Creation & Management**  
- ✅ **Provably Fair Drawing System**
- ✅ **Manual Prize Distribution**
- ✅ **Real-time Dashboard**
- ✅ **Activity Monitoring**

### Security Features
- ✅ **Admin-only access controls**
- ✅ **Firestore security rules**
- ✅ **Pi Network SDK integration**
- ✅ **Encrypted transaction handling**
- ✅ **Audit logging**

## 🛠️ Development

### Local Development
```bash
# Install dependencies
npm install -g firebase-tools

# Start emulators
firebase emulators:start

# Test functions locally
firebase functions:shell
```

### Deploy Updates
```bash
# Deploy everything
firebase deploy

# Deploy specific components
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only hosting
```

## 🔐 Security

### Admin Security
- **Strong passwords required**
- **Admin verification in Firestore rules**
- **Pi wallet authentication required**
- **Session-based authentication**

### Data Security
- **Firestore security rules protect all data**
- **Storage rules prevent unauthorized access**
- **Cloud Functions validate admin permissions**
- **No sensitive data in client code**

### Pi Network Security
- **No private keys stored**
- **Pi SDK handles all wallet operations**
- **Transaction verification through Pi Network**
- **Payment confirmation required**

## 📊 Usage

### Creating a Lottery
1. **Login as admin**
2. **Connect Pi wallet**
3. **Fill lottery configuration:**
   - Entry fee (π)
   - Platform fee (π)
   - Max tickets per user
   - Minimum participants
   - Drawing time
4. **Click "Create Lottery"**

### Conducting Drawing
1. **Select active lottery**
2. **Verify minimum participants met**
3. **Click "Conduct Drawing"**
4. **Confirm action**
5. **Winners selected using provably fair algorithm**

### Distributing Prizes
1. **View pending winners**
2. **Click "Send Prize" for each winner**
3. **Pi SDK opens payment interface**
4. **Confirm transaction in Pi wallet**
5. **System records transaction**

## 🚨 Troubleshooting

### Common Issues

**Login fails:**
- Verify admin user exists in `admin_users` collection
- Check `isAdmin: true` field is set
- Ensure Firestore rules are deployed

**Pi wallet won't connect:**
- Must be running in Pi Browser
- Check Pi SDK initialization
- Verify Pi API key is valid

**Functions not working:**
- Ensure Firebase project is on Blaze plan
- Check functions are deployed: `firebase functions:list`
- View logs: `firebase functions:log`

**Rules errors:**
- Test rules in Firebase Console Rules Playground
- Ensure admin user has proper permissions
- Check rule syntax for errors

### Support
- Check Firebase Console for error logs
- Review browser console for client errors  
- Test security rules in Firebase simulator
- Monitor Cloud Functions logs

## 📈 Monitoring

### Admin Dashboard
- Real-time lottery statistics
- Participant counts and prize pools
- Recent activity feed
- Pending prize distributions

### Firebase Console
- Authentication users
- Firestore data
- Cloud Functions logs
- Security rule violations

### Pi Network Integration
- Transaction confirmations
- Payment processing status
- Wallet connection monitoring
- Prize distribution tracking

---

## 🎉 Your Platform is Ready!

1. ✅ **Firebase configured**
2. ✅ **Security rules deployed**  
3. ✅ **Admin user created**
4. ✅ **Environment variables set**
5. ✅ **Admin webpage ready**

**Next Steps:**
1. Deploy Cloud Functions
2. Test admin login
3. Create your first lottery
4. Start managing Pi lottery operations!

For additional support, check the Firebase documentation or review the troubleshooting section above.

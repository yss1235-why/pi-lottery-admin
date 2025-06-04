// File path: src/firebase.js - Secure Firebase Configuration with Environment Variables
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Validate required environment variables
const validateConfig = () => {
  const requiredVars = [
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required Firebase environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all Firebase configuration variables are set.'
    );
  }
};

// Validate configuration before proceeding
try {
  validateConfig();
} catch (error) {
  console.error('🚨 Firebase Configuration Error:', error.message);
  throw error;
}

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  ...(process.env.REACT_APP_FIREBASE_MEASUREMENT_ID && {
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
  })
};

// Log configuration status (without sensitive data)
const logConfigStatus = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  const useEmulator = process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true';
  
  console.log('🔧 Firebase Configuration:', {
    projectId: firebaseConfig.projectId,
    environment: process.env.NODE_ENV,
    authDomain: firebaseConfig.authDomain,
    useEmulator: isDevelopment && useEmulator,
    configComplete: true
  });
  
  if (isDevelopment && process.env.REACT_APP_ENABLE_DEBUG_MODE === 'true') {
    console.log('🔍 Firebase Debug Info:', {
      hasApiKey: !!firebaseConfig.apiKey,
      hasAppId: !!firebaseConfig.appId,
      hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
      storageBucket: firebaseConfig.storageBucket
    });
  }
};

// Initialize Firebase app
let app;
try {
  app = initializeApp(firebaseConfig);
  logConfigStatus();
  console.log('✅ Firebase app initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || 'us-central1');

// Configure emulators for development
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true') {
  try {
    const authPort = parseInt(process.env.REACT_APP_FIREBASE_AUTH_EMULATOR_PORT) || 9099;
    const firestorePort = parseInt(process.env.REACT_APP_FIREBASE_FIRESTORE_EMULATOR_PORT) || 8080;
    const functionsPort = parseInt(process.env.REACT_APP_FIREBASE_FUNCTIONS_EMULATOR_PORT) || 5001;
    
    // Connect to emulators
    connectAuthEmulator(auth, `http://localhost:${authPort}`);
    connectFirestoreEmulator(db, 'localhost', firestorePort);
    connectFunctionsEmulator(functions, 'localhost', functionsPort);
    
    console.log('🔧 Firebase emulators connected:', {
      auth: `localhost:${authPort}`,
      firestore: `localhost:${firestorePort}`,
      functions: `localhost:${functionsPort}`
    });
  } catch (emulatorError) {
    console.warn('⚠️ Firebase emulator connection failed:', emulatorError.message);
    console.log('Continuing with live Firebase services...');
  }
}

// Export Firebase services
export { auth, db, functions };

// Export Firebase app instance
export default app;

// Export configuration utilities
export const getFirebaseConfig = () => {
  return {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    // Don't expose sensitive config data
    environment: process.env.NODE_ENV,
    region: process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || 'us-central1',
    emulatorEnabled: process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true'
  };
};

// Export health check utility
export const checkFirebaseHealth = async () => {
  try {
    // Test Firestore connection
    await db.app.name;
    
    // Test Auth connection
    await auth.app.name;
    
    // Test Functions connection (if available)
    const functionsRegion = functions.region;
    
    console.log('✅ Firebase health check passed:', {
      firestore: 'connected',
      auth: 'connected',
      functions: `connected (${functionsRegion})`,
      timestamp: new Date().toISOString()
    });
    
    return {
      status: 'healthy',
      services: {
        firestore: true,
        auth: true,
        functions: true
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Firebase health check failed:', error);
    
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Export environment-specific configurations
export const getEnvironmentInfo = () => {
  return {
    nodeEnv: process.env.NODE_ENV,
    buildVersion: process.env.REACT_APP_BUILD_VERSION,
    deploymentEnv: process.env.REACT_APP_DEPLOYMENT_ENV,
    debugMode: process.env.REACT_APP_ENABLE_DEBUG_MODE === 'true',
    piEnvironment: process.env.REACT_APP_PI_ENVIRONMENT,
    platformName: process.env.REACT_APP_PLATFORM_NAME
  };
};

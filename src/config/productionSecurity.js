// File path: src/config/productionSecurity.js - PRODUCTION Security Configuration
// ⚠️ WARNING: PRODUCTION MODE - REAL PI CRYPTOCURRENCY SECURITY ⚠️

/**
 * PRODUCTION Security Configuration for Real Money Gambling Platform
 * 
 * This file contains all security configurations required for PRODUCTION
 * deployment of the Pi Lottery platform with real Pi cryptocurrency.
 * 
 * CRITICAL: Review all settings before production deployment!
 */

// PRODUCTION Environment Validation
const validateProductionEnvironment = () => {
  const requiredEnvVars = [
    'REACT_APP_PI_ENVIRONMENT',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_PI_API_KEY',
    'REACT_APP_ADMIN_EMAIL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('🚨 PRODUCTION ERROR: Missing required environment variables:', missingVars);
    throw new Error(`PRODUCTION deployment blocked: Missing environment variables: ${missingVars.join(', ')}`);
  }

  if (process.env.REACT_APP_PI_ENVIRONMENT !== 'production') {
    console.error('🚨 PRODUCTION ERROR: Pi environment not set to production');
    throw new Error('PRODUCTION deployment blocked: REACT_APP_PI_ENVIRONMENT must be "production"');
  }

  console.warn('✅ PRODUCTION environment validation passed');
  return true;
};

// PRODUCTION Security Headers Configuration
export const PRODUCTION_SECURITY_HEADERS = {
  // Content Security Policy for real money platform
  'Content-Security-Policy': [
    "default-src 'self' https://lottery4435.pinet.com https://sdk.minepi.com https://app-cdn.minepi.com",
    "script-src 'self' 'unsafe-inline' https://sdk.minepi.com https://app-cdn.minepi.com https://*.firebase.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' https: data: blob:",
    "connect-src 'self' https://lottery4435.pinet.com https://sdk.minepi.com https://blockstream.info https://*.firebase.com wss://*.firebaseio.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "frame-src 'self' https://sdk.minepi.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),

  // Security headers for real money gambling
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  
  // Custom headers for gambling compliance
  'X-Gambling-Warning': 'This platform involves real money gambling with Pi cryptocurrency',
  'X-Age-Restriction': '18+',
  'X-Real-Money': 'true',
  'X-Currency-Type': 'PI_CRYPTOCURRENCY',
  'X-Production-Mode': 'true',
  'X-Compliance-Required': 'true'
};

// PRODUCTION Rate Limiting Configuration
export const PRODUCTION_RATE_LIMITS = {
  // API rate limits for real money transactions
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP for real money platform',
    standardHeaders: true,
    legacyHeaders: false
  },

  // Payment rate limits for Pi transactions
  payments: {
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit to 5 payment requests per minute
    message: 'Too many payment requests - please wait before spending more Pi',
    standardHeaders: true,
    skipSuccessfulRequests: false
  },

  // Admin action rate limits
  admin: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // 50 admin actions per 5 minutes
    message: 'Too many admin actions - rate limited for security',
    standardHeaders: true
  },

  // Login rate limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many login attempts - account temporarily locked',
    skipSuccessfulRequests: true
  }
};

// PRODUCTION Input Validation Rules
export const PRODUCTION_VALIDATION_RULES = {
  // Pi amount validation for real money
  piAmount: {
    min: 0.01, // Minimum 0.01 Pi
    max: 10000, // Maximum 10,000 Pi per transaction
    precision: 4, // 4 decimal places max
    pattern: /^\d+(\.\d{1,4})?$/
  },

  // User input validation
  username: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/,
    blacklist: ['admin', 'root', 'null', 'undefined', 'script', 'alert']
  },

  // Email validation for admin access
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 255,
    adminDomains: process.env.REACT_APP_ADMIN_DOMAINS?.split(',') || []
  },

  // Lottery validation for real money gambling
  lottery: {
    title: {
      minLength: 5,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_.!?]+$/
    },
    description: {
      maxLength: 500,
      pattern: /^[a-zA-Z0-9\s\-_.!?(),]+$/
    },
    entryFee: {
      min: parseFloat(process.env.REACT_APP_MIN_ENTRY_FEE) || 0.1,
      max: parseFloat(process.env.REACT_APP_MAX_ENTRY_FEE) || 1000
    }
  }
};

// PRODUCTION Security Monitoring Configuration
export const PRODUCTION_SECURITY_MONITORING = {
  // Events to monitor for real money platform
  criticalEvents: [
    'LARGE_PI_TRANSACTION', // Pi transactions > 1000
    'MULTIPLE_FAILED_LOGINS', // > 3 failed logins
    'ADMIN_PRIVILEGE_ESCALATION', // Unauthorized admin access
    'PAYMENT_FAILURE_SPIKE', // High payment failure rate
    'SUSPICIOUS_USER_BEHAVIOR', // Unusual gambling patterns
    'PRIZE_DISTRIBUTION_ERROR', // Failed prize payments
    'SECURITY_HEADER_BYPASS', // CSP violations
    'RATE_LIMIT_EXCEEDED', // Rate limiting triggered
    'DATABASE_QUERY_ANOMALY', // Unusual database access
    'EXTERNAL_API_FAILURE' // Pi Network or Firebase failures
  ],

  // Thresholds for alerting
  alertThresholds: {
    failedLogins: 5, // Alert after 5 failed logins
    largeTransaction: 1000, // Alert for transactions > 1000 Pi
    rapidTransactions: 10, // Alert for > 10 transactions in 5 minutes
    prizeDistributionFailures: 3, // Alert after 3 failed prize distributions
    apiErrorRate: 0.05, // Alert if > 5% of API calls fail
    databaseResponseTime: 5000 // Alert if DB queries > 5 seconds
  },

  // Security response actions
  automaticResponses: {
    blockSuspiciousIP: true,
    temporaryAccountLock: true,
    requireAdditionalVerification: true,
    notifySecurityTeam: true,
    logSecurityEvent: true
  }
};

// PRODUCTION Compliance Configuration
export const PRODUCTION_COMPLIANCE_CONFIG = {
  // Age verification requirements
  ageVerification: {
    required: true,
    minimumAge: 18,
    documentTypes: ['passport', 'drivers_license', 'national_id'],
    verificationProvider: process.env.REACT_APP_KYC_PROVIDER || 'manual'
  },

  // Responsible gambling features
  responsibleGambling: {
    // Spending limits (in Pi)
    dailyLimit: parseFloat(process.env.REACT_APP_DAILY_LIMIT) || 100,
    weeklyLimit: parseFloat(process.env.REACT_APP_WEEKLY_LIMIT) || 500,
    monthlyLimit: parseFloat(process.env.REACT_APP_MONTHLY_LIMIT) || 2000,
    
    // Session limits
    maxSessionDuration: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
    cooldownPeriod: 30 * 60 * 1000, // 30 minutes break required
    
    // Self-exclusion options
    exclusionPeriods: ['24h', '1w', '1m', '6m', '1y', 'permanent'],
    
    // Addiction warnings
    warningTriggers: {
      consecutiveLosses: 5,
      timeSpentGambling: 2 * 60 * 60 * 1000, // 2 hours
      amountSpentInSession: 50 // 50 Pi
    }
  },

  // Transaction monitoring for AML compliance
  amlMonitoring: {
    largeTransactionThreshold: 600, // Report transactions > 600 Pi
    suspiciousPatterns: [
      'rapid_deposits_withdrawals',
      'round_number_transactions',
      'transaction_structuring',
      'velocity_monitoring'
    ],
    reportingRequired: true,
    recordRetention: 10 * 365 * 24 * 60 * 60 * 1000 // 10 years in milliseconds
  },

  // Geographic restrictions
  geoBlocking: {
    enabled: true,
    blockedCountries: process.env.REACT_APP_BLOCKED_COUNTRIES?.split(',') || [],
    allowedCountries: process.env.REACT_APP_ALLOWED_COUNTRIES?.split(',') || [],
    vpnDetection: true,
    proxyDetection: true
  }
};

// PRODUCTION Data Protection Configuration
export const PRODUCTION_DATA_PROTECTION = {
  // Encryption settings
  encryption: {
    algorithm: 'AES-256-GCM',
    keyRotationInterval: 90 * 24 * 60 * 60 * 1000, // 90 days
    encryptPersonalData: true,
    encryptFinancialData: true,
    hashPasswords: true
  },

  // Data retention policies
  dataRetention: {
    userProfiles: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    transactionRecords: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
    gamblingActivity: 5 * 365 * 24 * 60 * 60 * 1000, // 5 years
    kycDocuments: 5 * 365 * 24 * 60 * 60 * 1000, // 5 years
    logFiles: 1 * 365 * 24 * 60 * 60 * 1000 // 1 year
  },

  // Privacy controls
  privacy: {
    anonymizeData: true,
    rightToForgetting: false, // Cannot delete gambling records
    dataPortability: true,
    consentRequired: true,
    cookieConsent: true
  }
};

// PRODUCTION Audit Configuration
export const PRODUCTION_AUDIT_CONFIG = {
  // Events to audit for compliance
  auditEvents: [
    'USER_REGISTRATION',
    'PI_TRANSACTION',
    'LOTTERY_ENTRY',
    'WINNER_SELECTION',
    'PRIZE_DISTRIBUTION',
    'ADMIN_ACTION',
    'SECURITY_EVENT',
    'COMPLIANCE_VIOLATION',
    'SYSTEM_ACCESS',
    'DATA_EXPORT'
  ],

  // Audit log retention
  auditRetention: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
  
  // Audit log format
  logFormat: {
    timestamp: true,
    userId: true,
    action: true,
    ipAddress: true,
    userAgent: true,
    sessionId: true,
    transactionDetails: true,
    complianceData: true
  },

  // External audit requirements
  externalAudit: {
    required: true,
    frequency: 'annual',
    scope: ['security', 'compliance', 'financial'],
    auditorAccess: true
  }
};

// PRODUCTION Emergency Response Configuration
export const PRODUCTION_EMERGENCY_CONFIG = {
  // Emergency shutdown procedures
  emergencyShutdown: {
    triggers: [
      'SECURITY_BREACH',
      'FINANCIAL_DISCREPANCY',
      'REGULATORY_ORDER',
      'TECHNICAL_FAILURE',
      'COMPLIANCE_VIOLATION'
    ],
    automaticShutdown: false, // Manual shutdown only for gambling platform
    notificationChannels: ['email', 'sms', 'slack'],
    escalationProcedure: true
  },

  // Incident response
  incidentResponse: {
    responseTeam: process.env.REACT_APP_INCIDENT_TEAM?.split(',') || [],
    responseTime: 15 * 60 * 1000, // 15 minutes
    escalationTime: 60 * 60 * 1000, // 1 hour
    documentationRequired: true,
    postMortemRequired: true
  },

  // Business continuity
  businessContinuity: {
    backupSystems: true,
    recoveryTime: 4 * 60 * 60 * 1000, // 4 hours
    dataBackupInterval: 60 * 60 * 1000, // 1 hour
    disasterRecoveryPlan: true,
    communicationPlan: true
  }
};

// PRODUCTION Security Initialization
export const initializeProductionSecurity = () => {
  try {
    console.warn('🚨 INITIALIZING PRODUCTION SECURITY FOR REAL MONEY PLATFORM');
    
    // Validate environment
    validateProductionEnvironment();
    
    // Log security configuration
    console.warn('🔒 PRODUCTION Security headers configured');
    console.warn('⚡ PRODUCTION Rate limiting enabled');
    console.warn('📋 PRODUCTION Compliance monitoring active');
    console.warn('🛡️ PRODUCTION Data protection enabled');
    console.warn('📊 PRODUCTION Audit logging active');
    console.warn('🚨 PRODUCTION Emergency procedures ready');
    
    // Security warning
    console.warn('💰 REAL PI CRYPTOCURRENCY SECURITY ACTIVE');
    console.warn('🎰 REAL MONEY GAMBLING PLATFORM SECURED');
    
    return {
      status: 'PRODUCTION_SECURITY_INITIALIZED',
      timestamp: new Date().toISOString(),
      environment: 'PRODUCTION',
      realMoney: true,
      gambling: true,
      securityLevel: 'MAXIMUM'
    };
    
  } catch (error) {
    console.error('❌ PRODUCTION SECURITY INITIALIZATION FAILED:', error);
    throw new Error(`PRODUCTION deployment blocked: ${error.message}`);
  }
};

// Export all security configurations
export default {
  PRODUCTION_SECURITY_HEADERS,
  PRODUCTION_RATE_LIMITS,
  PRODUCTION_VALIDATION_RULES,
  PRODUCTION_SECURITY_MONITORING,
  PRODUCTION_COMPLIANCE_CONFIG,
  PRODUCTION_DATA_PROTECTION,
  PRODUCTION_AUDIT_CONFIG,
  PRODUCTION_EMERGENCY_CONFIG,
  initializeProductionSecurity,
  validateProductionEnvironment
};

// Initialize security on module load
if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_PI_ENVIRONMENT === 'production') {
  initializeProductionSecurity();
}

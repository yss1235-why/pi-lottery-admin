// File path: src/components/LegalComponents.js - Combined Legal Components
import React, { useState, useEffect } from 'react';

// Legal document versions and metadata
const LEGAL_VERSIONS = {
  privacyPolicy: {
    version: process.env.REACT_APP_PRIVACY_POLICY_VERSION || "1.0.0",
    lastUpdated: process.env.REACT_APP_LEGAL_LAST_UPDATED || "2024-01-15",
    effectiveDate: "2024-01-15"
  },
  termsOfService: {
    version: process.env.REACT_APP_TERMS_VERSION || "1.0.0", 
    lastUpdated: process.env.REACT_APP_LEGAL_LAST_UPDATED || "2024-01-15",
    effectiveDate: "2024-01-15"
  }
};

const COMPANY_INFO = {
  name: process.env.REACT_APP_COMPANY_NAME || "Pi Lottery Inc.",
  address: process.env.REACT_APP_COMPANY_ADDRESS || "123 Blockchain St, Crypto City, CC 12345",
  contactEmail: process.env.REACT_APP_CONTACT_EMAIL || "legal@pilottery.com",
  supportEmail: process.env.REACT_APP_SUPPORT_EMAIL || "support@pilottery.com"
};

// Privacy Policy Component
const PrivacyPolicy = ({ isModal = false }) => {
  return (
    <div className={`legal-document ${isModal ? 'modal-content' : ''}`}>
      <div className="legal-header">
        <h1>🔒 Privacy Policy</h1>
        <div className="legal-meta">
          <p><strong>Version:</strong> {LEGAL_VERSIONS.privacyPolicy.version}</p>
          <p><strong>Last Updated:</strong> {LEGAL_VERSIONS.privacyPolicy.lastUpdated}</p>
          <p><strong>Effective Date:</strong> {LEGAL_VERSIONS.privacyPolicy.effectiveDate}</p>
        </div>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>📋 Overview</h2>
          <p>
            This Privacy Policy describes how {COMPANY_INFO.name} ("we," "us," or "our") 
            collects, uses, and protects your information when you use our Pi Lottery platform 
            (the "Service"). We are committed to protecting your privacy and being transparent 
            about our data practices.
          </p>
        </section>

        <section className="legal-section">
          <h2>📊 Information We Collect</h2>
          
          <h3>🔹 Information You Provide</h3>
          <ul>
            <li><strong>Pi Network User Data:</strong> Pi Network user ID, username, and profile information</li>
            <li><strong>Wallet Information:</strong> Pi wallet connection status and public wallet addresses</li>
            <li><strong>Lottery Participation:</strong> Entry records, ticket purchases, and participation history</li>
            <li><strong>Communication:</strong> Messages you send to us through support channels</li>
          </ul>

          <h3>🔹 Information Automatically Collected</h3>
          <ul>
            <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
            <li><strong>Usage Data:</strong> Pages visited, features used, time spent on platform</li>
            <li><strong>Transaction Data:</strong> Payment information, transaction IDs, and timestamps</li>
            <li><strong>Technical Data:</strong> IP address, cookies, and analytics data</li>
          </ul>

          <h3>🔹 Blockchain Data</h3>
          <ul>
            <li><strong>Public Transactions:</strong> All Pi Network transactions are recorded on the blockchain</li>
            <li><strong>Lottery Results:</strong> Winner selections and verification data are publicly verifiable</li>
            <li><strong>Bitcoin Block Data:</strong> Block hashes and heights used for provably fair randomness</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🎯 How We Use Your Information</h2>
          
          <h3>🔹 Service Operations</h3>
          <ul>
            <li>Process lottery entries and manage participation</li>
            <li>Facilitate payments and prize distributions</li>
            <li>Verify winners and maintain fair play</li>
            <li>Provide customer support and respond to inquiries</li>
          </ul>

          <h3>🔹 Platform Improvement</h3>
          <ul>
            <li>Analyze usage patterns to improve user experience</li>
            <li>Develop new features and lottery types</li>
            <li>Monitor platform performance and security</li>
            <li>Conduct research and analytics (anonymized data)</li>
          </ul>

          <h3>🔹 Legal and Safety</h3>
          <ul>
            <li>Comply with applicable laws and regulations</li>
            <li>Prevent fraud and maintain platform security</li>
            <li>Resolve disputes and enforce our terms</li>
            <li>Protect the rights and safety of our users</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🤝 Information Sharing</h2>
          
          <p><strong>We DO NOT sell, rent, or trade your personal information.</strong></p>

          <h3>🔹 Limited Sharing Scenarios</h3>
          <ul>
            <li><strong>Public Blockchain:</strong> Transaction data is inherently public on Pi Network</li>
            <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
            <li><strong>Service Providers:</strong> Trusted third parties who help operate our platform (under strict agreements)</li>
            <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets</li>
            <li><strong>Safety:</strong> To protect against fraud, abuse, or harm to users or our platform</li>
          </ul>

          <h3>🔹 Anonymized Data</h3>
          <p>
            We may share aggregated, anonymized statistics about lottery participation, 
            platform usage, and other non-identifying information for research, 
            marketing, or partnership purposes.
          </p>
        </section>

        <section className="legal-section">
          <h2>🔐 Data Security</h2>
          
          <h3>🔹 Security Measures</h3>
          <ul>
            <li><strong>Encryption:</strong> Data transmission secured with industry-standard encryption</li>
            <li><strong>Access Controls:</strong> Limited employee access on a need-to-know basis</li>
            <li><strong>Regular Audits:</strong> Security reviews and vulnerability assessments</li>
            <li><strong>Secure Infrastructure:</strong> Hosted on secure, compliant cloud platforms</li>
          </ul>

          <h3>🔹 Data Retention</h3>
          <ul>
            <li><strong>Account Data:</strong> Retained while your account is active</li>
            <li><strong>Transaction Records:</strong> Kept for 7 years for financial compliance</li>
            <li><strong>Analytics Data:</strong> Anonymized data may be retained indefinitely</li>
            <li><strong>Legal Holds:</strong> Data preserved longer when required by law</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🎛️ Your Rights and Choices</h2>
          
          <h3>🔹 Access and Control</h3>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
            <li><strong>Portability:</strong> Download your lottery participation history</li>
          </ul>

          <h3>🔹 Communication Preferences</h3>
          <ul>
            <li><strong>Marketing:</strong> Opt out of promotional communications</li>
            <li><strong>Notifications:</strong> Control platform notifications and alerts</li>
            <li><strong>Analytics:</strong> Limit certain analytics and tracking</li>
          </ul>

          <h3>🔹 Exercising Your Rights</h3>
          <p>
            To exercise any of these rights, contact us at {COMPANY_INFO.contactEmail}. 
            We will respond within 30 days and verify your identity before processing requests.
          </p>
        </section>

        <section className="legal-section">
          <h2>🍪 Cookies and Tracking</h2>
          
          <h3>🔹 Types of Cookies</h3>
          <ul>
            <li><strong>Essential:</strong> Required for platform functionality</li>
            <li><strong>Analytics:</strong> Help us understand platform usage</li>
            <li><strong>Preferences:</strong> Remember your settings and choices</li>
            <li><strong>Security:</strong> Detect fraud and abuse</li>
          </ul>

          <h3>🔹 Managing Cookies</h3>
          <p>
            You can control cookies through your browser settings. However, 
            disabling essential cookies may affect platform functionality.
          </p>
        </section>

        <section className="legal-section">
          <h2>👶 Children's Privacy</h2>
          <p>
            Our platform is not intended for users under 18 years old. We do not 
            knowingly collect personal information from children. If we become aware 
            that we have collected data from a child under 18, we will take steps 
            to delete such information promptly.
          </p>
        </section>

        <section className="legal-section">
          <h2>🌍 International Users</h2>
          <p>
            Our platform may be accessed globally. By using our service, you consent 
            to the transfer and processing of your information in countries where we 
            operate, which may have different data protection laws than your residence.
          </p>
        </section>

        <section className="legal-section">
          <h2>📢 Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. We will notify users of 
            material changes through the platform or email. Your continued use after 
            changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="legal-section">
          <h2>📞 Contact Us</h2>
          <div className="contact-info">
            <p><strong>Email:</strong> {COMPANY_INFO.contactEmail}</p>
            <p><strong>Support:</strong> {COMPANY_INFO.supportEmail}</p>
            <p><strong>Address:</strong> {COMPANY_INFO.address}</p>
          </div>
        </section>
      </div>
    </div>
  );
};

// Terms of Service Component
const TermsOfService = ({ isModal = false }) => {
  return (
    <div className={`legal-document ${isModal ? 'modal-content' : ''}`}>
      <div className="legal-header">
        <h1>📋 Terms of Service</h1>
        <div className="legal-meta">
          <p><strong>Version:</strong> {LEGAL_VERSIONS.termsOfService.version}</p>
          <p><strong>Last Updated:</strong> {LEGAL_VERSIONS.termsOfService.lastUpdated}</p>
          <p><strong>Effective Date:</strong> {LEGAL_VERSIONS.termsOfService.effectiveDate}</p>
        </div>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>🎯 Agreement Overview</h2>
          <p>
            These Terms of Service ("Terms") govern your use of the Pi Lottery platform 
            operated by {COMPANY_INFO.name}. By accessing or using our service, you agree 
            to be bound by these Terms. If you do not agree, please do not use our platform.
          </p>
        </section>

        <section className="legal-section">
          <h2>🎰 Service Description</h2>
          
          <h3>🔹 Platform Overview</h3>
          <ul>
            <li><strong>Lottery Platform:</strong> Decentralized lottery system using Pi cryptocurrency</li>
            <li><strong>Provably Fair:</strong> Winner selection using Bitcoin blockchain randomness</li>
            <li><strong>2% Ticket System:</strong> Fair participation limits to prevent domination</li>
            <li><strong>Multi-Winner Format:</strong> Multiple prizes for better odds and engagement</li>
          </ul>

          <h3>🔹 Service Environment</h3>
          <ul>
            <li><strong>Testnet/Sandbox:</strong> Currently operating on Pi Network testnet</li>
            <li><strong>Development Phase:</strong> Features and functionality may change</li>
            <li><strong>No Real Money:</strong> Uses testnet Pi tokens, not mainnet currency</li>
            <li><strong>Educational Purpose:</strong> Platform for learning and testing</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>✅ Eligibility and Requirements</h2>
          
          <h3>🔹 User Requirements</h3>
          <ul>
            <li><strong>Age:</strong> Must be 18 years or older</li>
            <li><strong>Legal Capacity:</strong> Able to enter into binding agreements</li>
            <li><strong>Pi Network Account:</strong> Valid Pi Network account required</li>
            <li><strong>Jurisdiction:</strong> Use must comply with local laws</li>
          </ul>

          <h3>🔹 Prohibited Users</h3>
          <ul>
            <li>Individuals under 18 years of age</li>
            <li>Users in jurisdictions where lotteries are prohibited</li>
            <li>Persons restricted by local gambling laws</li>
            <li>Previously banned or suspended users</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🎫 Lottery Participation Rules</h2>
          
          <h3>🔹 Entry Requirements</h3>
          <ul>
            <li><strong>Pi Wallet:</strong> Connected and authenticated Pi wallet</li>
            <li><strong>Entry Fee:</strong> Sufficient Pi balance for lottery entry</li>
            <li><strong>Ticket Limits:</strong> Maximum 2% of total participants per lottery</li>
            <li><strong>Fair Play:</strong> One person per account, no automation</li>
          </ul>

          <h3>🔹 Lottery Process</h3>
          <ul>
            <li><strong>Entry Period:</strong> Open participation until lottery end time</li>
            <li><strong>Winner Selection:</strong> Provably fair using Bitcoin blockchain</li>
            <li><strong>Prize Distribution:</strong> Manual distribution by administrators</li>
            <li><strong>Verification:</strong> All results publicly verifiable</li>
          </ul>

          <h3>🔹 Ticket System</h3>
          <ul>
            <li><strong>Dynamic Limits:</strong> Ticket limits adjust based on participation</li>
            <li><strong>Minimum Tickets:</strong> At least 2 tickets available per user</li>
            <li><strong>Fair Distribution:</strong> Prevents whale domination</li>
            <li><strong>Real-Time Updates:</strong> Limits update as users join</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>💰 Financial Terms</h2>
          
          <h3>🔹 Entry Fees and Payments</h3>
          <ul>
            <li><strong>Non-Refundable:</strong> Entry fees cannot be refunded once submitted</li>
            <li><strong>Platform Fees:</strong> Deducted from prize pool as disclosed</li>
            <li><strong>Pi Network Fees:</strong> Transaction fees may apply</li>
            <li><strong>Payment Processing:</strong> Processed through Pi Network SDK</li>
          </ul>

          <h3>🔹 Prize Distribution</h3>
          <ul>
            <li><strong>Automatic Calculation:</strong> Prizes calculated based on participation</li>
            <li><strong>Manual Distribution:</strong> Prizes sent manually by administrators</li>
            <li><strong>Winner Verification:</strong> Identity verification may be required</li>
            <li><strong>Processing Time:</strong> Prizes distributed within reasonable timeframe</li>
          </ul>

          <h3>🔹 Currency and Exchange</h3>
          <ul>
            <li><strong>Pi Cryptocurrency:</strong> All transactions in Pi tokens</li>
            <li><strong>Testnet Tokens:</strong> No real-world monetary value</li>
            <li><strong>Exchange Rates:</strong> Subject to Pi Network policies</li>
            <li><strong>Future Changes:</strong> Terms may change with mainnet launch</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🛡️ User Responsibilities</h2>
          
          <h3>🔹 Account Security</h3>
          <ul>
            <li><strong>Wallet Security:</strong> Secure your Pi wallet and private keys</li>
            <li><strong>Account Access:</strong> Keep login credentials confidential</li>
            <li><strong>Authorized Use:</strong> Only you may use your account</li>
            <li><strong>Suspicious Activity:</strong> Report security breaches immediately</li>
          </ul>

          <h3>🔹 Fair Play</h3>
          <ul>
            <li><strong>One Account:</strong> Maintain only one account per person</li>
            <li><strong>No Automation:</strong> Manual participation only, no bots</li>
            <li><strong>Honest Information:</strong> Provide accurate information</li>
            <li><strong>Respect Limits:</strong> Comply with ticket limits and restrictions</li>
          </ul>

          <h3>🔹 Legal Compliance</h3>
          <ul>
            <li><strong>Local Laws:</strong> Ensure participation is legal in your jurisdiction</li>
            <li><strong>Age Requirements:</strong> Confirm you meet minimum age requirements</li>
            <li><strong>Tax Obligations:</strong> Handle any applicable tax responsibilities</li>
            <li><strong>Reporting:</strong> Report suspected fraud or abuse</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🚫 Prohibited Activities</h2>
          
          <h3>🔹 Platform Abuse</h3>
          <ul>
            <li>Creating multiple accounts</li>
            <li>Using automated systems or bots</li>
            <li>Attempting to manipulate lottery results</li>
            <li>Circumventing ticket limits or restrictions</li>
          </ul>

          <h3>🔹 Fraudulent Behavior</h3>
          <ul>
            <li>Providing false identity information</li>
            <li>Colluding with other users</li>
            <li>Exploiting platform vulnerabilities</li>
            <li>Money laundering or illegal activities</li>
          </ul>

          <h3>🔹 System Interference</h3>
          <ul>
            <li>Hacking or attempting unauthorized access</li>
            <li>Distributing malware or viruses</li>
            <li>Overloading platform systems</li>
            <li>Reverse engineering platform code</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>⚖️ Dispute Resolution</h2>
          
          <h3>🔹 Internal Resolution</h3>
          <ul>
            <li><strong>Support Contact:</strong> Contact support team first</li>
            <li><strong>Investigation:</strong> We will investigate disputes promptly</li>
            <li><strong>Documentation:</strong> Provide relevant evidence and information</li>
            <li><strong>Decision:</strong> Our decision will be based on available evidence</li>
          </ul>

          <h3>🔹 Binding Arbitration</h3>
          <p>
            Any disputes not resolved through internal processes will be settled through 
            binding arbitration in accordance with applicable arbitration rules. Class 
            action lawsuits are waived.
          </p>
        </section>

        <section className="legal-section">
          <h2>📈 Platform Changes</h2>
          
          <h3>🔹 Service Modifications</h3>
          <ul>
            <li><strong>Feature Updates:</strong> We may add, modify, or remove features</li>
            <li><strong>Rule Changes:</strong> Lottery rules may be updated with notice</li>
            <li><strong>Technical Improvements:</strong> Platform upgrades and maintenance</li>
            <li><strong>Policy Updates:</strong> Terms and policies may be revised</li>
          </ul>

          <h3>🔹 Service Discontinuation</h3>
          <p>
            We reserve the right to discontinue the platform with reasonable notice. 
            Outstanding prizes will be distributed before discontinuation.
          </p>
        </section>

        <section className="legal-section">
          <h2>⚠️ Disclaimers and Limitations</h2>
          
          <h3>🔹 Service Availability</h3>
          <ul>
            <li><strong>No Guarantee:</strong> Platform availability not guaranteed</li>
            <li><strong>Maintenance:</strong> Scheduled and emergency maintenance may occur</li>
            <li><strong>Third-Party Dependencies:</strong> Reliance on Pi Network and Bitcoin</li>
            <li><strong>Technical Issues:</strong> Bugs and technical problems may arise</li>
          </ul>

          <h3>🔹 Limitation of Liability</h3>
          <p>
            Our liability is limited to the maximum extent permitted by law. We are not 
            liable for indirect, incidental, or consequential damages. Total liability 
            shall not exceed amounts paid by user in the preceding 12 months.
          </p>

          <h3>🔹 Risk Acknowledgment</h3>
          <ul>
            <li><strong>Gambling Risk:</strong> Lottery participation involves risk of loss</li>
            <li><strong>No Guarantees:</strong> No guarantee of winning or returns</li>
            <li><strong>Cryptocurrency Risk:</strong> Pi token value may fluctuate</li>
            <li><strong>Technical Risk:</strong> Platform dependent on external systems</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>📜 Legal Framework</h2>
          
          <h3>🔹 Governing Law</h3>
          <p>
            These Terms are governed by the laws of [Jurisdiction] without regard to 
            conflict of law principles. Any legal proceedings must be conducted in 
            the courts of [Jurisdiction].
          </p>

          <h3>🔹 Severability</h3>
          <p>
            If any provision of these Terms is deemed invalid or unenforceable, the 
            remaining provisions shall remain in full force and effect.
          </p>

          <h3>🔹 Entire Agreement</h3>
          <p>
            These Terms, together with our Privacy Policy, constitute the entire 
            agreement between you and {COMPANY_INFO.name} regarding use of our platform.
          </p>
        </section>

        <section className="legal-section">
          <h2>📞 Contact Information</h2>
          <div className="contact-info">
            <p><strong>Legal Inquiries:</strong> {COMPANY_INFO.contactEmail}</p>
            <p><strong>Customer Support:</strong> {COMPANY_INFO.supportEmail}</p>
            <p><strong>Mailing Address:</strong> {COMPANY_INFO.address}</p>
          </div>
        </section>
      </div>
    </div>
  );
};

// FAQ Component
const FAQ = ({ isModal = false }) => {
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (index) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const faqItems = [
    {
      question: "🎰 How does the lottery system work?",
      answer: "Our lottery system uses provably fair technology with Bitcoin blockchain randomness. Winners are selected using future Bitcoin block hashes, making manipulation impossible. Each lottery has multiple winners with decreasing prize amounts."
    },
    {
      question: "🎫 What is the 2% ticket system?",
      answer: "Each user can buy up to 2% of the total participants as tickets (minimum 2 tickets). This prevents any single user from dominating the lottery and ensures fair chances for everyone."
    },
    {
      question: "🔒 How is the lottery provably fair?",
      answer: "We use future Bitcoin block hashes for winner selection. The block is chosen before entries, and its hash is unpredictable. Anyone can verify results using the same algorithm and Bitcoin blockchain data."
    },
    {
      question: "💰 How are prizes distributed?",
      answer: "Prizes are distributed manually by administrators using Pi Network payments. Winners are notified and prizes are sent directly to their Pi wallets. Distribution typically occurs within 24-48 hours after winner selection."
    },
    {
      question: "🔄 Can I get a refund on my entry fee?",
      answer: "Entry fees are non-refundable once submitted and confirmed on the blockchain. This policy ensures lottery integrity and prevents manipulation."
    },
    {
      question: "📱 What do I need to participate?",
      answer: "You need: 1) A Pi Network account, 2) Connected Pi wallet, 3) Sufficient Pi balance for entry fees, 4) Must be 18+ years old, 5) Participation must be legal in your jurisdiction."
    },
    {
      question: "🏆 How many winners are there?",
      answer: "Winner count depends on total participants: 1-10 participants = 1 winner, 11-25 = 3 winners, 26-50 = 5 winners, etc. More participants means more winners and better odds!"
    },
    {
      question: "⏰ When do lotteries end?",
      answer: "Each lottery has a specific end date and time displayed on the platform. Entries are accepted until this deadline. Winner selection occurs after the lottery ends using the predetermined Bitcoin block."
    },
    {
      question: "🔍 How can I verify results?",
      answer: "All results can be verified on the Bitcoin blockchain. We provide verification links and detailed explanations of how winners were selected using the block hash and lottery algorithm."
    },
    {
      question: "⚠️ Is this real money gambling?",
      answer: "Currently, we operate on Pi Network testnet with test tokens that have no real-world monetary value. This is a development and testing platform for learning purposes."
    },
    {
      question: "🌍 Can I participate from any country?",
      answer: "Participation must comply with local laws and regulations. You are responsible for ensuring lottery participation is legal in your jurisdiction. Some countries may prohibit online lotteries."
    },
    {
      question: "📊 Can I see my participation history?",
      answer: "Yes! Your account shows complete participation history including: lotteries entered, tickets purchased, amounts spent, prizes won, and win/loss statistics."
    }
  ];

  return (
    <div className={`legal-document ${isModal ? 'modal-content' : ''}`}>
      <div className="legal-header">
        <h1>❓ Frequently Asked Questions</h1>
        <p>Find answers to common questions about Pi Lottery platform</p>
      </div>

      <div className="legal-content">
        <div className="faq-list">
          {faqItems.map((item, index) => (
            <div key={index} className={`faq-item ${openItems.has(index) ? 'open' : ''}`}>
              <button 
                className="faq-question"
                onClick={() => toggleItem(index)}
                aria-expanded={openItems.has(index)}
              >
                <span>{item.question}</span>
                <span className="faq-toggle">
                  {openItems.has(index) ? '−' : '+'}
                </span>
              </button>
              {openItems.has(index) && (
                <div className="faq-answer">
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <section className="legal-section">
          <h2>📞 Still Have Questions?</h2>
          <p>
            If you can't find the answer you're looking for, please contact our support team:
          </p>
          <div className="contact-info">
            <p><strong>Support Email:</strong> {COMPANY_INFO.supportEmail}</p>
            <p><strong>Response Time:</strong> Usually within 24 hours</p>
            <p><strong>Support Hours:</strong> Monday - Friday, 9 AM - 6 PM UTC</p>
          </div>
        </section>
      </div>
    </div>
  );
};

// Responsible Gambling Component
const ResponsibleGambling = ({ isModal = false }) => {
  return (
    <div className={`legal-document ${isModal ? 'modal-content' : ''}`}>
      <div className="legal-header">
        <h1>🛡️ Responsible Gambling</h1>
        <p>Your well-being is our priority. Please gamble responsibly.</p>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>⚠️ Important Reminders</h2>
          <div className="warning-box">
            <ul>
              <li><strong>Never gamble more than you can afford to lose</strong></li>
              <li><strong>Set limits before you start playing</strong></li>
              <li><strong>Take regular breaks from gambling</strong></li>
              <li><strong>Don't chase losses with bigger bets</strong></li>
              <li><strong>Gambling should be fun, not stressful</strong></li>
            </ul>
          </div>
        </section>

        <section className="legal-section">
          <h2>📊 Setting Limits</h2>
          <p>
            Our platform includes built-in spending controls to help you gamble responsibly:
          </p>
          <ul>
            <li><strong>Daily Limits:</strong> Maximum Pi you can spend per day</li>
            <li><strong>Weekly Limits:</strong> Total spending limits per week</li>
            <li><strong>Monthly Limits:</strong> Overall monthly spending controls</li>
            <li><strong>Cool-down Periods:</strong> Mandatory waiting periods for large entries</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🚨 Warning Signs</h2>
          <p>
            If you experience any of these signs, consider taking a break:
          </p>
          <ul>
            <li>Spending more time or money than intended</li>
            <li>Gambling to escape problems or stress</li>
            <li>Lying about gambling activities</li>
            <li>Feeling anxious or depressed about gambling</li>
            <li>Neglecting family, work, or other responsibilities</li>
            <li>Borrowing money to gamble</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🆘 Getting Help</h2>
          <p>
            If you need help with gambling problems, these resources are available:
          </p>
          <div className="help-resources">
            <div className="resource-item">
              <h4>🇺🇸 United States</h4>
              <p><strong>National Council on Problem Gambling:</strong></p>
              <p>1-800-522-4700 | <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer">ncpgambling.org</a></p>
            </div>
            
            <div className="resource-item">
              <h4>🇬🇧 United Kingdom</h4>
              <p><strong>GamCare:</strong></p>
              <p>0808-8020-133 | <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer">gamcare.org.uk</a></p>
            </div>
            
            <div className="resource-item">
              <h4>🇦🇺 Australia</h4>
              <p><strong>Gambling Help Online:</strong></p>
              <p>1800-858-858 | <a href="https://www.gamblinghelponline.org.au" target="_blank" rel="noopener noreferrer">gamblinghelponline.org.au</a></p>
            </div>
            
            <div className="resource-item">
              <h4>🌍 International</h4>
              <p><strong>Gamblers Anonymous:</strong></p>
              <p><a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer">gamblersanonymous.org</a></p>
            </div>
          </div>
        </section>

        <section className="legal-section">
          <h2>⏸️ Self-Exclusion</h2>
          <p>
            If you need to take a break from gambling, you can request self-exclusion:
          </p>
          <ul>
            <li><strong>24 Hours:</strong> Temporary cooling-off period</li>
            <li><strong>1 Week:</strong> Short-term break</li>
            <li><strong>1 Month:</strong> Extended break</li>
            <li><strong>6 Months:</strong> Long-term exclusion</li>
            <li><strong>Permanent:</strong> Indefinite account closure</li>
          </ul>
          <p>
            To request self-exclusion, contact us at {COMPANY_INFO.supportEmail} with 
            your desired exclusion period.
          </p>
        </section>
      </div>
    </div>
  );
};

// Main Legal Modal Component
const LegalModal = ({ 
  isOpen, 
  onClose, 
  type = 'privacy', 
  onAccept = null,
  showAcceptButton = false 
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  useEffect(() => {
    const handleScroll = (e) => {
      const element = e.target;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      
      const progress = scrollTop / (scrollHeight - clientHeight);
      setScrollProgress(progress * 100);
      
      // Check if user has scrolled to near the end (95%)
      if (progress > 0.95) {
        setHasScrolledToEnd(true);
      }
    };

    if (isOpen) {
      const modalContent = document.querySelector('.legal-modal-content');
      if (modalContent) {
        modalContent.addEventListener('scroll', handleScroll);
        return () => modalContent.removeEventListener('scroll', handleScroll);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderContent = () => {
    switch (type) {
      case 'privacy':
        return <PrivacyPolicy isModal={true} />;
      case 'terms':
        return <TermsOfService isModal={true} />;
      case 'faq':
        return <FAQ isModal={true} />;
      case 'responsible':
        return <ResponsibleGambling isModal={true} />;
      default:
        return <PrivacyPolicy isModal={true} />;
    }
  };

  const handleAccept = () => {
    if (onAccept) {
      onAccept(type);
    }
    onClose();
  };

  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal-header">
          <h2>
            {type === 'privacy' && '🔒 Privacy Policy'}
            {type === 'terms' && '📋 Terms of Service'}
            {type === 'faq' && '❓ FAQ'}
            {type === 'responsible' && '🛡️ Responsible Gambling'}
          </h2>
          <button className="legal-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="legal-modal-progress">
          <div 
            className="legal-modal-progress-bar"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
        
        <div className="legal-modal-content">
          {renderContent()}
        </div>
        
        <div className="legal-modal-footer">
          {showAcceptButton && (
            <button 
              className="legal-modal-accept"
              onClick={handleAccept}
              disabled={!hasScrolledToEnd}
            >
              {hasScrolledToEnd ? '✅ Accept & Continue' : '📜 Please scroll to continue'}
            </button>
          )}
          <button className="legal-modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Footer Links Component
const LegalFooter = ({ onOpenLegal }) => {
  return (
    <footer className="legal-footer">
      <div className="legal-links">
        <button onClick={() => onOpenLegal('privacy')} className="legal-link">
          📄 Privacy Policy
        </button>
        <button onClick={() => onOpenLegal('terms')} className="legal-link">
          📋 Terms of Service
        </button>
        <button onClick={() => onOpenLegal('faq')} className="legal-link">
          ❓ FAQ
        </button>
        <button onClick={() => onOpenLegal('responsible')} className="legal-link">
          🛡️ Responsible Gambling
        </button>
      </div>
      <div className="legal-footer-info">
        <span className="company-info">
          © 2024 {COMPANY_INFO.name} | 
          Version {LEGAL_VERSIONS.privacyPolicy.version} | 
          Updated {LEGAL_VERSIONS.privacyPolicy.lastUpdated}
        </span>
      </div>
    </footer>
  );
};

// Consent Tracking Hook
const useConsentTracking = () => {
  const [consents, setConsents] = useState(() => {
    try {
      const stored = localStorage.getItem('pi-lottery-consents');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const recordConsent = (documentType, version = null) => {
    const consent = {
      documentType,
      version: version || LEGAL_VERSIONS[documentType]?.version || '1.0.0',
      acceptedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ipAddress: 'hidden' // Would be set server-side in real implementation
    };

    const newConsents = {
      ...consents,
      [documentType]: consent
    };

    setConsents(newConsents);
    localStorage.setItem('pi-lottery-consents', JSON.stringify(newConsents));
    
    console.log('📝 Consent recorded:', consent);
    return consent;
  };

  const hasConsent = (documentType, requiredVersion = null) => {
    const consent = consents[documentType];
    if (!consent) return false;
    
    if (requiredVersion) {
      return consent.version === requiredVersion;
    }
    
    return true;
  };

  return { consents, recordConsent, hasConsent };
};

// Export all components
export {
  PrivacyPolicy,
  TermsOfService,
  FAQ,
  ResponsibleGambling,
  LegalModal,
  LegalFooter,
  useConsentTracking,
  LEGAL_VERSIONS,
  COMPANY_INFO
};

export default LegalModal;

// Usage Example for integrating into UserApp.js:
/*
import { 
  LegalModal, 
  LegalFooter, 
  useConsentTracking,
  LEGAL_VERSIONS 
} from './components/LegalComponents';

// In your UserApp component:
const [legalModal, setLegalModal] = useState({ isOpen: false, type: 'privacy' });
const { recordConsent, hasConsent } = useConsentTracking();

const openLegal = (type) => {
  setLegalModal({ isOpen: true, type });
};

const closeLegal = () => {
  setLegalModal({ isOpen: false, type: 'privacy' });
};

const handleLegalAccept = (type) => {
  recordConsent(type);
  console.log(`User accepted ${type}`);
};

// In your JSX:
<>
  <LegalModal
    isOpen={legalModal.isOpen}
    onClose={closeLegal}
    type={legalModal.type}
    onAccept={handleLegalAccept}
    showAcceptButton={true}
  />
  
  <LegalFooter onOpenLegal={openLegal} />
</>
*/

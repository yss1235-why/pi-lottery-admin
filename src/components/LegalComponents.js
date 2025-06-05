// File path: src/components/LegalComponents.js - PRODUCTION VERSION
// ⚠️ WARNING: PRODUCTION MODE - REAL PI CRYPTOCURRENCY ⚠️
import React, { useState, useEffect } from 'react';

// Legal document versions and metadata for PRODUCTION
const LEGAL_VERSIONS = {
  privacyPolicy: {
    version: process.env.REACT_APP_PRIVACY_POLICY_VERSION || "2.0.0",
    lastUpdated: process.env.REACT_APP_LEGAL_LAST_UPDATED || "2024-12-19",
    effectiveDate: "2024-12-19"
  },
  termsOfService: {
    version: process.env.REACT_APP_TERMS_VERSION || "2.0.0", 
    lastUpdated: process.env.REACT_APP_LEGAL_LAST_UPDATED || "2024-12-19",
    effectiveDate: "2024-12-19"
  }
};

const COMPANY_INFO = {
  name: process.env.REACT_APP_COMPANY_NAME || "Pi Lottery Inc.",
  address: process.env.REACT_APP_COMPANY_ADDRESS || "",
  contactEmail: process.env.REACT_APP_CONTACT_EMAIL || "",
  supportEmail: process.env.REACT_APP_SUPPORT_EMAIL || ""
};

// Privacy Policy Component - PRODUCTION
const PrivacyPolicy = ({ isModal = false }) => {
  return (
    <div className={`legal-document ${isModal ? 'modal-content' : ''}`}>
      <div className="legal-header">
        <h1>🔒 Privacy Policy</h1>
        <div className="warning-box" style={{margin: '16px 0', background: '#fff3cd', border: '2px solid #ffc107', borderRadius: '8px', padding: '16px'}}>
          <strong>⚠️ PRODUCTION MODE:</strong> This platform uses REAL Pi cryptocurrency. All transactions involve actual monetary value.
        </div>
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
            (the "Service"). <strong>This platform uses REAL Pi cryptocurrency with actual monetary value.</strong>
          </p>
          <div className="warning-box">
            <ul>
              <li><strong>Real Money Gambling:</strong> All transactions involve actual Pi cryptocurrency</li>
              <li><strong>Financial Risk:</strong> You may lose real money participating in lotteries</li>
              <li><strong>Age Restriction:</strong> Must be 18+ years old to use this platform</li>
              <li><strong>Legal Compliance:</strong> Ensure gambling is legal in your jurisdiction</li>
            </ul>
          </div>
        </section>

        <section className="legal-section">
          <h2>📊 Information We Collect</h2>
          
          <h3>🔹 Financial and Transaction Data</h3>
          <ul>
            <li><strong>Real Pi Transactions:</strong> All Pi cryptocurrency payments, transfers, and balances</li>
            <li><strong>Gambling Activity:</strong> Lottery entries, amounts wagered, prizes won/lost</li>
            <li><strong>Payment History:</strong> Complete transaction history with real monetary values</li>
            <li><strong>Wallet Information:</strong> Pi wallet addresses and transaction IDs</li>
            <li><strong>Tax Information:</strong> Data required for tax reporting and compliance</li>
          </ul>

          <h3>🔹 Identity Verification (KYC/AML)</h3>
          <ul>
            <li><strong>Personal Identification:</strong> Name, date of birth, address, ID documents</li>
            <li><strong>Government Documents:</strong> Passport, driver's license, or national ID</li>
            <li><strong>Financial Verification:</strong> Source of funds documentation</li>
            <li><strong>Compliance Screening:</strong> Anti-money laundering and sanctions checks</li>
          </ul>

          <h3>🔹 Gambling Behavior Monitoring</h3>
          <ul>
            <li><strong>Spending Patterns:</strong> Amount and frequency of real Pi gambling</li>
            <li><strong>Risk Indicators:</strong> Signs of problem gambling behavior</li>
            <li><strong>Self-Exclusion Data:</strong> Responsible gambling settings and restrictions</li>
            <li><strong>Session Data:</strong> Time spent gambling, loss/win patterns</li>
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
          
          <h3>🔹 Gambling Operations</h3>
          <ul>
            <li>Process real Pi cryptocurrency lottery entries and payments</li>
            <li>Distribute real Pi prizes to winners</li>
            <li>Monitor gambling activity for responsible gaming compliance</li>
            <li>Detect and prevent gambling addiction and problem gambling</li>
            <li>Implement loss limits and cooling-off periods</li>
          </ul>

          <h3>🔹 Legal and Regulatory Compliance</h3>
          <ul>
            <li>Comply with gambling laws and regulations</li>
            <li>Conduct Know Your Customer (KYC) verification</li>
            <li>Perform Anti-Money Laundering (AML) screening</li>
            <li>Report suspicious financial activities to authorities</li>
            <li>Maintain records for tax reporting and audits</li>
          </ul>

          <h3>🔹 Financial Security</h3>
          <ul>
            <li>Verify the legitimacy of Pi cryptocurrency transactions</li>
            <li>Prevent fraud and money laundering</li>
            <li>Protect against unauthorized access to real money accounts</li>
            <li>Maintain audit trails for financial compliance</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🤝 Information Sharing</h2>
          
          <p><strong>We DO NOT sell your personal information, but we may be required to share it for legal compliance.</strong></p>

          <h3>🔹 Required Sharing</h3>
          <ul>
            <li><strong>Law Enforcement:</strong> When required by court order or legal investigation</li>
            <li><strong>Tax Authorities:</strong> Prize winnings and gambling activity for tax compliance</li>
            <li><strong>Financial Regulators:</strong> AML/KYC compliance and suspicious activity reports</li>
            <li><strong>Gambling Authorities:</strong> Compliance with gambling regulations and licensing</li>
            <li><strong>Pi Network:</strong> Transaction data is inherently public on the blockchain</li>
          </ul>

          <h3>🔹 Service Providers</h3>
          <ul>
            <li><strong>Payment Processors:</strong> For processing real Pi cryptocurrency transactions</li>
            <li><strong>Identity Verification:</strong> Third-party KYC/AML service providers</li>
            <li><strong>Legal Services:</strong> Lawyers and compliance consultants</li>
            <li><strong>Auditors:</strong> Financial auditing and compliance verification</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🔐 Data Security</h2>
          
          <h3>🔹 Financial Security Measures</h3>
          <ul>
            <li><strong>Encryption:</strong> Bank-grade encryption for all financial data</li>
            <li><strong>Secure Storage:</strong> Financial records stored in secure, compliant systems</li>
            <li><strong>Access Controls:</strong> Strict access controls for sensitive financial data</li>
            <li><strong>Regular Audits:</strong> Regular security audits and penetration testing</li>
            <li><strong>Compliance Standards:</strong> PCI DSS and other financial security standards</li>
          </ul>

          <h3>🔹 Data Retention for Compliance</h3>
          <ul>
            <li><strong>Financial Records:</strong> Retained for 10 years for tax and regulatory compliance</li>
            <li><strong>KYC/AML Data:</strong> Retained for 5-10 years per regulatory requirements</li>
            <li><strong>Gambling Activity:</strong> Retained for responsible gambling monitoring</li>
            <li><strong>Legal Holds:</strong> Data preserved indefinitely when required by law</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🎛️ Your Rights and Choices</h2>
          
          <h3>🔹 Financial Data Rights</h3>
          <ul>
            <li><strong>Transaction History:</strong> Access to complete gambling and financial records</li>
            <li><strong>Account Statements:</strong> Regular statements of wins, losses, and balances</li>
            <li><strong>Tax Documents:</strong> Annual tax reporting documents for prize winnings</li>
            <li><strong>Correction Rights:</strong> Ability to correct inaccurate financial information</li>
          </ul>

          <h3>🔹 Responsible Gambling Controls</h3>
          <ul>
            <li><strong>Spending Limits:</strong> Set daily, weekly, and monthly Pi spending limits</li>
            <li><strong>Time Limits:</strong> Restrict gambling session duration</li>
            <li><strong>Self-Exclusion:</strong> Temporarily or permanently exclude yourself from gambling</li>
            <li><strong>Cooling-Off Periods:</strong> Mandatory waiting periods for large transactions</li>
          </ul>

          <h3>🔹 Data Deletion Limitations</h3>
          <p>
            <strong>Important:</strong> Due to legal and regulatory requirements, we cannot delete 
            financial records, KYC/AML data, or gambling activity records. This information must 
            be retained for compliance with gambling laws, tax regulations, and anti-money 
            laundering requirements.
          </p>
        </section>

        <section className="legal-section">
          <h2>👶 Age Verification</h2>
          <p>
            <strong>18+ Only:</strong> This platform is strictly restricted to users 18 years of age or older. 
            We conduct age verification as part of our KYC process. Underage gambling is illegal and 
            will result in immediate account termination and forfeiture of funds.
          </p>
        </section>

        <section className="legal-section">
          <h2>🌍 International Users and Compliance</h2>
          <p>
            <strong>Jurisdiction-Specific Restrictions:</strong> Online gambling with real money is illegal 
            in many jurisdictions. Users are responsible for ensuring compliance with local laws. 
            We may restrict access from certain countries or regions where online gambling is prohibited.
          </p>
        </section>

        <section className="legal-section">
          <h2>📞 Contact Us</h2>
          <div className="contact-info">
            <p><strong>Legal Inquiries:</strong> {COMPANY_INFO.contactEmail}</p>
            <p><strong>Customer Support:</strong> {COMPANY_INFO.supportEmail}</p>
            <p><strong>Responsible Gambling:</strong> help@gamblingtherapy.org</p>
            <p><strong>Address:</strong> {COMPANY_INFO.address}</p>
          </div>
        </section>
      </div>
    </div>
  );
};

// Terms of Service Component - PRODUCTION
const TermsOfService = ({ isModal = false }) => {
  return (
    <div className={`legal-document ${isModal ? 'modal-content' : ''}`}>
      <div className="legal-header">
        <h1>📋 Terms of Service</h1>
        <div className="warning-box" style={{margin: '16px 0', background: '#f8d7da', border: '2px solid #dc3545', borderRadius: '8px', padding: '16px'}}>
          <strong>🚨 CRITICAL WARNING:</strong> This platform involves REAL MONEY GAMBLING with actual Pi cryptocurrency. You can lose real money. Must be 18+. Gambling may be illegal in your jurisdiction.
        </div>
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
            operated by {COMPANY_INFO.name}. <strong>This platform involves real money gambling 
            using Pi cryptocurrency.</strong> By accessing or using our service, you agree 
            to be bound by these Terms and acknowledge the financial risks involved.
          </p>
        </section>

        <section className="legal-section">
          <h2>🚨 CRITICAL WARNINGS AND DISCLAIMERS</h2>
          
          <div className="warning-box">
            <h3>🔴 REAL MONEY GAMBLING RISKS</h3>
            <ul>
              <li><strong>Financial Loss:</strong> You can lose all money you spend on this platform</li>
              <li><strong>No Guarantees:</strong> No guarantee of winning or return on investment</li>
              <li><strong>Addiction Risk:</strong> Gambling can be addictive and harmful</li>
              <li><strong>Emotional Impact:</strong> Losing money can cause stress and depression</li>
              <li><strong>No Refunds:</strong> All payments are final and non-refundable</li>
            </ul>
          </div>

          <div className="warning-box">
            <h3>🔴 LEGAL AND REGULATORY RISKS</h3>
            <ul>
              <li><strong>Illegal Activity:</strong> Online gambling may be illegal in your jurisdiction</li>
              <li><strong>Age Restriction:</strong> Must be 18+ years old to participate</li>
              <li><strong>Tax Obligations:</strong> You may owe taxes on winnings</li>
              <li><strong>Criminal Penalties:</strong> Gambling violations may result in criminal charges</li>
              <li><strong>Account Seizure:</strong> Authorities may freeze accounts in illegal jurisdictions</li>
            </ul>
          </div>
        </section>

        <section className="legal-section">
          <h2>🎰 Service Description</h2>
          
          <h3>🔹 Real Money Gambling Platform</h3>
          <ul>
            <li><strong>Pi Cryptocurrency Lottery:</strong> Real money gambling using Pi tokens</li>
            <li><strong>Provably Fair:</strong> Winner selection using Bitcoin blockchain randomness</li>
            <li><strong>Multi-Winner Format:</strong> Multiple real Pi prizes for better odds</li>
            <li><strong>Real Monetary Value:</strong> All Pi tokens have actual market value</li>
          </ul>

          <h3>🔹 Financial Nature of Service</h3>
          <ul>
            <li><strong>Real Currency:</strong> Uses Pi cryptocurrency with actual monetary value</li>
            <li><strong>Financial Risk:</strong> Users can lose significant amounts of real money</li>
            <li><strong>No Investment Advice:</strong> Platform provides entertainment, not investment advice</li>
            <li><strong>Market Volatility:</strong> Pi cryptocurrency value may fluctuate</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>✅ Eligibility and Legal Requirements</h2>
          
          <h3>🔹 Mandatory Requirements</h3>
          <ul>
            <li><strong>Age:</strong> Must be 18 years or older (verified by ID)</li>
            <li><strong>Legal Capacity:</strong> Able to enter into binding financial agreements</li>
            <li><strong>Jurisdiction:</strong> Gambling must be legal in your location</li>
            <li><strong>Financial Capacity:</strong> Must have legitimate source of funds</li>
            <li><strong>Mental Capacity:</strong> Must be of sound mind and not impaired</li>
          </ul>

          <h3>🔹 Prohibited Users</h3>
          <ul>
            <li>Anyone under 18 years of age</li>
            <li>Users in jurisdictions where online gambling is illegal</li>
            <li>Persons with gambling addiction or financial problems</li>
            <li>Users under the influence of drugs or alcohol</li>
            <li>Previously banned users or family members of banned users</li>
            <li>Employees of gambling companies and their families</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🎫 Real Money Lottery Rules</h2>
          
          <h3>🔹 Financial Entry Requirements</h3>
          <ul>
            <li><strong>Real Pi Payment:</strong> Must pay actual Pi cryptocurrency to enter</li>
            <li><strong>Sufficient Balance:</strong> Must have enough Pi in your wallet</li>
            <li><strong>Payment Verification:</strong> All payments verified on Pi blockchain</li>
            <li><strong>No Credit:</strong> Cannot participate with borrowed or credit money</li>
          </ul>

          <h3>🔹 Prize Distribution</h3>
          <ul>
            <li><strong>Real Pi Prizes:</strong> Winners receive actual Pi cryptocurrency</li>
            <li><strong>Tax Implications:</strong> Winners responsible for applicable taxes</li>
            <li><strong>Prize Verification:</strong> Large prizes may require additional identity verification</li>
            <li><strong>Payment Processing:</strong> Prizes distributed within reasonable timeframe</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>💰 Financial Terms and Risks</h2>
          
          <h3>🔹 Payment Terms</h3>
          <ul>
            <li><strong>Non-Refundable:</strong> All payments are final and cannot be refunded</li>
            <li><strong>Real Money:</strong> All transactions involve actual Pi cryptocurrency</li>
            <li><strong>Market Risk:</strong> Pi value may fluctuate, affecting prize values</li>
            <li><strong>Transaction Fees:</strong> Pi Network fees may apply to transactions</li>
          </ul>

          <h3>🔹 Financial Responsibility</h3>
          <ul>
            <li><strong>Afford to Lose:</strong> Only gamble money you can afford to lose</li>
            <li><strong>No Borrowing:</strong> Do not borrow money to gamble</li>
            <li><strong>Budget Management:</strong> Set and stick to gambling budgets</li>
            <li><strong>Seek Help:</strong> Get help if gambling becomes a problem</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🛡️ User Responsibilities</h2>
          
          <h3>🔹 Legal Compliance</h3>
          <ul>
            <li><strong>Jurisdiction Check:</strong> Verify gambling is legal in your location</li>
            <li><strong>Age Verification:</strong> Provide valid ID to verify age 18+</li>
            <li><strong>Tax Compliance:</strong> Report winnings to tax authorities as required</li>
            <li><strong>Source of Funds:</strong> Ensure all gambling funds are legitimate</li>
          </ul>

          <h3>🔹 Responsible Gambling</h3>
          <ul>
            <li><strong>Self-Assessment:</strong> Regularly assess your gambling behavior</li>
            <li><strong>Use Controls:</strong> Utilize deposit limits and self-exclusion tools</li>
            <li><strong>Seek Help:</strong> Contact gambling addiction resources if needed</li>
            <li><strong>Take Breaks:</strong> Take regular breaks from gambling</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🚫 Prohibited Activities</h2>
          
          <h3>🔹 Financial Fraud</h3>
          <ul>
            <li>Using stolen or unauthorized payment methods</li>
            <li>Money laundering or illegal fund transfers</li>
            <li>Creating multiple accounts to circumvent limits</li>
            <li>Providing false identity or financial information</li>
          </ul>

          <h3>🔹 Platform Manipulation</h3>
          <ul>
            <li>Attempting to manipulate lottery results</li>
            <li>Exploiting technical vulnerabilities for financial gain</li>
            <li>Colluding with other users to gain unfair advantage</li>
            <li>Using automated systems or bots</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>⚖️ Dispute Resolution and Legal Action</h2>
          
          <h3>🔹 Financial Disputes</h3>
          <ul>
            <li><strong>Internal Process:</strong> All disputes must first go through our support team</li>
            <li><strong>Documentation Required:</strong> Provide transaction records and evidence</li>
            <li><strong>Final Decision:</strong> Our decision on financial disputes is final</li>
            <li><strong>No Chargebacks:</strong> Pi cryptocurrency transactions cannot be reversed</li>
          </ul>

          <h3>🔹 Binding Arbitration</h3>
          <p>
            Any legal disputes involving real money gambling will be settled through 
            binding arbitration. Class action lawsuits are waived. Users agree to 
            individual arbitration only.
          </p>
        </section>

        <section className="legal-section">
          <h2>⚠️ Platform Risks and Limitations</h2>
          
          <h3>🔹 Technical Risks</h3>
          <ul>
            <li><strong>System Downtime:</strong> Platform may be unavailable during maintenance</li>
            <li><strong>Transaction Delays:</strong> Pi Network congestion may delay payments</li>
            <li><strong>Data Loss:</strong> Technical issues may affect transaction records</li>
            <li><strong>Security Breaches:</strong> Cyber attacks may compromise user data</li>
          </ul>

          <h3>🔹 Limitation of Liability</h3>
          <p>
            <strong>MAXIMUM LIABILITY:</strong> Our total liability is limited to the amount 
            you paid to the platform in the preceding 12 months. We are not liable for 
            indirect, consequential, or punitive damages, including lost profits or 
            gambling losses beyond your direct payments to us.
          </p>
        </section>

        <section className="legal-section">
          <h2>📞 Contact Information</h2>
          <div className="contact-info">
            <p><strong>Legal Inquiries:</strong> {COMPANY_INFO.contactEmail}</p>
            <p><strong>Customer Support:</strong> {COMPANY_INFO.supportEmail}</p>
            <p><strong>Gambling Help:</strong> 1-800-522-4700 (US) | help@gamblingtherapy.org</p>
            <p><strong>Mailing Address:</strong> {COMPANY_INFO.address}</p>
          </div>
        </section>
      </div>
    </div>
  );
};

// FAQ Component - PRODUCTION
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
      question: "🚨 Is this real money gambling?",
      answer: "YES! This platform uses REAL Pi cryptocurrency with actual monetary value. You are gambling with real money. All lottery entries cost real Pi tokens, and all prizes are paid in real Pi cryptocurrency. Only participate if you can afford to lose the money you spend."
    },
    {
      question: "💰 How much real money can I lose?",
      answer: "You can lose ALL the Pi cryptocurrency you spend on lottery entries. There are no guarantees of winning. Set strict spending limits and never gamble more than you can afford to lose. Gambling can be addictive and financially devastating."
    },
    {
      question: "🔞 Who can participate in real money gambling?",
      answer: "Only users 18+ years old can participate. You must provide valid government ID for age verification. Gambling must be legal in your jurisdiction - it's illegal in many places. You are responsible for checking your local laws."
    },
    {
      question: "🎰 How does the real money lottery work?",
      answer: "You pay real Pi cryptocurrency to buy lottery tickets. Winners are selected using provably fair Bitcoin blockchain randomness. Multiple winners share the real Pi prize pool. All transactions involve actual monetary value."
    },
    {
      question: "🎫 What is the 2% ticket system?",
      answer: "Each user can buy up to 2% of total participants as tickets (minimum 2 tickets). This prevents any single user from dominating the lottery with large amounts of real money and ensures fair chances for everyone."
    },
    {
      question: "💸 Can I get refunds on my real money?",
      answer: "NO! All Pi cryptocurrency payments are final and non-refundable. Once you enter a lottery with real Pi, you cannot get your money back. This is a fundamental rule of cryptocurrency gambling."
    },
    {
      question: "🏆 How are real Pi prizes paid?",
      answer: "Winners receive actual Pi cryptocurrency directly to their Pi wallets. Prizes have real monetary value. Large prizes may require additional identity verification. You may owe taxes on winnings."
    },
    {
      question: "📱 What do I need to gamble with real Pi?",
      answer: "You need: 1) Valid government ID (18+ verification), 2) Pi wallet with real Pi balance, 3) Legal permission to gamble in your location, 4) Financial ability to afford losses, 5) Mental capacity to make financial decisions."
    },
    {
      question: "🔒 How can I verify the fairness of real money results?",
      answer: "All winner selections use Bitcoin blockchain randomness and are provably fair. You can verify results independently using the Bitcoin block hash and our verification tools. The randomness cannot be manipulated by us or anyone else."
    },
    {
      question: "⚖️ Is online gambling legal where I live?",
      answer: "Online gambling is ILLEGAL in many jurisdictions. You are responsible for checking your local laws. We may block access from certain countries. Violating gambling laws can result in criminal penalties and account seizure."
    },
    {
      question: "🆘 What if I develop a gambling problem?",
      answer: "Gambling addiction is serious. We provide self-exclusion tools, spending limits, and cooling-off periods. Seek help immediately: US: 1-800-522-4700, UK: 0808-8020-133, International: help@gamblingtherapy.org. Consider professional counseling."
    },
    {
      question: "💳 What are the tax implications of winning?",
      answer: "Gambling winnings may be taxable income in your jurisdiction. You are responsible for reporting winnings to tax authorities and paying applicable taxes. We may be required to report large winnings to government agencies."
    }
  ];

  return (
    <div className={`legal-document ${isModal ? 'modal-content' : ''}`}>
      <div className="legal-header">
        <h1>❓ Frequently Asked Questions</h1>
        <div className="warning-box" style={{margin: '16px 0', background: '#f8d7da', border: '2px solid #dc3545', borderRadius: '8px', padding: '16px'}}>
          <strong>⚠️ REAL MONEY WARNING:</strong> This platform involves actual financial risk. Read all answers carefully before participating.
        </div>
        <p>Critical information about real money Pi cryptocurrency gambling</p>
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
            <strong>Before contacting support, ensure you understand the financial risks involved.</strong>
          </p>
          <div className="contact-info">
            <p><strong>Support Email:</strong> {COMPANY_INFO.supportEmail}</p>
            <p><strong>Legal Questions:</strong> {COMPANY_INFO.contactEmail}</p>
            <p><strong>Gambling Help:</strong> 1-800-522-4700 (US)</p>
            <p><strong>Response Time:</strong> Usually within 24-48 hours</p>
          </div>
        </section>
      </div>
    </div>
  );
};

// Responsible Gambling Component - PRODUCTION
const ResponsibleGambling = ({ isModal = false }) => {
  return (
    <div className={`legal-document ${isModal ? 'modal-content' : ''}`}>
      <div className="legal-header">
        <h1>🛡️ Responsible Gambling</h1>
        <div className="warning-box" style={{margin: '16px 0', background: '#f8d7da', border: '2px solid #dc3545', borderRadius: '8px', padding: '16px'}}>
          <strong>🚨 URGENT:</strong> This platform uses REAL Pi cryptocurrency. Gambling addiction can destroy your financial life and relationships. Seek help immediately if gambling becomes a problem.
        </div>
        <p>Protecting yourself while gambling with real Pi cryptocurrency</p>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>⚠️ Critical Financial Warnings</h2>
          <div className="warning-box">
            <h3>🔴 BEFORE YOU GAMBLE WITH REAL PI:</h3>
            <ul>
              <li><strong>You can lose ALL your money</strong> - Gambling is designed to favor the house</li>
              <li><strong>Set a strict budget</strong> - Only gamble money you can afford to lose completely</li>
              <li><strong>No borrowing</strong> - Never gamble with borrowed money or credit</li>
              <li><strong>Time limits</strong> - Set strict time limits for gambling sessions</li>
              <li><strong>Take breaks</strong> - Regular breaks help maintain perspective</li>
              <li><strong>Alcohol/drugs</strong> - Never gamble while impaired</li>
            </ul>
          </div>
        </section>

        <section className="legal-section">
          <h2>📊 Financial Protection Tools</h2>
          <p>
            Our platform includes mandatory spending controls to protect you from financial harm:
          </p>
          <ul>
            <li><strong>Daily Pi Limits:</strong> Maximum real Pi you can spend per day</li>
            <li><strong>Weekly Pi Limits:</strong> Total Pi spending limits per week</li>
            <li><strong>Monthly Pi Limits:</strong> Overall monthly Pi spending controls</li>
            <li><strong>Loss Limits:</strong> Automatic stop when you reach loss thresholds</li>
            <li><strong>Cool-down Periods:</strong> Mandatory waiting periods for large Pi transactions</li>
            <li><strong>Session Time Limits:</strong> Automatic logout after extended sessions</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🚨 Gambling Addiction Warning Signs</h2>
          <p>
            <strong>SEEK HELP IMMEDIATELY if you experience any of these:</strong>
          </p>
          <ul>
            <li><strong>Spending more Pi than planned</strong> or budgeted</li>
            <li><strong>Chasing losses</strong> with bigger bets to win back money</li>
            <li><strong>Lying about gambling</strong> activities or Pi spending</li>
            <li><strong>Neglecting responsibilities</strong> like work, family, or bills</li>
            <li><strong>Borrowing money</strong> to gamble or pay gambling debts</li>
            <li><strong>Feeling anxious or depressed</strong> about gambling losses</li>
            <li><strong>Unable to stop</strong> gambling despite wanting to quit</li>
            <li><strong>Gambling to escape problems</strong> or negative emotions</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🆘 Immediate Help Resources</h2>
          <p>
            <strong>If gambling is affecting your life, GET HELP NOW:</strong>
          </p>
          <div className="help-resources">
            <div className="resource-item">
              <h4>🇺🇸 United States - National Council on Problem Gambling</h4>
              <p><strong>24/7 Helpline:</strong> 1-800-522-4700</p>
              <p><strong>Text Support:</strong> Text "HELP" to 233-456</p>
              <p><strong>Website:</strong> <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer">ncpgambling.org</a></p>
            </div>
            
            <div className="resource-item">
              <h4>🇬🇧 United Kingdom - GamCare</h4>
              <p><strong>24/7 Helpline:</strong> 0808-8020-133</p>
              <p><strong>Live Chat:</strong> Available on website</p>
              <p><strong>Website:</strong> <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer">gamcare.org.uk</a></p>
            </div>
            
            <div className="resource-item">
              <h4>🇦🇺 Australia - Gambling Help Online</h4>
              <p><strong>24/7 Helpline:</strong> 1800-858-858</p>
              <p><strong>Online Chat:</strong> Available 24/7</p>
              <p><strong>Website:</strong> <a href="https://www.gamblinghelponline.org.au" target="_blank" rel="noopener noreferrer">gamblinghelponline.org.au</a></p>
            </div>
            
            <div className="resource-item">
              <h4>🌍 International - Gamblers Anonymous</h4>
              <p><strong>Global Support:</strong> Find local meetings worldwide</p>
              <p><strong>Online Meetings:</strong> Available 24/7</p>
              <p><strong>Website:</strong> <a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer">gamblersanonymous.org</a></p>
            </div>

            <div className="resource-item">
              <h4>🌐 Online Counseling - BetterHelp</h4>
              <p><strong>Professional Therapy:</strong> Licensed counselors specializing in gambling addiction</p>
              <p><strong>Available:</strong> Phone, video, and text therapy</p>
              <p><strong>Website:</strong> <a href="https://www.betterhelp.com" target="_blank" rel="noopener noreferrer">betterhelp.com</a></p>
            </div>
          </div>
        </section>

        <section className="legal-section">
          <h2>⏸️ Self-Exclusion Options</h2>
          <p>
            <strong>Immediately block yourself from gambling:</strong>
          </p>
          <ul>
            <li><strong>24 Hours:</strong> Temporary cooling-off period</li>
            <li><strong>1 Week:</strong> Short-term break from real Pi gambling</li>
            <li><strong>1 Month:</strong> Extended break to reassess finances</li>
            <li><strong>6 Months:</strong> Long-term exclusion for recovery</li>
            <li><strong>1 Year:</strong> Annual exclusion for serious problems</li>
            <li><strong>Permanent:</strong> Lifetime ban from the platform</li>
          </ul>
          <p>
            <strong>To request self-exclusion:</strong> Contact us immediately at {COMPANY_INFO.supportEmail} 
            with your desired exclusion period. We will process your request within 24 hours.
          </p>
        </section>

        <section className="legal-section">
          <h2>👨‍👩‍👧‍👦 Family and Friends</h2>
          <p>
            <strong>If someone you know has a gambling problem:</strong>
          </p>
          <ul>
            <li><strong>Don't lend money</strong> or pay gambling debts</li>
            <li><strong>Encourage professional help</strong> from addiction specialists</li>
            <li><strong>Attend support groups</strong> for families of gambling addicts</li>
            <li><strong>Set boundaries</strong> to protect your own financial security</li>
            <li><strong>Consider intervention</strong> with professional guidance</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>📚 Educational Resources</h2>
          <ul>
            <li><strong>Understanding Odds:</strong> Learn why the house always has an edge</li>
            <li><strong>Financial Planning:</strong> Resources for budgeting and debt management</li>
            <li><strong>Mental Health:</strong> Understanding the psychology of gambling addiction</li>
            <li><strong>Legal Consequences:</strong> How gambling problems can lead to legal issues</li>
            <li><strong>Recovery Stories:</strong> Testimonials from people who overcame gambling addiction</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>🏥 When to Seek Professional Help</h2>
          <p>
            <strong>Contact a professional immediately if:</strong>
          </p>
          <ul>
            <li>You've lost significant amounts of real Pi cryptocurrency</li>
            <li>Gambling is affecting your work, relationships, or health</li>
            <li>You've borrowed money to gamble or pay gambling debts</li>
            <li>You feel suicidal or hopeless due to gambling losses</li>
            <li>Family members are concerned about your gambling</li>
            <li>You've tried to quit but keep returning to gambling</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

// Keep the rest of the components the same (LegalModal, LegalFooter, etc.)
// ... [The remaining components stay largely the same, just with updated PRODUCTION context]

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

// Footer Links Component with PRODUCTION warnings
const LegalFooter = ({ onOpenLegal }) => {
  return (
    <footer className="legal-footer">
      <div className="warning-box" style={{margin: '20px 0', textAlign: 'center', background: '#f8d7da', border: '2px solid #dc3545', borderRadius: '8px', padding: '16px'}}>
        <strong>⚠️ REAL MONEY GAMBLING WARNING:</strong> This platform uses actual Pi cryptocurrency. Gambling involves financial risk and may be illegal in your jurisdiction. Must be 18+.
      </div>
      
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
          Updated {LEGAL_VERSIONS.privacyPolicy.lastUpdated} |
          <strong style={{color: '#dc3545'}}> PRODUCTION MODE - REAL Pi CRYPTOCURRENCY</strong>
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
      version: version || LEGAL_VERSIONS[documentType]?.version || '2.0.0',
      acceptedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      environment: 'PRODUCTION',
      realMoney: true,
      ipAddress: 'hidden' // Would be set server-side in real implementation
    };

    const newConsents = {
      ...consents,
      [documentType]: consent
    };

    setConsents(newConsents);
    localStorage.setItem('pi-lottery-consents', JSON.stringify(newConsents));
    
    console.log('📝 PRODUCTION consent recorded:', consent);
    console.warn('💰 User consented to REAL money gambling terms!');
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

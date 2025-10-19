# Privacy Policy for Beetcode Chrome Extension

**Last Updated:** October 8, 2024

## Overview

Beetcode ("we", "our", or "the extension") is a Chrome extension that helps users track their LeetCode problem-solving progress. This privacy policy explains how we collect, use, and protect your information.

## Information We Collect

### Information You Provide

- **Google Account Information**: When you sign in with Google OAuth, we collect:
  - Email address
  - Name
  - Profile picture (optional)
  - Google account ID (for authentication purposes)

### Automatically Collected Information

- **Problem Tracking Data**: When you use Beetcode on LeetCode, we collect:
  - Problem slug/identifier (e.g., "two-sum")
  - Problem completion status (attempted, completed)
  - Time spent on problems (in seconds)
  - Timestamps of problem attempts

- **Extension Usage Data**:
  - Authentication session tokens
  - User preferences (stored locally in Chrome)

### Information We Do NOT Collect

- Your LeetCode account credentials
- Your code solutions or submissions
- Your LeetCode subscription status
- Browsing history outside of LeetCode.com
- Personal information beyond what's provided via Google OAuth

## How We Use Your Information

We use the collected information to:

1. **Provide Core Functionality**:
   - Track your LeetCode problem-solving progress
   - Display statistics and analytics about your practice
   - Sync your data across devices

2. **Authentication**:
   - Verify your identity using Google OAuth
   - Maintain secure sessions
   - Enable access to your personal dashboard

3. **Data Storage**:
   - Store your problem history in our Supabase database
   - Associate your problems with your user account

## Data Storage and Security

### Where Your Data is Stored

- **Supabase Cloud Database**: Your problem tracking data is stored securely in Supabase (PostgreSQL database)
- **Chrome Local Storage**: Authentication tokens and preferences are stored locally in your browser
- **No Third-Party Analytics**: We do not use Google Analytics or other third-party tracking services

### Security Measures

- **Row Level Security (RLS)**: Database policies ensure you can only access your own data
- **Encrypted Connections**: All data transmission uses HTTPS/TLS encryption
- **OAuth 2.0**: We use industry-standard OAuth for authentication
- **Token Storage**: Authentication tokens are stored securely in Chrome's encrypted storage
- **Automatic Token Refresh**: Tokens are refreshed automatically to maintain security

## Data Sharing and Disclosure

We **DO NOT**:
- Sell your personal information to third parties
- Share your data with advertisers
- Use your data for marketing purposes
- Provide your information to data brokers

We **MAY** share your information only in these limited circumstances:
- **With your consent**: If you explicitly authorize us to share specific information
- **Legal requirements**: If required by law, court order, or governmental authority
- **Service providers**: With Supabase (our database provider) to enable core functionality

## Your Data Rights

You have the right to:

- **Access**: View all your tracked problem data through the extension dashboard
- **Export**: Download your data in CSV format via the extension popup
- **Delete**: Request deletion of your account and all associated data
- **Modify**: Update or correct your problem tracking data
- **Revoke Access**: Sign out at any time to revoke the extension's access

### How to Exercise Your Rights

- **Export Data**: Click "Export CSV" in the extension popup
- **Delete Account**: Contact us or clear your data via the dashboard
- **Sign Out**: Click "Sign out" in the extension settings

## Data Retention

- **Active Accounts**: We retain your data as long as you use the extension
- **Inactive Accounts**: Data is retained indefinitely unless you request deletion
- **Deleted Accounts**: Upon request, we will delete all your data within 30 days

## Third-Party Services

Beetcode integrates with the following third-party services:

1. **Google OAuth** (accounts.google.com)
   - Purpose: User authentication
   - Data shared: Email, name, profile picture
   - Privacy Policy: https://policies.google.com/privacy

2. **Supabase** (supabase.com)
   - Purpose: Database and authentication infrastructure
   - Data shared: User ID, problem tracking data, email
   - Privacy Policy: https://supabase.com/privacy

3. **LeetCode** (leetcode.com)
   - Purpose: We read publicly available problem information from LeetCode pages
   - Data shared: None - we only read data, we don't send data to LeetCode
   - Note: You access LeetCode under their own terms of service

## Cookies and Tracking

- **No Cookies**: Beetcode does not set cookies
- **Local Storage**: We use Chrome's storage API for local preferences
- **No Cross-Site Tracking**: We do not track your activity outside of LeetCode.com

## Children's Privacy

Beetcode is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.

## Changes to This Privacy Policy

We may update this privacy policy from time to time. Changes will be indicated by updating the "Last Updated" date at the top of this policy. Significant changes will be communicated through:
- Extension update notifications
- Dashboard announcements

## Open Source

Beetcode is open-source software. You can review our code and data handling practices at:
- GitHub Repository: [Your repository URL]

## Contact Us

If you have questions about this privacy policy or your data, please contact us:

- **Email**: [Your support email]
- **GitHub Issues**: [Your repository URL]/issues

## Your Consent

By using Beetcode, you consent to this privacy policy and our collection and use of information as described herein.

---

**Summary for Chrome Web Store Disclosure:**

Beetcode collects and uses the following data:
- **User Authentication**: Email, name (via Google OAuth)
- **Problem Tracking**: LeetCode problem identifiers, completion status, time tracking
- **Purpose**: To provide problem tracking and progress analytics
- **Storage**: Securely stored in Supabase database with Row Level Security
- **No Sale**: We never sell your data to third parties

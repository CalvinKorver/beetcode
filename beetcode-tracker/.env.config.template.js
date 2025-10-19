// Environment-specific configuration template
//
// SETUP INSTRUCTIONS:
// 1. Copy this file to `.env.config.js` in the same directory
// 2. Update the values below based on your environment
// 3. DO NOT commit `.env.config.js` - it's gitignored
//
// For local development:
//   - dashboardUrl: 'http://localhost:3000'
//   - serviceUrl: 'http://localhost:3001'
//
// For production:
//   - dashboardUrl: 'https://your-production-domain.com'
//   - serviceUrl: 'https://your-production-domain.com'

export const envConfig = {
  // Dashboard URL - where users go when clicking the logo
  dashboardUrl: 'http://localhost:3000',

  // Backend service URL - API endpoint for tracking problems
  serviceUrl: 'http://localhost:3001'
};

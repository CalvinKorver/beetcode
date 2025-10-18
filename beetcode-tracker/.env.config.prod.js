// Production environment configuration
// INSTRUCTIONS FOR PRODUCTION DEPLOYMENT:
// 1. Copy this file to `.env.config.js` in the beetcode-tracker directory
// 2. Replace the placeholder URLs below with your actual production domain
// 3. Ensure your domain matches your Next.js dashboard deployment
// 4. DO NOT commit .env.config.js to git (it's gitignored)

export const envConfig = {
  // Dashboard URL - where users go when clicking the logo
  // Example: 'https://beetcode.yourdomain.com'
  dashboardUrl: 'https://your-production-domain.com',

  // Backend service URL - API endpoint for tracking problems
  // This should be the same as your dashboard URL (Next.js API routes)
  // Example: 'https://beetcode.yourdomain.com'
  serviceUrl: 'https://your-production-domain.com'
};

// Import environment-specific configuration
// If .env.config.js doesn't exist, we'll use the defaults below
let envConfig = {
  dashboardUrl: 'http://localhost:3000',
  serviceUrl: 'http://localhost:3000'
};

// Dynamically import environment config (no top-level await for service worker compatibility)
import('./.env.config.js')
  .then((imported) => {
    envConfig = imported.envConfig;
    // Update config object with new values
    config.dashboardUrl = envConfig.dashboardUrl;
    config.serviceUrl = envConfig.serviceUrl;
    console.log('Environment configuration loaded:', envConfig);
  })
  .catch(() => {
    // .env.config.js doesn't exist, using defaults
    console.warn('No .env.config.js found, using default configuration. Copy .env.config.template.js to .env.config.js to customize.');
  });

// Extension configuration
export const config = {
  // Dashboard URL - where the user will be redirected when clicking the logo
  // Configured via .env.config.js (see .env.config.template.js)
  dashboardUrl: envConfig.dashboardUrl,

  // Web app service URL - API endpoint for tracking problems
  // Configured via .env.config.js (see .env.config.template.js)
  serviceUrl: envConfig.serviceUrl,

  // Supabase configuration (for auth only)
  supabase: {
    url: 'https://hukfgtczrtllqhlahuar.supabase.co',
    // TODO: Replace with your actual Supabase anon/public key from:
    // Supabase Dashboard → Settings → API → Project API keys → anon/public
    // The key should be a long JWT token starting with 'eyJ...'
    publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1a2ZndGN6cnRsbHFobGFodWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDc4ODIsImV4cCI6MjA3MzQyMzg4Mn0.UGf2YLz8EJr1ylhRWf_nhdC0vLxllYFKpfWF7bulYzc'
  }
};
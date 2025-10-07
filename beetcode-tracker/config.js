// Extension configuration
export const config = {
  // Web app service URL - should match BEETCODE_SERVICE_URL in web app's .env.local
  serviceUrl: 'http://localhost:3001', // TODO: Update for production

  // Supabase configuration (for auth only)
  supabase: {
    url: 'https://hukfgtczrtllqhlahuar.supabase.co',
    // TODO: Replace with your actual Supabase anon/public key from:
    // Supabase Dashboard → Settings → API → Project API keys → anon/public
    // The key should be a long JWT token starting with 'eyJ...'
    publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1a2ZndGN6cnRsbHFobGFodWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDc4ODIsImV4cCI6MjA3MzQyMzg4Mn0.UGf2YLz8EJr1ylhRWf_nhdC0vLxllYFKpfWF7bulYzc'
  }
};
// Helper script to get the Chrome extension redirect URL
// Run this in the extension context (popup or background script console)

console.log('='.repeat(60));
console.log('CHROME EXTENSION REDIRECT URL');
console.log('='.repeat(60));
console.log('');
console.log('Your redirect URL is:');
console.log(chrome.identity.getRedirectURL());
console.log('');
console.log('='.repeat(60));
console.log('NEXT STEPS:');
console.log('='.repeat(60));
console.log('');
console.log('1. Copy the URL above');
console.log('');
console.log('2. Add to Supabase:');
console.log('   → Authentication → URL Configuration → Redirect URLs');
console.log('');
console.log('3. Add to Google Cloud Console:');
console.log('   → APIs & Services → Credentials → OAuth 2.0 Client');
console.log('   → Authorized redirect URIs');
console.log('');
console.log('See OAUTH_SETUP.md for detailed instructions');
console.log('='.repeat(60));

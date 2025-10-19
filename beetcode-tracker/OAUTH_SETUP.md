# OAuth Setup Guide for BeetCode Extension

## Prerequisites
You need to configure OAuth redirect URLs in both Supabase and Google Cloud Console for authentication to work.

## Step 1: Get Your Extension's Redirect URL

### Method 1: Check in Extension Console
1. Load the extension in Chrome (`chrome://extensions/`)
2. Click "Inspect views: service worker" or open the popup and inspect it
3. In the console, run:
   ```javascript
   console.log(chrome.identity.getRedirectURL())
   ```
4. Copy the URL (format: `https://<extension-id>.chromiumapp.org/`)

### Method 2: Find Extension ID
1. Go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Find your extension's ID (under the extension name)
4. Your redirect URL is: `https://<extension-id>.chromiumapp.org/`

**Example:**
- Extension ID: `abcdefghijklmnopqrstuvwxyz123456`
- Redirect URL: `https://abcdefghijklmnopqrstuvwxyz123456.chromiumapp.org/`

---

## Step 2: Configure Supabase

### 2.1 Add Redirect URL to Supabase
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project: `hukfgtczrtllqhlahuar`
3. Navigate to: **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, click **Add URL**
5. Paste your redirect URL (e.g., `https://abcdefghijklmnopqrstuvwxyz123456.chromiumapp.org/`)
6. Click **Save**

### 2.2 Get Your Supabase Anon Key
1. In Supabase Dashboard, go to: **Settings** → **API**
2. Under **Project API keys**, find the `anon` `public` key
3. Copy the key (it's a long JWT token starting with `eyJ...`)
4. Update `beetcode-tracker/config.js`:
   ```javascript
   publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Your actual key
   ```

---

## Step 3: Configure Google Cloud Console

### 3.1 Access OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to: **APIs & Services** → **Credentials**

### 3.2 Update OAuth 2.0 Client
1. Find your OAuth 2.0 Client ID (should match the one in `manifest.json`):
   ```
   699635422526-ijgogea6agkjj987slnfqpkcjb5f7h3h.apps.googleusercontent.com
   ```
2. Click on the client ID to edit it
3. Under **Authorized redirect URIs**, click **Add URI**
4. Paste your extension's redirect URL
5. Click **Save**

### 3.3 Verify OAuth Consent Screen
1. In Google Cloud Console, go to: **APIs & Services** → **OAuth consent screen**
2. Ensure the following scopes are configured:
   - `openid`
   - `email`
   - `profile`
3. These should match the scopes in `manifest.json`

---

## Step 4: Verify Configuration

### 4.1 Check Redirect URL is Whitelisted
Run this checklist:
- [ ] Redirect URL added to Supabase → Authentication → URL Configuration
- [ ] Redirect URL added to Google Cloud Console → OAuth Client → Authorized redirect URIs
- [ ] Supabase anon key updated in `config.js`
- [ ] Extension reloaded in Chrome

### 4.2 Test Authentication Flow
1. Open the extension popup
2. Click "Sign in with Google"
3. Should open a new tab with Google sign-in
4. After signing in, the tab should redirect to your extension URL
5. The tab should close automatically
6. You should see a "Successfully signed in" notification
7. Popup should show "Sign out (your@email.com)"

### 4.3 Check Console Logs
**In Background Script Console** (`chrome://extensions/` → service worker):
```
Handling user OAuth callback...
Callback URL: https://<extension-id>.chromiumapp.org/#access_token=...
Extracted tokens: { hasAccessToken: true, hasRefreshToken: true, ... }
Session stored successfully
Finished handling user OAuth callback
User signed in
```

**In Popup Console** (right-click popup → Inspect):
```
Starting Google sign-in...
OAuth flow initiated
Session changed, refreshing auth state
```

---

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Cause:** The redirect URL isn't whitelisted in Google Cloud Console.

**Fix:**
1. Check the exact error message for the redirect URL it tried to use
2. Add that exact URL to Google Cloud Console → OAuth Client → Authorized redirect URIs

### Error: "Invalid redirect URL"
**Cause:** The redirect URL isn't whitelisted in Supabase.

**Fix:**
1. Add the redirect URL to Supabase → Authentication → URL Configuration → Redirect URLs
2. Make sure there are no trailing slashes unless the actual URL has one

### Error: "Invalid API key"
**Cause:** Wrong or missing Supabase publishable key in `config.js`.

**Fix:**
1. Get the correct `anon` `public` key from Supabase Dashboard → Settings → API
2. Update `config.js` with the correct key (should be a long JWT starting with `eyJ...`)

### OAuth Opens But Doesn't Complete
**Cause:** The `chrome.tabs.onUpdated` listener in `background.js` isn't detecting the redirect.

**Fix:**
1. Check background script console for errors
2. Verify the redirect URL matches exactly (check for http vs https, trailing slash, etc.)
3. Try reloading the extension

### Session Not Persisting
**Cause:** Tokens are expiring and not being refreshed.

**Fix:**
1. Ensure the token refresh logic is working (see `background.js` changes)
2. Check that `onAuthStateChange` handles `TOKEN_REFRESHED` events
3. Verify refresh token is being stored properly

---

## Development vs Production

### Development (Unpacked Extension)
- Extension ID changes every time you reload from a different directory
- You'll need to update redirect URLs each time the extension ID changes
- Recommendation: Keep the extension in a stable directory

### Production (Chrome Web Store)
- Extension ID is permanent once published
- Set up redirect URLs once with the production extension ID
- Update `config.js` with production Supabase URL and keys

---

## Security Notes

⚠️ **Never commit your Supabase anon key to public repositories.**
- The anon key in `config.js` is client-side and will be visible to users
- Use Row Level Security (RLS) in Supabase to protect your data
- For production, consider using environment variables or a build step

---

## References

- [Supabase Auth Guide for Extensions](https://pustelto.com/blog/supabase-auth/)
- [Chrome Extension Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
- [Supabase OAuth Providers](https://supabase.com/docs/guides/auth/social-login/auth-google)

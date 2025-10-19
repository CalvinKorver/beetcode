# Quick Start: Fix Authentication

## TL;DR - What You Need to Do

Authentication is currently broken due to configuration issues. Follow these 4 steps to fix it:

### 1️⃣ Get Supabase Anon Key (2 minutes)
```
1. Go to https://app.supabase.com/
2. Select project: hukfgtczrtllqhlahuar
3. Settings → API
4. Copy the "anon" "public" key (starts with eyJ...)
5. Paste it in beetcode-tracker/config.js
```

### 2️⃣ Get Extension Redirect URL (1 minute)
```
1. Load extension in Chrome
2. Open popup → Right-click → Inspect
3. In console: run get-redirect-url.js or type:
   console.log(chrome.identity.getRedirectURL())
4. Copy the URL (https://<id>.chromiumapp.org/)
```

### 3️⃣ Configure Supabase (1 minute)
```
1. Supabase Dashboard → Authentication → URL Configuration
2. Under "Redirect URLs" → Add URL
3. Paste your extension redirect URL
4. Save
```

### 4️⃣ Configure Google Cloud (2 minutes)
```
1. Go to https://console.cloud.google.com/
2. APIs & Services → Credentials
3. Edit OAuth client: 699635422526-ijgogea6agkjj987slnfqpkcjb5f7h3h
4. Authorized redirect URIs → Add URI
5. Paste your extension redirect URL
6. Save
```

---

## Test It Works

1. Reload extension: `chrome://extensions/` → Click reload
2. Open popup → Settings → "Sign in with Google"
3. Should see Google sign-in page → Sign in
4. Tab closes → "Successfully signed in" notification
5. Popup shows "Sign out (your@email.com)" ✅

---

## Need More Help?

- **Full Setup Guide:** [OAUTH_SETUP.md](./OAUTH_SETUP.md)
- **What Was Fixed:** [AUTH_FIX_SUMMARY.md](./AUTH_FIX_SUMMARY.md)
- **Debugging:** [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md)

---

## What Changed in Code?

✅ Fixed invalid Supabase key format in `config.js`
✅ Added token refresh on extension startup (`background.js`)
✅ Added token refresh when popup opens (`popup.js`)
✅ Added TOKEN_REFRESHED event handler (`background.js`)
✅ Created OAuth setup documentation

**Result:** Tokens now refresh automatically instead of expiring after 1 hour! 🎉

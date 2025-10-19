# Beetcode Chrome Extension - Production Deployment Guide

Complete step-by-step guide for deploying Beetcode extension to the Chrome Web Store.

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Phase 1: Production Configuration](#phase-1-production-configuration)
3. [Phase 2: Create Store Assets](#phase-2-create-store-assets)
4. [Phase 3: Package Extension](#phase-3-package-extension)
5. [Phase 4: Chrome Web Store Submission](#phase-4-chrome-web-store-submission)
6. [Phase 5: Post-Publication OAuth Setup](#phase-5-post-publication-oauth-setup)
7. [Phase 6: Testing & Launch](#phase-6-testing--launch)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### ✅ What You Already Have

- [x] Extension code complete and tested
- [x] Icons ready (16px, 32px, 64px, 128px) in `icons/` directory
- [x] Manifest V3 configured
- [x] OAuth client ID configured
- [x] Privacy policy created (`PRIVACY_POLICY.md`)
- [x] Store listing content prepared (`STORE_LISTING.md`)
- [x] Packaging script created (`package-extension.sh`)

### 📝 What You Need to Create

- [ ] Production `.env.config.js` with actual domain
- [ ] 3-5 screenshots of extension in use (1280x800 or 640x400)
- [ ] Promotional images for store:
  - Small tile: 440x280px
  - Large tile: 920x680px
  - Marquee: 1400x560px
- [ ] Public URL for privacy policy
- [ ] Chrome Web Store developer account ($5 one-time fee)

---

## Phase 1: Production Configuration

### Step 1.1: Update Production URLs

1. Open `.env.config.js` (already open in your IDE)

2. Replace placeholder URLs with your actual production domain:

```javascript
export const envConfig = {
  // Replace with your actual production domain
  dashboardUrl: 'https://beetcode.yourdomain.com',
  serviceUrl: 'https://beetcode.yourdomain.com'
};
```

**Example:**
- If deploying to Vercel: `https://beetcode.vercel.app`
- If using custom domain: `https://app.beetcode.com`

### Step 1.2: Verify Supabase Configuration

1. Open `config.js`
2. Verify the Supabase anon key is correct for production:

```javascript
supabase: {
  url: 'https://hukfgtczrtllqhlahuar.supabase.co',
  publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Verify this is correct
}
```

3. If using a different Supabase project for production, update these values

### Step 1.3: Update Manifest Version (Optional)

If this is an update to an existing extension:

1. Open `manifest.json`
2. Increment the version number:
```json
"version": "1.0.1"  // or "1.1.0" for features, "2.0.0" for breaking changes
```

---

## Phase 2: Create Store Assets

### Step 2.1: Take Screenshots

Take 3-5 high-quality screenshots (1280x800 or 640x400 pixels):

**Recommended Screenshots:**

1. **Extension Popup** - Show the main popup interface
   - Navigate to LeetCode problem
   - Open extension popup
   - Screenshot showing: current problem, timer, track button

2. **Dashboard View** - Show the main dashboard
   - Go to your dashboard URL
   - Screenshot showing: problem list, filters, statistics

3. **Problem Tracking in Action** - Show active tracking
   - Open popup while tracking a problem
   - Show the timer running and problem details

4. **Statistics View** - Show analytics
   - Dashboard with charts/stats visible
   - Show problems by difficulty, best times, etc.

5. **Authentication** - Show sign-in (optional)
   - Extension popup with "Sign in with Google" visible
   - Or dashboard showing user profile

**Screenshot Tips:**
- Use Chrome's built-in screenshot tool (Cmd+Shift+5 on Mac)
- Ensure high contrast and readable text
- Hide personal information (blur email if needed)
- Use consistent browser theme (light or dark)
- Show realistic data (not empty states)

### Step 2.2: Create Promotional Images

Create 3 promotional images using Figma, Canva, or Photoshop:

**1. Small Tile (440x280px)**
```
- Background: Orange/red gradient
- Beetcode logo (centered or left)
- Text: "Track Your LeetCode Progress"
- Subtext: "Automatic • Free • Secure"
```

**2. Large Tile (920x680px)**
```
- Background: Clean white or gradient
- Screenshot of extension popup (right side)
- Text overlay (left side):
  - "Smart LeetCode Tracking"
  - Bullet points: "Auto Time Tracking", "Cloud Sync", "Export Data"
- Beetcode logo (top left)
```

**3. Marquee (1400x560px)**
```
- Background: Gradient or branded
- Dashboard screenshot (center/right)
- Large text (left): "Level Up Your LeetCode"
- Subtext: "Automatic tracking • Analytics • Free Forever"
- Call to action: "Install Now"
```

**Design Resources:**
- Use Figma (free): https://figma.com
- Use Canva (free): https://canva.com
- Templates available in `STORE_LISTING.md`

### Step 2.3: Host Privacy Policy

Your privacy policy must be publicly accessible. **Options:**

**Option A: GitHub Pages (Recommended - Free)**
```bash
# 1. Create a docs branch or use main
git checkout -b gh-pages

# 2. Copy privacy policy to docs/
mkdir -p docs
cp PRIVACY_POLICY.md docs/privacy.md

# 3. Commit and push
git add docs/privacy.md
git commit -m "Add privacy policy for Chrome Web Store"
git push origin gh-pages

# 4. Enable GitHub Pages in repo settings
# Settings → Pages → Source: gh-pages branch → /docs folder
# Your URL will be: https://yourusername.github.io/beetcode/privacy
```

**Option B: Host on Your Dashboard Domain**
```bash
# In beetcode-dash, create a privacy page
# File: beetcode-dash/app/privacy/page.tsx

# Copy content from PRIVACY_POLICY.md and convert to React component
# URL will be: https://beetcode.yourdomain.com/privacy
```

**Option C: Google Sites or Other Free Hosting**
- Create a page on Google Sites
- Paste privacy policy content
- Publish and get public URL

**Save this URL** - you'll need it for Chrome Web Store submission!

---

## Phase 3: Package Extension

### Step 3.1: Clean Up Development Files

1. **Remove test files:**
```bash
cd /Users/calvinkorver/Code/beetcode/beetcode-tracker
rm -f BackendClient.test.js
rm -f *.test.js
```

2. **Verify no sensitive data:**
```bash
# Check that .env.config.js has production URLs (not localhost)
cat .env.config.js

# Look for any TODO comments
grep -r "TODO" *.js *.html
```

### Step 3.2: Run Packaging Script

```bash
cd /Users/calvinkorver/Code/beetcode/beetcode-tracker
./package-extension.sh
```

**The script will:**
- Check for `.env.config.js` and warn if using localhost
- Copy all necessary files to staging area
- Remove development/test files
- Create ZIP file in `dist/` directory
- Show package contents for review

**Output:** `dist/beetcode-extension-YYYYMMDD_HHMMSS.zip`

### Step 3.3: Test the Package Locally

**CRITICAL: Test before uploading!**

1. **Unload current development extension:**
   - Go to `chrome://extensions/`
   - Find "BeetCode Problem Tracker"
   - Click "Remove"

2. **Load the packaged extension:**
   - Extract the ZIP file you just created
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extracted folder

3. **Test all features:**
   - [ ] Extension icon appears in toolbar
   - [ ] Click "Sign in with Google" - OAuth flow works
   - [ ] Navigate to any LeetCode problem
   - [ ] Open popup - shows current problem
   - [ ] Click "Track Problem"
   - [ ] Verify problem appears in popup list
   - [ ] Click logo - redirects to production dashboard URL
   - [ ] Export CSV works
   - [ ] Sign out works

4. **Check console for errors:**
   - Background script: `chrome://extensions/` → "service worker"
   - Popup: Right-click popup → Inspect
   - Look for any errors or warnings

**If everything works ✅ proceed to submission**
**If issues found ❌ fix them, re-package, and re-test**

---

## Phase 4: Chrome Web Store Submission

### Step 4.1: Create Developer Account

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

2. **Requirements:**
   - Google Account with 2-step verification enabled
   - $5 one-time registration fee
   - Valid payment method

3. Sign in and complete registration

4. Accept Developer Agreement

### Step 4.2: Upload Extension

1. Click **"New Item"** button

2. **Upload ZIP file:**
   - Upload the file from `dist/beetcode-extension-*.zip`
   - Do NOT extract it - upload the ZIP directly

3. Wait for upload to complete
   - You'll see package validation results
   - Fix any errors if reported

### Step 4.3: Fill Out Store Listing

Navigate through the tabs and fill out all required information:

#### **📦 Package Tab** (Auto-filled)
- Review manifest details
- Verify version number
- Check permissions list

#### **🎨 Store Listing Tab**

**Product Details:**
- **Language:** English (United States)
- **Name:** Beetcode - LeetCode Progress Tracker
- **Summary:** (Copy from `STORE_LISTING.md` - Short Description)
  ```
  Track your LeetCode progress automatically. Monitor time, track problems solved,
  and accelerate your coding interview preparation.
  ```

**Description:** (Copy from `STORE_LISTING.md` - Detailed Description)
- Paste the full detailed description
- Use formatting for readability

**Category:**
- **Primary:** Developer Tools
- **Secondary:** Productivity (optional)

**Language:** English

**Icon:** Upload `icons/beetcode-128.png`

**Screenshots:**
- Upload 3-5 screenshots you created
- Add captions from `STORE_LISTING.md`

**Promotional Images:**
- **Small tile (440x280):** Upload promotional image
- **Large tile (920x680):** Upload promotional image
- **Marquee (1400x560):** Upload promotional image (optional but recommended)

**Links:**
- **Website:** Your dashboard URL (e.g., `https://beetcode.yourdomain.com`)
- **Support URL:** GitHub issues or support email

#### **🔒 Privacy Practices Tab**

**Privacy Policy:**
- **URL:** Paste your hosted privacy policy URL
  - Example: `https://yourusername.github.io/beetcode/privacy`
  - Or: `https://beetcode.yourdomain.com/privacy`

**Single Purpose Description:**
```
Beetcode tracks LeetCode problem-solving progress by recording problem identifiers,
completion status, and time spent to help users monitor their coding practice and
interview preparation.
```

**Permission Justifications:**

Copy these exactly:

**storage:**
```
Store user preferences and authentication tokens locally in Chrome to maintain
user sessions and extension settings.
```

**activeTab:**
```
Detect LeetCode problem pages and read problem identifiers to enable automatic
problem tracking functionality.
```

**identity:**
```
Enable Google OAuth 2.0 authentication for secure user sign-in and access to
cloud-synced progress data.
```

**tabs:**
```
Monitor tab updates to detect OAuth redirect completion during the sign-in process.
```

**notifications:**
```
Display success/error notifications to inform users when problems are tracked,
data is exported, or actions complete.
```

**Host Permission (leetcode.com):**
```
Extension requires access to LeetCode pages to detect problem information and
provide automatic tracking functionality. No data is collected from other websites.
```

**Data Usage Disclosure:**

Select these checkboxes and fill out:

- [x] **User Authentication Information**
  - Types: Email address, User IDs
  - Usage: Authentication, Account management
  - Transferred: Yes (to Supabase for cloud storage)
  - Sold: No

- [x] **Website Content**
  - Types: Web page elements (LeetCode problem identifiers)
  - Usage: App functionality
  - Transferred: Yes (to backend API)
  - Sold: No

- [x] **User Activity**
  - Types: Page views, User interactions (problem attempts, time tracking)
  - Usage: App functionality, Analytics
  - Transferred: Yes (to backend database)
  - Sold: No

**Certification:**
- [x] Check: "I certify that this information is accurate"

#### **🌍 Distribution Tab**

**Visibility:**
- **Public:** Listed on Chrome Web Store (recommended)
- **Unlisted:** Only accessible via direct link
- **Private:** Only for specific users/groups

Select: **Public**

**Countries/Regions:**
- Select: **All regions** (or specific countries if preferred)

**Pricing:**
- Select: **Free**

**Publishing Options:**
- [x] **Publish automatically after review** (recommended for first launch)
- Or uncheck to manually publish after approval

### Step 4.4: Submit for Review

1. **Review all tabs** - ensure no required fields are missing

2. Click **"Submit for Review"** button

3. **Confirmation:**
   - You'll receive email confirmation
   - Status will show "Pending Review"

4. **Review Timeline:**
   - Typical: 1-3 business days
   - Complex extensions: Up to 1 week
   - You'll receive email when reviewed

---

## Phase 5: Post-Publication OAuth Setup

⚠️ **CRITICAL STEP:** This must be done after extension is published!

### Why This is Necessary

When your extension is published to the Chrome Web Store, it gets a **permanent extension ID** that's different from your development/unpacked extension ID. OAuth redirect URLs must match this new production ID.

### Step 5.1: Get Production Extension ID

**After your extension is approved and published:**

1. Go to [Chrome Web Store](https://chrome.google.com/webstore)

2. Search for "Beetcode" (or go to your extension's store page)

3. **Option A:** Look at the URL
   ```
   https://chrome.google.com/webstore/detail/[EXTENSION_ID_HERE]
   ```
   The extension ID is the long string in the URL

4. **Option B:** Install and check
   - Install the extension from Chrome Web Store
   - Go to `chrome://extensions/`
   - Look under your extension name for "ID: [extension_id]"

5. **Save this ID** - you'll need it for OAuth setup

**Your redirect URL will be:**
```
https://[EXTENSION_ID].chromiumapp.org/
```

### Step 5.2: Update Supabase Redirect URL

1. Go to [Supabase Dashboard](https://app.supabase.com/)

2. Select your project: `hukfgtczrtllqhlahuar`

3. Navigate to: **Authentication** → **URL Configuration**

4. Under **Redirect URLs**, click **"Add URL"**

5. Paste your production redirect URL:
   ```
   https://[YOUR_EXTENSION_ID].chromiumapp.org/
   ```

6. Click **"Save"**

7. **Keep your development redirect URL** (don't delete it if you want to continue local dev)

### Step 5.3: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Select your project

3. Navigate to: **APIs & Services** → **Credentials**

4. Find OAuth 2.0 Client ID: `699635422526-ijgogea6agkjj987slnfqpkcjb5f7h3h`

5. Click to edit it

6. Under **Authorized redirect URIs**, click **"Add URI"**

7. Paste your production redirect URL:
   ```
   https://[YOUR_EXTENSION_ID].chromiumapp.org/
   ```

8. Click **"Save"**

### Step 5.4: Verify OAuth Configuration

**Checklist:**
- [ ] Production extension ID obtained from Chrome Web Store
- [ ] Redirect URL added to Supabase
- [ ] Redirect URL added to Google Cloud Console
- [ ] Both URLs match exactly (including trailing slash)

---

## Phase 6: Testing & Launch

### Step 6.1: Test Published Extension

1. **Uninstall development version:**
   - Go to `chrome://extensions/`
   - Remove any unpacked/development versions

2. **Install from Chrome Web Store:**
   - Search for "Beetcode" on Chrome Web Store
   - Click "Add to Chrome"

3. **Complete test suite:**
   - [ ] Extension installs successfully
   - [ ] Icon appears in toolbar
   - [ ] Click "Sign in with Google"
   - [ ] OAuth flow completes (tab closes, shows "Successfully signed in")
   - [ ] User email shows in popup
   - [ ] Navigate to LeetCode problem
   - [ ] Track problem works
   - [ ] Timer tracks accurately
   - [ ] Submit detection works
   - [ ] Problem appears in popup list
   - [ ] Click logo → redirects to production dashboard
   - [ ] Dashboard shows tracked problems
   - [ ] Export CSV works
   - [ ] Sign out works

4. **Check for errors:**
   - Open background service worker console
   - Open popup inspector
   - Look for any OAuth errors or API failures

**If OAuth fails:**
- Double-check redirect URLs match extension ID exactly
- Wait a few minutes for DNS propagation
- Try signing out and in again
- Check Google Cloud Console for error logs

### Step 6.2: Monitor Initial Launch

1. **Chrome Web Store Developer Dashboard:**
   - Monitor: Stats → Installs
   - Monitor: Reviews

2. **Check for issues:**
   - User reviews (respond within 24 hours)
   - Crash reports
   - Feature requests

3. **Analytics (Optional):**
   - Track extension installs
   - Monitor API usage on backend
   - Check Supabase metrics

### Step 6.3: Promote Your Extension

**Share on:**
- [ ] Reddit (r/leetcode, r/cscareerquestions)
- [ ] LinkedIn
- [ ] Twitter/X
- [ ] Dev.to or Medium blog post
- [ ] Discord communities (coding interview prep)
- [ ] Your personal network

**Include:**
- Chrome Web Store link
- Screenshot or demo GIF
- Key benefits
- "Free forever" messaging

---

## Troubleshooting

### Issue: Package Upload Fails

**Error:** "Package is invalid"

**Solutions:**
- Verify manifest.json is valid JSON
- Check all required manifest fields are present
- Ensure icons referenced in manifest exist
- Run: `cat manifest.json | jq .` to validate JSON

---

### Issue: Review Rejected for Privacy

**Error:** "Privacy policy doesn't match data usage"

**Solutions:**
- Ensure privacy policy URL is publicly accessible
- Update privacy policy to explicitly mention all data types
- Add clear "Data Usage" section
- Resubmit with updated privacy practices disclosure

---

### Issue: OAuth Not Working After Publishing

**Error:** "redirect_uri_mismatch" or "Invalid redirect URL"

**Solutions:**
1. Verify you're using the PRODUCTION extension ID
2. Check redirect URL format: `https://[EXTENSION_ID].chromiumapp.org/`
3. Ensure no typos in extension ID
4. Verify URL added to BOTH Supabase AND Google Cloud
5. Wait 5-10 minutes for changes to propagate
6. Clear extension data: `chrome://extensions/` → Clear storage
7. Sign out and try again

**Debug steps:**
```javascript
// In background service worker console:
chrome.identity.getRedirectURL()
// This should return: https://[EXTENSION_ID].chromiumapp.org/
```

---

### Issue: "Sign in with Google" Button Does Nothing

**Possible causes:**
1. OAuth client ID in manifest.json is wrong
2. Google Cloud project not configured
3. Redirect URLs not whitelisted
4. Extension ID changed

**Solutions:**
- Open background service worker console
- Look for errors
- Verify OAuth client ID: `699635422526-ijgogea6agkjj987slnfqpkcjb5f7h3h`
- Check Google Cloud Console → Credentials

---

### Issue: Extension Can't Connect to Backend

**Error:** "Failed to fetch" or "Network error"

**Solutions:**
1. Verify `.env.config.js` has correct production URLs
2. Check dashboard is deployed and accessible
3. Verify CORS is enabled on backend API routes
4. Check Supabase project is active
5. Verify Supabase anon key in config.js is correct

**Test backend:**
```bash
# Test API endpoint
curl https://beetcode.yourdomain.com/api/user-problems
# Should return 401 (needs auth) not 404 or 500
```

---

### Issue: Problems Not Syncing to Dashboard

**Possible causes:**
1. User not authenticated
2. Backend API errors
3. RLS policies blocking access
4. Supabase connection issues

**Debug:**
1. Check background script console for API errors
2. Verify user is signed in (check popup shows email)
3. Test dashboard login separately
4. Check Supabase logs for RLS policy violations

---

## Update Process

### For Future Updates

1. **Make changes** to extension code

2. **Update version** in manifest.json:
   ```json
   "version": "1.0.1"  // Increment appropriately
   ```

3. **Test locally** with updated code

4. **Re-package:**
   ```bash
   ./package-extension.sh
   ```

5. **Upload to Chrome Web Store:**
   - Developer Dashboard → Your extension
   - Click "Package" tab
   - Upload new ZIP
   - Click "Submit for Review"

6. **Review timeline:**
   - Updates typically review faster (24-48 hours)
   - Published automatically or manually based on settings

---

## Support Resources

### Documentation
- [Chrome Web Store Developer Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)

### Your Resources
- `README.md` - Extension overview
- `OAUTH_SETUP.md` - OAuth configuration details
- `DEBUGGING_GUIDE.md` - Debugging instructions
- `PRIVACY_POLICY.md` - Privacy policy content
- `STORE_LISTING.md` - Store listing copy

### Getting Help
- Chrome Web Store Developer Support Forum
- Your GitHub repository issues
- Stack Overflow (tag: chrome-extension)

---

## Checklist Summary

Before submission:
- [ ] Production .env.config.js configured
- [ ] Supabase config verified
- [ ] Screenshots created (3-5)
- [ ] Promotional images created (3)
- [ ] Privacy policy hosted publicly
- [ ] Extension packaged and tested
- [ ] All features working with production URLs
- [ ] Developer account created ($5 paid)

After publication:
- [ ] Production extension ID obtained
- [ ] Supabase redirect URL updated
- [ ] Google Cloud redirect URL updated
- [ ] Published extension tested end-to-end
- [ ] OAuth sign-in verified working
- [ ] Problem tracking tested
- [ ] Dashboard sync verified

Launch:
- [ ] Monitor reviews and respond
- [ ] Share on social media
- [ ] Update README with Chrome Web Store link
- [ ] Celebrate! 🎉

---

**You're ready to deploy!** Follow this guide step-by-step and your extension will be live on the Chrome Web Store. Good luck! 🚀

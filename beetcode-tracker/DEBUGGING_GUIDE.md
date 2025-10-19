# Beetcode Extension Debugging Guide

## ⚠️ IMPORTANT: OAuth Setup Required

**Before debugging, ensure you've completed the OAuth setup in [OAUTH_SETUP.md](./OAUTH_SETUP.md):**
- [ ] Supabase anon key configured in `config.js`
- [ ] Extension redirect URL whitelisted in Supabase
- [ ] Extension redirect URL whitelisted in Google Cloud Console

## Comprehensive Logging Added

The extension now has detailed logging throughout the tracking flow to help debug issues.

## How to View Logs

### 1. Background Script Logs (Service Worker)
1. Go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Find "Beetcode Tracker" extension
4. Click "service worker" or "Inspect views: service worker"
5. Open the Console tab

### 2. Content Script Logs (On LeetCode Pages)
1. Open any LeetCode problem page
2. Right-click → Inspect
3. Open Console tab
4. Look for logs prefixed with `BeetCode:`

### 3. Popup Logs
1. Click the extension icon
2. Right-click the popup → Inspect
3. Open Console tab

## Expected Log Flow for Tracking

When you click "Track" button, you should see:

### In Background Script Console:
```
=== BeetCode: handleStartTracking START ===
Problem object received: { id: "two-sum", ... }
Problem slug (problem.id): two-sum
Calling backendClient.trackProblem...

=== trackProblem called ===
problemSlug: two-sum
status: Attempted
time: null

=== BackendClient API Call ===
Endpoint: /problems/track
Base URL: http://localhost:3001
Auth headers: Present
Auth headers detail: { Authorization: "Bearer ey...", Content-Type: "..." }
Full URL: http://localhost:3001/api/problems/track
Request method: POST
Request body: {"problemSlug":"two-sum","status":"Attempted","time":null}
Making fetch request...

Response status: 200 OK
Response OK: true
Response data: { success: true, userProblemId: "...", metadata: {...} }
=== End API Call (Success) ===

=== trackProblem result ===
result: { success: true, userProblemId: "...", metadata: {...} }

Storing to chrome.storage with key: problem_two-sum
Storage data: { userProblemId: "...", metadata: {...}, ... }
Successfully stored to chrome.storage
Verification - read back from storage: { problem_two-sum: {...} }

=== BeetCode: Successfully started tracking ===
Problem slug: two-sum
User problem ID: uuid-here
Metadata: { problem_name: "Two Sum", difficulty: "Easy", ... }
=== handleStartTracking END ===
```

## Common Issues & Solutions

### 1. No Logs Appear at All
**Symptoms**: Nothing in console when clicking Track
**Possible causes**:
- Extension not loaded/active
- Content script not injected
- Service worker crashed

**Solutions**:
- Reload the extension at `chrome://extensions/`
- Refresh the LeetCode page
- Check if service worker is running (should see "service worker" link)

### 2. "Not authenticated" Error
**Symptoms**:
```
No valid session available
Error: Not authenticated - please sign in
```

**Solutions**:
- Sign in through the extension popup
- Check chrome.storage for session data:
  ```javascript
  chrome.storage.local.get(['session'], (result) => console.log(result))
  ```
- Verify the session has `access_token` and `refresh_token`
- Check if token has expired (tokens expire after ~1 hour)
- The extension now auto-refreshes tokens on startup and when popup opens

### 3. Network Error / Connection Refused
**Symptoms**:
```
Error type: TypeError
Error message: Failed to fetch
```

**Possible causes**:
- Backend server not running on localhost:3001
- CORS issues
- Wrong API URL

**Solutions**:
- Start the backend: `cd beetcode-dash && npm run dev`
- Verify server is running on port 3001
- Check `config.js` has correct `serviceUrl`

### 4. 404 Not Found
**Symptoms**:
```
Response status: 404 Not Found
Error: Problem not found in database
```

**Possible causes**:
- Problem not in `leetcode_problems` table (crawler hasn't indexed it)
- Wrong problem slug

**Solutions**:
- Check database has the problem:
  ```sql
  SELECT * FROM leetcode_problems WHERE problem_slug = 'two-sum';
  ```
- Populate `leetcode_problems` table with crawler data

### 5. 401 Unauthorized
**Symptoms**:
```
Response status: 401 Unauthorized
```

**Possible causes**:
- Token expired
- Token invalid
- Token not sent

**Solutions**:
- Sign out and sign in again
- Check auth headers are present in logs
- Verify token in chrome.storage is valid

## Manual Testing Commands

### Check Chrome Storage
```javascript
// In background script console or any extension context
chrome.storage.local.get(null, (items) => {
  console.log('All storage:', items);
});

// Check specific problem
chrome.storage.local.get(['problem_two-sum'], (result) => {
  console.log('Two Sum tracking data:', result);
});
```

### Test API Directly
```javascript
// In background script console
backendClient.trackProblem('two-sum', 'Attempted', null)
  .then(result => console.log('Result:', result))
  .catch(err => console.error('Error:', err));
```

### Check Authentication
```javascript
// In background script console
authService.isAuthenticated()
  .then(isAuth => console.log('Authenticated:', isAuth));

authService.getAuthHeaders()
  .then(headers => console.log('Headers:', headers))
  .catch(err => console.error('Error:', err));
```

## Server-Side Debugging

### Check Server Logs
When extension makes request, you should see in Next.js terminal:
```
API /problems/track - POST request received
Using token-based authentication
Tracking problem: two-sum
```

### Test API with curl
```bash
# Get your token from chrome.storage
TOKEN="your-token-here"

# Test track endpoint
curl -X POST http://localhost:3001/api/problems/track \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"problemSlug":"two-sum","status":"Attempted","time":null}'
```

## Success Indicators

✅ **Everything working correctly when you see:**
1. No errors in console
2. `userProblemId` returned from API
3. Data stored in `chrome.storage.local`
4. Server logs show request received
5. Database has new row in `user_problems` table

## Next Steps After Tracking Works

Once tracking works, test submission:
1. Track a problem
2. Click Submit button on LeetCode
3. Wait for result (Accepted/Wrong Answer)
4. Check logs show submission being processed
5. Verify database updated with time and status

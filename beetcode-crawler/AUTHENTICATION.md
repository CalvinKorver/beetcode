# LeetCode Authentication Guide

This guide explains how to set up authentication for the Beetcode crawler to access premium LeetCode problems.

## Why Authentication?

By default, the crawler can only access free LeetCode problems. To crawl premium (locked) problems, you need to authenticate with a LeetCode Premium account.

## Cookie-Based Authentication (Recommended)

The crawler uses cookie-based authentication, which is the most reliable and secure method.

### Step 1: Log in to LeetCode

1. Open your browser (Chrome/Firefox/Edge)
2. Go to [https://leetcode.com](https://leetcode.com)
3. Sign in to your LeetCode account (with Premium subscription)

### Step 2: Export Your Cookies

There are several ways to export cookies:

#### Option A: Using Browser DevTools (Manual)

1. While logged in to LeetCode, press `F12` to open DevTools
2. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
3. In the left sidebar, expand **Cookies** and select `https://leetcode.com`
4. Find these important cookies:
   - `LEETCODE_SESSION` - Your session token (most important)
   - `csrftoken` - CSRF protection token
5. Create a JSON file with this format:

```json
[
  {
    "name": "LEETCODE_SESSION",
    "value": "your-actual-session-value-here",
    "domain": ".leetcode.com",
    "path": "/",
    "expires": 1735689600,
    "httpOnly": true,
    "secure": true,
    "sameSite": "Lax"
  },
  {
    "name": "csrftoken",
    "value": "your-actual-csrf-value-here",
    "domain": ".leetcode.com",
    "path": "/",
    "expires": 1735689600,
    "httpOnly": false,
    "secure": true,
    "sameSite": "Lax"
  }
]
```

#### Option B: Using Browser Extension (Easier)

1. Install a cookie export extension:
   - Chrome: [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg)
   - Firefox: [Cookie-Editor](https://addons.mozilla.org/en-US/firefox/addon/cookie-editor/)
2. While on leetcode.com, click the extension icon
3. Export cookies as JSON
4. Save to a file (e.g., `leetcode-cookies.json`)

#### Option C: Using the Crawler's Helper Method

1. Set `HEADLESS=false` in your `.env` file
2. Remove or comment out `AUTH_COOKIES_FILE` temporarily
3. Run the crawler: `npm run dev`
4. Manually log in to LeetCode in the opened browser
5. In your code, call `crawler.saveCookies('leetcode-cookies.json')` after login
6. The cookies will be saved automatically

### Step 3: Configure the Crawler

1. Save your cookies to a file (e.g., `leetcode-cookies.json`)
2. Update your `.env` file:

```bash
AUTH_COOKIES_FILE=./leetcode-cookies.json
```

Or use an absolute path:

```bash
AUTH_COOKIES_FILE=/Users/yourname/beetcode/beetcode-crawler/leetcode-cookies.json
```

### Step 4: Run the Crawler

```bash
npm run dev
```

You should see:

```
✓ Authentication cookies loaded successfully
  Authenticated session enabled for Premium problems
```

## Security Notes

⚠️ **IMPORTANT**: Your cookies contain sensitive authentication tokens!

- **NEVER commit cookies to Git** - Add `*cookies*.json` to `.gitignore`
- **Keep cookies private** - They provide full access to your LeetCode account
- **Rotate cookies regularly** - Log out and log back in periodically
- **Check expiration** - Cookies expire; you'll need to refresh them

## Troubleshooting

### "Authentication failed: Cookies file not found"

- Check that the file path in `AUTH_COOKIES_FILE` is correct
- Use an absolute path if relative paths aren't working

### "Cookies file must contain an array of cookie objects"

- Ensure your JSON file is properly formatted
- It should be an array `[...]` not an object `{...}`
- Use `cookies.example.json` as a reference

### Still seeing "Premium" locked problems

- Verify your LeetCode account has an active Premium subscription
- Check that `LEETCODE_SESSION` cookie is correct and not expired
- Try exporting fresh cookies after logging out and back in

### Cookies expired

- LeetCode cookies typically expire after 1-2 weeks
- Simply export fresh cookies following the steps above
- The `expires` field in the cookie is a Unix timestamp

## Running Without Authentication

If you don't provide `AUTH_COOKIES_FILE`, the crawler will:

1. Continue to work normally
2. Only access free (non-premium) problems
3. Log a message: `Authentication: Disabled (free problems only)`

This is the default behavior and requires no special configuration.

## Advanced: Programmatic Cookie Export

If you want to automate cookie export, you can use this script:

```typescript
// save-cookies.ts
import { LeetCodeCrawler } from './src/crawler.js';

async function saveCookies() {
  const crawler = new LeetCodeCrawler({
    startUrl: 'https://leetcode.com/problems/two-sum/',
    maxProblems: 1,
    rateLimitMs: 1000,
    headless: false, // Must be false for manual login
    skipExisting: false,
    resumeFromLargest: false,
  });

  await crawler.init();

  console.log('Please log in to LeetCode in the browser...');
  console.log('Press Enter when you are logged in');

  // Wait for user to press Enter
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  await crawler.saveCookies('leetcode-cookies.json');
  await crawler.close();
}

saveCookies();
```

Run with: `npx tsx save-cookies.ts`

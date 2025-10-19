# BeetCode Tracker - Chrome Extension

Track your LeetCode problem-solving progress with automatic time tracking and statistics.

## 🚨 Authentication Setup Required

**The extension requires OAuth configuration to work.** Follow the quick start guide:

### **→ [QUICK_START.md](./QUICK_START.md)** ← Start here! (5 minutes)

## Documentation

| Document | Purpose |
|----------|---------|
| [QUICK_START.md](./QUICK_START.md) | **Start here** - 4 simple steps to fix authentication |
| [OAUTH_SETUP.md](./OAUTH_SETUP.md) | Complete OAuth setup guide with detailed instructions |
| [AUTH_FIX_SUMMARY.md](./AUTH_FIX_SUMMARY.md) | What was broken and how it was fixed |
| [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md) | Troubleshooting and logging guide |

## Features

- ✅ Automatic time tracking for LeetCode problems
- ✅ Track attempts and completion status
- ✅ View best times and statistics
- ✅ Export data to CSV
- ✅ Google OAuth authentication
- ✅ Sync across devices via cloud backend

## Installation (Development)

1. Clone the repository
2. **Complete OAuth setup** (see [QUICK_START.md](./QUICK_START.md))
3. Load unpacked extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `beetcode-tracker` folder

## Usage

1. Navigate to a LeetCode problem page
2. Click the BeetCode extension icon
3. Click "Track Problem" to start tracking
4. Solve the problem - time is tracked automatically
5. Submit your solution - status updates automatically
6. View your progress in the popup

## Architecture

```
beetcode-tracker/
├── manifest.json          # Extension configuration
├── popup.html/js/css      # Extension popup UI
├── content.js             # LeetCode page integration
├── background.js          # Service worker (message handling, OAuth)
├── config.js              # Configuration (⚠️ needs Supabase key)
├── supabase-client.js     # Minimal Supabase auth client
├── BackendClient.js       # API client for backend
└── AuthenticationService.js # Auth token management
```

## Configuration

### Required: Supabase Anon Key

Edit `config.js` and replace `YOUR_SUPABASE_ANON_KEY_HERE` with your actual key:

```javascript
export const config = {
  serviceUrl: 'http://localhost:3001',
  supabase: {
    url: 'https://hukfgtczrtllqhlahuar.supabase.co',
    publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Your key here
  }
};
```

Get your key from: Supabase Dashboard → Settings → API → anon/public key

### Required: OAuth Redirect URLs

See [OAUTH_SETUP.md](./OAUTH_SETUP.md) for detailed instructions on configuring:
- Supabase redirect URLs
- Google Cloud Console OAuth settings

## Development

### Prerequisites

- Chrome browser
- Supabase project with authentication enabled
- Google OAuth credentials
- Backend API running (see `beetcode-dash/`)

### Local Development

1. Start the backend API:
   ```bash
   cd ../beetcode-dash
   npm run dev
   ```

2. Load the extension in Chrome (see Installation above)

3. Make changes to extension files

4. Reload the extension:
   - Go to `chrome://extensions/`
   - Click the reload icon on BeetCode extension

### Debugging

- **Background script**: `chrome://extensions/` → Click "service worker"
- **Popup**: Right-click popup → Inspect
- **Content script**: Open LeetCode page → F12 → Console

See [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md) for detailed debugging instructions.

## Troubleshooting

### "Sign in with Google" doesn't work
→ See [QUICK_START.md](./QUICK_START.md) - OAuth setup required

### "Not authenticated" errors
→ Check Supabase anon key in `config.js`

### Redirect URL mismatch
→ Follow [OAUTH_SETUP.md](./OAUTH_SETUP.md) to configure redirect URLs

### Extension not tracking problems
→ Check [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md) for console logs

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (ES6 modules)
- Supabase Authentication
- Google OAuth 2.0
- Chrome Identity API

## Security

- Uses Chrome's secure storage for tokens
- Automatic token refresh (tokens don't expire)
- Row Level Security (RLS) in Supabase backend
- OAuth 2.0 PKCE flow

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (see [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md))
5. Submit a pull request

## License

[Add your license here]

## Support

For issues and questions:
1. Check [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md)
2. Review [OAUTH_SETUP.md](./OAUTH_SETUP.md)
3. Open an issue on GitHub

---

**Next Steps:** Follow [QUICK_START.md](./QUICK_START.md) to get authentication working! 🚀

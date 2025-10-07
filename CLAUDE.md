# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beetcode is a LeetCode problem tracking system consisting of three main components:

1. **beetcode-tracker/** - Chrome extension (Manifest V3) for tracking LeetCode problems in real-time
2. **beetcode-dash/** - Next.js dashboard for viewing problem history and statistics
3. **beetcode-crawler/** - Puppeteer-based crawler that populates the `leetcode_problems` table with metadata

## Architecture

### Database Design (Supabase)

The system uses two main tables:

- **`leetcode_problems`** - Global table of all LeetCode problems (populated by crawler)
  - Contains: problem_slug, problem_name, difficulty, leetcode_id, problem_url, tags
  - No RLS policies (read-only for users)

- **`user_problems`** - User's problem attempts/completions (populated by extension and dashboard)
  - Contains: user_id, problem_slug (FK), status, best_time_seconds, score, timestamps
  - RLS policies enforce users only see their own data

- **`user_problems_with_metadata`** - View that joins user_problems with leetcode_problems
  - Used by dashboard to display problems with full metadata

### Data Flow

1. **Crawler** → Populates `leetcode_problems` with metadata from LeetCode
2. **Extension** → Tracks problem via API → Creates/updates `user_problems` record
3. **Dashboard** → Queries `user_problems_with_metadata` view → Displays user's progress

### Key Design Patterns

- **Extension → Backend API**: Extension sends only `problemSlug` to backend. Backend looks up metadata from `leetcode_problems` table (populated by crawler)
- **Conflict Resolution**: `upsertProblem()` only upgrades status (Attempted → Completed) and only updates best_time if it's better
- **Authentication**: Supabase Auth with Google OAuth, Chrome Identity API for extension

## Commands

### beetcode-dash (Next.js Dashboard)

```bash
cd beetcode-dash
npm install
npm run dev              # Start dev server with Turbopack
npm run build            # Production build
npm start                # Start production server
npm run lint             # Run ESLint

# Testing
npm test                 # Run all tests (Vitest)
npm run test:watch       # Watch mode
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:unit:watch
npm run test:integration:watch
```

### beetcode-crawler (Puppeteer Crawler)

```bash
cd beetcode-crawler
npm install
npm run build            # Compile TypeScript
npm start                # Run crawler (must build first)
npm run dev              # Build and run
npm run clean            # Remove dist/
```

**Environment Variables** (`.env`):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (NOT anon key - needs write access)
- `START_URL` - LeetCode problem to start from
- `MAX_PROBLEMS` - Number of problems to crawl
- `RATE_LIMIT_MS` - Delay between requests (default: 2000)
- `RESUME_FROM_LARGEST` - Start from largest leetcode_id in database (ignores START_URL)
- `AUTH_COOKIES_FILE` - Path to cookies JSON for authentication (optional, enables Premium problems)

**Authentication** (for Premium problems):
- See [beetcode-crawler/AUTHENTICATION.md](beetcode-crawler/AUTHENTICATION.md) for detailed setup
- Export cookies from browser after logging into LeetCode
- Set `AUTH_COOKIES_FILE=./leetcode-cookies.json` in `.env`
- Without authentication, crawler only accesses free problems

### beetcode-tracker (Chrome Extension)

No build process - load directly in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `beetcode-tracker/` folder

**Configuration** (`config.js`):
- Update `supabase.publishableKey` with your Supabase anon key
- Update `serviceUrl` to point to your backend API (default: `http://localhost:3001`)

**OAuth Setup Required**: See `beetcode-tracker/QUICK_START.md` for Google OAuth configuration

## API Routes (beetcode-dash)

- `POST /api/problems/track` - Track a problem (creates user_problem if doesn't exist)
  - Body: `{ problemSlug, status, time }` (time in milliseconds)
  - Returns: `{ userProblemId, metadata }`

- `GET /api/user-problems` - Get all user's problems with metadata
  - Query params: `status`, `limit`, `offset`
  - Returns: `{ problems, stats }`

- `PUT /api/user-problems/[id]` - Update a user problem
  - Body: `{ status, time }` (time in milliseconds)
  - Returns: `{ userProblem }`

## Important Services

### problemsService (beetcode-dash)

Located at `lib/services/problemsService.ts` - handles all database operations:

- `trackProblem(problemSlug, status?, timeSeconds?)` - Create/get user_problem record
- `upsertProblem(problemData)` - Insert or update with conflict resolution
- `getProblemsForUser()` - Get all problems for authenticated user (joined with metadata)
- `updateProblem(problemId, updates)` - Update existing user_problem
- `syncFromExtension(extensionData)` - Convert extension format to database format

### BackendClient (beetcode-tracker)

Located at `beetcode-tracker/BackendClient.js` - extension's API client:

- `trackProblem(problemSlug, status, time)` - Track problem (returns userProblemId and metadata)
- `submitProblem(userProblemId, duration, isCompleted)` - Update problem attempt
- `getProblems(options)` - Get user's problems
- `testConnection()` - Verify API and auth

## Development Workflow

### Adding a New Feature to Extension

1. Modify extension files in `beetcode-tracker/`
2. Go to `chrome://extensions/`
3. Click reload icon on BeetCode extension
4. Test on LeetCode problem page

### Adding a New API Endpoint

1. Create route in `beetcode-dash/app/api/`
2. Use `createClient()` from `@/utils/supabase/server` for auth
3. Use `problemsService` for database operations
4. Update `BackendClient.js` in extension if needed

### Running the Full Stack Locally

1. Start dashboard: `cd beetcode-dash && npm run dev` (runs on port 3000)
2. Update extension config.js to point to `http://localhost:3000`
3. Load extension in Chrome
4. Test on LeetCode

### Database Migrations

1. Write SQL migration in `beetcode-dash/database/`
2. Name with convention: `01-description.sql`, `02-description.sql`
3. Run in Supabase SQL Editor
4. Update TypeScript types in `lib/services/problemsService.ts` if needed

## Tech Stack

- **Dashboard**: Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS, Vitest
- **Extension**: Vanilla JS (ES6 modules), Chrome Manifest V3, Supabase Auth
- **Crawler**: TypeScript, Puppeteer, Node.js 20
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Google OAuth 2.0 via Supabase Auth

## Security Notes

- Extension uses Chrome's secure storage for tokens
- All API routes verify authentication via Supabase
- RLS policies enforce data isolation between users
- Crawler requires service role key (keep private)
- Never commit `.env` or `config.js` with real credentials

## Common Development Tasks

### Debugging Extension

- **Background script**: `chrome://extensions/` → Click "service worker"
- **Popup**: Right-click popup → Inspect
- **Content script**: Open LeetCode page → F12 → Console
- **See**: `beetcode-tracker/DEBUGGING_GUIDE.md`

### Testing Problem Tracking

1. Navigate to any LeetCode problem
2. Open extension popup
3. Click "Track Problem"
4. Solve and submit
5. Check dashboard at `/protected` to see updated data

### Crawling New Problems

```bash
cd beetcode-crawler
# Crawl 10 problems starting from where you left off
RESUME_FROM_LARGEST=true MAX_PROBLEMS=10 npm run dev
```

## Troubleshooting

### Extension "Not authenticated" errors
- Verify Supabase anon key in `beetcode-tracker/config.js`
- Check OAuth redirect URLs (see `OAUTH_SETUP.md`)
- Clear Chrome storage and re-authenticate

### Dashboard shows no problems
- Check RLS policies on `user_problems` table
- Verify user is authenticated (check browser console)
- Ensure extension has tracked at least one problem

### Crawler fails to insert problems
- Verify using service role key (not anon key)
- Check `leetcode_problems` table exists (run migration)
- Try non-headless mode: `HEADLESS=false npm start`

### Rules for developing:

- Every new feature or change should be accompanied by unit testing if applicable and then a run of the tests in that directory's test folder.
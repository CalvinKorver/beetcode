# Beetcode Crawler

A web crawler for systematically scraping LeetCode problem metadata and storing it in the Beetcode database.

## Overview

The Beetcode Crawler uses Puppeteer to navigate through LeetCode problems, extracting metadata such as:
- Problem slug (unique identifier)
- LeetCode ID (official problem number)
- Problem name
- Difficulty (Easy/Medium/Hard)
- Problem URL

All crawled data is stored in the `leetcode_problems` table in Supabase.

## Setup

### 1. Install Dependencies

```bash
cd beetcode-crawler
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Supabase Configuration (use service role key for write access)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Crawler Configuration
START_URL=https://leetcode.com/problems/add-two-numbers/
MAX_PROBLEMS=5
RATE_LIMIT_MS=2000

# Optional: Set to false to see browser (useful for debugging)
HEADLESS=true
```

**Important:** Use the **Service Role Key**, not the anon/public key, as the crawler needs write access to the `leetcode_problems` table.

### 3. Run Database Migration

Before running the crawler, ensure you've run the database migration to create the `leetcode_problems` table:

```sql
-- Run this in your Supabase SQL Editor
-- See /migration-user-problems.sql for the full migration
```

## Usage

### Build and Run

```bash
# Build the TypeScript code
npm run build

# Run the crawler
npm start
```

### Development Mode

```bash
# Build and run in one command
npm run dev
```

### Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `START_URL` | The LeetCode problem to start crawling from | `https://leetcode.com/problems/add-two-numbers/` |
| `MAX_PROBLEMS` | Maximum number of problems to crawl in one run | `5` |
| `RATE_LIMIT_MS` | Delay between requests (milliseconds) | `2000` |
| `HEADLESS` | Run browser in headless mode | `true` |
| `SKIP_EXISTING` | Skip problems that already exist in the database | `true` |
| `RESUME_FROM_LARGEST` | When `true`, disregards `START_URL` and starts from the largest leetcode_id in the database | `false` |

### Resume From Largest

To continue crawling from where you left off, set `RESUME_FROM_LARGEST=true`:

```bash
# This will automatically start from the next problem after the largest leetcode_id in your database
RESUME_FROM_LARGEST=true npm start
```

This is useful for:
- Resuming an interrupted crawl session
- Incrementally adding new problems without manually tracking where you left off
- Running scheduled jobs that always pick up from the latest problem

## How It Works

1. **Initialize Browser**: Launches a Puppeteer browser instance
2. **Determine Start Point**:
   - If `RESUME_FROM_LARGEST=true`, queries the database for the largest leetcode_id and starts from the next problem
   - Otherwise, uses `START_URL`
3. **Navigate to Start URL**: Opens the first problem page
4. **Extract Metadata**: Uses CSS selectors to extract problem information
   - Title from: `#qd-content a[href*="/problems/"]:not([href*="/discuss/"])`
   - Difficulty from: `div[class*="text-difficulty-"]`
5. **Find Next Problem**: Locates the "next" button using `a.group.flex-none.cursor-pointer[href*="/problems/"]`
6. **Rate Limiting**: Waits before navigating to the next problem
7. **Save to Database**: Upserts all crawled problems to Supabase
8. **Repeat**: Continues until MAX_PROBLEMS limit is reached

## Deployment

### Manual Run

```bash
cd beetcode-crawler
npm start
```

### Cron Job (Daily)

Add to your crontab to run daily at 2 AM:

```bash
0 2 * * * cd /path/to/beetcode-crawler && npm start >> /var/log/beetcode-crawler.log 2>&1
```

### GitHub Actions (Recommended)

Create `.github/workflows/crawler.yml` in your repository:

```yaml
name: LeetCode Crawler

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd beetcode-crawler
          npm install

      - name: Run crawler
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          MAX_PROBLEMS: 100
        run: |
          cd beetcode-crawler
          npm run build
          npm start
```

Add your secrets in GitHub: Settings → Secrets and variables → Actions

## Scaling Up

To crawl all ~3000 LeetCode problems:

```bash
# Set higher limit
MAX_PROBLEMS=3000 npm start

# Or edit .env file
MAX_PROBLEMS=3000
```

**Note:** Crawling 3000 problems at 2 seconds per problem takes ~100 minutes. Run during off-peak hours.

## Troubleshooting

### Browser won't launch

Try running in non-headless mode to see errors:

```bash
HEADLESS=false npm start
```

### Selectors not found

LeetCode may have changed their DOM structure. Update selectors in `src/crawler.ts`:
- Title selector (line ~61)
- Difficulty selector (line ~79)
- Next button selector (line ~146)

### Rate limiting

If you get blocked, increase `RATE_LIMIT_MS`:

```bash
RATE_LIMIT_MS=5000 npm start
```

## Architecture

```
beetcode-crawler/
├── src/
│   ├── index.ts      # CLI entry point
│   ├── crawler.ts    # Puppeteer crawling logic
│   └── db.ts         # Supabase operations
├── package.json
├── tsconfig.json
└── .env
```

## License

MIT

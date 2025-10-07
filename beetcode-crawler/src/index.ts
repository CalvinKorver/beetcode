import dotenv from 'dotenv';
import { LeetCodeCrawler, CrawlerConfig } from './crawler.js';
import { DatabaseService } from './db.js';

// Load environment variables
dotenv.config();

async function main() {
  console.log('=== Beetcode Crawler ===\n');

  // Validate environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing required environment variables');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file');
    process.exit(1);
  }

  // Crawler configuration
  const config: CrawlerConfig = {
    startUrl: process.env.START_URL || 'https://leetcode.com/problems/add-two-numbers/',
    maxProblems: parseInt(process.env.MAX_PROBLEMS || '5', 10),
    rateLimitMs: parseInt(process.env.RATE_LIMIT_MS || '2000', 10),
    headless: process.env.HEADLESS !== 'false',
    skipExisting: process.env.SKIP_EXISTING !== 'false', // Default to true
    resumeFromLargest: process.env.RESUME_FROM_LARGEST === 'true', // Default to false
    cookiesFile: process.env.AUTH_COOKIES_FILE || undefined,
  };

  console.log('Configuration:');
  console.log(`  Start URL: ${config.startUrl}`);
  console.log(`  Max Problems: ${config.maxProblems}`);
  console.log(`  Rate Limit: ${config.rateLimitMs}ms`);
  console.log(`  Headless: ${config.headless}`);
  console.log(`  Skip Existing: ${config.skipExisting}`);
  console.log(`  Resume From Largest: ${config.resumeFromLargest}`);
  console.log(`  Authentication: ${config.cookiesFile ? `Enabled (${config.cookiesFile})` : 'Disabled (free problems only)'}\n`);

  // Initialize database service
  const db = new DatabaseService(supabaseUrl, supabaseKey);
  console.log('Database service initialized\n');

  // Get current problem count
  const initialCount = await db.getProblemCount();
  console.log(`Current problems in database: ${initialCount}\n`);

  // Initialize crawler with database service
  const crawler = new LeetCodeCrawler(config, db);

  try {
    // Initialize browser
    await crawler.init();

    // Start crawling
    console.log('Starting crawl...\n');
    const problems = await crawler.crawl();

    // Save problems to database
    let savedCount = 0;
    if (problems.length > 0) {
      console.log('\nSaving problems to database...');
      savedCount = await db.upsertProblems(problems);
      console.log(`Saved ${savedCount}/${problems.length} problems to database`);

      // Get updated count
      const finalCount = await db.getProblemCount();
      console.log(`Total problems in database: ${finalCount}`);
      console.log(`New problems added: ${finalCount - initialCount}`);
    } else {
      console.log('\nNo problems to save');
    }

    console.log('\n=== Crawl Summary ===');
    console.log(`Problems crawled: ${problems.length}`);
    console.log(`Problems saved: ${savedCount}`);
    console.log('Status: SUCCESS ✓');
  } catch (error) {
    console.error('\n=== Crawl Failed ===');
    console.error('Error:', error);
    process.exit(1);
  } finally {
    // Always close the browser
    await crawler.close();
  }
}

// Run the main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

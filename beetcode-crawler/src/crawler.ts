import puppeteer, { Browser, Page } from 'puppeteer';
import { LeetCodeProblem, DatabaseService } from './db.js';

export interface CrawlerConfig {
  startUrl: string;
  maxProblems: number;
  rateLimitMs: number;
  headless: boolean;
  skipExisting: boolean;
  resumeFromLargest: boolean;
}

/**
 * Utility function to wait/sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class LeetCodeCrawler {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: CrawlerConfig;
  private crawledProblems: LeetCodeProblem[] = [];
  private db: DatabaseService | null = null;

  constructor(config: CrawlerConfig, db?: DatabaseService) {
    this.config = config;
    this.db = db || null;
  }

  /**
   * Initialize the browser and page
   */
  async init(): Promise<void> {
    console.log('Initializing browser...');
    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.page = await this.browser.newPage();

    // Set user agent to avoid detection
    await this.page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log('Browser initialized successfully');
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('Browser closed');
    }
  }

  /**
   * Extract problem information from the current page
   */
  private async extractProblemInfo(url: string): Promise<LeetCodeProblem | null> {
    if (!this.page) {
      console.error('Page not initialized');
      return null;
    }

    try {
      // Extract problem slug from URL
      const slugMatch = url.match(/\/problems\/([^\/]+)/);
      if (!slugMatch) {
        console.error('Could not extract slug from URL:', url);
        return null;
      }
      const problemSlug = slugMatch[1];

      // Wait for the title element to load
      await this.page.waitForSelector('#qd-content a[href*="/problems/"]:not([href*="/discuss/"])', {
        timeout: 10000,
      });

      // Extract problem metadata
      const problemData = await this.page.evaluate(() => {
        // Extract problem title and ID
        const titleElement = document.querySelector(
          '#qd-content a[href*="/problems/"]:not([href*="/discuss/"])'
        );
        let leetcodeId: number | null = null;
        let problemTitle: string | null = null;

        if (titleElement) {
          const rawTitle = titleElement.textContent?.trim();
          if (rawTitle) {
            // Extract leetcode ID (e.g., "2. Add Two Numbers" → 2)
            const idMatch = rawTitle.match(/^(\d+)\.\s*/);
            leetcodeId = idMatch ? parseInt(idMatch[1], 10) : null;
            problemTitle = leetcodeId ? rawTitle.replace(/^\d+\.\s*/, '') : rawTitle;
          }
        }

        // Extract difficulty
        const difficultyElement = document.querySelector('div[class*="text-difficulty-"]');
        let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
        if (difficultyElement) {
          const difficultyText = difficultyElement.textContent?.trim().toLowerCase();
          if (difficultyText === 'easy') difficulty = 'Easy';
          else if (difficultyText === 'medium') difficulty = 'Medium';
          else if (difficultyText === 'hard') difficulty = 'Hard';
        }

        return {
          leetcodeId,
          problemTitle,
          difficulty,
        };
      });

      if (!problemData.problemTitle) {
        console.error('Could not extract problem title from page');
        return null;
      }

      const problem: LeetCodeProblem = {
        problem_slug: problemSlug,
        leetcode_id: problemData.leetcodeId,
        problem_name: problemData.problemTitle,
        difficulty: problemData.difficulty,
        problem_url: url,
      };

      console.log(
        `Extracted: ${problem.leetcode_id}. ${problem.problem_name} (${problem.difficulty})`
      );

      return problem;
    } catch (error) {
      console.error('Error extracting problem info:', error);
      return null;
    }
  }

  /**
   * Find the next problem URL by looking for the chevron-right navigation button
   */
  private async findNextProblemUrl(): Promise<string | null> {
    if (!this.page) return null;

    try {
      // Wait for navigation container to be fully loaded
      await sleep(1500);

      // Find the next button: it's an <a> tag with href containing /problems/ that has a chevron-right SVG
      const nextUrl = await this.page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="/problems/"]');

        // Look for the one that contains the chevron-right SVG
        for (const link of Array.from(links)) {
          const svg = link.querySelector('svg[data-icon="chevron-right"]');
          if (svg) {
            return (link as HTMLAnchorElement).href;
          }
        }

        return null;
      });

      if (nextUrl && nextUrl.includes('/problems/')) {
        return nextUrl;
      }

      return null;
    } catch (error) {
      console.error('Error finding next problem:', error);
      return null;
    }
  }

  /**
   * Navigate to a URL and wait for page load
   */
  private async navigateTo(url: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      console.log(`Navigating to: ${url}`);
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Additional wait to ensure dynamic content loads
      await sleep(1000);

      return true;
    } catch (error) {
      console.error(`Error navigating to ${url}:`, error);
      return false;
    }
  }

  /**
   * Crawl LeetCode problems starting from the configured URL
   */
  async crawl(): Promise<LeetCodeProblem[]> {
    if (!this.browser || !this.page) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    let currentUrl = this.config.startUrl;

    // If resumeFromLargest is enabled, get the largest problem and use its URL
    if (this.config.resumeFromLargest) {
      if (!this.db) {
        throw new Error('Database service is required when resumeFromLargest is enabled');
      }

      const largestProblem = await this.db.getLargestProblem();
      if (largestProblem) {
        console.log(`📍 Resuming from largest problem in database:`);
        console.log(`   ID: ${largestProblem.leetcode_id}`);
        console.log(`   Name: ${largestProblem.problem_name}`);
        console.log(`   URL: ${largestProblem.problem_url}\n`);
        currentUrl = largestProblem.problem_url;
      } else {
        console.log('⚠️  No problems found in database, using startUrl\n');
      }
    }

    let problemCount = 0;
    let isResumeNavigation = this.config.resumeFromLargest;

    console.log(`Starting crawl from: ${currentUrl}`);
    console.log(`Max problems to crawl: ${this.config.maxProblems}`);
    console.log(`Skip existing: ${this.config.skipExisting}`);
    console.log(`Resume from largest: ${this.config.resumeFromLargest}`);
    console.log(`Rate limit: ${this.config.rateLimitMs}ms\n`);

    while (problemCount < this.config.maxProblems && currentUrl) {
      // Navigate to the current problem page first (needed to find next button)
      const navigated = await this.navigateTo(currentUrl);
      if (!navigated) {
        console.error('Failed to navigate, stopping crawl');
        break;
      }

      // If this is the initial resume navigation, skip extraction and just get the next problem
      if (isResumeNavigation) {
        console.log('🔄 Finding next problem after resume point...');
        const nextUrl = await this.findNextProblemUrl();
        if (!nextUrl) {
          console.log('No next problem found after resume point, stopping crawl');
          break;
        }
        currentUrl = nextUrl;
        isResumeNavigation = false;
        await sleep(this.config.rateLimitMs);
        continue;
      }

      // Extract slug from current URL to check if it exists
      const slugMatch = currentUrl.match(/\/problems\/([^\/]+)/);
      const problemSlug = slugMatch ? slugMatch[1] : null;

      // Check if we should skip this problem
      if (this.config.skipExisting && this.db && problemSlug) {
        const exists = await this.db.problemExists(problemSlug);
        if (exists) {
          console.log(`⏭️  Skipping existing problem: ${problemSlug}`);

          // Find next problem and continue
          const nextUrl = await this.findNextProblemUrl();
          if (!nextUrl) {
            console.log('No next problem found, stopping crawl');
            break;
          }
          currentUrl = nextUrl;
          await sleep(this.config.rateLimitMs);
          continue;
        }
      }

      // Extract problem information
      const problem = await this.extractProblemInfo(currentUrl);
      if (problem) {
        this.crawledProblems.push(problem);
        problemCount++;
        console.log(`✓ Crawled: ${problem.problem_name}`);
        console.log(`Progress: ${problemCount}/${this.config.maxProblems}\n`);
      } else {
        console.warn('Failed to extract problem info, continuing...\n');
      }

      // Stop if we've reached the limit
      if (problemCount >= this.config.maxProblems) {
        console.log('Reached max problem limit');
        break;
      }

      // Find the next problem URL
      const nextUrl = await this.findNextProblemUrl();
      if (!nextUrl) {
        console.log('No next problem found, stopping crawl');
        break;
      }

      currentUrl = nextUrl;

      // Rate limiting
      console.log(`Waiting ${this.config.rateLimitMs}ms before next request...`);
      await sleep(this.config.rateLimitMs);
    }

    console.log(`\nCrawl complete. Total problems crawled: ${this.crawledProblems.length}`);
    return this.crawledProblems;
  }

  /**
   * Get the crawled problems
   */
  getProblems(): LeetCodeProblem[] {
    return this.crawledProblems;
  }
}

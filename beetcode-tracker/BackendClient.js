// BackendClient - Clean API client for BeetCode backend (no local storage)
import { config } from './config.js';
import { authService } from './AuthenticationService.js';

export class BackendClient {
  constructor() {
    this.baseUrl = config.serviceUrl;
  }

  /**
   * Generic API call wrapper with authentication
   */
  async apiCall(endpoint, options = {}) {
    try {
      const authHeaders = await authService.getAuthHeaders();

      const url = `${this.baseUrl}/api${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API call failed [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Track a new problem or update tracking status
   * @param {Object} problem - Problem data with id, name, url, difficulty, etc.
   * @returns {Promise<Object>} The tracked problem from backend
   */
  async trackProblem(problem) {
    const result = await this.apiCall('/problems/track', {
      method: 'POST',
      body: JSON.stringify(problem)
    });

    return result.problem;
  }

  /**
   * Submit a problem attempt (record time entry and potentially mark complete)
   * @param {string} problemId - Problem slug/id
   * @param {number} duration - Time spent in milliseconds
   * @param {boolean} isCompleted - Whether problem was successfully completed
   * @param {number} timestamp - Submission timestamp
   * @returns {Promise<Object>} Updated problem from backend
   */
  async submitProblem(problemId, duration, isCompleted, timestamp) {
    const result = await this.apiCall('/problems/submit', {
      method: 'POST',
      body: JSON.stringify({
        problemId,
        duration,
        isCompleted,
        timestamp
      })
    });

    return result.problem;
  }

  /**
   * Get all problems for the authenticated user
   * @returns {Promise<Object>} Object containing problems array and stats
   */
  async getProblems() {
    const result = await this.apiCall('/problems/user');

    return {
      problems: result.problems,
      stats: result.stats
    };
  }

  /**
   * Update problem metadata (name, difficulty, leetcodeId, etc.)
   * @param {string} problemId - Problem slug/id
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated problem from backend
   */
  async updateProblemInfo(problemId, updates) {
    const result = await this.apiCall(`/problems/${problemId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });

    return result.problem;
  }

  /**
   * Check if a problem is currently being tracked
   * @param {string} problemId - Problem slug/id
   * @returns {Promise<boolean>} True if problem is in TRACKING status
   */
  async checkTrackingStatus(problemId) {
    try {
      const result = await this.apiCall(`/problems/${problemId}/status`);
      return result.status === 'TRACKING';
    } catch (error) {
      // If problem doesn't exist or error occurs, return false
      console.warn(`Error checking tracking status for ${problemId}:`, error);
      return false;
    }
  }

  /**
   * Test API connection and authentication
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      const isAuth = await authService.isAuthenticated();
      if (!isAuth) {
        throw new Error('Not authenticated - please sign in');
      }

      const { problems } = await this.getProblems();

      return {
        success: true,
        message: `Connected to ${this.baseUrl} - Found ${problems?.length || 0} problems`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const backendClient = new BackendClient();

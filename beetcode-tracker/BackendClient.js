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
      console.log('=== BackendClient API Call ===');
      console.log('Endpoint:', endpoint);
      console.log('Base URL:', this.baseUrl);

      const authHeaders = await authService.getAuthHeaders();
      console.log('Auth headers:', authHeaders ? 'Present' : 'Missing');
      console.log('Auth headers detail:', authHeaders);

      const url = `${this.baseUrl}/api${endpoint}`;
      console.log('Full URL:', url);
      console.log('Request method:', options.method || 'GET');
      console.log('Request body:', options.body);

      console.log('Making fetch request...');
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options.headers
        },
        ...options
      });

      console.log('Response status:', response.status, response.statusText);
      console.log('Response OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error body:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      console.log('=== End API Call (Success) ===');

      return data;
    } catch (error) {
      console.error('=== API Call Error ===');
      console.error('Endpoint:', endpoint);
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      console.error('=== End API Call Error ===');
      throw error;
    }
  }

  /**
   * Track a problem - creates or returns existing user_problem record
   * Per API Design: Send just problemSlug, backend has the metadata via crawler
   *
   * @param {string} problemSlug - Problem slug (e.g., "two-sum")
   * @param {string} status - "Attempted" or "Completed" (defaults to "Attempted")
   * @param {number|null} time - Time in milliseconds (optional)
   * @returns {Promise<{userProblemId: string, metadata: Object}>} The user_problem UUID and problem metadata
   */
  async trackProblem(problemSlug, status = 'Attempted', time = null) {
    console.log('=== trackProblem called ===');
    console.log('problemSlug:', problemSlug);
    console.log('status:', status);
    console.log('time:', time);

    const result = await this.apiCall('/problems/track', {
      method: 'POST',
      body: JSON.stringify({
        problemSlug,
        status,
        time // milliseconds
      })
    });

    console.log('=== trackProblem result ===');
    console.log('result:', result);

    // Returns: { success, userProblemId, metadata: { problem_name, difficulty, leetcode_id, problem_url, tags } }
    return result;
  }

  /**
   * Submit a problem attempt (update status and time on existing user_problem)
   * @param {string} userProblemId - User problem database ID (from trackProblem)
   * @param {number} duration - Time spent in milliseconds
   * @param {boolean} isCompleted - Whether problem was successfully completed
   * @returns {Promise<Object>} Updated user problem from backend
   */
  async submitProblem(userProblemId, duration, isCompleted) {
    const result = await this.apiCall(`/user-problems/${userProblemId}`, {
      method: 'PUT',
      body: JSON.stringify({
        time: duration, // milliseconds
        status: isCompleted ? 'Completed' : 'Attempted'
      })
    });

    return result.userProblem;
  }

  /**
   * Get all problems for the authenticated user
   * @param {Object} options - Optional query parameters
   * @param {string} options.status - Filter by "Attempted" or "Completed"
   * @param {number} options.limit - Limit number of results
   * @param {number} options.offset - Pagination offset
   * @returns {Promise<Object>} Object containing problems array and stats
   */
  async getProblems(options = {}) {
    let endpoint = '/user-problems';
    const params = new URLSearchParams();

    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const result = await this.apiCall(endpoint);

    return {
      problems: result.problems,
      stats: result.stats
    };
  }

  /**
   * Update user problem metadata (status, time, etc.)
   * @param {string} userProblemId - User problem database ID
   * @param {Object} updates - Fields to update (status, time, title, difficulty, etc.)
   * @returns {Promise<Object>} Updated user problem from backend
   */
  async updateProblemInfo(userProblemId, updates) {
    const result = await this.apiCall(`/user-problems/${userProblemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    return result.userProblem;
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

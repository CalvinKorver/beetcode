// BeetCode Service Client - handles API calls to the web app
import { config } from './config.js';
import { authService } from './AuthenticationService.js';

export class BeetcodeServiceClient {
  constructor() {
    this.baseUrl = config.serviceUrl;
  }

  // Generic method to call web app API endpoints
  async callAPI(endpoint, options = {}) {
    try {
      // Get authentication headers (includes token validation)
      const authHeaders = await authService.getAuthHeaders();

      console.log('Making API call to endpoint:', endpoint);

      const url = `${this.baseUrl}/api${endpoint}`;
      const response = await fetch(url, {
        headers: {
          ...authHeaders,
          ...options.headers
        },
        ...options
      });

      console.log('API response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('BeetCode service API call error:', error);
      throw error;
    }
  }

  // Get problems for current user
  async getUserProblems() {
    try {
      console.log('Getting user problems from BeetCode service...');
      const result = await this.callAPI('/problems/user');
      console.log('Successfully retrieved problems from service:', result);
      return {
        success: true,
        problems: result.problems,
        stats: result.stats
      };
    } catch (error) {
      console.error('Error getting user problems:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sync problem data to the web application
  async syncProblem(problemData) {
    try {
      console.log('Syncing problem to BeetCode service:', problemData);
      const result = await this.callAPI('/problems/sync', {
        method: 'POST',
        body: JSON.stringify(problemData)
      });
      console.log('Problem sync successful:', result);
      return {
        success: true,
        problem: result.problem
      };
    } catch (error) {
      console.error('Error syncing problem:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test function for API connectivity
  async testConnection() {
    try {
      console.log('Testing BeetCode service API connection...');

      // Check if authenticated
      const isAuth = await authService.isAuthenticated();
      if (!isAuth) {
        throw new Error('Not authenticated - please sign in');
      }

      console.log('Authentication check passed, testing API connection...');

      const result = await this.getUserProblems();

      if (result.success) {
        console.log('Service connection test successful!', result);
        return {
          success: true,
          data: result.problems,
          message: `Connected to ${this.baseUrl} - Found ${result.problems?.length || 0} problems`
        };
      } else {
        console.error('Service connection test failed:', result.error);
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('Service connection test error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create a singleton instance
export const beetcodeService = new BeetcodeServiceClient();
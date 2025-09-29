// Authentication Service - handles token validation and auth logic
import { getStoredSession, clearStoredSession } from './supabase-client.js';
import { config } from './config.js';

export class AuthenticationService {
  constructor() {
    this.baseUrl = config.serviceUrl;
  }

  // Validate if the current token is still valid
  async validateToken() {
    try {
      const session = await getStoredSession();
      if (!session?.access_token) {
        return { valid: false, error: 'No authentication token available' };
      }

      console.log('AuthService: Validating token...');
      const url = `${this.baseUrl}/api/problems/user`;
      const response = await fetch(url, {
        method: 'HEAD', // Use HEAD for lightweight preflight check
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        console.log('AuthService: Token validation successful');
        return { valid: true };
      } else if (response.status === 401) {
        console.log('AuthService: Token validation failed - token expired or invalid');
        return { valid: false, error: 'Token expired or invalid' };
      } else {
        console.log('AuthService: Token validation failed - server error:', response.status);
        return { valid: false, error: `Server error: ${response.status}` };
      }
    } catch (error) {
      console.error('AuthService: Token validation error:', error);
      return { valid: false, error: error.message };
    }
  }

  // Get current session if valid, otherwise return null
  async getValidSession() {
    const session = await getStoredSession();
    if (!session?.access_token) {
      return null;
    }

    const validation = await this.validateToken();
    if (!validation.valid) {
      console.log('AuthService: Token invalid, clearing stored session');
      await clearStoredSession();
      return null;
    }

    return session;
  }

  // Check if user is authenticated with a valid token
  async isAuthenticated() {
    const session = await this.getValidSession();
    return !!session;
  }

  // Get authentication headers for API calls
  async getAuthHeaders() {
    const session = await this.getValidSession();
    if (!session) {
      throw new Error('Not authenticated - please sign in');
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }
}

// Create singleton instance
export const authService = new AuthenticationService();
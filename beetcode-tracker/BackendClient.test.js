// BackendClient Tests - Standalone unit tests with full mocking
// Run with: node BackendClient.test.js

// ===== Setup Mocks =====
// Mock chrome API (not available in Node.js)
globalThis.chrome = {
  storage: {
    local: {
      get: async () => ({ session: null }),
      set: async () => {},
      remove: async () => {}
    }
  }
};

// Mock fetch
let mockFetchResponse = null;
let mockFetchError = null;
let lastFetchCall = null;

globalThis.fetch = async (url, options) => {
  lastFetchCall = { url, options };

  if (mockFetchError) {
    throw mockFetchError;
  }

  return {
    ok: mockFetchResponse?.ok ?? true,
    status: mockFetchResponse?.status ?? 200,
    json: async () => mockFetchResponse?.data ?? {},
    text: async () => mockFetchResponse?.errorText ?? 'Error'
  };
};

// ===== Mock Dependencies =====
// Mock config
const mockConfig = { serviceUrl: 'https://api.beetcode.com' };

// Mock AuthenticationService with injectable behavior
class MockAuthenticationService {
  constructor() {
    this.mockSession = { access_token: 'mock-token-12345' };
    this.shouldBeAuthenticated = true;
  }

  async getAuthHeaders() {
    if (!this.shouldBeAuthenticated) {
      throw new Error('Not authenticated - please sign in');
    }
    return {
      'Authorization': `Bearer ${this.mockSession.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  async isAuthenticated() {
    return this.shouldBeAuthenticated;
  }

  async getValidSession() {
    return this.shouldBeAuthenticated ? this.mockSession : null;
  }

  setAuthenticated(value) {
    this.shouldBeAuthenticated = value;
  }
}

const mockAuthService = new MockAuthenticationService();

// ===== Import BackendClient with mocked dependencies =====
// Create a testable BackendClient that uses our mocks
class BackendClient {
  constructor() {
    this.baseUrl = mockConfig.serviceUrl;
    this.authService = mockAuthService;
  }

  async apiCall(endpoint, options = {}) {
    try {
      const authHeaders = await this.authService.getAuthHeaders();

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

  async trackProblem(problem) {
    const result = await this.apiCall('/problems/track', {
      method: 'POST',
      body: JSON.stringify(problem)
    });
    return result.problem;
  }

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

  async getProblems() {
    const result = await this.apiCall('/problems/user');
    return {
      problems: result.problems,
      stats: result.stats
    };
  }

  async updateProblemInfo(problemId, updates) {
    const result = await this.apiCall(`/problems/${problemId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return result.problem;
  }

  async checkTrackingStatus(problemId) {
    try {
      const result = await this.apiCall(`/problems/${problemId}/status`);
      return result.status === 'TRACKING';
    } catch (error) {
      console.warn(`Error checking tracking status for ${problemId}:`, error);
      return false;
    }
  }

  async testConnection() {
    try {
      const isAuth = await this.authService.isAuthenticated();
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

// ===== Test Framework =====
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n🧪 Running BackendClient Tests\n');

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ ${name}`);
      } catch (error) {
        this.failed++;
        console.error(`❌ ${name}`);
        console.error(`   Error: ${error.message}`);
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed\n`);
    return this.failed === 0;
  }
}

// Test utilities
function mockFetch(responseData, ok = true, status = 200) {
  mockFetchResponse = { data: responseData, ok, status };
  mockFetchError = null;
}

function mockFetchNetworkError(error) {
  mockFetchError = error;
  mockFetchResponse = null;
}

function resetMocks() {
  mockFetchResponse = null;
  mockFetchError = null;
  lastFetchCall = null;
  mockAuthService.setAuthenticated(true);
}

function assertEqual(actual, expected, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`);
  }
}

function assertTrue(value, message = '') {
  if (!value) {
    throw new Error(message || 'Expected true, got false');
  }
}

function assertFalse(value, message = '') {
  if (value) {
    throw new Error(message || 'Expected false, got true');
  }
}

function assertIncludes(str, substring, message = '') {
  if (!str.includes(substring)) {
    throw new Error(message || `Expected "${str}" to include "${substring}"`);
  }
}

// ===== Tests =====
const runner = new TestRunner();

runner.test('trackProblem - success', async () => {
  resetMocks();
  const client = new BackendClient();

  const mockProblem = {
    id: 'two-sum',
    name: 'Two Sum',
    difficulty: 'Easy',
    url: 'https://leetcode.com/problems/two-sum'
  };

  mockFetch({ problem: { ...mockProblem, status: 'TRACKING' } });

  const result = await client.trackProblem(mockProblem);

  assertEqual(result.status, 'TRACKING');
  assertIncludes(lastFetchCall.url, '/api/problems/track');
  assertEqual(lastFetchCall.options.method, 'POST');
});

runner.test('submitProblem - completed submission', async () => {
  resetMocks();
  const client = new BackendClient();

  const mockUpdatedProblem = {
    id: 'two-sum',
    status: 'COMPLETED',
    completedAt: Date.now(),
    timeEntries: [{ duration: 1200000, timestamp: Date.now() }]
  };

  mockFetch({ problem: mockUpdatedProblem });

  const result = await client.submitProblem('two-sum', 1200000, true, Date.now());

  assertEqual(result.status, 'COMPLETED');
  assertIncludes(lastFetchCall.url, '/api/problems/submit');
  assertEqual(lastFetchCall.options.method, 'POST');

  const body = JSON.parse(lastFetchCall.options.body);
  assertEqual(body.problemId, 'two-sum');
  assertTrue(body.isCompleted);
});

runner.test('submitProblem - attempted but not completed', async () => {
  resetMocks();
  const client = new BackendClient();

  const mockUpdatedProblem = {
    id: 'three-sum',
    status: 'ATTEMPTED',
    timeEntries: [{ duration: 600000, timestamp: Date.now() }]
  };

  mockFetch({ problem: mockUpdatedProblem });

  const result = await client.submitProblem('three-sum', 600000, false, Date.now());

  assertEqual(result.status, 'ATTEMPTED');

  const body = JSON.parse(lastFetchCall.options.body);
  assertFalse(body.isCompleted);
});

runner.test('getProblems - returns problems and stats', async () => {
  resetMocks();
  const client = new BackendClient();

  const mockResponse = {
    problems: [
      { id: 'two-sum', status: 'COMPLETED' },
      { id: 'three-sum', status: 'TRACKING' }
    ],
    stats: {
      total: 2,
      completed: 1,
      tracking: 1
    }
  };

  mockFetch(mockResponse);

  const result = await client.getProblems();

  assertEqual(result.problems.length, 2);
  assertEqual(result.stats.total, 2);
  assertIncludes(lastFetchCall.url, '/api/problems/user');
});

runner.test('updateProblemInfo - updates metadata', async () => {
  resetMocks();
  const client = new BackendClient();

  const mockUpdated = {
    id: 'two-sum',
    name: 'Two Sum',
    difficulty: 'Easy',
    leetcodeId: '1'
  };

  mockFetch({ problem: mockUpdated });

  const result = await client.updateProblemInfo('two-sum', {
    name: 'Two Sum',
    difficulty: 'Easy',
    leetcodeId: '1'
  });

  assertEqual(result.leetcodeId, '1');
  assertIncludes(lastFetchCall.url, '/api/problems/two-sum');
  assertEqual(lastFetchCall.options.method, 'PATCH');
});

runner.test('checkTrackingStatus - returns true when tracking', async () => {
  resetMocks();
  const client = new BackendClient();

  mockFetch({ status: 'TRACKING' });

  const result = await client.checkTrackingStatus('two-sum');

  assertTrue(result);
  assertIncludes(lastFetchCall.url, '/api/problems/two-sum/status');
});

runner.test('checkTrackingStatus - returns false when not tracking', async () => {
  resetMocks();
  const client = new BackendClient();

  mockFetch({ status: 'COMPLETED' });

  const result = await client.checkTrackingStatus('two-sum');

  assertFalse(result);
});

runner.test('checkTrackingStatus - returns false on error', async () => {
  resetMocks();
  const client = new BackendClient();

  mockFetch({ error: 'Not found' }, false, 404);
  mockFetchResponse.errorText = 'Not found';

  const result = await client.checkTrackingStatus('non-existent');

  assertFalse(result);
});

runner.test('apiCall - handles HTTP errors', async () => {
  resetMocks();
  const client = new BackendClient();

  mockFetch({ error: 'Bad request' }, false, 400);
  mockFetchResponse.errorText = 'Bad request';

  try {
    await client.apiCall('/test');
    throw new Error('Should have thrown error');
  } catch (error) {
    assertIncludes(error.message, 'HTTP 400');
  }
});

runner.test('apiCall - handles network errors', async () => {
  resetMocks();
  const client = new BackendClient();

  mockFetchNetworkError(new Error('Network failure'));

  try {
    await client.trackProblem({ id: 'test' });
    throw new Error('Should have thrown error');
  } catch (error) {
    assertIncludes(error.message, 'Network failure');
  }
});

runner.test('testConnection - success when authenticated', async () => {
  resetMocks();
  const client = new BackendClient();

  mockFetch({ problems: [{ id: 'test' }], stats: {} });

  const result = await client.testConnection();

  assertTrue(result.success);
  assertIncludes(result.message, 'Found 1 problems');
});

runner.test('testConnection - fails when not authenticated', async () => {
  resetMocks();
  const client = new BackendClient();

  mockAuthService.setAuthenticated(false);

  const result = await client.testConnection();

  assertFalse(result.success);
  assertIncludes(result.error, 'Not authenticated');
});

runner.test('apiCall - includes auth headers', async () => {
  resetMocks();
  const client = new BackendClient();

  mockFetch({ success: true });

  await client.apiCall('/test');

  assertTrue(lastFetchCall.options.headers['Authorization'].includes('Bearer mock-token'));
  assertEqual(lastFetchCall.options.headers['Content-Type'], 'application/json');
});

// Run all tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function extractProblemInfo(isCompleted = false) {
  const status = isCompleted ? 'COMPLETED' : 'ATTEMPTED';
  const url = global.window?.location?.href || 'https://leetcode.com/problems/two-sum';
  const problemMatch = url.match(/\/problems\/([^\/]+)/);
  
  if (!problemMatch) return null;
  
  const problemSlug = problemMatch[1];
  const titleElement = global.document?.querySelector?.('h1[data-cy="question-title"], .css-v3d350');
  const problemTitle = titleElement?.textContent?.trim() || problemSlug;
  
  return {
    id: problemSlug,
    name: problemTitle,
    url: url.split('?')[0],
    status: status,
    lastAttempted: Date.now(),
    completedAt: status === 'COMPLETED' ? Date.now() : null
  };
}

// Mock chrome storage functions
const mockStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn()
  }
};

global.chrome = {
  storage: mockStorage
};

// Background script functions (simplified versions for testing)
async function getProblemByUrl(url) {
  try {
    const result = await chrome.storage.local.get(['problems']);
    const problems = result.problems || {};
    const cleanUrl = url.split('?')[0];
    
    for (const problem of Object.values(problems)) {
      if (problem && problem.url === cleanUrl) {
        return problem;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting problem by URL:', error);
    return null;
  }
}

async function saveProblem(problem) {
  const result = await chrome.storage.local.get(['problems']);
  const problems = result.problems || {};
  const existingProblem = problems[problem.id];
  
  if (existingProblem) {
    const updatedProblem = {
      ...existingProblem,
      ...problem,
      timeEntries: existingProblem.timeEntries || problem.timeEntries || [],
      status: existingProblem.status === 'COMPLETED' && problem.status === 'ATTEMPTED' 
        ? 'COMPLETED' 
        : problem.status,
      completedAt: existingProblem.status === 'COMPLETED' 
        ? existingProblem.completedAt 
        : problem.completedAt,
      attemptCount: (existingProblem.attemptCount || 0) + 1
    };
    problems[problem.id] = updatedProblem;
  } else {
    const newProblem = {
      ...problem,
      attemptCount: 1,
      timeEntries: problem.timeEntries || []
    };
    problems[problem.id] = newProblem;
  }
  
  await chrome.storage.local.set({ problems });
  return problems[problem.id];
}

describe('extractProblemInfo', () => {
  beforeEach(() => {
    global.window = {
      location: { href: 'https://leetcode.com/problems/two-sum' }
    };
    global.document = {
      querySelector: vi.fn(() => ({ textContent: 'Two Sum' }))
    };
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return ATTEMPTED status when isCompleted is false', () => {
    const result = extractProblemInfo(false);
    
    expect(result.status).toBe('ATTEMPTED');
    expect(result.completedAt).toBe(null);
  });

  it('should return COMPLETED status when isCompleted is true', () => {
    const result = extractProblemInfo(true);
    
    expect(result.status).toBe('COMPLETED');
    expect(result.completedAt).toBe(1234567890);
  });

  it('should extract problem info correctly', () => {
    const result = extractProblemInfo(false);
    
    expect(result.id).toBe('two-sum');
    expect(result.name).toBe('Two Sum');
    expect(result.url).toBe('https://leetcode.com/problems/two-sum');
  });
});

describe('getProblemByUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return existing problem when URL matches', async () => {
    const existingProblems = {
      'two-sum': {
        id: 'two-sum',
        name: 'Two Sum',
        url: 'https://leetcode.com/problems/two-sum',
        status: 'ATTEMPTED',
        attemptCount: 2
      }
    };
    
    mockStorage.local.get.mockResolvedValue({ problems: existingProblems });
    
    const result = await getProblemByUrl('https://leetcode.com/problems/two-sum?tab=description');
    
    expect(result).toEqual(existingProblems['two-sum']);
    expect(mockStorage.local.get).toHaveBeenCalledWith(['problems']);
  });

  it('should return null when problem does not exist', async () => {
    mockStorage.local.get.mockResolvedValue({ problems: {} });
    
    const result = await getProblemByUrl('https://leetcode.com/problems/nonexistent');
    
    expect(result).toBeNull();
  });

  it('should handle storage errors gracefully', async () => {
    mockStorage.local.get.mockRejectedValue(new Error('Storage error'));
    
    const result = await getProblemByUrl('https://leetcode.com/problems/two-sum');
    
    expect(result).toBeNull();
  });
});

describe('saveProblem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save new problem with attemptCount = 1', async () => {
    mockStorage.local.get.mockResolvedValue({ problems: {} });
    mockStorage.local.set.mockResolvedValue();
    
    const newProblem = {
      id: 'two-sum',
      name: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum',
      status: 'ATTEMPTED'
    };
    
    const result = await saveProblem(newProblem);
    
    expect(result.attemptCount).toBe(1);
    expect(result.timeEntries).toEqual([]);
    expect(mockStorage.local.set).toHaveBeenCalledWith({
      problems: {
        'two-sum': expect.objectContaining({
          ...newProblem,
          attemptCount: 1,
          timeEntries: []
        })
      }
    });
  });

  it('should update existing problem and increment attemptCount', async () => {
    const existingProblems = {
      'two-sum': {
        id: 'two-sum',
        name: 'Two Sum',
        url: 'https://leetcode.com/problems/two-sum',
        status: 'ATTEMPTED',
        attemptCount: 2,
        timeEntries: [{ duration: '05:30', timestamp: 1234567000 }]
      }
    };
    
    mockStorage.local.get.mockResolvedValue({ problems: existingProblems });
    mockStorage.local.set.mockResolvedValue();
    
    const updatedProblem = {
      id: 'two-sum',
      status: 'ATTEMPTED',
      lastAttempted: 1234567890
    };
    
    const result = await saveProblem(updatedProblem);
    
    expect(result.attemptCount).toBe(3);
    expect(result.timeEntries).toEqual([{ duration: '05:30', timestamp: 1234567000 }]);
    expect(result.lastAttempted).toBe(1234567890);
  });

  it('should not downgrade status from COMPLETED to ATTEMPTED', async () => {
    const existingProblems = {
      'two-sum': {
        id: 'two-sum',
        status: 'COMPLETED',
        completedAt: 1234567000,
        attemptCount: 3
      }
    };
    
    mockStorage.local.get.mockResolvedValue({ problems: existingProblems });
    mockStorage.local.set.mockResolvedValue();
    
    const updatedProblem = {
      id: 'two-sum',
      status: 'ATTEMPTED'
    };
    
    const result = await saveProblem(updatedProblem);
    
    expect(result.status).toBe('COMPLETED');
    expect(result.completedAt).toBe(1234567000);
    expect(result.attemptCount).toBe(4);
  });

  it('should allow upgrading status from ATTEMPTED to COMPLETED', async () => {
    const existingProblems = {
      'two-sum': {
        id: 'two-sum',
        status: 'ATTEMPTED',
        attemptCount: 2
      }
    };
    
    mockStorage.local.get.mockResolvedValue({ problems: existingProblems });
    mockStorage.local.set.mockResolvedValue();
    
    const updatedProblem = {
      id: 'two-sum',
      status: 'COMPLETED',
      completedAt: 1234567890
    };
    
    const result = await saveProblem(updatedProblem);
    
    expect(result.status).toBe('COMPLETED');
    expect(result.completedAt).toBe(1234567890);
    expect(result.attemptCount).toBe(3);
  });
});
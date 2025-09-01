import { describe, it, expect, vi, beforeEach } from 'vitest';

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
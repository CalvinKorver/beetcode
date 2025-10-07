# Beetcode Backend API Design Document

## Overview

This document outlines the design and implementation plan for the Beetcode backend API that enables the Chrome extension to track LeetCode problem-solving progress.

---

## Database Schema

### Two-Table Design (Leveraging Existing Crawler Data)

The crawler has already populated `leetcode_problems` with all problem metadata. We use this as the source of truth and only store user-specific tracking data in `user_problems`.

#### `leetcode_problems` (Existing - Populated by Crawler)
Stores canonical information about LeetCode problems, shared across all users.

```sql
CREATE TABLE leetcode_problems (
  problem_slug TEXT PRIMARY KEY,           -- URL slug (e.g., "two-sum")
  leetcode_id INT UNIQUE,                  -- Official LeetCode problem number
  problem_name TEXT NOT NULL,              -- Display name (e.g., "Two Sum")
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  problem_url TEXT NOT NULL,               -- Full LeetCode URL
  tags TEXT[],                             -- Array of topic tags
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leetcode_problems_difficulty ON leetcode_problems(difficulty);
CREATE INDEX idx_leetcode_problems_leetcode_id ON leetcode_problems(leetcode_id);
```

**Note**: This table is already populated by the crawler. The API doesn't need to manage this data.

#### `user_problems` (User-Specific Tracking)
Tracks individual user's progress. References `leetcode_problems` for metadata.

```sql
CREATE TABLE user_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_slug TEXT NOT NULL REFERENCES leetcode_problems(problem_slug),

  -- Tracking Data (user-specific)
  status TEXT NOT NULL CHECK (status IN ('Attempted', 'Completed')),
  best_time_seconds INT,                   -- Best completion time in seconds
  score INT DEFAULT 5,                     -- Spaced repetition score (1-10)
  first_completed_at TIMESTAMPTZ,          -- Timestamp of first completion
  last_attempted_at TIMESTAMPTZ NOT NULL,  -- Timestamp of most recent attempt

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, problem_slug)            -- One record per user per problem
);

CREATE INDEX idx_user_problems_user_id ON user_problems(user_id);
CREATE INDEX idx_user_problems_status ON user_problems(status);
CREATE INDEX idx_user_problems_last_attempted ON user_problems(last_attempted_at DESC);
CREATE INDEX idx_user_problems_slug ON user_problems(problem_slug);
```

#### `user_problems_with_metadata` (View)
Joins `user_problems` with `leetcode_problems` for convenient querying.

```sql
CREATE VIEW user_problems_with_metadata AS
SELECT
  up.id,
  up.user_id,
  up.problem_slug,
  lp.problem_name,
  lp.leetcode_id,
  lp.difficulty,
  lp.problem_url,
  lp.tags,
  up.status,
  up.best_time_seconds,
  up.score,
  up.last_attempted_at,
  up.first_completed_at,
  up.created_at,
  up.updated_at
FROM user_problems up
INNER JOIN leetcode_problems lp ON up.problem_slug = lp.problem_slug;
```

**Benefits**:
- ✅ Leverages existing crawler data (no duplication)
- ✅ Problem metadata centrally managed by crawler
- ✅ Clean separation: global metadata vs. user tracking
- ✅ View makes queries simple (single SELECT)
- ✅ Foreign key ensures data integrity

---

## API Endpoints

### 1. POST `/api/problems/track`

**Purpose**: Create a user_problem record when the extension starts tracking a problem. This establishes the tracking relationship between the user and a problem from the crawler database.

**Request Body**:
```typescript
{
  // Problem Identity (required)
  problemSlug: string;     // Problem slug (e.g., "two-sum")

  // Initial Tracking State (optional)
  status?: "Attempted" | "Completed";  // Defaults to "Attempted"
  time?: number;           // Time in milliseconds (optional)
}
```

**Response**:
```typescript
{
  success: true,
  userProblemId: string;   // UUID of the created/existing user_problem record
  metadata: {
    problem_name: string;
    difficulty: "Easy" | "Medium" | "Hard";
    leetcode_id: number | null;
    problem_url: string;
    tags: string[] | null;
  }
}
```

**Logic**:
1. Authenticate user via Bearer token or cookies
2. Validate required field: `problemSlug`
3. **Verify problem exists** in `leetcode_problems` table:
   - If NOT found: Return `404 Not Found` (problem not in crawler database)
4. Check if `user_problems` record already exists (user_id + problem_slug)
5. **If exists**: Return existing `user_problem.id` (idempotent)
6. **If new**: Create new record:
   - `problem_slug` references existing `leetcode_problems` row
   - `status = "Attempted"` (or from request)
   - `last_attempted_at = NOW()`
   - `best_time_seconds = time / 1000` (if provided)
   - Generate new UUID
7. Return the `user_problems.id`

**Why This Design**:
- Leverages existing crawler data (no metadata in request!)
- Foreign key ensures problem exists before tracking
- Idempotent: calling multiple times returns same UUID
- Simple request body (just the slug)

**Error Cases**:
- `401 Unauthorized`: Invalid or missing auth
- `400 Bad Request`: Missing required field `problemSlug`
- `404 Not Found`: Problem slug not found in `leetcode_problems` (crawler hasn't indexed it yet)
- `500 Internal Server Error`: Database errors

---

### 2. PUT `/api/user-problems/[id]`

**Purpose**: Update a user_problem record (status, time, metadata).

**URL Params**:
- `id`: UUID of the user_problem record

**Request Body**:
```typescript
{
  status?: "Attempted" | "Completed";
  time?: number;           // Time in milliseconds
  title?: string;          // Update problem name (updates leetcode_problems)
  difficulty?: "Easy" | "Medium" | "Hard";
  url?: string;
  leetcodeId?: number;
  tags?: string[];
}
```

**Response**:
```typescript
{
  success: true,
  userProblem: {
    id: string;
    user_id: string;
    problem_slug: string;
    status: "Attempted" | "Completed";
    best_time_seconds: number | null;
    score: number;
    last_attempted_at: string;
    first_completed_at: string | null;
    created_at: string;
    updated_at: string;
  }
}
```

**Logic**:
1. Authenticate user
2. Verify ownership: `user_problems.user_id` must match authenticated user
3. Update `user_problems` with conflict resolution:
   - **Status**: Only upgrade (Attempted → Completed), never downgrade
   - **Time**: Only update if new time is better (lower)
   - **Timestamps**:
     - Always update `last_attempted_at` to now
     - Set `first_completed_at` only if status changes to Completed and field is null
4. If metadata fields provided (title, difficulty, etc.):
   - Update corresponding `leetcode_problems` record
5. Return updated record with joined metadata

**Conflict Resolution Rules**:
- **Best Time**: Only replace if `new_time < existing_best_time` OR `existing_best_time IS NULL`
- **Status**: Can upgrade from Attempted to Completed, cannot downgrade
- **First Completion**: Once set, never overwrite

**Error Cases**:
- `401 Unauthorized`: Invalid or missing auth
- `403 Forbidden`: User doesn't own this user_problem
- `404 Not Found`: user_problem ID doesn't exist
- `500 Internal Server Error`: Database errors

---

### 3. GET `/api/user-problems`

**Purpose**: Retrieve all user_problems for the authenticated user with stats.

**Query Params** (Optional):
- `status`: Filter by "Attempted" or "Completed"
- `limit`: Limit number of results
- `offset`: Pagination offset

**Response**:
```typescript
{
  success: true,
  problems: [
    {
      id: string;
      user_id: string;
      problem_slug: string;
      problem_name: string;
      leetcode_id: number | null;
      difficulty: "Easy" | "Medium" | "Hard";
      problem_url: string;
      status: "Attempted" | "Completed";
      best_time_seconds: number | null;
      score: number;
      last_attempted_at: string;
      first_completed_at: string | null;
      created_at: string;
      updated_at: string;
    }
  ],
  stats: {
    total: number;
    attempted: number;
    completed: number;
  }
}
```

**Logic**:
1. Authenticate user
2. Query `user_problems_with_metadata` view:
   - Filter by `user_id`
   - Apply optional filters (status, limit, offset)
   - Order by `last_attempted_at DESC`
3. Calculate stats:
   - `total`: Count of all records
   - `attempted`: Count where status = "Attempted"
   - `completed`: Count where status = "Completed"
4. Return problems array and stats

**Error Cases**:
- `401 Unauthorized`: Invalid or missing auth
- `500 Internal Server Error`: Database errors

---

## Authentication Strategy

### Two Authentication Methods

**1. Cookie-Based Auth (Web App)**
```typescript
const supabase = await createClient(); // Uses Next.js cookies
const { data: { user } } = await supabase.auth.getUser();
```

**2. Token-Based Auth (Chrome Extension)**
```typescript
const authHeader = request.headers.get('authorization');
const token = authHeader?.replace('Bearer ', '');

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
  {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    },
    cookies: {
      getAll: () => [],
      setAll: () => {}
    }
  }
);
```

**Auth Flow**:
1. Check for `Authorization: Bearer <token>` header
2. If present: Use token-based auth (extension)
3. If absent: Use cookie-based auth (web app)
4. Get user from Supabase auth
5. If unauthorized or no user: Return 401

---

## CORS Configuration

All API endpoints must support CORS for Chrome extension requests:

```typescript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // 24 hours
}
```

**OPTIONS handler** (required for preflight):
```typescript
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { /* CORS headers */ }
  });
}
```

---

## Service Layer

### `ProblemsService` Class

Located at `lib/services/problemsService.ts`

**Core Methods**:

#### `trackProblem(problemSlug, status, timeSeconds, supabaseClient)`
- Verifies problem exists in `leetcode_problems`
- Creates new `user_problems` record (or returns existing)
- **Input**: `problemSlug`, optional `status`, optional `timeSeconds`
- **Returns**: `user_problem.id` (UUID) or throws error if problem not found
- **Note**: Idempotent - returns existing ID if already tracking

#### `getProblemById(id, supabaseClient)`
- Retrieves single problem from `user_problems_with_metadata` view
- Verifies user ownership
- **Input**: `user_problem.id` (UUID)
- **Returns**: Full problem object with metadata or null

#### `getProblemsForUser(supabaseClient)`
- Retrieves all problems for authenticated user
- Queries `user_problems_with_metadata` view (includes metadata!)
- Orders by `last_attempted_at DESC`
- **Returns**: Array of problems with full metadata

#### `updateProblem(id, updates, supabaseClient)`
- Updates `user_problems` record
- Implements conflict resolution:
  - **Best time**: Only update if better (lower)
  - **Status**: Only upgrade (Attempted → Completed)
  - **Timestamps**: Always update `last_attempted_at`
- **Input**: `user_problem.id` + update fields
- **Returns**: Updated problem with metadata (from view)

#### `calculateStats(problems)`
- Client-side calculation of total/attempted/completed
- Pure function, no DB queries
- **Input**: Array of problems
- **Returns**: `{ total, attempted, completed }`

---

## Data Flow

### Extension → Backend: Tracking a Problem

```
1. User opens LeetCode problem in browser
2. Extension extracts problem slug from URL (e.g., "two-sum")
3. Extension calls POST /api/problems/track with just the slug
4. Backend:
   a. Verifies problem exists in leetcode_problems table
   b. If NOT found: Returns 404 (crawler hasn't indexed it)
   c. If found: Checks if user_problems record exists
   d. If new: Creates user_problems record (references leetcode_problems)
   e. If exists: Returns existing UUID (idempotent)
5. Backend returns user_problem.id (UUID) along with the metadata from the problem that is stored in the database which includes difficulty, name, and leetcode ID
6. Extension stores UUID locally mapped to problem slug along with the metadata so we can display it to the user if needed.
```

**Key Insight**: Extension doesn't need to send metadata! The crawler already has it.

### Extension → Backend: Submitting a Solution

```
1. User completes problem (or attempts). They press the submit button (listener for this already exists in code, utilize it)
2. Extension has stored userProblemId from tracking along with the metadata
3. Extension calls PUT /api/user-problems/{userProblemId}
   - Body: { status: "Completed", time: 1234567 } // milliseconds
4. Backend:
   a. Converts time from ms to seconds
   b. Applies conflict resolution (best time, status upgrade)
   c. Updates timestamps
   d. Returns updated user_problem
5. Extension updates local UI
```

### Extension → Backend: Fetching All Problems

```
1. Extension opens dashboard/popup
2. Extension calls GET /api/user-problems
3. Backend:
   a. Queries user_problems_with_metadata for user
   b. Calculates stats
   c. Returns problems + stats
4. Extension displays list of tracked problems
```

---

## Extension Client Updates

### BackendClient.js

**Methods to implement**:

#### `trackProblem(problemSlug, status, time)`
```javascript
async trackProblem(problemSlug, status = 'Attempted', time = null) {
  const result = await this.apiCall('/problems/track', {
    method: 'POST',
    body: JSON.stringify({
      problemSlug,
      status,
      time // milliseconds
    })
  });
  return result; // return the UUID of the user_problem as well as metadata of the problem itself
}
```

**Usage**:
```javascript
// When user starts a problem
const result = await backendClient.trackProblem('two-sum');
// result = { success: true, userProblemId: 'uuid-here', metadata: { problem_name, difficulty, leetcode_id, problem_url, tags } }

// Store mapping: problemSlug -> userProblemId + metadata for display
localStorage.set('two-sum', {
  userProblemId: result.userProblemId,
  metadata: result.metadata
});
```

#### `submitProblem(userProblemId, duration, isCompleted)`
```javascript
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
```

#### `getProblems()`
```javascript
async getProblems() {
  const result = await this.apiCall('/user-problems');
  return {
    problems: result.problems,
    stats: result.stats
  };
}
```

#### `updateProblemInfo(userProblemId, updates)`
```javascript
async updateProblemInfo(userProblemId, updates) {
  const result = await this.apiCall(`/user-problems/${userProblemId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  return result.userProblem;
}
```

---

## Implementation Checklist

### Phase 1: Database Setup
- [ ] Create `leetcode_problems` table in Supabase
- [ ] Create `user_problems` table in Supabase
- [ ] Create `user_problems_with_metadata` view
- [ ] Set up RLS (Row Level Security) policies
  - [ ] Users can only read/write their own `user_problems`
  - [ ] `leetcode_problems` is readable by all authenticated users
- [ ] Create indexes for performance

### Phase 2: Service Layer
- [ ] Implement `ensureLeetCodeProblem()` method
- [ ] Implement `upsertProblem()` with conflict resolution
- [ ] Implement `getProblemById()` with ownership check
- [ ] Implement `getProblemsForUser()`
- [ ] Implement `updateProblem()` with conflict resolution
- [ ] Add unit tests for service methods

### Phase 3: API Routes
- [ ] Implement `POST /api/problems/track`
  - [ ] Auth handling (token + cookies)
  - [ ] CORS setup
  - [ ] Input validation
  - [ ] Call service layer
  - [ ] Error handling
- [ ] Implement `GET /api/user-problems`
  - [ ] Auth handling
  - [ ] CORS setup
  - [ ] Query parameter support
  - [ ] Stats calculation
- [ ] Implement `PUT /api/user-problems/[id]`
  - [ ] Auth handling
  - [ ] CORS setup
  - [ ] Ownership verification
  - [ ] Conflict resolution
  - [ ] Error handling

### Phase 4: Extension Client
- [ ] Update `trackProblem()` to return userProblemId
- [ ] Update `submitProblem()` to use userProblemId + PUT
- [ ] Update `getProblems()` to use new endpoint
- [ ] Remove deprecated `checkTrackingStatus()` method
- [ ] Update extension storage to cache userProblemIds

### Phase 5: Testing
- [ ] Unit tests for service layer
- [ ] Integration tests for API routes
- [ ] E2E tests: Extension → API → Database
- [ ] Test conflict resolution scenarios
- [ ] Test auth edge cases
- [ ] Performance testing with large datasets

### Phase 6: Migration
- [ ] Create migration script for existing data (if any)
- [ ] Deprecate old `/api/problems/sync` endpoint
- [ ] Update web app to use new endpoints
- [ ] Deploy to production
- [ ] Monitor error rates and performance

---

## Security Considerations

### Authentication
- Always verify user identity via Supabase auth
- Never trust client-provided `user_id`
- Use RLS policies as defense-in-depth

### Authorization
- Verify `user_problems.user_id` matches authenticated user
- Use Supabase RLS to enforce row-level permissions

### Input Validation
- Validate all request bodies
- Sanitize string inputs (problem names, tags)
- Reject invalid status values
- Validate time values (must be positive)

### Rate Limiting (Future)
- Consider rate limiting for `/api/problems/track`
- Prevent abuse from malicious extensions

---

## Performance Considerations

### Database Indexes
- `user_problems(user_id)`: Fast user-specific queries
- `user_problems(last_attempted_at DESC)`: Fast sorting
- `user_problems(status)`: Fast filtering

### Caching Strategy (Future)
- Cache `leetcode_problems` metadata (rarely changes)
- Consider Redis for frequently accessed data
- Use Supabase's built-in caching

### Query Optimization
- Use view for joined queries
- Limit result sets with pagination
- Use `select()` to fetch only needed fields

---

## Error Handling

### Standard Error Response Format
```typescript
{
  error: string;           // Human-readable error message
  code?: string;           // Optional error code for debugging
}
```

### HTTP Status Codes
- `200 OK`: Success
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing or invalid auth
- `403 Forbidden`: Valid auth but insufficient permissions
- `404 Not Found`: Resource doesn't exist
- `500 Internal Server Error`: Server/database errors

### Logging Strategy
- Log all errors with context (user_id, endpoint, params)
- Use `console.log()` for info/debug in development
- Use `console.error()` for errors
- Consider structured logging in production

---

## Future Enhancements

### Time Tracking
- Add `time_entries` table for detailed session tracking
- Track multiple attempts per problem
- Calculate average/median/best times

### Spaced Repetition
- Implement scoring algorithm
- Schedule problem reviews
- Track review history

### Analytics
- Track completion streaks
- Calculate difficulty-based scores
- Generate progress reports

### Social Features
- Public profiles
- Problem recommendations
- Leaderboards

---

## Migration from Old Endpoints

### Old Endpoints (Deprecated)
- `POST /api/problems/sync` → Use `POST /api/problems/track` + `PUT /api/user-problems/[id]`
- `GET /api/problems/user` → Use `GET /api/user-problems`
- `PUT /api/problems/[id]` → Use `PUT /api/user-problems/[id]`

### Migration Strategy
1. Deploy new endpoints alongside old ones
2. Update extension to use new endpoints
3. Update web app to use new endpoints
4. Monitor usage of old endpoints
5. Deprecate old endpoints after 30 days
6. Remove old endpoints after 60 days

---

## Questions for Discussion

1. Should we store time in milliseconds or seconds in the database?
   - **Recommendation**: Store in seconds (smaller data type)
   - Convert from milliseconds in API layer

2. Should `best_time_seconds` allow NULL?
   - **Recommendation**: Yes, user may track without timing

3. Should we track individual time entries or just best time?
   - **Current**: Just best time
   - **Future**: Add `time_entries` table for detailed tracking

4. How should we handle problem metadata updates?
   - **Current**: Upsert on every track
   - **Future**: Consider background job to sync from LeetCode API

5. Should we support bulk operations (track multiple problems)?
   - **Current**: One at a time
   - **Future**: Add `POST /api/user-problems/bulk` for efficiency
